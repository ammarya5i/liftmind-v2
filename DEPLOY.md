# Deploying LiftMind v2 (staging)

Vercel + the existing Supabase project. ~10 minutes.

## 0. Prereqs
- The Supabase migrations are applied to your project: `schema.sql`, `seed/exercises.sql`,
  `migrations/0001_account_deletion.sql`, `migrations/0002_programs.sql`.
- A GitHub account + a Vercel account.

## 1. Push to GitHub
This folder isn't a git repo yet. From the project root:
```bash
git init
git add .
git commit -m "LiftMind v2"
gh repo create liftmind-v2 --private --source=. --push   # or create the repo in the UI and push
```
`.env.local` is gitignored — secrets do NOT get committed (they go in Vercel below).

## 2. Import to Vercel
- vercel.com → **Add New → Project** → import the GitHub repo.
- Framework preset auto-detects **Next.js**. Leave build settings default.

## 3. Set environment variables (Vercel → Project → Settings → Environment Variables)
Add these for the **Preview** (staging) and **Production** environments:
```
NEXT_PUBLIC_SUPABASE_URL=...                 # same as .env.local
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...      # same as .env.local
ANTHROPIC_API_KEY=...                         # server-only — Vercel keeps it secret
```
(No `NEXT_PUBLIC_` on the Anthropic key.)

## 4. Deploy
- Click **Deploy**. You get a Production URL and a Preview URL per branch/PR — the **Preview
  URL is your staging URL**.

## 5. Point Supabase at the deployed URL
Supabase → **Authentication → URL Configuration**:
- **Site URL**: your staging/prod URL.
- **Redirect URLs**: add `https://<your-app>/reset-password` (and `http://localhost:3000/reset-password`
  for local). Needed for the password-reset email link to return to the app.

## 6. Smoke test
Open the URL → sign up → onboarding → log a workout → coach → programs. Done.

---
### Notes
- The `[webpack.cache] Serializing big strings` warning in `next build` is a **local build-cache
  performance note** — it doesn't affect the deployed bundle or runtime. Safe to ignore. (If you
  want it gone locally, building with Turbopack avoids the webpack disk cache entirely.)
- Rate limit, RLS, and server-only secrets are already in place from the hardening pass.
