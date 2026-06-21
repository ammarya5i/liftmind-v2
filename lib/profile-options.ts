// Shared option lists for onboarding + settings, so they never drift.

export const TRAINING_TYPES = [
  { value: 'powerlifting', label: 'Powerlifting', desc: 'Squat · bench · deadlift, max strength' },
  { value: 'bodybuilding', label: 'Bodybuilding', desc: 'Hypertrophy & physique' },
  { value: 'general_strength', label: 'General strength', desc: 'Strong and athletic' },
  { value: 'crossfit', label: 'CrossFit', desc: 'Mixed-modal conditioning' },
  { value: 'calisthenics', label: 'Calisthenics', desc: 'Bodyweight skill & strength' },
  { value: 'endurance', label: 'Endurance', desc: 'Run · bike · row' },
] as const

export const EXPERIENCE = [
  { value: 'beginner', label: 'Beginner', desc: 'Under a year' },
  { value: 'intermediate', label: 'Intermediate', desc: '1–3 years' },
  { value: 'advanced', label: 'Advanced', desc: '3+ years' },
] as const

export type ExperienceValue = (typeof EXPERIENCE)[number]['value']
