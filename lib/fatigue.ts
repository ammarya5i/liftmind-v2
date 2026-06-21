// Deterministic readiness/fatigue signal — computed from the lifter's own data,
// NOT an LLM guess. The coach reads the result and talks about it. Transparent
// heuristic: rising session RPE, high frequency, or a volume spike → more fatigue.

export type FatigueStatus = 'unknown' | 'fresh' | 'moderate' | 'high'

export interface Fatigue {
  status: FatigueStatus
  label: string
  detail: string
}

export interface FatigueInput {
  sessions: { date: string; rpe: number | null }[]
  setVolumes?: { date: string; volume: number }[]
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 864e5).toISOString().slice(0, 10)
}

export function computeFatigue({ sessions, setVolumes = [] }: FatigueInput): Fatigue {
  const d7 = daysAgo(6) // last 7 days, inclusive of today
  const d8 = daysAgo(7)
  const d14 = daysAgo(13)

  const last7 = sessions.filter((s) => s.date >= d7)
  const last14 = sessions.filter((s) => s.date >= d14)
  if (last14.length < 3) {
    return {
      status: 'unknown',
      label: 'Building baseline',
      detail: 'Log a few more sessions to gauge readiness.',
    }
  }

  const rpes = last7.map((s) => s.rpe).filter((r): r is number => r != null)
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 0
  const sessions7 = last7.length

  const vol7 = setVolumes.filter((v) => v.date >= d7).reduce((a, b) => a + b.volume, 0)
  const volPrev7 = setVolumes
    .filter((v) => v.date >= d14 && v.date <= d8)
    .reduce((a, b) => a + b.volume, 0)
  const ratio = volPrev7 > 0 ? vol7 / volPrev7 : 1

  const parts = [`${sessions7} session${sessions7 === 1 ? '' : 's'} this week`]
  if (avgRpe > 0) parts.push(`avg RPE ${avgRpe.toFixed(1)}`)
  if (volPrev7 > 0 && ratio >= 1.25) parts.push(`volume +${Math.round((ratio - 1) * 100)}% vs last week`)
  const detail = parts.join(' · ')

  if (avgRpe >= 8.5 || sessions7 >= 6 || ratio >= 1.5) {
    return { status: 'high', label: 'High fatigue', detail: `${detail}. Consider a lighter day or a deload.` }
  }
  if (avgRpe >= 7.5 || sessions7 >= 5 || ratio >= 1.25) {
    return { status: 'moderate', label: 'Moderate load', detail: `${detail}. Manageable — watch recovery.` }
  }
  return { status: 'fresh', label: 'Fresh', detail: `${detail}. Good to push.` }
}
