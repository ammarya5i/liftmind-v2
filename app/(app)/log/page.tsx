import { createClient } from '@/lib/supabase/server'
import { sportProfile } from '@/lib/sport-profiles'
import type { Exercise, Units } from '@/lib/types'
import LogForm from './log-form'

export default async function LogPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: exercises }, profileRes] = await Promise.all([
    supabase.from('exercises').select('*').order('canonical_name'),
    user
      ? supabase.from('profiles').select('units, training_type').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const units: Units = (profileRes.data?.units as Units) ?? 'kg'
  const focusNames = sportProfile(profileRes.data?.training_type).focus ?? []

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Log a workout</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Each set writes to the normalized <code className="text-zinc-300">workout_sets</code> table.
        {focusNames.length > 0 && ' ★ marks your key lifts.'}
      </p>
      <LogForm exercises={(exercises ?? []) as Exercise[]} units={units} focusNames={focusNames} />
    </div>
  )
}
