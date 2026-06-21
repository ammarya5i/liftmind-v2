import type { SupabaseClient } from '@supabase/supabase-js'
import type Anthropic from '@anthropic-ai/sdk'
import { getAnthropic, MODELS } from './anthropic'

/**
 * Episodic memory (tier 2b). Distills the conversation into a compact, durable
 * note so the coach resumes across sessions without replaying the whole chat —
 * which also keeps per-message context (and cost) small. Uses the cheap fast
 * model. Non-fatal: a failure here never breaks the chat.
 */
export async function refreshSummary(
  supabase: SupabaseClient,
  userId: string,
  recent: { role: string; content: string }[],
  prevSummary: string | null,
): Promise<void> {
  const transcript = recent
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n')
    .slice(0, 6000)

  const system =
    'You maintain a compact long-term memory of a lifter for their AI coach. Given the prior memory and the latest conversation, return an UPDATED memory. Keep it under 150 words as terse, bullet-style notes. Capture ONLY durable facts: goals, injuries/limitations, available equipment, schedule, preferences, current programming focus, and notable recent PRs. Drop greetings, acknowledgements, and one-off chatter. Output only the memory.'

  const user = `Prior memory:\n${prevSummary ?? '(none yet)'}\n\nLatest conversation:\n${transcript}\n\nUpdated memory:`

  try {
    const res = await getAnthropic().messages.create({
      model: MODELS.fast,
      max_tokens: 300,
      system,
      messages: [{ role: 'user', content: user }],
    })
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
    if (text) {
      await supabase.from('session_summaries').insert({
        user_id: userId,
        summary: text,
        covers_to: new Date().toISOString(),
      })
    }
  } catch {
    // memory refresh is best-effort
  }
}
