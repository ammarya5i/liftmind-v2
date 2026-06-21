# LiftMind v2

AI fitness coaching for lifters — a clean rebuild of v1.

Built fresh 8 months after v1, designed around three ideas v1 got wrong:

1. **Normalized training data** — one row per set, a real exercise dictionary,
   and a single derived source of truth for PRs (no JSONB blobs, no substring
   matching, no four-divergent-1RM-implementations).
2. **A real memory model** — three tiers: structured logs, episodic session
   summaries, and semantic long-term memory (user facts/goals/injuries) via
   Supabase pgvector.
3. **One agentic AI layer** — Claude with native tool calling in a
   retrieve → reason → write loop. No prompt-and-regex action parsing.

## Stack

- **Next.js (App Router) + TypeScript**
- **Supabase** — Postgres + Auth + RLS + pgvector
- **Anthropic Claude** (`@anthropic-ai/sdk`) — the coach, server-side only
- **OpenAI `text-embedding-3-small`** — embeddings for semantic memory retrieval

## Planned structure

```
LiftMind_v2/
├─ app/
│  ├─ (auth)/login/          # sign in / sign up
│  ├─ log/                   # manual workout logging
│  ├─ coach/                 # AI chat coach
│  ├─ progress/              # analytics (Recharts)
│  └─ api/
│     └─ coach/route.ts      # Claude agent loop — server only, key never leaves here
├─ lib/
│  ├─ supabase/              # browser + server clients
│  ├─ ai/                    # claude client, tool definitions, the agent loop
│  ├─ memory/                # embed + pgvector retrieval + summarization
│  └─ metrics/               # ONE shared Epley / volume util
├─ components/ui/            # cleaned-up primitives (some reused from v1)
└─ supabase/
   ├─ schema.sql             # ← the schema (this is here now)
   └─ seed/exercises.sql     # exercise dictionary seed
```

## Build phases

- **Phase 0 — Foundation:** schema, auth, RLS, exercise seed. *(in progress)*
- **Phase 1 — Logbook:** manual logging + analytics from SQL. Usable with zero AI.
- **Phase 2 — Coach:** Claude tool-calling loop (`log_workout`/`log_pr`/`update_goal`).
- **Phase 3 — Memory:** episodic summaries + semantic pgvector retrieval.
- **Phase 4 — Vision:** form/progress photo analysis (with auth + rate limit).
- **Phase 5 — Depth:** real fatigue/deload detection, program generation.

> v1 lives in `../LiftMind_v1` as a frozen reference. It is not modified.
