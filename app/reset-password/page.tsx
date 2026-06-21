'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AuthShell from '@/components/AuthShell'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (pw.length < 6) return setError('At least 6 characters.')
    setLoading(true)
    // The recovery link from the email establishes a session in the browser;
    // updateUser then sets the new password for that user.
    const { error } = await createClient().auth.updateUser({ password: pw })
    setLoading(false)
    if (error) return setError(error.message)
    setDone(true)
    setTimeout(() => {
      router.push('/login')
      router.refresh()
    }, 1500)
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose something you’ll remember."
      footer={
        <Link href="/login" className="font-medium text-electric-400 hover:text-electric-300">
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <p className="inline-flex items-center gap-2 text-sm text-electric-400">
          <Check className="h-4 w-4" /> Password updated — taking you to sign in…
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">New password</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                required
                minLength={6}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="At least 6 characters"
                className="input pr-11"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                tabIndex={-1}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
