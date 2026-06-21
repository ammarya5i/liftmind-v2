'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { EXPERIENCE, TRAINING_TYPES, type ExperienceValue } from '@/lib/profile-options'
import { saveProfile } from '@/app/onboarding/actions'

export interface SettingsInitial {
  display_name: string
  units: 'kg' | 'lbs'
  training_type: string
  experience: ExperienceValue
  email: string
}

export default function SettingsForm({ initial }: { initial: SettingsInitial }) {
  const router = useRouter()
  const [name, setName] = useState(initial.display_name)
  const [units, setUnits] = useState<'kg' | 'lbs'>(initial.units)
  const [trainingType, setTrainingType] = useState(initial.training_type)
  const [experience, setExperience] = useState<ExperienceValue>(initial.experience)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    const res = await saveProfile({ display_name: name, units, training_type: trainingType, experience })
    setSaving(false)
    if (!res.ok) return setError(res.error)
    setSaved(true)
    router.refresh()
  }

  return (
    <div className="mt-6 max-w-2xl space-y-6">
      <Field label="Email">
        <input value={initial.email} disabled className="input cursor-not-allowed opacity-60" />
      </Field>

      <Field label="Display name">
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Your name" />
      </Field>

      <Field label="Units">
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.02] p-1">
          {(['kg', 'lbs'] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnits(u)}
              className={`rounded-lg px-6 py-2 text-sm font-medium transition ${
                units === u ? 'bg-electric-500 text-white shadow-glow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Experience">
        <div className="grid gap-2 sm:grid-cols-3">
          {EXPERIENCE.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setExperience(o.value)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                experience === o.value
                  ? 'border-electric-500/60 bg-electric-500/10 shadow-glow'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/25'
              }`}
            >
              <span className="block text-sm font-medium">{o.label}</span>
              <span className="block text-xs text-zinc-500">{o.desc}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Primary focus">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TRAINING_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTrainingType(t.value)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                trainingType === t.value
                  ? 'border-electric-500/60 bg-electric-500/10 shadow-glow'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/25'
              }`}
            >
              <span className="block text-sm font-medium">{t.label}</span>
              <span className="block text-xs text-zinc-500">{t.desc}</span>
            </button>
          ))}
        </div>
      </Field>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="button" onClick={onSave} disabled={saving} className="btn-primary">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-electric-400">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  )
}
