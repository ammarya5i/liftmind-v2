'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface ProfileInput {
  display_name: string
  units: 'kg' | 'lbs'
  training_type: string
  experience: 'beginner' | 'intermediate' | 'advanced'
}

export type SaveProfileResult = { ok: true } | { ok: false; error: string }

/** Updates the signed-in user's profile (the row is auto-created on signup). */
export async function saveProfile(input: ProfileInput): Promise<SaveProfileResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You are not signed in.' }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: input.display_name.trim() || null,
      units: input.units,
      training_type: input.training_type,
      experience: input.experience,
    })
    .eq('id', user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/', 'layout')
  return { ok: true }
}
