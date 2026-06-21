'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Check, Loader2, Send, User, X } from 'lucide-react'
import { executeAction } from './actions'

type Msg = { id: string; role: 'user' | 'assistant'; content: string }
type Action = { id: string; name: string; input: Record<string, unknown> }

export default function CoachChat({ initial }: { initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial)
  const [pending, setPending] = useState<Action[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pending, sending])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setError(null)
    setInput('')
    setPending([])
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', content: text }])
    setSending(true)
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        return
      }
      if (data.text) {
        setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', content: data.text }])
      }
      if (Array.isArray(data.actions) && data.actions.length) setPending(data.actions)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setSending(false)
    }
  }

  async function confirm(action: Action) {
    setError(null)
    setPending((p) => p.filter((a) => a.id !== action.id))
    const res = await executeAction(action)
    setMessages((m) => [
      ...m,
      {
        id: `r-${Date.now()}`,
        role: 'assistant',
        content: res.ok ? `✅ ${res.summary}` : `⚠️ ${res.error}`,
      },
    ])
  }

  function decline(action: Action) {
    setPending((p) => p.filter((a) => a.id !== action.id))
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold">Coach</h1>
        <p className="text-sm text-zinc-400">
          Tell it what you trained — it logs, tracks PRs, and advises. You confirm before anything
          saves.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="glass mx-auto mt-10 max-w-md p-6 text-center text-sm text-zinc-400">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-electric-500/15 text-electric-400">
              <Bot className="h-6 w-6" />
            </span>
            Try <span className="text-zinc-200">“did 5×5 squat at 140, felt like RPE 8”</span> — or
            ask for a plan.
          </div>
        )}

        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} content={m.content} />
        ))}

        {pending.map((a) => (
          <ActionCard key={a.id} action={a} onConfirm={() => confirm(a)} onDecline={() => decline(a)} />
        ))}

        {sending && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Coach is thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          placeholder="What did you train?"
          className="input flex-1 resize-none"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="btn-primary h-[46px] px-4"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          isUser ? 'bg-forge-500/20 text-forge-300' : 'bg-electric-500/20 text-electric-300'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
          isUser ? 'bg-electric-600/20 text-zinc-100' : 'glass text-zinc-200'
        }`}
      >
        {content}
      </div>
    </div>
  )
}

function ActionCard({
  action,
  onConfirm,
  onDecline,
}: {
  action: Action
  onConfirm: () => void
  onDecline: () => void
}) {
  const [saving, setSaving] = useState(false)
  return (
    <div className="glass ml-11 max-w-[80%] border-electric-500/30 p-4 shadow-glow">
      <div className="text-xs font-semibold uppercase tracking-wide text-electric-300">
        {actionTitle(action)}
      </div>
      <div className="mt-2 space-y-1 text-sm text-zinc-200">{describeAction(action)}</div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => {
            setSaving(true)
            onConfirm()
          }}
          disabled={saving}
          className="btn-primary px-3 py-1.5 text-xs"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
        </button>
        <button onClick={onDecline} disabled={saving} className="btn-ghost px-3 py-1.5 text-xs">
          <X className="h-3 w-3" /> Discard
        </button>
      </div>
    </div>
  )
}

function actionTitle(a: Action) {
  if (a.name === 'log_workout') return 'Log workout'
  if (a.name === 'log_pr') return 'Log PR'
  if (a.name === 'update_profile') return 'Update profile'
  if (a.name === 'save_program') return 'Save program'
  return 'Action'
}

function describeAction(a: Action) {
  if (a.name === 'log_workout') {
    const exercises = (a.input.exercises as { exercise: string; sets: Record<string, unknown>[] }[]) ?? []
    return exercises.map((e, i) => (
      <div key={i}>
        <span className="font-medium">{e.exercise}</span>:{' '}
        {(e.sets ?? [])
          .map((s) => `${s.reps}×${s.weight}${s.is_warmup ? ' (wu)' : ''}`)
          .join(', ')}
      </div>
    ))
  }
  if (a.name === 'log_pr') {
    return (
      <div>
        <span className="font-medium">{String(a.input.exercise)}</span> — {String(a.input.weight)} ×{' '}
        {a.input.reps ? String(a.input.reps) : '1'}
      </div>
    )
  }
  if (a.name === 'update_profile') {
    return <div>{Object.entries(a.input).map(([k, v]) => `${k}: ${v}`).join(', ')}</div>
  }
  if (a.name === 'save_program') {
    const days = (a.input.days as { name: string; items: unknown[] }[]) ?? []
    return (
      <div>
        <span className="font-medium">{String(a.input.name)}</span> — {days.length} day
        {days.length === 1 ? '' : 's'}
      </div>
    )
  }
  return null
}
