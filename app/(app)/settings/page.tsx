import { createClient } from '@/lib/supabase/server'
import type { ExperienceValue } from '@/lib/profile-options'
import SettingsForm from './settings-form'
import AccountActions from './account-actions'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, units, training_type, experience')
    .eq('id', user.id)
    .single()

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-zinc-400">Your training profile — the coach reads this.</p>
      <SettingsForm
        initial={{
          display_name: profile?.display_name ?? '',
          units: (profile?.units as 'kg' | 'lbs') ?? 'kg',
          training_type: profile?.training_type ?? 'powerlifting',
          experience: (profile?.experience as ExperienceValue) ?? 'intermediate',
          email: user.email ?? '',
        }}
      />
      <AccountActions />
    </div>
  )
}
