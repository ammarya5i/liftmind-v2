import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="gradient-text font-display text-7xl font-bold">404</div>
      <p className="text-zinc-400">That page doesn’t exist.</p>
      <Link href="/" className="btn-primary">
        Back home
      </Link>
    </div>
  )
}
