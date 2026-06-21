// One source of truth for how the dashboard adapts per training type.
// The dashboard stays a SINGLE file — it just reads this config to decide which
// metrics to headline and which lifts to feature. No per-sport page duplication.

export type MetricKey = 'sessions30' | 'perWeek' | 'volume30' | 'topE1rm' | 'reps30' | 'compTotal'

export interface SportProfile {
  blurb: string // short marketing-flavored tagline shown on the dashboard
  primary: MetricKey // which stat gets the accent
  stats: [MetricKey, MetricKey, MetricKey] // the three headline cards, in order
  focus?: string[] // canonical exercise names to feature as "key lifts"
  focusMode?: 'e1rm' | 'reps' // how to summarize a focus lift
}

export const SPORT_PROFILES: Record<string, SportProfile> = {
  powerlifting: {
    blurb: 'Squat · Bench · Deadlift',
    primary: 'compTotal',
    stats: ['compTotal', 'topE1rm', 'perWeek'],
    focus: ['Back Squat', 'Bench Press', 'Deadlift'],
    focusMode: 'e1rm',
  },
  bodybuilding: {
    blurb: 'Volume & hypertrophy',
    primary: 'volume30',
    stats: ['volume30', 'sessions30', 'perWeek'],
  },
  general_strength: {
    blurb: 'Strong & athletic',
    primary: 'topE1rm',
    stats: ['topE1rm', 'volume30', 'perWeek'],
  },
  crossfit: {
    blurb: 'Work capacity',
    primary: 'perWeek',
    stats: ['perWeek', 'sessions30', 'volume30'],
  },
  calisthenics: {
    blurb: 'Bodyweight mastery',
    primary: 'reps30',
    stats: ['reps30', 'sessions30', 'perWeek'],
    focus: ['Pull-up', 'Dip'],
    focusMode: 'reps',
  },
  endurance: {
    blurb: 'Consistency & engine',
    primary: 'perWeek',
    stats: ['perWeek', 'sessions30', 'volume30'],
  },
}

export function sportProfile(trainingType: string | null | undefined): SportProfile {
  return SPORT_PROFILES[trainingType ?? ''] ?? SPORT_PROFILES.general_strength
}

export interface Metrics {
  sessions30: number
  perWeek: number
  volume30: number
  topE1rm: number
  reps30: number
  compTotal: number
}

/** Maps a metric key + computed values to a display card (label/value/unit). */
export function metricCard(
  key: MetricKey,
  m: Metrics,
  units: string,
): { label: string; value: number | string; unit: string } {
  switch (key) {
    case 'sessions30':
      return { label: 'Sessions · 30d', value: m.sessions30, unit: '' }
    case 'perWeek':
      return { label: 'Sessions / week', value: m.perWeek, unit: '' }
    case 'volume30':
      return {
        label: 'Volume · 30d',
        value: m.volume30 >= 1000 ? `${Math.round(m.volume30 / 1000)}k` : Math.round(m.volume30),
        unit: m.volume30 > 0 ? units : '',
      }
    case 'topE1rm':
      return { label: 'Top e1RM', value: m.topE1rm > 0 ? m.topE1rm : '—', unit: m.topE1rm > 0 ? units : '' }
    case 'reps30':
      return { label: 'Reps · 30d', value: m.reps30, unit: '' }
    case 'compTotal':
      return { label: 'Competition total', value: m.compTotal > 0 ? m.compTotal : '—', unit: m.compTotal > 0 ? units : '' }
  }
}
