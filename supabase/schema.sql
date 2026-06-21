-- LiftMind v2 — Database Schema
-- Fresh Supabase project. Run in the SQL editor (or via `supabase db push`).
--
-- Design goals vs v1:
--   * Normalized sets (one row per set) instead of a JSONB `lifts` blob.
--   * A real exercise dictionary with aliases — no more substring matching
--     ("Front Squat" / "Box Squat" collapsing into "squat").
--   * One source of truth for PRs (a derived view) — kills v1's four divergent
--     1RM implementations.
--   * A three-tier memory model: structured logs / episodic summaries /
--     semantic long-term memory (pgvector).

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists vector;          -- pgvector, for semantic memory

-- ── 1. Profiles (1:1 with auth.users) ───────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text,
  units         text not null default 'kg' check (units in ('kg','lbs')),
  training_type text not null default 'powerlifting',
  experience    text check (experience in ('beginner','intermediate','advanced')),
  created_at    timestamptz not null default now()
);

-- ── 2. Exercise dictionary (canonical names + aliases) ───────────────────────
create table exercises (
  id             uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  category       text,          -- 'squat'|'bench'|'deadlift'|'press'|'accessory'|'cardio'
  modality       text,          -- 'barbell'|'dumbbell'|'machine'|'bodyweight'
  is_competition boolean not null default false,    -- the SBD lifts
  aliases        text[] not null default '{}'       -- 'bp','bench press' -> Bench Press
);
create index exercises_aliases_idx on exercises using gin (aliases);

-- ── 3. Workouts (session header) ─────────────────────────────────────────────
create table workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  performed_at date not null default current_date,
  session_rpe  numeric(3,1),
  notes        text,
  source       text not null default 'manual' check (source in ('manual','coach')),
  created_at   timestamptz not null default now()
);
create index workouts_user_date_idx on workouts (user_id, performed_at desc);

-- ── 4. Workout sets (one row per set — the core normalization) ───────────────
create table workout_sets (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references workouts on delete cascade,
  exercise_id uuid not null references exercises,
  set_index   int  not null,
  reps        int  not null check (reps >= 0),
  weight      numeric(6,2) not null default 0,
  rpe         numeric(3,1),
  is_warmup   boolean not null default false,
  completed   boolean not null default true
);
create index workout_sets_workout_idx  on workout_sets (workout_id);
create index workout_sets_exercise_idx on workout_sets (exercise_id);

-- ── 5. PRs (derived VIEW — single source of truth, can't drift) ──────────────
-- Epley e1RM = weight * (1 + reps/30). A logged single is its own e1RM.
-- security_invoker: the view runs with the *querying* user's RLS, so it only
-- ever returns that user's PRs (a plain view would run as owner and leak rows).
create view personal_records with (security_invoker = true) as
select
  w.user_id,
  s.exercise_id,
  max(s.weight) filter (where s.reps = 1 and s.completed)               as true_1rm,
  max(round((s.weight * (1 + s.reps::numeric / 30)), 1))
      filter (where s.completed and s.reps between 1 and 12)            as est_1rm
from workout_sets s
join workouts w on w.id = s.workout_id
where not s.is_warmup
group by w.user_id, s.exercise_id;

-- ── 6. Chat (episodic — tier 2a: verbatim recent turns) ──────────────────────
create table threads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  thread_id  uuid references threads on delete cascade,   -- null = main chat
  role       text not null check (role in ('user','assistant','tool')),
  content    text not null,
  created_at timestamptz not null default now()
);
create index chat_messages_user_idx   on chat_messages (user_id, created_at desc);
create index chat_messages_thread_idx on chat_messages (thread_id, created_at);

-- ── 7. Session summaries (episodic — tier 2b: rolled-up past) ─────────────────
create table session_summaries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  covers_from timestamptz,
  covers_to   timestamptz,
  summary     text not null,
  embedding   vector(384),        -- local bge-small-en-v1.5 (Transformers.js), Phase 4
  created_at  timestamptz not null default now()
);
create index session_summaries_user_idx on session_summaries (user_id, created_at desc);

-- ── 8. Semantic long-term memory (tier 3: facts/prefs/goals via pgvector) ─────
create table memories (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  kind            text not null check (kind in ('fact','preference','goal','injury','constraint')),
  content         text not null,
  embedding       vector(384),         -- local bge-small-en-v1.5 (Transformers.js), Phase 4
  source          text,               -- chat_message id | 'coach-inferred'
  last_referenced timestamptz,
  created_at      timestamptz not null default now()
);
create index memories_user_idx      on memories (user_id);
create index memories_embedding_idx on memories
  using hnsw (embedding vector_cosine_ops);   -- incremental; no training step

-- ── Row-Level Security — every user table is owner-scoped ────────────────────
alter table profiles          enable row level security;
alter table workouts          enable row level security;
alter table workout_sets      enable row level security;
alter table threads           enable row level security;
alter table chat_messages     enable row level security;
alter table session_summaries enable row level security;
alter table memories          enable row level security;
-- `exercises` is a shared read-only dictionary — no RLS, just grant select.

create policy "own profile"   on profiles          for all using (auth.uid() = id)      with check (auth.uid() = id);
create policy "own workouts"  on workouts          for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own threads"   on threads           for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own messages"  on chat_messages     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own summaries" on session_summaries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own memories"  on memories          for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- workout_sets are owned via their parent workout
create policy "own sets" on workout_sets for all
  using      (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()));

-- ── Auto-create a profile row on signup ──────────────────────────────────────
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
