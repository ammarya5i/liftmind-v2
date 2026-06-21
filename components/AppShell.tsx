'use client'

import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'

/**
 * Client shell that owns the sidebar collapse state so the main content's left
 * padding stays in sync. The layout stays a server component (it fetches the
 * user/profile and gates onboarding) and passes server-rendered children here.
 */
export default function AppShell({
  email,
  displayName,
  children,
}: {
  email: string
  displayName: string | null
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem('lm-sidebar') === 'collapsed')
  }, [])

  function toggle() {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('lm-sidebar', next ? 'collapsed' : 'expanded')
      return next
    })
  }

  return (
    <div
      className={`transition-[padding] duration-300 ease-in-out ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}
    >
      <Sidebar email={email} displayName={displayName} collapsed={collapsed} onToggle={toggle} />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">{children}</main>
    </div>
  )
}
