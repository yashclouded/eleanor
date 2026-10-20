-- Eleanor Row Level Security & Privileges
-- Task 2.1: Restrict direct client writes and protect sensitive data

-- 1. Enable RLS on every table
alter table public.tracks enable row level security;
alter table public.concepts enable row level security;
alter table public.concept_cards enable row level security;
alter table public.families enable row level security;
alter table public.items enable row level security;
alter table public.profiles enable row level security;
alter table public.instances enable row level security;
alter table public.instance_secrets enable row level security;
alter table public.sets enable row level security;
alter table public.attempts enable row level security;
alter table public.transitions enable row level security;
alter table public.track_ratings enable row level security;
alter table public.concept_ratings enable row level security;
alter table public.misconception_stats enable row level security;
alter table public.rating_events enable row level security;
alter table public.echoes enable row level security;
alter table public.playbook enable row level security;
alter table public.daily enable row level security;
alter table public.code_tests enable row level security;
alter table public.code_submissions enable row level security;
alter table public.rate_events enable row level security;
alter table public.reports enable row level security;
alter table public.integrity_flags enable row level security;
alter table public.moderation_actions enable row level security;

-- 2. Revoke all privileges from anon and authenticated on all public tables
revoke all on all tables in schema public from anon, authenticated;

-- 3. Catalog read access (tracks, concepts, concept_cards, families) to anon and authenticated
grant select on public.tracks, public.concepts, public.concept_cards, public.families to anon, authenticated;

create policy "tracks_select" on public.tracks for select to anon, authenticated
  using (true);

create policy "concepts_select" on public.concepts for select to anon, authenticated
  using (true);

create policy "concept_cards_select" on public.concept_cards for select to anon, authenticated
  using (true);

create policy "families_select" on public.families for select to anon, authenticated
  using (true);

-- 4. Daily challenge viewable by authenticated users
grant select on public.daily to authenticated;

create policy "daily_select" on public.daily for select to authenticated
  using (true);

-- 5. User-owned learning tables: select own rows only
grant select on
  public.sets,
  public.attempts,
  public.track_ratings,
  public.concept_ratings,
  public.misconception_stats,
  public.rating_events,
  public.echoes,
  public.code_submissions
to authenticated;

create policy "sets_select_own" on public.sets for select to authenticated
  using (user_id = (select auth.uid()));

create policy "attempts_select_own" on public.attempts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "track_ratings_select_own" on public.track_ratings for select to authenticated
  using (user_id = (select auth.uid()));

create policy "concept_ratings_select_own" on public.concept_ratings for select to authenticated
  using (user_id = (select auth.uid()));

create policy "misconception_stats_select_own" on public.misconception_stats for select to authenticated
  using (user_id = (select auth.uid()));

create policy "rating_events_select_own" on public.rating_events for select to authenticated
  using (user_id = (select auth.uid()));

create policy "echoes_select_own" on public.echoes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "code_submissions_select_own" on public.code_submissions for select to authenticated
  using (user_id = (select auth.uid()));

-- 6. Profiles: select own row, update only non-sensitive preferences
grant select on public.profiles to authenticated;
grant update (
  leaderboard_visible,
  intensity,
  set_size,
  rating_reveal,
  reduced_motion,
  theme,
  weekly_goal,
  tracks
) on public.profiles to authenticated;

create policy "profiles_select_own" on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- 7. Playbook: select, update (text, updated_at), delete own rows, insert with revealed attempt check
grant select, insert, delete on public.playbook to authenticated;
grant update (text, updated_at) on public.playbook to authenticated;

create policy "playbook_select_own" on public.playbook for select to authenticated
  using (user_id = (select auth.uid()));

create policy "playbook_update_own" on public.playbook for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "playbook_delete_own" on public.playbook for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "playbook_insert_own" on public.playbook for insert to authenticated
  with check (
    user_id = (select auth.uid()) and
    exists (
      select 1 from public.attempts a
      where a.id = attempt_id
        and a.user_id = (select auth.uid())
        and a.state = 'revealed'
    )
  );

-- No client grants at all on: items, instances, instance_secrets, code_tests, transitions,
-- rate_events, reports, integrity_flags, moderation_actions.
