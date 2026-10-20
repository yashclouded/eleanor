-- Eleanor Database Schema
-- Task 2.1: Initial database tables, constraints, and indexes

create table public.tracks (
  id text primary key check (id in ('judgment','logic','math','code')),
  name text not null,
  sort int not null
);

create table public.concepts (
  id text primary key,
  track_id text not null references public.tracks,
  name text not null,
  summary text not null,
  prereqs text[] not null default '{}',
  entry_rating int not null check (entry_rating between 400 and 3000),
  sort int not null
);

create table public.concept_cards (
  concept_id text primary key references public.concepts on delete cascade,
  version int not null,
  body jsonb not null,
  reviewer text not null,
  reviewed_at date not null
);

create table public.families (
  id text primary key,
  concept_id text not null references public.concepts
);

create table public.items (
  id text primary key,
  kind text not null check (kind in ('generated','code')),
  source_id text not null,
  source_version int not null,
  level int not null,
  track_id text not null references public.tracks,
  concept_id text not null references public.concepts,
  family_id text not null references public.families,
  rating double precision not null,
  rd double precision not null,
  n int not null default 0,
  anchor boolean not null default false,
  status text not null check (status in ('published','retired')),
  daily_eligible boolean not null default false,
  updated_at timestamptz not null default now()
);
create index items_select on public.items (concept_id, status, rating);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  age_confirmed_at timestamptz not null,
  terms_accepted_at timestamptz not null,
  pledge_accepted_at timestamptz not null,
  leaderboard_visible boolean not null,
  intensity text not null default 'balanced' check (intensity in ('steady','balanced','stretch')),
  set_size int not null default 5 check (set_size in (3,5,8)),
  rating_reveal text not null default 'end_of_set' check (rating_reveal in ('each','end_of_set')),
  reduced_motion boolean not null default false,
  theme text not null default 'system' check (theme in ('system','light','dark')),
  weekly_goal int not null default 3 check (weekly_goal between 1 and 7),
  tracks text[] not null default '{judgment,logic,math,code}',
  handle_changed_at timestamptz,
  banned_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.instances (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references public.items,
  seed bigint not null,
  skin text,
  prompt jsonb not null,
  answer_spec jsonb not null,
  created_at timestamptz not null default now()
);

create table public.instance_secrets (
  instance_id uuid primary key references public.instances on delete cascade,
  answer jsonb not null,
  misconceptions jsonb not null,
  steps jsonb not null,
  solution jsonb not null
);

create table public.sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  track_id text not null references public.tracks,
  mode text not null check (mode in ('rated','unrated')),
  size int not null check (size in (3,5,8)),
  rng_seed bigint not null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  close_reason text check (close_reason in ('completed','abandoned','exhausted'))
);
create unique index one_open_rated_set on public.sets (user_id, track_id) where closed_at is null and mode = 'rated';

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  set_id uuid references public.sets on delete cascade,
  slot int,
  instance_id uuid not null references public.instances,
  item_id text not null references public.items,
  track_id text not null,
  concept_id text not null,
  family_id text not null,
  kind text not null check (kind in ('placement','selected','echo','unrated','daily')),
  echo_id uuid,
  state text not null default 'presented' check (state in ('presented','judging','resolved','revealed')),
  outcome text check (outcome in ('correct','incorrect','gave_up','abandoned')),
  rated boolean not null,
  answer jsonb,
  confidence double precision check (confidence >= 0 and confidence <= 1),
  declared_help boolean not null default false,
  misconception_id text,
  forecast double precision,
  item_rating double precision,
  rating_delta double precision,
  repair_step int not null default 0,
  presented_at timestamptz not null default now(),
  resolved_at timestamptz,
  revealed_at timestamptz,
  unique (set_id, slot),
  unique (user_id, instance_id),
  check ((outcome is null) = (state in ('presented','judging'))),
  check (outcome not in ('correct','incorrect') or confidence is not null)
);
create index attempts_user_time on public.attempts (user_id, resolved_at);

create table public.transitions (
  id uuid primary key,
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null,
  attempt_id uuid references public.attempts on delete cascade,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create table public.track_ratings (
  user_id uuid not null references public.profiles on delete cascade,
  track_id text not null references public.tracks,
  rating double precision not null,
  rd double precision not null,
  n int not null default 0,
  peak double precision not null,
  last_at timestamptz,
  primary key (user_id, track_id)
);

create table public.concept_ratings (
  user_id uuid not null references public.profiles on delete cascade,
  concept_id text not null references public.concepts,
  rating double precision not null,
  rd double precision not null,
  n int not null default 0,
  last_at timestamptz,
  state text not null default 'new' check (state in ('new','learning','practiced','proven','needs_review')),
  first_correct_at timestamptz,
  echo_successes int not null default 0,
  last_echo_success_at timestamptz,
  primary key (user_id, concept_id)
);

create table public.misconception_stats (
  user_id uuid not null references public.profiles on delete cascade,
  misconception_id text not null,
  concept_id text not null references public.concepts,
  weight double precision not null,
  last_at timestamptz not null,
  primary key (user_id, misconception_id)
);

create table public.rating_events (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references public.attempts on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  subject_type text not null check (subject_type in ('track','concept','item')),
  subject_id text not null,
  r_before double precision not null,
  rd_before double precision not null,
  r_after double precision not null,
  rd_after double precision not null,
  expected double precision not null,
  score smallint not null check (score in (0,1)),
  model_version text not null,
  created_at timestamptz not null default now()
);

create table public.echoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  track_id text not null,
  concept_id text not null,
  family_id text not null,
  source_attempt_id uuid not null references public.attempts on delete cascade,
  interval_days int not null check (interval_days in (1,3,7,21)),
  due_at timestamptz not null,
  status text not null default 'due' check (status in ('due','done','dropped')),
  done_attempt_id uuid references public.attempts on delete set null
);
create unique index one_due_echo_per_family on public.echoes (user_id, family_id) where status = 'due';
alter table public.attempts add constraint attempts_echo_fk foreign key (echo_id) references public.echoes on delete set null;

create table public.playbook (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  attempt_id uuid not null unique references public.attempts on delete cascade,
  concept_id text not null references public.concepts,
  text text not null check (char_length(text) between 1 and 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily (
  day date primary key,
  number int not null unique,
  instance_id uuid not null references public.instances,
  item_id text not null references public.items
);

create table public.code_tests (
  item_id text not null references public.items on delete cascade,
  group_idx int not null,
  label text not null,
  fingerprint text not null,
  input text not null,
  expected text not null,
  primary key (item_id, group_idx)
);

create table public.code_submissions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  language text not null check (language in ('python','cpp','javascript')),
  source text not null check (octet_length(source) <= 65536),
  confidence double precision check (confidence >= 0 and confidence <= 1),
  rated boolean not null,
  status text not null default 'queued' check (status in ('queued','done','error')),
  verdict text check (verdict in ('accepted','wrong_answer','time_limit','runtime_error','compile_error','judge_error')),
  failed_group int,
  compile_output text,
  judge_tokens text[] not null default '{}',
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.rate_events (
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);
create index rate_events_lookup on public.rate_events (user_id, kind, created_at);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles on delete set null,
  target_id uuid not null references public.profiles on delete cascade,
  reason text not null check (char_length(reason) between 5 and 1000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text
);

create table public.integrity_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  track_id text,
  kind text not null check (kind in ('rapid_gain','improbable_run','report','code_similarity')),
  detail jsonb not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  user_id uuid not null,
  action text not null check (action in ('ban','unban','unrate','note')),
  reason text not null,
  params jsonb not null default '{}',
  created_at timestamptz not null default now()
);
