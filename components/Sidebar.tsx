'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Bot,
  ChevronsLeft,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/log', label: 'Log workout', icon: Dumbbell },
  { href: '/progress', label: 'Progress', icon: LineChart },
  { href: '/programs', label: 'Programs', icon: ClipboardList },
  { href: '/coach', label: 'Coach', icon: Bot },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({
  email,
  displayName,
  collapsed = false,
  onToggle,
}: {
  email: string
  displayName: string | null
  collapsed?: boolean
  onToggle?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = (displayName || email || '?').charAt(0).toUpperCase()

  // Labels fade as the panel clips them — `c` is the collapsed state for the surface.
  const label = (c: boolean) =>
    `whitespace-nowrap transition-opacity duration-200 ${c ? 'opacity-0' : 'opacity-100'}`

  // Fixed-width inner content. The desktop <aside> animates its own width and
  // clips this with overflow-hidden, so the panel glides instead of reflowing.
  function Content({ c }: { c: boolean }) {
    return (
      <div className="flex h-full w-64 flex-col gap-3 p-3">
        <Link
          href="/dashboard"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 px-1 pt-1 font-display text-lg font-bold"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-electric-400 to-electric-600 shadow-glow">
            <Dumbbell className="h-4 w-4 text-zinc-950" />
          </span>
          <span className={label(c)}>LiftMind</span>
        </Link>

        <Link
          href="/log"
          onClick={() => setOpen(false)}
          title="Log workout"
          className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-electric-500 to-electric-600 px-3 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:from-electric-400 hover:to-electric-500 active:scale-[0.98]"
        >
          <Dumbbell className="h-4 w-4 shrink-0" />
          <span className={label(c)}>Log workout</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label: text, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                title={text}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-electric-500/15 text-electric-300 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-electric-400' : ''}`} />
                <span className={label(c)}>{text}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          <div className="flex items-center gap-3 px-1 py-1">
            <span
              title={email}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-forge-400 to-forge-600 text-sm font-bold text-zinc-950"
            >
              {initial}
            </span>
            <div className={`min-w-0 ${label(c)}`}>
              <div className="truncate text-sm font-medium text-zinc-100">{displayName || 'Lifter'}</div>
              <div className="truncate text-xs text-zinc-500">{email}</div>
            </div>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-red-400"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className={label(c)}>Sign out</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-zinc-950/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-display text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-electric-400 to-electric-600 shadow-glow">
            <Dumbbell className="h-4 w-4 text-zinc-950" />
          </span>
          LiftMind
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-zinc-300 transition hover:bg-white/5"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 border-r border-white/10 bg-zinc-950">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-2 top-3 z-10 rounded-lg p-2 text-zinc-400 hover:bg-white/5"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <Content c={false} />
          </div>
        </div>
      )}

      {/* Desktop sidebar — animates width and clips the fixed-width content */}
      <aside
        className={`fixed left-0 top-0 z-30 hidden h-screen overflow-hidden border-r border-white/10 bg-zinc-950/60 backdrop-blur-xl transition-[width] duration-300 ease-in-out lg:block ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <Content c={collapsed} />
        {onToggle && (
          <button
            onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="absolute right-2 top-3 z-20 rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
          >
            <ChevronsLeft
              className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </aside>
    </>
  )
}
