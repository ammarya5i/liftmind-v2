-- Saved training programs. Run in the Supabase SQL editor (one time).
-- The program *structure* lives in JSONB here — that's fine: a program is
-- reference content the user reads, NOT the logged-sets source of truth that
-- drives PRs/analytics (that stays normalized in workout_sets).

create table programs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,
  notes      text,
  days       jsonb not null default '[]'::jsonb,  -- [{ name, items: [{ exercise, sets, reps, intensity?, notes? }] }]
  source     text not null default 'coach' check (source in ('coach','manual')),
  created_at timestamptz not null default now()
);
create index programs_user_idx on programs (user_id, created_at desc);

alter table programs enable row level security;
create policy "own programs" on programs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
