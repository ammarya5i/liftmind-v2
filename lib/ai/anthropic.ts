import Anthropic from '@anthropic-ai/sdk'

// Lazy singleton so a missing key fails gracefully in the route (503) instead of
// throwing at module import.
let client: Anthropic | null = null
export function getAnthropic(): Anthropic {
  if (!client) client = new Anthropic() // reads ANTHROPIC_API_KEY from env
  return client
}

// Tiered routing seam (see the AI-architecture note): the fast lane is for cheap,
// frequent tasks; the coach lane is the reasoning model. The chat coach uses the
// reasoning lane. Verified current via the claude-api model list.
export const MODELS = {
  fast: 'claude-haiku-4-5',
  coach: 'claude-sonnet-4-6',
} as const
