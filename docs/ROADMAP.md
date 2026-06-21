# LiftMind v2 — Roadmap (deferred phases)

Captures work we've **decided to do later**, with the context/decisions behind each
so we can pick it up without re-litigating. Living doc — update as things land.

## Status snapshot (done)
- Foundation + auth + onboarding (profile: name, units, training_type, experience)
- Logbook — manual logging → normalized `workout_sets`
- Analytics — `/progress` dashboard (stat cards, e1RM trend, weekly volume, top exercises, PRs)
- Coach — Claude (`claude-sonnet-4-6`) tool-calling (`log_workout`/`log_pr`/`update_profile`),
  confirm gate, asks-like-a-coach personality
- Memory — episodic summaries via Haiku (`session_summaries`), resumes across sessions

---

## Deferred / future phases

### A. Training-type adaptation  (small, pre-deployment candidate)
The dashboard/analytics are currently hardcoded to powerlifting (competition total = SBD,
e1RM trend = `is_competition` lifts); only the coach adapts. **Decision: ONE adaptive page,
not per-sport pages** (v1's 5 metric calculators were sprawl). Keep universal metrics (volume,
sessions, frequency, top exercises) for all; swap only the headline metric + primary chart's
focus lifts via a thin config keyed on `training_type`. Port v1's `getPrimaryExercises(type)`.

### B. Training depth  (original Phase 6)
- Deterministic fatigue/deload signals computed in SQL from RPE + volume trends (NOT an LLM
  guess — the coach *reads* the numbers and talks about them).
- Persist coach-generated programs (a `programs` table) so plans are saved, not just chatted.

### C. Nutrition / food + calorie logging  (BIG — its own multi-step phase)
This roughly doubles the app and shifts identity from "lifting coach" → "fitness platform."
Deliberate pivot, not a bolt-on. **First decision (shapes the whole build): the food-data
source** — free USDA FoodData Central vs. a paid API (Nutritionix / Edamam). Then:
- Schema: `foods` (or external API), `food_logs` (per-day entries), `nutrition_targets`
  (daily macro/calorie goals on the profile).
- UI: food search, quick-add, daily macro rings/totals.
- Coach: nutrition advice via the tiered AI (likely Haiku for parsing/logging, Sonnet for advice).
- Recommendation: dogfood the training side first; confirm you actually reach for calorie tracking.

### D. Calendar  (build AFTER a 2nd data type exists)
A date-based view unifying workouts + meals + planned/programmed sessions. Most valuable once
there's more than one thing to show per day — so it follows nutrition and/or saved programs.

### E. Reminders / notifications  (deploy-gated)
Web push (service worker + push subscription + a server to send) or email + a cron/scheduler.
Meaningless until deployed (a closed local app can't notify). Park until hosting exists.

### F. Production hardening + deployment  (bundle together; deploy-gated)
Most of these only earn their keep with real/multiple users — do them WITH the deploy step,
not before:
- **Rate limits** — Supabase- or Upstash-backed (NOT v1's in-memory limiter, useless on
  serverless). The one worth adding the moment the coach is exposed: a **per-user cap on coach
  messages** (protects real Anthropic spend).
- **Better auth** — password reset, email confirmation, optional Google OAuth, maybe MFA.
- **Account settings** — change email/password, delete account, export my data.
- **Deploy** — Vercel (first-class Next.js) + the existing Supabase. Keep secrets server-side
  (already enforced).

### G. Semantic memory  (finish the memory tier)
pgvector + local `bge-small` embeddings over the `memories` table (facts/goals/injuries) for
*searchable* long-term recall. Deferred: episodic summaries already give continuity; add this
only when memory grows enough to need similarity search.

### H. Vision / form-check  (parked — honest)
No frontier LLM reliably judges biomechanics. The credible path is **pose estimation**
(MediaPipe Pose / MoveNet) → deterministic joint angles / depth / bar path → LLM *narrates*
the measurements. Its own focused sub-project. **Body-fat-from-photo: skipped** (unreliable,
trust/liability). Decide together when reached.

---

## Cross-cutting principles (carry forward)
- Compute truth deterministically (BMI, 1RM view, volume, fatigue signals); the AI talks
  *about* numbers, never invents them.
- One adaptive surface over per-variant duplication (the v1→v2 lesson).
- Single provider (Claude), tiered by task; local embeddings the only exception.
- Add hardening at the deploy boundary, not speculatively.
