import Link from 'next/link'
import { CalendarDays, Dumbbell, Flame, Layers } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { epley1RM, setVolume, showsE1RM } from '@/lib/metrics'
import type { Exercise, PersonalRecord, Units } from '@/lib/types'
import E1rmChart from './e1rm-chart'
import VolumeChart from './volume-chart'

type SetRow = {
  reps: number
  weight: number
  is_warmup: boolean
  workouts: { performed_at: string } | null
  exercises: { canonical_name: string } | null
}

function weekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - dow)
  return d.toISOString().slice(0, 10)
}

function shortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function ProgressPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const since30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const since28 = new Date(Date.now() - 28 * 864e5).toISOString().slice(0, 10)

  const [profileRes, prsRes, exRes, workoutsRes, setsRes] = await Promise.all([
    supabase.from('profiles').select('units').eq('id', user.id).single(),
    supabase.from('personal_records').select('exercise_id, true_1rm, est_1rm, user_id').eq('user_id', user.id),
    supabase.from('exercises').select('id, canonical_name'),
    supabase
      .from('workouts')
      .select('id, performed_at, session_rpe, workout_sets(count)')
      .order('performed_at', { ascending: false })
      .limit(60),
    supabase
      .from('workout_sets')
      .select('reps, weight, is_warmup, workouts!inner(performed_at), exercises!inner(canonical_name)')
      .eq('completed', true),
  ])

  const units: Units = (profileRes.data?.units as Units) ?? 'kg'

  // ── Personal records (the view = source of truth), best first ──────
  const exById = new Map<string, string>(
    ((exRes.data ?? []) as Pick<Exercise, 'id' | 'canonical_name'>[]).map((e) => [e.id, e.canonical_name]),
  )
  const prs = ((prsRes.data ?? []) as PersonalRecord[])
    .map((pr) => ({ ...pr, name: exById.get(pr.exercise_id) }))
    .filter((pr): pr is PersonalRecord & { name: string } => Boolean(pr.name))
    .sort((a, b) => (b.est_1rm ?? b.true_1rm ?? 0) - (a.est_1rm ?? a.true_1rm ?? 0))
  const topE1rm = prs.length ? (prs[0].est_1rm ?? prs[0].true_1rm ?? 0) : 0

  // ── Derive analytics from normalized sets (sport-agnostic) ─────────
  const rows = ((setsRes.data ?? []) as unknown as SetRow[]).filter((r) => r.workouts && r.exercises)

  const volByWeek = new Map<string, number>()
  const volByExercise = new Map<string, number>()
  const e1rmByExDate = new Map<string, Map<string, number>>() // exercise -> (date -> best e1RM)
  let volume30 = 0

  for (const r of rows) {
    if (r.is_warmup) continue
    const date = r.workouts!.performed_at
    const name = r.exercises!.canonical_name

    const vol = setVolume(r.weight, r.reps)
    volByExercise.set(name, (volByExercise.get(name) ?? 0) + vol)
    volByWeek.set(weekStart(date), (volByWeek.get(weekStart(date)) ?? 0) + vol)
    if (date >= since30) volume30 += vol

    if (showsE1RM(r.reps, false)) {
      const e = epley1RM(r.weight, r.reps)
      if (e > 0) {
        const m = e1rmByExDate.get(name) ?? new Map<string, number>()
        m.set(date, Math.max(m.get(date) ?? 0, e))
        e1rmByExDate.set(name, m)
      }
    }
  }

  const topExercises = [...volByExercise.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, volume]) => ({ name, volume: Math.round(volume) }))
  const maxVol = topExercises[0]?.volume ?? 1

  // e1RM trend for the lifter's top exercises that have ≥2 dated points
  const focus = topExercises
    .map((e) => e.name)
    .filter((n) => (e1rmByExDate.get(n)?.size ?? 0) >= 2)
    .slice(0, 3)
  const focusDates = new Set<string>()
  focus.forEach((n) => e1rmByExDate.get(n)!.forEach((_v, d) => focusDates.add(d)))
  const e1rmSeries = [...focusDates].sort().map((date) => {
    const rec: Record<string, number | string> = { date: shortDate(date) }
    focus.forEach((n) => {
      const v = e1rmByExDate.get(n)!.get(date)
      if (v != null) rec[n] = v
    })
    return rec
  })

  const weeklyVolume = [...volByWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([wk, volume]) => ({ week: shortDate(wk), volume: Math.round(volume) }))

  // ── Sessions ───────────────────────────────────────────────────────
  const workouts =
    (workoutsRes.data as
      | { id: string; performed_at: string; session_rpe: number | null; workout_sets: { count: number }[] }[]
      | null) ?? []
  const sessions30 = workouts.filter((w) => w.performed_at >= since30).length
  const perWeek = Math.round((workouts.filter((w) => w.performed_at >= since28).length / 4) * 10) / 10

  const hasData = workouts.length > 0 || prs.length > 0

  const stats = [
    { label: 'Sessions · 30d', value: sessions30, unit: '', icon: CalendarDays, accent: false },
    {
      label: 'Volume · 30d',
      value: volume30 >= 1000 ? `${Math.round(volume30 / 1000)}k` : Math.round(volume30),
      unit: units,
      icon: Layers,
      accent: false,
    },
    { label: 'Top e1RM', value: topE1rm > 0 ? topE1rm : '—', unit: topE1rm > 0 ? units : '', icon: Flame, accent: true },
    { label: 'Sessions / week', value: perWeek, unit: '', icon: Dumbbell, accent: false },
  ]

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="font-display text-2xl font-bold">Progress</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Computed in SQL from <code className="text-zinc-300">workout_sets</code> — PRs via the{' '}
          <code className="text-zinc-300">personal_records</code> view.
        </p>
      </div>

      {!hasData && (
        <div className="glass animate-fade-up p-8 text-center text-sm text-zinc-500">
          Nothing logged yet.{' '}
          <Link href="/log" className="text-electric-400 hover:text-electric-300">
            Log your first workout →
          </Link>
        </div>
      )}

      {hasData && (
        <>
          {/* Stat cards */}
          <div className="grid animate-fade-up gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className={`glass glass-hover p-5 ${s.accent ? 'shadow-glow-forge' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{s.label}</span>
                    <Icon className={`h-4 w-4 ${s.accent ? 'text-forge-400' : 'text-electric-400'}`} />
                  </div>
                  <div className={`mt-3 font-display text-2xl font-bold ${s.accent ? 'text-forge-400' : 'text-zinc-100'}`}>
                    {s.value}
                    {s.unit && <span className="ml-1 text-sm text-zinc-500">{s.unit}</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* e1RM trend — top exercises by volume */}
          {e1rmSeries.length > 1 && focus.length > 0 && (
            <section className="animate-fade-up">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Estimated 1RM over time
              </h2>
              <E1rmChart data={e1rmSeries} lifts={focus} units={units} />
            </section>
          )}

          {/* Weekly volume */}
          {weeklyVolume.length > 1 && (
            <section className="animate-fade-up">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Weekly volume
              </h2>
              <VolumeChart data={weeklyVolume} units={units} />
            </section>
          )}

          {/* Top exercises by volume */}
          {topExercises.length > 0 && (
            <section className="glass animate-fade-up p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Top exercises by volume
              </h2>
              <div className="space-y-3">
                {topExercises.map((e) => (
                  <div key={e.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-200">{e.name}</span>
                      <span className="text-zinc-500">
                        {e.volume.toLocaleString()} {units}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-electric-500 to-electric-400"
                        style={{ width: `${(e.volume / maxVol) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Personal records */}
          {prs.length > 0 && (
            <section className="animate-fade-up">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Personal records
              </h2>
              <div className="overflow-hidden rounded-xl border border-zinc-800">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900/60 text-left text-xs text-zinc-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Exercise</th>
                      <th className="px-4 py-2 font-medium">True 1RM</th>
                      <th className="px-4 py-2 font-medium">Est. 1RM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prs.map((pr) => (
                      <tr key={pr.exercise_id} className="border-t border-zinc-800 transition-colors hover:bg-white/[0.02]">
                        <td className="px-4 py-2">{pr.name}</td>
                        <td className="px-4 py-2 text-zinc-300">
                          {pr.true_1rm != null ? `${pr.true_1rm} ${units}` : '—'}
                        </td>
                        <td className="px-4 py-2 text-zinc-300">
                          {pr.est_1rm != null ? `${pr.est_1rm} ${units}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
