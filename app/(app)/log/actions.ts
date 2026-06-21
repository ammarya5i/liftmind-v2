'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface SetInput {
  exercise_id: string
  set_index: number
  reps: number
  weight: number
  rpe: number | null
  is_warmup: boolean
}

export interface WorkoutInput {
  performed_at: string
  session_rpe: number | null
  notes: string | null
  sets: SetInput[]
  source?: 'manual' | 'coach'
}

export type CreateWorkoutResult =
  | { ok: true; id: string; setCount: number }
  | { ok: false; error: string }

/**
 * Inserts a workout header + its sets. RLS scopes everything to the signed-in
 * user. If the sets insert fails we delete the orphan header so we never leave
 * a half-written workout behind. (A SQL function would make this a single
 * transaction; the coach in Phase 3 will reuse one — for now this is enough.)
 */
export async function createWorkout(input: WorkoutInput): Promise<CreateWorkoutResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You are not signed in.' }

  if (input.sets.length === 0) return { ok: false, error: 'Add at least one set before saving.' }

  const { data: workout, error: wErr } = await supabase
    .from('workouts')
    .insert({
      user_id: user.id,
      performed_at: input.performed_at,
      session_rpe: input.session_rpe,
      notes: input.notes,
      source: input.source ?? 'manual',
    })
    .select('id')
    .single()

  if (wErr || !workout) {
    return { ok: false, error: wErr?.message ?? 'Could not create the workout.' }
  }

  const rows = input.sets.map((s) => ({
    workout_id: workout.id,
    exercise_id: s.exercise_id,
    set_index: s.set_index,
    reps: s.reps,
    weight: s.weight,
    rpe: s.rpe,
    is_warmup: s.is_warmup,
    completed: true,
  }))

  const { error: sErr } = await supabase.from('workout_sets').insert(rows)
  if (sErr) {
    await supabase.from('workouts').delete().eq('id', workout.id) // compensate
    return { ok: false, error: sErr.message }
  }

  revalidatePath('/progress')
  revalidatePath('/log')
  return { ok: true, id: workout.id, setCount: rows.length }
}
