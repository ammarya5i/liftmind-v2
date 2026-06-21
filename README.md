# LiftMind v2

AI fitness coaching for lifters — a clean rebuild of v1, designed around three
things v1 got wrong and now actually delivers on:

1. **Normalized training data** — one row per set, a real exercise dictionary with
   aliases, and a single derived source of truth for PRs (a SQL view). No JSONB
   blobs, no substring matching, no divergent 1RM implementations.
2. **A real memory model** — the coach keeps an episodic summary of your training
   so it resumes across sessions without you re-explaining.
3. **One agentic AI layer** — Claude with native tool calling in a
   retrieve → reason → write loop, gated by a confirm step. No prompt-and-regex
   action parsing.

## Features

- **Logbook** — manual workout logging into normalized `workout_sets`, live e1RM
  preview, with the `personal_records` view as the one source of truth for PRs.
- **Analytics** — a **sport-adaptive** dashboard (a powerlifter sees competition
  total + SBD; a calisthenics lifter sees reps; etc., all from one config — no
  per-sport pages), plus e1RM trends, weekly volume, and top exercises by volume.
- **Readiness** — a deterministic fatigue/deload signal from RPE + frequency +
  volume trends (computed in code; the coach talks about it, never guesses it).
- **AI Coach** — Claude (`claude-sonnet-4-6`) with tool calling
  (`log_workout` / `log_pr` / `update_profile` / `save_program`), a confirm-gate
  before anything writes, episodic memory, and fatigue-aware advice.
- **Programs** — plans the coach builds, saved and viewable.
- **Accounts & safety** — Supabase Auth + RLS, email/password with reset, a
  per-user coach rate limit (cost guard), change password, export data, delete
  account.

## Stack

- **Next.js (App Router) + TypeScript**, Turbopack
- **Supabase** — Postgres + Auth + RLS (+ pgvector, reserved for semantic memory)
- **Anthropic Claude** (`@anthropic-ai/sdk`) — the coach, server-side only
  - Tiered by task: Sonnet for coaching, Haiku for cheap summarization
- **Recharts** + Tailwind CSS

## Project structure

```
app/
├─ page.tsx                  # marketing landing (→ /dashboard if signed in)
├─ login/ signup/            # split auth
├─ forgot-password/ reset-password/
├─ onboarding/               # first-run profile setup (gated)
├─ (app)/                    # signed-in shell (collapsible left sidebar)
│  ├─ dashboard/  log/  progress/  programs/  coach/  settings/
└─ api/coach/route.ts        # Claude agent loop — server only
lib/
├─ supabase/                 # browser + server + middleware clients
├─ ai/                       # claude client (tiered models) + episodic memory
├─ metrics.ts  fatigue.ts    # one Epley util; deterministic readiness signal
├─ sport-profiles.ts         # per-sport dashboard config (one file, not N pages)
└─ types.ts  profile-options.ts
components/                  # AppShell, Sidebar, AuthShell
supabase/
├─ schema.sql                # normalized schema + personal_records view + RLS
├─ seed/exercises.sql        # exercise dictionary
└─ migrations/               # account deletion, programs
docs/ROADMAP.md              # deferred phases (nutrition, calendar, …)
```

## Running locally

See [SETUP.md](SETUP.md) — create a Supabase project, run `schema.sql` + the
seed + the migrations, fill `.env.local`, then:

```bash
npm install
npm run dev
```

Required env (server reads `ANTHROPIC_API_KEY`; the rest are RLS-safe public keys):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
ANTHROPIC_API_KEY=
```

## Deploying

See [DEPLOY.md](DEPLOY.md) — Vercel + Supabase, ~10 minutes.

## Roadmap

Built so far: logbook, analytics, coach (tool-calling + memory + fatigue),
programs, auth hardening. Deferred work — nutrition/calorie logging, calendar,
reminders, semantic (pgvector) memory, and vision/form-check (via pose
estimation) — is captured in [docs/ROADMAP.md](docs/ROADMAP.md).

> v1 lives in `../LiftMind_v1` as a frozen "before" reference. It is not modified.
