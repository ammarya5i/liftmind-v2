'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Download, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AccountActions() {
  const router = useRouter()

  // ── Change password ──────────────────────────────────────────────
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<string | null>(null)
  const [pwErr, setPwErr] = useState<string | null>(null)

  async function changePassword() {
    setPwErr(null)
    setPwMsg(null)
    if (pw.length < 6) return setPwErr('At least 6 characters.')
    if (pw !== pw2) return setPwErr('Passwords don’t match.')
    setPwSaving(true)
    const { error } = await createClient().auth.updateUser({ password: pw })
    setPwSaving(false)
    if (error) return setPwErr(error.message)
    setPw('')
    setPw2('')
    setPwMsg('Password updated.')
  }

  // ── Export data ──────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false)
  async function exportData() {
    setExporting(true)
    const s = createClient()
    const [profile, workouts, sets, chat, summaries] = await Promise.all([
      s.from('profiles').select('*').maybeSingle(),
      s.from('workouts').select('*'),
      s.from('workout_sets').select('*'),
      s.from('chat_messages').select('*'),
      s.from('session_summaries').select('*'),
    ])
    const payload = {
      exported_at: new Date().toISOString(),
      profile: profile.data,
      workouts: workouts.data,
      workout_sets: sets.data,
      chat_messages: chat.data,
      session_summaries: summaries.data,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'liftmind-export.json'
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  // ── Delete account ───────────────────────────────────────────────
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [delErr, setDelErr] = useState<string | null>(null)
  async function deleteAccount() {
    if (confirmText !== 'DELETE') return
    setDeleting(true)
    setDelErr(null)
    const s = createClient()
    const { error } = await s.rpc('delete_current_user')
    if (error) {
      setDeleting(false)
      setDelErr(error.message)
      return
    }
    await s.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="mt-10 max-w-2xl space-y-6">
      <h2 className="font-display text-xl font-bold">Account</h2>

      {/* Change password */}
      <section className="glass p-5">
        <h3 className="text-sm font-semibold">Change password</h3>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="New password"
            className="input"
          />
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Confirm"
            className="input"
          />
          <button onClick={changePassword} disabled={pwSaving} className="btn-primary shrink-0">
            {pwSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Update
          </button>
        </div>
        {pwErr && <p className="mt-2 text-sm text-red-400">{pwErr}</p>}
        {pwMsg && (
          <p className="mt-2 inline-flex items-center gap-1 text-sm text-electric-400">
            <Check className="h-4 w-4" /> {pwMsg}
          </p>
        )}
      </section>

      {/* Export */}
      <section className="glass flex items-center justify-between p-5">
        <div>
          <h3 className="text-sm font-semibold">Export your data</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Download everything — profile, workouts, sets, chat — as JSON.
          </p>
        </div>
        <button onClick={exportData} disabled={exporting} className="btn-ghost shrink-0">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export
        </button>
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-5">
        <h3 className="text-sm font-semibold text-red-300">Delete account</h3>
        <p className="mt-0.5 text-xs text-zinc-400">
          Permanently deletes your account and all data. This can&rsquo;t be undone. Type{' '}
          <span className="font-mono text-zinc-200">DELETE</span> to confirm.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="input"
          />
          <button
            onClick={deleteAccount}
            disabled={deleting || confirmText !== 'DELETE'}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600/90 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete forever
          </button>
        </div>
        {delErr && <p className="mt-2 text-sm text-red-400">{delErr}</p>}
      </section>
    </div>
  )
}
