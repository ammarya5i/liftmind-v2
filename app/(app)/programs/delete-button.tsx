'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { deleteProgram } from './actions'

export default function DeleteProgramButton({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onDelete() {
    if (!confirm('Delete this program?')) return
    setBusy(true)
    await deleteProgram(id)
    setBusy(false)
    router.refresh()
  }

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      title="Delete program"
      className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-red-400"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  )
}
