import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Brain, Database, Dumbbell, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const FEATURES = [
  {
    icon: Database,
    title: 'Normalized logs',
    body: 'One row per set against a real exercise dictionary — no JSON blobs, no substring matching.',
  },
  {
    icon: Target,
    title: 'One source of PRs',
    body: 'Personal records derive from your sets in SQL. They can never drift out of sync.',
  },
  {
    icon: Brain,
    title: 'Memory that sticks',
    body: 'A three-tier memory model so your coach recalls your goals, injuries, and history.',
  },
]

const PREVIEW = [
  { label: 'Competition total', value: '487.5', unit: 'kg', accent: true },
  { label: 'Sessions · 30d', value: '14', unit: '', accent: false },
  { label: 'Top e1RM', value: '185', unit: 'kg', accent: false },
]

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5 font-display text-lg font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-electric-400 to-electric-600 shadow-glow">
            <Dumbbell className="h-5 w-5 text-zinc-950" />
          </span>
          LiftMind
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary">
            Get started
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 text-center sm:pt-20">
        <div className="mb-6 inline-flex animate-fade-in">
          <span className="chip">
            <span className="h-1.5 w-1.5 rounded-full bg-electric-400" /> Rebuilt from scratch — v2
          </span>
        </div>
        <h1 className="mx-auto max-w-3xl animate-fade-up font-display text-5xl font-extrabold leading-[1.05] sm:text-6xl">
          The lifting log with a <span className="gradient-text">memory</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl animate-fade-up text-lg text-zinc-400">
          Normalized training data, one true source of PRs, and an AI coach that remembers your
          knees, your meet date, and your numbers.
        </p>
        <div className="mt-8 flex animate-fade-up items-center justify-center gap-3">
          <Link href="/signup" className="btn-primary">
            Start logging <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className="btn-ghost">
            I have an account
          </Link>
        </div>

        {/* Faux dashboard preview */}
        <div className="mx-auto mt-16 max-w-3xl animate-fade-up">
          <div className="glass grid grid-cols-3 gap-4 p-5 text-left">
            {PREVIEW.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="text-xs text-zinc-500">{s.label}</div>
                <div
                  className={`mt-2 font-display text-2xl font-bold sm:text-3xl ${
                    s.accent ? 'text-forge-400' : 'text-zinc-100'
                  }`}
                >
                  {s.value}
                  {s.unit && <span className="ml-1 text-sm text-zinc-500">{s.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-5 sm:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="glass glass-hover p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-electric-500/15 text-electric-400">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-zinc-400">{f.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-zinc-600">
        LiftMind v2 · built for lifters
      </footer>
    </div>
  )
}
