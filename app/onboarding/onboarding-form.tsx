'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Dumbbell, Loader2 } from 'lucide-react'
import { EXPERIENCE, TRAINING_TYPES, type ExperienceValue } from '@/lib/profile-options'
import { saveProfile } from './actions'

export default function OnboardingForm({ initialName }: { initialName: string }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(initialName)
  const [experience, setExperience] = useState<ExperienceValue | ''>('')
  const [units, setUnits] = useState<'kg' | 'lbs'>('kg')
  const [trainingType, setTrainingType] = useState('powerlifting')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canContinue = step === 0 ? name.trim() !== '' && experience !== '' : true

  async function finish() {
    if (experience === '') return
    setSaving(true)
    setError(null)
    const res = await saveProfile({
      display_name: name,
      units,
      training_type: trainingType,
      experience,
    })
    if (!res.ok) {
      setSaving(false)
      setError(res.error)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg animate-fade-up">
        {/* Header */}
        <div className="mb-8 flex items-center gap-2.5 font-display text-lg font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-electric-400 to-electric-600 shadow-glow">
            <Dumbbell className="h-5 w-5 text-zinc-950" />
          </span>
          LiftMind
        </div>

        {/* Progress */}
        <div className="mb-6 flex items-center gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-electric-500' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        <div className="glass p-6 sm:p-8">
          {step === 0 ? (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold">Let&rsquo;s set you up</h1>
                <p className="mt-1 text-sm text-zinc-400">A couple of basics to tailor your coach.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  What should we call you?
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">Experience</label>
                <div className="grid gap-2">
                  {EXPERIENCE.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setExperience(o.value)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        experience === o.value
                          ? 'border-electric-500/60 bg-electric-500/10 shadow-glow'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/25'
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-medium">{o.label}</span>
                        <span className="block text-xs text-zinc-500">{o.desc}</span>
                      </span>
                      {experience === o.value && <Check className="h-4 w-4 text-electric-400" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold">Your training</h1>
                <p className="mt-1 text-sm text-zinc-400">You can change any of this later in Settings.</p>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">Units</label>
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
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">Primary focus</label>
                <div className="grid grid-cols-2 gap-2">
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
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          {/* Controls */}
          <div className="mt-8 flex items-center justify-between">
            {step === 1 ? (
              <button type="button" onClick={() => setStep(0)} className="btn-ghost">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <span />
            )}
            {step === 0 ? (
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setStep(1)}
                className="btn-primary"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" disabled={saving} onClick={finish} className="btn-primary">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Saving…' : 'Enter LiftMind'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
