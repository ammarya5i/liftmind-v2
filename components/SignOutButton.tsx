'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={signOut}
      className="rounded-md border border-zinc-700 px-2.5 py-1 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
    >
      Sign out
    </button>
  )
}
