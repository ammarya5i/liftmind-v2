'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="font-display text-3xl font-bold">Something went wrong</div>
      <p className="text-zinc-400">An unexpected error occurred.</p>
      <button onClick={reset} className="btn-primary">
        Try again
      </button>
    </div>
  )
}
