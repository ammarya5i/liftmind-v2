// Hand-written row types for the tables Phase 1 touches. Once a v2 Supabase
// project exists we can replace these with generated types
// (`supabase gen types typescript`), but these keep the app type-safe today.

export type Units = 'kg' | 'lbs'

export interface Exercise {
  id: string
  canonical_name: string
  category: string | null
  modality: string | null
  is_competition: boolean
  aliases: string[]
}

export interface Workout {
  id: string
  user_id: string
  performed_at: string // date (YYYY-MM-DD)
  session_rpe: number | null
  notes: string | null
  source: 'manual' | 'coach'
  created_at: string
}

export interface WorkoutSet {
  id: string
  workout_id: string
  exercise_id: string
  set_index: number
  reps: number
  weight: number
  rpe: number | null
  is_warmup: boolean
  completed: boolean
}

// Row shape of the personal_records VIEW.
export interface PersonalRecord {
  user_id: string
  exercise_id: string
  true_1rm: number | null
  est_1rm: number | null
}

export interface Profile {
  id: string
  display_name: string | null
  units: Units
  training_type: string
  experience: 'beginner' | 'intermediate' | 'advanced' | null
  created_at: string
}

export interface ProgramItem {
  exercise: string
  sets: number
  reps: string
  intensity?: string | null
  notes?: string | null
}

export interface ProgramDay {
  name: string
  items: ProgramItem[]
}

export interface Program {
  id: string
  user_id: string
  name: string
  notes: string | null
  days: ProgramDay[]
  source: string
  created_at: string
}
