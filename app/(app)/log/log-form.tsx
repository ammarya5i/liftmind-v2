'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Exercise, Units } from '@/lib/types'
import { epley1RM, showsE1RM } from '@/lib/metrics'
import { createWorkout, type SetInput } from './actions'

type DraftSet = { reps: string; weight: string; rpe: string; is_warmup: boolean }
type Entry = { exercise_id: string; sets: DraftSet[] }

const emptySet = (): DraftSet => ({ reps: '', weight: '', rpe: '', is_warmup: false })

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function LogForm({
  exercises,
  units,
  focusNames,
}: {
  exercises: Exercise[]
  units: Units
  focusNames: string[]
}) {
  const router = useRouter()
  const [performedAt, setPerformedAt] = useState(today())
  const [sessionRpe, setSessionRpe] = useState('')
  const [notes, setNotes] = useState('')
  const [entries, setEntries] = useState<Entry[]>([
    { exercise_id: exercises[0]?.id ?? '', sets: [emptySet()] },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  function patchEntry(ei: number, patch: Partial<Entry>) {
    setEntries((prev) => prev.map((e, i) => (i === ei ? { ...e, ...patch } : e)))
  }
  function patchSet(ei: number, si: number, patch: Partial<DraftSet>) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === ei ? { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : e,
      ),
    )
  }

  function buildSets(): SetInput[] | { error: string } {
    const out: SetInput[] = []
    for (const entry of entries) {
      if (!entry.exercise_id) return { error: 'Pick an exercise for every block.' }
      let idx = 0
      for (const s of entry.sets) {
        const reps = Number(s.reps)
        const weight = s.weight === '' ? 0 : Number(s.weight)
        if (s.reps === '' && s.weight === '') continue // skip blank rows
        if (!Number.isFinite(reps) || reps < 1) return { error: 'Every set needs reps ≥ 1.' }
        if (!Number.isFinite(weight) || weight < 0) return { error: 'Weight must be 0 or more.' }
        const rpe = s.rpe === '' ? null : Number(s.rpe)
        if (rpe !== null && (!Number.isFinite(rpe) || rpe < 0 || rpe > 10))
          return { error: 'RPE must be between 0 and 10.' }
        out.push({
          exercise_id: entry.exercise_id,
          set_index: idx++,
          reps,
          weight,
          rpe,
          is_warmup: s.is_warmup,
        })
      }
    }
    if (out.length === 0) return { error: 'Add at least one set.' }
    return out
  }

  async function onSave() {
    setError(null)
    setDone(null)
    const built = buildSets()
    if ('error' in built) {
      setError(built.error)
      return
    }
    const rpe = sessionRpe === '' ? null : Number(sessionRpe)
    if (rpe !== null && (!Number.isFinite(rpe) || rpe < 0 || rpe > 10)) {
      setError('Session RPE must be between 0 and 10.')
      return
    }

    setSaving(true)
    const res = await createWorkout({
      performed_at: performedAt,
      session_rpe: rpe,
      notes: notes.trim() === '' ? null : notes.trim(),
      sets: built,
    })
    setSaving(false)

    if (!res.ok) {
      setError(res.error)
      return
    }
    setDone(`Saved ${res.setCount} set${res.setCount === 1 ? '' : 's'}.`)
    setEntries([{ exercise_id: exercises[0]?.id ?? '', sets: [emptySet()] }])
    setSessionRpe('')
    setNotes('')
    router.refresh()
  }

  if (exercises.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">
        No exercises found. Run <code className="text-zinc-300">supabase/seed/exercises.sql</code> against
        your database, then reload.
      </p>
    )
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Session header */}
      <div className="flex flex-wrap gap-4">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-400">Date</span>
          <input
            type="date"
            value={performedAt}
            onChange={(e) => setPerformedAt(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-electric-500"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-400">Session RPE</span>
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            placeholder="—"
            value={sessionRpe}
            onChange={(e) => setSessionRpe(e.target.value)}
            className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-electric-500"
          />
        </label>
      </div>

      {/* Exercise blocks */}
      {entries.map((entry, ei) => (
        <div key={ei} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center gap-3">
            <select
              value={entry.exercise_id}
              onChange={(e) => patchEntry(ei, { exercise_id: e.target.value })}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-electric-500"
            >
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.canonical_name}
                  {focusNames.includes(ex.canonical_name) ? ' ★' : ''}
                </option>
              ))}
            </select>
            {entries.length > 1 && (
              <button
                type="button"
                onClick={() => setEntries((prev) => prev.filter((_, i) => i !== ei))}
                className="text-xs text-zinc-500 hover:text-red-400"
              >
                Remove
              </button>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {entry.sets.map((s, si) => {
              const reps = Number(s.reps)
              const weight = s.weight === '' ? 0 : Number(s.weight)
              const e1rm =
                Number.isFinite(reps) && showsE1RM(reps, s.is_warmup) && weight > 0
                  ? epley1RM(weight, reps)
                  : null
              return (
                <div key={si} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="w-6 text-right text-xs text-zinc-600">{si + 1}</span>
                  <input
                    type="number"
                    min={1}
                    placeholder="reps"
                    value={s.reps}
                    onChange={(e) => patchSet(ei, si, { reps: e.target.value })}
                    className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 outline-none focus:border-electric-500"
                  />
                  <span className="text-zinc-600">×</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder={`weight (${units})`}
                    value={s.weight}
                    onChange={(e) => patchSet(ei, si, { weight: e.target.value })}
                    className="w-28 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 outline-none focus:border-electric-500"
                  />
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    placeholder="rpe"
                    value={s.rpe}
                    onChange={(e) => patchSet(ei, si, { rpe: e.target.value })}
                    className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 outline-none focus:border-electric-500"
                  />
                  <label className="flex items-center gap-1 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={s.is_warmup}
                      onChange={(e) => patchSet(ei, si, { is_warmup: e.target.checked })}
                    />
                    warmup
                  </label>
                  {e1rm !== null && (
                    <span className="text-xs text-electric-400">
                      ≈ {e1rm} {units} e1RM
                    </span>
                  )}
                  {entry.sets.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        patchEntry(ei, { sets: entry.sets.filter((_, j) => j !== si) })
                      }
                      className="text-xs text-zinc-600 hover:text-red-400"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => patchEntry(ei, { sets: [...entry.sets, emptySet()] })}
            className="mt-3 text-xs text-electric-400 hover:text-electric-300"
          >
            + Add set
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          setEntries((prev) => [...prev, { exercise_id: exercises[0]?.id ?? '', sets: [emptySet()] }])
        }
        className="rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500"
      >
        + Add exercise
      </button>

      {/* Notes */}
      <label className="block text-sm">
        <span className="mb-1 block text-zinc-400">Notes</span>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did it feel?"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-electric-500"
        />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {done && <p className="text-sm text-electric-400">{done}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-electric-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-electric-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save workout'}
        </button>
      </div>
    </div>
  )
}
