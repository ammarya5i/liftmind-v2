import Link from 'next/link'
import { Dumbbell } from 'lucide-react'

/**
 * Split-screen auth layout: a branded gradient panel on the left (desktop),
 * the form on the right. Presentational only — login/signup pass their form in.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-electric-600/30 via-zinc-950 to-forge-600/20" />
        <div className="absolute inset-0 bg-grid opacity-40 [background-size:32px_32px]" />
        <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-electric-500/20 blur-3xl animate-pulse-glow" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-electric-400 to-electric-600 shadow-glow">
              <Dumbbell className="h-5 w-5 text-zinc-950" />
            </span>
            LiftMind
          </Link>

          <div className="max-w-md animate-fade-up">
            <h2 className="font-display text-4xl font-bold leading-[1.1]">
              Train smarter.
              <br />
              <span className="gradient-text">Remember everything.</span>
            </h2>
            <p className="mt-4 text-zinc-400">
              Normalized logs, one true source of PRs, and an AI coach that actually remembers your
              training — your knees, your meet date, your numbers.
            </p>
          </div>

          <div className="flex gap-10 text-sm text-zinc-500">
            <div>
              <div className="font-display text-2xl font-bold text-zinc-100">3-tier</div>
              memory
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-zinc-100">1</div>
              source of truth
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-zinc-100">0</div>
              JSON blobs
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-up">
          <Link href="/" className="mb-8 flex items-center gap-2 font-display text-lg font-bold lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-electric-400 to-electric-600">
              <Dumbbell className="h-4 w-4 text-zinc-950" />
            </span>
            LiftMind
          </Link>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <div className="mt-6 text-center text-sm text-zinc-400">{footer}</div>
        </div>
      </div>
    </div>
  )
}
