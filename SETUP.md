# LiftMind v2 — local setup (beta)

The Phase 0→1 logbook is code-complete. These are the **manual steps only you can
do** (they need your Supabase account); after them, `npm run dev` gives you a
working logbook.

## 1. Create a Supabase project (manual)
- Go to https://supabase.com → **New project**. Pick a name + a DB password.
- Wait for it to provision (~1–2 min).

## 2. Apply the schema + seed (manual)
- In the project: **SQL Editor → New query**.
- Paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
- New query → paste all of [`supabase/seed/exercises.sql`](supabase/seed/exercises.sql) → **Run**.
- (The `vector` extension is enabled by the schema; it's only used in Phase 4.)

## 3. Fill in env keys (manual)
- **Project Settings → API**. Copy **Project URL** and the **anon public** key.
- Paste them into [`.env.local`](.env.local):
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  ```

## 4. (Optional, makes testing instant) disable email confirmation
- **Authentication → Sign In / Providers → Email** → turn **Confirm email** off.
- Otherwise sign-up sends a confirmation link you must click before signing in.

## 5. Run it
```bash
npm install      # already done if I ran it for you
npm run dev
```
- Open http://localhost:3000 → create an account → you land on **/log**.
- Log a session (pick a lift, add sets) → check **/progress** for PRs + the e1RM chart.

---

### What's in this beta
- Auth + RLS, normalized schema, exercise dictionary.
- **/log** — manual workout logging (sets → `workout_sets`), live e1RM preview.
- **/progress** — PRs from the `personal_records` view + an estimated-1RM-over-time
  chart for the competition lifts. All analytics from SQL; one Epley util.
- **/coach** — intentionally a stub. The Claude coach is Phase 3.

### Not yet (by design)
Coach (Phase 3), semantic memory (Phase 4), vision/program-gen (cut for now).
