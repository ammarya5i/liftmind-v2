import { NextRequest, NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getAnthropic, MODELS } from '@/lib/ai/anthropic'
import { refreshSummary } from '@/lib/ai/memory'
import { computeFatigue } from '@/lib/fatigue'
import type { Exercise, PersonalRecord } from '@/lib/types'

export const runtime = 'nodejs'

const tools: Anthropic.Tool[] = [
  {
    name: 'log_workout',
    description:
      'Log a completed workout when the user reports training they performed. Use canonical exercise names from the allowed list.',
    input_schema: {
      type: 'object',
      properties: {
        performed_at: { type: 'string', description: 'Date YYYY-MM-DD. Defaults to today.' },
        session_rpe: { type: 'number', description: 'Overall session RPE 0–10, optional.' },
        notes: { type: 'string' },
        exercises: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              exercise: { type: 'string', description: 'Canonical exercise name.' },
              sets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    reps: { type: 'number' },
                    weight: { type: 'number' },
                    rpe: { type: 'number' },
                    is_warmup: { type: 'boolean' },
                  },
                  required: ['reps', 'weight'],
                },
              },
            },
            required: ['exercise', 'sets'],
          },
        },
      },
      required: ['exercises'],
    },
  },
  {
    name: 'log_pr',
    description: 'Log a personal record or heavy single the user reports hitting.',
    input_schema: {
      type: 'object',
      properties: {
        exercise: { type: 'string', description: 'Canonical exercise name.' },
        weight: { type: 'number' },
        reps: { type: 'number', description: 'Reps achieved. Defaults to 1.' },
      },
      required: ['exercise', 'weight'],
    },
  },
  {
    name: 'update_profile',
    description:
      'Update the user profile when they ask to change units, training focus, experience, or display name.',
    input_schema: {
      type: 'object',
      properties: {
        display_name: { type: 'string' },
        units: { type: 'string', enum: ['kg', 'lbs'] },
        training_type: { type: 'string' },
        experience: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
      },
    },
  },
  {
    name: 'save_program',
    description:
      'Save a training program/plan you built for the user, when they want to keep it. Use their canonical exercise names where possible.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Short program name.' },
        notes: { type: 'string', description: 'Optional overview/notes.' },
        days: {
          type: 'array',
          description: 'One entry per training day in the weekly template.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'e.g. "Day 1 — Lower".' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    exercise: { type: 'string' },
                    sets: { type: 'number' },
                    reps: { type: 'string', description: 'e.g. "5", "8-12", "AMRAP".' },
                    intensity: { type: 'string', description: 'e.g. "80%", "RPE 8".' },
                    notes: { type: 'string' },
                  },
                  required: ['exercise', 'sets', 'reps'],
                },
              },
            },
            required: ['name', 'items'],
          },
        },
      },
      required: ['name', 'days'],
    },
  },
]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'The coach isn’t configured yet — add ANTHROPIC_API_KEY to .env.local.' },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => null)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message) return NextResponse.json({ error: 'Empty message.' }, { status: 400 })

  // Rate limit — protect Anthropic spend. Cap user messages per rolling hour.
  // Counts existing rows (no new infra); works across serverless instances.
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString()
  const { count: recentCount } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('role', 'user')
    .gte('created_at', hourAgo)
  if ((recentCount ?? 0) >= 40) {
    return NextResponse.json(
      { error: 'Hourly message limit reached — take a breather and try again later.' },
      { status: 429 },
    )
  }

  // Persist the user's turn first so it's part of the loaded history.
  const { error: insErr } = await supabase
    .from('chat_messages')
    .insert({ user_id: user.id, role: 'user', content: message })
  if (insErr) console.error('chat_messages insert (user) failed:', insErr.message)

  // ── Retrieve context ────────────────────────────────────────────────
  const since14 = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)
  const [profileRes, prsRes, exRes, recentRes, histRes, sumRes, cntRes, sessions14Res] =
    await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, units, training_type, experience')
      .eq('id', user.id)
      .single(),
    supabase
      .from('personal_records')
      .select('exercise_id, true_1rm, est_1rm, user_id')
      .eq('user_id', user.id),
    supabase
      .from('exercises')
      .select('id, canonical_name, is_competition')
      .order('is_competition', { ascending: false })
      .order('canonical_name'),
    supabase
      .from('workouts')
      .select('performed_at, session_rpe, workout_sets(count)')
      .order('performed_at', { ascending: false })
      .limit(5),
    supabase
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .is('thread_id', null)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('session_summaries')
      .select('summary')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('thread_id', null),
    supabase
      .from('workouts')
      .select('performed_at, session_rpe')
      .eq('user_id', user.id)
      .gte('performed_at', since14),
  ])

  const profile = profileRes.data
  const units = (profile?.units as string) ?? 'kg'
  const name = profile?.display_name || 'the lifter'
  const memory = (sumRes.data?.[0]?.summary as string | undefined) ?? null
  const count = cntRes.count ?? 0
  const fatigue = computeFatigue({
    sessions: ((sessions14Res.data ?? []) as { performed_at: string; session_rpe: number | null }[]).map(
      (w) => ({ date: w.performed_at, rpe: w.session_rpe }),
    ),
  })

  const exes = (exRes.data ?? []) as Pick<Exercise, 'id' | 'canonical_name' | 'is_competition'>[]
  const exById = new Map(exes.map((e) => [e.id, e.canonical_name]))
  const exerciseNames = exes.map((e) => e.canonical_name)

  const prLines = ((prsRes.data ?? []) as PersonalRecord[])
    .map((pr) => {
      const nm = exById.get(pr.exercise_id)
      const v = pr.est_1rm ?? pr.true_1rm
      return nm && v != null ? `${nm} ${v}${units}` : null
    })
    .filter(Boolean)
    .join(', ')

  const recentLines = (
    (recentRes.data as
      | { performed_at: string; session_rpe: number | null; workout_sets: { count: number }[] }[]
      | null) ?? []
  )
    .map(
      (w) =>
        `${w.performed_at} (${w.workout_sets?.[0]?.count ?? 0} sets${
          w.session_rpe != null ? `, RPE ${w.session_rpe}` : ''
        })`,
    )
    .join(' · ')

  const system = `You are ${name}'s LiftMind coach — an attentive, knowledgeable strength coach for a ${
    profile?.experience ?? 'intermediate'
  } lifter focused on ${profile?.training_type ?? 'powerlifting'} (units ${units}).

Act like a real coach, not a form to fill in:
- Gather what you need by ASKING. Before you program, advise, or assess, ask for the relevant context you're missing — goals and timeline, schedule and availability, equipment, injuries or niggles, recent training and how it felt. Ask a few focused questions at a time, not an interrogation.
- When they ask for your opinion, feedback, or whether something is right: be direct and substantive. Name what's off, why it matters, and a concrete fix. Don't hedge into uselessness.
- Don't pile unsolicited critique onto routine logging — when they're just logging, keep it light. Bring the deeper coaching when they ask for it (or when there's a genuine safety issue worth flagging).

Be clear and concise — no filler — but as thorough as the question actually needs.

Logging: when they report training, call log_workout (the app shows a Save card to confirm, so you don't ask permission to log) — but if a needed detail is missing, like the weight, ask instead of guessing. PRs/heavy singles → log_pr. Profile changes → update_profile. When you build a program or plan they want to keep, call save_program. Keep the logging acknowledgement short.

Never invent numbers — use the data below or ask. Use ONLY these canonical exercise names: ${exerciseNames.join(', ')}. If they name something not listed, pick the closest or ask.

Memory (durable notes from past sessions): ${memory ?? 'none yet'}
Readiness (computed from their RPE + frequency, not a guess): ${
    fatigue.status === 'unknown' ? 'not enough data yet' : `${fatigue.label} — ${fatigue.detail}`
  }
Current PRs: ${prLines || 'none logged yet'}
Recent sessions: ${recentLines || 'none yet'}`

  // ── Build the conversation (older context lives in Memory above) ────
  const ordered = ((histRes.data ?? []) as { role: string; content: string }[]).reverse()
  let messages: Anthropic.MessageParam[] = ordered
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m): Anthropic.MessageParam => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))
    .slice(-10)
  while (messages.length && messages[0].role === 'assistant') messages = messages.slice(1)
  if (messages.length === 0) messages = [{ role: 'user', content: message }]

  // ── Reason ──────────────────────────────────────────────────────────
  let reply: Anthropic.Message
  try {
    reply = await getAnthropic().messages.create({
      model: MODELS.coach,
      max_tokens: 1024,
      system,
      tools,
      messages,
    })
  } catch (err) {
    const e = err as { status?: number; message?: string }
    let msg = 'The coach hit an error. Try again.'
    if (e.status === 401) msg = 'The Anthropic API key looks invalid.'
    else if (e.status === 400 && /credit|billing|balance/i.test(e.message ?? ''))
      msg = 'No Anthropic credits yet — add billing to use the coach.'
    else if (e.status === 429) msg = 'Rate limited — give it a moment.'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  let text = ''
  const actions: { id: string; name: string; input: unknown }[] = []
  for (const block of reply.content) {
    if (block.type === 'text') text += block.text
    else if (block.type === 'tool_use')
      actions.push({ id: block.id, name: block.name, input: block.input })
  }

  if (text.trim()) {
    const { error: aErr } = await supabase
      .from('chat_messages')
      .insert({ user_id: user.id, role: 'assistant', content: text })
    if (aErr) console.error('chat_messages insert (assistant) failed:', aErr.message)
  }

  // ── Refresh durable memory periodically (cheap, fast model) ─────────
  if (count >= 5 && count % 6 === 5) {
    const recent = [...ordered, ...(text.trim() ? [{ role: 'assistant', content: text }] : [])]
    await refreshSummary(supabase, user.id, recent.slice(-16), memory)
  }

  return NextResponse.json({ text, actions })
}
