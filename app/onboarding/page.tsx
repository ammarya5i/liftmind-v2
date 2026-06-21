import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingForm from './onboarding-form'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, experience')
    .eq('id', user.id)
    .single()

  // Already onboarded → straight to the app.
  if (profile?.experience) redirect('/dashboard')

  return <OnboardingForm initialName={profile?.display_name ?? ''} />
}
