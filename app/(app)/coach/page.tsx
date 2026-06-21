import { createClient } from '@/lib/supabase/server'
import CoachChat from './coach-chat'

export default async function CoachPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('chat_messages')
    .select('id, role, content')
    .eq('user_id', user.id)
    .is('thread_id', null)
    .order('created_at', { ascending: true })
    .limit(100)

  const initial = ((data ?? []) as { id: string; role: string; content: string }[])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content }))

  return <CoachChat initial={initial} />
}
