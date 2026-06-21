import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Dumbbell,
  Flame,
  Gauge,
  Layers,
  Repeat,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { setVolume } from '@/lib/metrics'
import { computeFatigue, type FatigueStatus } from '@/lib/fatigue'
import { metricCard, sportProfile, type Metrics, type MetricKey } from '@/lib/sport-profiles'
import type { Exercise, PersonalRecord, Units } from '@/lib/types'

const COMP = ['Back Squat', 'Bench Press', 'Deadlift']

const ICONS: Record<MetricKey, LucideIcon> = {
  sessions30: CalendarDays,
  perWeek: TrendingUp,
  volume30: Layers,
  topE1rm: Flame,
  reps30: Repeat,
  compTotal: Flame,
}

type SetRow = {
  reps: number
  weight: number
  is_warmup: boolean
  workouts: { performed_at: string } | null
  exercises: { canonical_name: string } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const since30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const since28 = new Date(Date.now() - 28 * 864e5).toISOString().slice(0, 10)
  const since14 = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)

  const [profileRes, prsRes, exRes, recentRes, count30Res, count28Res, setsRes, sessions14Res] =
    await Promise.all([
    supabase.from('profiles').select('display_name, units, training_type').eq('id', user.id).single(),
    supabase.from('personal_records').select('exercise_id, true_1rm, est_1rm, user_id').eq('user_id', user.id),
    supabase.from('exercises').select('id, canonical_name'),
    supabase
      .from('workouts')
      .select('id, performed_at, session_rpe, workout_sets(count)')
      .order('performed_at', { ascending: false })
      .limit(5),
    supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('performed_at', since30),
    supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('performed_at', since28),
    supabase
      .from('workout_sets')
      .select('reps, weight, is_warmup, workouts!inner(performed_at), exercises!inner(canonical_name)')
      .eq('completed', true),
    supabase
      .from('workouts')
      .select('performed_at, session_rpe')
      .eq('user_id', user.id)
      .gte('performed_at', since14),
  ])

  const units: Units = (profileRes.data?.units as Units) ?? 'kg'
  const name = profileRes.data?.display_name || 'Lifter'
  const profile = sportProfile(profileRes.data?.training_type)

  // Best e1RM per exercise (from the PR view).
  const exById = new Map<string, string>(
    ((exRes.data ?? []) as Pick<Exercise, 'id' | 'canonical_name'>[]).map((e) => [e.id, e.canonical_name]),
  )
  const bestByName = new Map<string, number>()
  for (const pr of (prsRes.data ?? []) as PersonalRecord[]) {
    const nm = exById.get(pr.exercise_id)
    const v = pr.est_1rm ?? pr.true_1rm ?? 0
    if (nm && v > 0) bestByName.set(nm, Math.max(bestByName.get(nm) ?? 0, v))
  }

  // Volume / reps / best-reps from normalized sets.
  const bestRepsByName = new Map<string, number>()
  const setVolumes: { date: string; volume: number }[] = []
  let volume30 = 0
  let reps30 = 0
  for (const r of (setsRes.data ?? []) as unknown as SetRow[]) {
    if (r.is_warmup || !r.workouts || !r.exercises) continue
    const name2 = r.exercises.canonical_name
    bestRepsByName.set(name2, Math.max(bestRepsByName.get(name2) ?? 0, r.reps))
    const v = setVolume(r.weight, r.reps)
    if (r.workouts.performed_at >= since14) setVolumes.push({ date: r.workouts.performed_at, volume: v })
    if (r.workouts.performed_at >= since30) {
      volume30 += v
      reps30 += r.reps
    }
  }

  const fatigue = computeFatigue({
    sessions: ((sessions14Res.data ?? []) as { performed_at: string; session_rpe: number | null }[]).map(
      (w) => ({ date: w.performed_at, rpe: w.session_rpe }),
    ),
    setVolumes,
  })
  const fatigueColor: Record<FatigueStatus, string> = {
    fresh: 'text-emerald-400',
    moderate: 'text-forge-400',
    high: 'text-red-400',
    unknown: 'text-zinc-400',
  }

  const metrics: Metrics = {
    sessions30: count30Res.count ?? 0,
    perWeek: Math.round(((count28Res.count ?? 0) / 4) * 10) / 10,
    volume30: Math.round(volume30),
    topE1rm: Math.max(0, ...bestByName.values()),
    reps30,
    compTotal: Math.round(COMP.reduce((s, n) => s + (bestByName.get(n) ?? 0), 0) * 10) / 10,
  }

  const recent =
    (recentRes.data as
      | { id: string; performed_at: string; session_rpe: number | null; workout_sets: { count: number }[] }[]
      | null) ?? []
  const hasData = recent.length > 0 || bestByName.size > 0 || metrics.sessions30 > 0

  const stats = profile.stats.map((k) => ({ ...metricCard(k, metrics, units), accent: k === profile.primary, Icon: ICONS[k] }))

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold">
            Good to see you, <span className="gradient-text">{name}</span>
          </h1>
          <span className="chip">{profile.blurb}</span>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {!hasData ? (
        <div className="glass animate-fade-up p-10 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-electric-500/20 to-forge-500/20 text-electric-400">
            <Dumbbell className="h-8 w-8" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold">Log your first session</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-400">
            Your stats, PRs, and trends fill in automatically as you log.
          </p>
          <Link href="/log" className="btn-primary mx-auto mt-6 w-fit">
            Log a workout <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* Readiness — deterministic fatigue/deload signal */}
          {fatigue.status !== 'unknown' && (
            <div className="glass animate-fade-up flex items-center gap-4 p-5">
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 ${fatigueColor[fatigue.status]}`}
              >
                <Gauge className="h-5 w-5" />
              </span>
              <div>
                <div className={`font-semibold ${fatigueColor[fatigue.status]}`}>
                  Readiness · {fatigue.label}
                </div>
                <div className="text-sm text-zinc-400">{fatigue.detail}</div>
              </div>
            </div>
          )}

          {/* Sport-adaptive stat cards */}
          <div className="grid animate-fade-up gap-4 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className={`glass glass-hover p-5 ${s.accent ? 'shadow-glow-forge' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{s.label}</span>
                  <s.Icon className={`h-4 w-4 ${s.accent ? 'text-forge-400' : 'text-electric-400'}`} />
                </div>
                <div className={`mt-3 font-display text-3xl font-bold ${s.accent ? 'text-forge-400' : 'text-zinc-100'}`}>
                  {s.value}
                  {s.unit && <span className="ml-1 text-base text-zinc-500">{s.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Sport-specific focus lifts */}
          {profile.focus && profile.focus.length > 0 && (
            <div className="animate-fade-up">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Key lifts</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {profile.focus.map((lift) => {
                  const val =
                    profile.focusMode === 'reps' ? (bestRepsByName.get(lift) ?? 0) : (bestByName.get(lift) ?? 0)
                  const unit = profile.focusMode === 'reps' ? 'reps' : units
                  return (
                    <div key={lift} className="glass p-5">
                      <div className="text-xs text-zinc-500">{lift}</div>
                      <div className="mt-2 font-display text-2xl font-bold">
                        {val > 0 ? val : '—'}
                        {val > 0 && <span className="ml-1 text-sm text-zinc-500">{unit}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid animate-fade-up gap-4 sm:grid-cols-2">
            <Link href="/log" className="glass glass-hover flex items-center gap-4 p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-electric-500/15 text-electric-400">
                <Dumbbell className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block font-medium">Log a workout</span>
                <span className="block text-sm text-zinc-500">Add today&rsquo;s sets</span>
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-500" />
            </Link>
            <Link href="/coach" className="glass glass-hover flex items-center gap-4 p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-electric-500/15 text-electric-400">
                <Bot className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block font-medium">Talk to your coach</span>
                <span className="block text-sm text-zinc-500">Log &amp; get advice by chat</span>
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-500" />
            </Link>
          </div>

          {/* Recent sessions */}
          <div className="animate-fade-up">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Recent sessions</h2>
              <Link href="/progress" className="text-sm text-electric-400 hover:text-electric-300">
                View progress →
              </Link>
            </div>
            <ul className="space-y-2">
              {recent.map((w) => (
                <li key={w.id} className="glass glass-hover flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-zinc-200">{w.performed_at}</span>
                  <span className="text-zinc-500">
                    {w.workout_sets?.[0]?.count ?? 0} sets
                    {w.session_rpe != null ? ` · RPE ${w.session_rpe}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
