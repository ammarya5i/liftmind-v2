import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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

  // Force first-run setup before the app is usable.
  if (!profile?.experience) redirect('/onboarding')

  return (
    <AppShell email={user.email ?? ''} displayName={profile?.display_name ?? null}>
      {children}
    </AppShell>
  )
}
