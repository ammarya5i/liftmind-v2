'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AuthShell from '@/components/AuthShell'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmSent, setConfirmSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) return setError(error.message)
    if (!data.session) {
      // Email confirmation is on — no session yet.
      setConfirmSent(true)
      return
    }
    router.push('/onboarding')
    router.refresh()
  }

  if (confirmSent) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle="One quick step to secure your account."
        footer={
          <Link href="/login" className="font-medium text-electric-400 hover:text-electric-300">
            Back to sign in
          </Link>
        }
      >
        <div className="glass flex flex-col items-center gap-3 p-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-electric-500/15 text-electric-400">
            <MailCheck className="h-6 w-6" />
          </span>
          <p className="text-sm text-zinc-300">
            We sent a confirmation link to <span className="text-zinc-100">{email}</span>. Click it,
            then sign in.
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start logging in under a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-electric-400 hover:text-electric-300">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Password</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          {loading ? 'Creating…' : 'Create account'}
        </button>
        <p className="text-center text-xs text-zinc-500">
          Next: a few quick questions to set up your training profile.
        </p>
      </form>
    </AuthShell>
  )
}
