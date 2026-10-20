-- Eleanor Functions, Materialized Views, and Cron Schedules
-- Task 2.1: public_profile, leaderboard materialized view, close_stale_sets, pg_cron

-- 1. Enable pg_cron extension
create extension if not exists pg_cron with schema extensions;

-- 2. Function public.public_profile(p_handle text)
create or replace function public.public_profile(p_handle text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_created_at timestamptz;
  v_tracks jsonb;
  v_history jsonb;
  v_proven_count int;
  v_calibration jsonb;
begin
  -- Returns null unless profile is leaderboard_visible and not banned
  select p.id, p.created_at
  into v_user_id, v_created_at
  from public.profiles p
  where p.handle = p_handle
    and p.leaderboard_visible = true
    and p.banned_at is null;

  if v_user_id is null then
    return null;
  end if;

  -- Per-track ratings: { rating, rd_eff, n, peak }
  select coalesce(
    jsonb_object_agg(
      tr.track_id,
      jsonb_build_object(
        'rating', tr.rating,
        'rd_eff', round(least(350.0, sqrt(tr.rd^2 + 225.0 * extract(epoch from now() - coalesce(tr.last_at, now())) / 86400.0))::numeric, 2),
        'n', tr.n,
        'peak', tr.peak
      )
    ),
    '{}'::jsonb
  )
  into v_tracks
  from public.track_ratings tr
  where tr.user_id = v_user_id;

  -- Rating history points: track subject events (date and r_after, at most 500 per track)
  with ranked_events as (
    select
      re.subject_id as track_id,
      re.created_at,
      re.r_after,
      row_number() over (partition by re.subject_id order by re.created_at desc) as rn
    from public.rating_events re
    where re.user_id = v_user_id
      and re.subject_type = 'track'
  )
  select coalesce(
    jsonb_object_agg(
      track_id,
      points
    ),
    '{}'::jsonb
  )
  into v_history
  from (
    select
      track_id,
      jsonb_agg(
        jsonb_build_object('date', created_at, 'r', r_after)
        order by created_at asc
      ) as points
    from ranked_events
    where rn <= 500
    group by track_id
  ) h;

  -- Count of proven concepts
  select count(*)::int
  into v_proven_count
  from public.concept_ratings cr
  where cr.user_id = v_user_id
    and cr.state = 'proven';

  -- Calibration inputs: last 100 resolved rated attempts with confidence, as [p, y] pairs only
  with recent_cal as (
    select
      a.confidence as p,
      (case when a.outcome = 'correct' then 1 else 0 end) as y
    from public.attempts a
    where a.user_id = v_user_id
      and a.rated = true
      and a.state in ('resolved', 'revealed')
      and a.confidence is not null
      and a.outcome in ('correct', 'incorrect')
    order by a.resolved_at desc nulls last, a.presented_at desc
    limit 100
  )
  select coalesce(
    jsonb_agg(jsonb_build_array(p, y)),
    '[]'::jsonb
  )
  into v_calibration
  from recent_cal;

  return jsonb_build_object(
    'handle', p_handle,
    'created_at', v_created_at,
    'tracks', v_tracks,
    'history', v_history,
    'proven_count', v_proven_count,
    'calibration', v_calibration
  );
end;
$$;

grant execute on function public.public_profile(text) to anon, authenticated;

-- 3. Materialized View: public.leaderboard
create materialized view public.leaderboard as
with eligible_tracks as (
  select
    tr.user_id,
    p.handle,
    tr.track_id,
    tr.rating,
    tr.n,
    least(350.0, sqrt(tr.rd^2 + 225.0 * extract(epoch from now() - coalesce(tr.last_at, now())) / 86400.0)) as rd_eff
  from public.track_ratings tr
  join public.profiles p on p.id = tr.user_id
  where p.leaderboard_visible = true
    and p.banned_at is null
    and tr.n >= 20
),
filtered_tracks as (
  select * from eligible_tracks
  where rd_eff <= 110.0
),
track_ranks as (
  select
    track_id,
    handle,
    rating,
    n,
    rank() over (partition by track_id order by rating desc) as rank
  from filtered_tracks
),
overall_calc as (
  select
    'overall'::text as track_id,
    handle,
    sum(rating / (rd_eff * rd_eff)) / sum(1.0 / (rd_eff * rd_eff)) as rating,
    sum(n)::int as n
  from filtered_tracks
  group by user_id, handle
),
overall_ranks as (
  select
    track_id,
    handle,
    rating,
    n,
    rank() over (order by rating desc) as rank
  from overall_calc
)
select * from track_ranks
union all
select * from overall_ranks;

create unique index leaderboard_track_handle on public.leaderboard (track_id, handle);

grant select on public.leaderboard to anon, authenticated;

-- 4. Function public.close_stale_sets()
create or replace function public.close_stale_sets()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  stale_set_record record;
begin
  for stale_set_record in
    select s.id
    from public.sets s
    where s.closed_at is null
      and s.created_at <= now() - interval '14 days'
      and not exists (
        select 1 from public.attempts a
        where a.set_id = s.id
          and a.presented_at > now() - interval '14 days'
      )
  loop
    update public.attempts
    set
      outcome = 'abandoned',
      state = 'resolved',
      rated = false,
      resolved_at = coalesce(resolved_at, now())
    where set_id = stale_set_record.id
      and state in ('presented', 'judging');

    update public.sets
    set
      closed_at = now(),
      close_reason = 'abandoned'
    where id = stale_set_record.id;
  end loop;
end;
$$;

-- 5. pg_cron schedules
-- Refresh leaderboard every 10 minutes
select cron.schedule(
  'refresh-leaderboard',
  '*/10 * * * *',
  'refresh materialized view concurrently public.leaderboard'
);

-- Close idle sets daily at 03:00 UTC
select cron.schedule(
  'close-stale-sets-daily',
  '0 3 * * *',
  'select public.close_stale_sets()'
);

-- Clean old rate events daily at 03:30 UTC
select cron.schedule(
  'clean-rate-events-daily',
  '30 3 * * *',
  'delete from public.rate_events where created_at < now() - interval ''1 day'''
);
