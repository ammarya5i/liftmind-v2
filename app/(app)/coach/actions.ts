'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createWorkout, type SetInput } from '@/app/(app)/log/actions'
import { saveProfile } from '@/app/onboarding/actions'
import type { ExperienceValue } from '@/lib/profile-options'

const setSchema = z.object({
  reps: z.number().int().min(1),
  weight: z.number().min(0),
  rpe: z.number().min(0).max(10).nullish(),
  is_warmup: z.boolean().optional(),
})

const actionSchema = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('log_workout'),
    input: z.object({
      performed_at: z.string().optional(),
      session_rpe: z.number().nullish(),
      notes: z.string().nullish(),
      exercises: z.array(z.object({ exercise: z.string(), sets: z.array(setSchema).min(1) })).min(1),
    }),
  }),
  z.object({
    name: z.literal('log_pr'),
    input: z.object({
      exercise: z.string(),
      weight: z.number().min(0),
      reps: z.number().int().min(1).optional(),
    }),
  }),
  z.object({
    name: z.literal('update_profile'),
    input: z.object({
      display_name: z.string().optional(),
      units: z.enum(['kg', 'lbs']).optional(),
      training_type: z.string().optional(),
      experience: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    }),
  }),
  z.object({
    name: z.literal('save_program'),
    input: z.object({
      name: z.string(),
      notes: z.string().nullish(),
      days: z
        .array(
          z.object({
            name: z.string(),
            items: z
              .array(
                z.object({
                  exercise: z.string(),
                  sets: z.number(),
                  reps: z.union([z.string(), z.number()]).transform((v) => String(v)),
                  intensity: z.string().nullish(),
                  notes: z.string().nullish(),
                }),
              )
              .min(1),
          }),
        )
        .min(1),
    }),
  }),
])

export type ExecuteResult = { ok: true; summary: string } | { ok: false; error: string }

const today = () => new Date().toISOString().slice(0, 10)

/**
 * Runs a coach-proposed action AFTER the user confirms it in the UI. Validates the
 * untrusted tool input with zod, resolves exercise names against the dictionary,
 * writes via the same server actions the manual UI uses, and records a chat note.
 */
export async function executeAction(raw: unknown): Promise<ExecuteResult> {
  const parsed = actionSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'That action wasn’t understood.' }
  const action = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You are not signed in.' }

  async function finish(summary: string): Promise<ExecuteResult> {
    await supabase.from('chat_messages').insert({ user_id: user!.id, role: 'assistant', content: `✅ ${summary}` })
    return { ok: true, summary }
  }

  if (action.name === 'log_workout' || action.name === 'log_pr') {
    const { data: exData } = await supabase.from('exercises').select('id, canonical_name, aliases')
    const exs = (exData ?? []) as { id: string; canonical_name: string; aliases: string[] }[]
    const resolve = (nameRaw: string) => {
      const n = nameRaw.trim().toLowerCase()
      return exs.find(
        (e) =>
          e.canonical_name.toLowerCase() === n ||
          (e.aliases ?? []).some((a) => a.toLowerCase() === n),
      )
    }

    if (action.name === 'log_pr') {
      const ex = resolve(action.input.exercise)
      if (!ex) return { ok: false, error: `I don’t recognize “${action.input.exercise}”.` }
      const reps = action.input.reps ?? 1
      const res = await createWorkout({
        performed_at: today(),
        session_rpe: 10,
        notes: 'PR via coach',
        source: 'coach',
        sets: [
          { exercise_id: ex.id, set_index: 0, reps, weight: action.input.weight, rpe: 10, is_warmup: false },
        ],
      })
      if (!res.ok) return { ok: false, error: res.error }
      return finish(`Logged ${ex.canonical_name} ${action.input.weight}×${reps} as a PR.`)
    }

    // log_workout
    const sets: SetInput[] = []
    let count = 0
    for (const e of action.input.exercises) {
      const ex = resolve(e.exercise)
      if (!ex) return { ok: false, error: `I don’t recognize “${e.exercise}”.` }
      e.sets.forEach((s, i) => {
        sets.push({
          exercise_id: ex.id,
          set_index: i,
          reps: s.reps,
          weight: s.weight,
          rpe: s.rpe ?? null,
          is_warmup: s.is_warmup ?? false,
        })
        count++
      })
    }
    const res = await createWorkout({
      performed_at: action.input.performed_at ?? today(),
      session_rpe: action.input.session_rpe ?? null,
      notes: action.input.notes ?? 'Logged via coach',
      source: 'coach',
      sets,
    })
    if (!res.ok) return { ok: false, error: res.error }
    return finish(`Logged ${action.input.exercises.length} exercise(s), ${count} sets.`)
  }

  if (action.name === 'save_program') {
    const { error } = await supabase.from('programs').insert({
      user_id: user.id,
      name: action.input.name,
      notes: action.input.notes ?? null,
      days: action.input.days,
      source: 'coach',
    })
    if (error) return { ok: false, error: error.message }
    const n = action.input.days.length
    return finish(`Saved program “${action.input.name}” (${n} day${n === 1 ? '' : 's'}).`)
  }

  // update_profile — merge over current values (the tool input is partial).
  const { data: cur } = await supabase
    .from('profiles')
    .select('display_name, units, training_type, experience')
    .eq('id', user.id)
    .single()
  const res = await saveProfile({
    display_name: action.input.display_name ?? cur?.display_name ?? '',
    units: action.input.units ?? ((cur?.units as 'kg' | 'lbs') ?? 'kg'),
    training_type: action.input.training_type ?? cur?.training_type ?? 'powerlifting',
    experience: action.input.experience ?? ((cur?.experience as ExperienceValue) ?? 'intermediate'),
  })
  if (!res.ok) return { ok: false, error: res.error }
  return finish('Profile updated.')
}
