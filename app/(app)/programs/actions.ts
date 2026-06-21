'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function deleteProgram(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const { error } = await supabase.from('programs').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/programs')
  return { ok: true }
}
