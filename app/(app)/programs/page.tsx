import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Program } from '@/lib/types'
import DeleteProgramButton from './delete-button'

export default async function ProgramsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('programs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const programs = (data ?? []) as Program[]

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="font-display text-2xl font-bold">Programs</h1>
        <p className="mt-1 text-sm text-zinc-400">Plans your coach saved for you.</p>
      </div>

      {programs.length === 0 ? (
        <div className="glass animate-fade-up p-8 text-center text-sm text-zinc-400">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-electric-500/15 text-electric-400">
            <ClipboardList className="h-6 w-6" />
          </span>
          No programs yet. Ask the{' '}
          <Link href="/coach" className="text-electric-400 hover:text-electric-300">
            coach
          </Link>{' '}
          to build you one and hit Save.
        </div>
      ) : (
        <div className="space-y-5">
          {programs.map((p) => (
            <section key={p.id} className="glass glass-hover animate-fade-up p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{p.name}</h2>
                  {p.notes && <p className="mt-1 text-sm text-zinc-400">{p.notes}</p>}
                </div>
                <DeleteProgramButton id={p.id} />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(p.days ?? []).map((day, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="text-sm font-semibold text-electric-300">{day.name}</div>
                    <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                      {(day.items ?? []).map((it, j) => (
                        <li key={j} className="flex justify-between gap-3">
                          <span>{it.exercise}</span>
                          <span className="shrink-0 text-zinc-500">
                            {it.sets}×{it.reps}
                            {it.intensity ? ` · ${it.intensity}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
