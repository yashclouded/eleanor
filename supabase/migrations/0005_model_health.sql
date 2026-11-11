-- Admin diagnostics are server-only: the browser never receives raw attempts.
alter table public.items add column anchored_at timestamptz;

update public.items set anchored_at = updated_at where anchor;

create index attempts_model_health on public.attempts (resolved_at)
  where rated and forecast is not null;

create index rating_events_item_residual on public.rating_events (subject_id)
  where subject_type = 'item';

create view public.admin_item_residuals as
select i.id, i.track_id, i.rating, i.rd, i.anchor, i.status,
  count(e.id)::int as n, avg(e.score - e.expected) as residual
from public.items i
left join public.rating_events e on e.subject_type = 'item' and e.subject_id = i.id
  and exists (select 1 from public.attempts a where a.id = e.attempt_id and a.rated)
group by i.id;

revoke all on public.admin_item_residuals from public, anon, authenticated;

grant select on public.admin_item_residuals to service_role;

create function public.admin_model_health(window_days int)
returns jsonb language sql stable set search_path = '' as $$
with points as (
  select a.track_id, a.forecast as p, (a.outcome = 'correct')::int as y
  from public.attempts a
  where a.rated and a.outcome in ('correct', 'incorrect', 'gave_up')
    and a.resolved_at between now() - make_interval(days => window_days) and now()
    and a.forecast between 0 and 1
), bins as (
  select b as bin, count(p)::int as n, avg(p) as mean_p, avg(y) as mean_y
  from generate_series(0, 4) b
  left join points on least(4, floor(p * 5)::int) = b
  group by b
), metrics as (
  select count(*)::int as n, avg((p - y)^2) as brier,
    avg(-y * ln(greatest(p, 1e-15)) - (1-y) * ln(greatest(1-p, 1e-15))) as log_loss,
    avg(p - y) as overconfidence
  from points
), track_history as (
  select e.user_id, a.track_id, a.resolved_at, a.id as attempt_id, e.id,
    e.r_after, row_number() over (partition by e.user_id, a.track_id order by a.resolved_at, a.id, e.id) as n
  from public.rating_events e join public.attempts a on a.id = e.attempt_id
  where e.subject_type = 'track' and a.rated and a.resolved_at is not null
), weekly_last as (
  select distinct on (date_trunc('week', resolved_at at time zone 'UTC'), user_id, track_id)
    date_trunc('week', resolved_at at time zone 'UTC') as week, user_id, track_id, r_after, n
  from track_history
  where resolved_at between now() - make_interval(days => window_days) and now()
  order by date_trunc('week', resolved_at at time zone 'UTC'), user_id, track_id, resolved_at desc, attempt_id desc, id desc
), learner_drift as (
  select week::date as week, track_id as track, avg(r_after) as "meanRating", count(*)::int as n
  from weekly_last where n > 100 group by week, track_id
), anchor_drift as (
  -- Frozen anchors emit no item rating events, so use their stored forecasts.
  select date_trunc('week', a.resolved_at at time zone 'UTC')::date as week,
    a.track_id as track, avg((a.outcome = 'correct')::int - a.forecast) as residual, count(*)::int as n
  from public.attempts a join public.items i on i.id = a.item_id
  where i.anchor and a.rated and a.forecast between 0 and 1
    and a.outcome in ('correct', 'incorrect', 'gave_up')
    and a.resolved_at >= i.anchored_at
    and a.resolved_at between now() - make_interval(days => window_days) and now()
  group by week, a.track_id
)
select jsonb_build_object(
  'n', m.n, 'brier', m.brier, 'logLoss', m.log_loss, 'overconfidence', m.overconfidence,
  'calError', (select sum(n * abs(mean_p - mean_y)) / nullif(sum(n), 0) from bins),
  'bins', (select jsonb_agg(jsonb_build_object('lo', bin * 0.2, 'hi', (bin+1) * 0.2,
    'n', n, 'meanP', coalesce(mean_p, 0), 'meanY', coalesce(mean_y, 0)) order by bin) from bins),
  'perTrack', (select jsonb_agg(jsonb_build_object('track', t.id, 'n',
    (select count(*)::int from points p where p.track_id = t.id)) order by t.sort) from public.tracks t),
  'learnerDrift', coalesce((select jsonb_agg(to_jsonb(d) order by week, track) from learner_drift d), '[]'::jsonb),
  'anchorDrift', coalesce((select jsonb_agg(to_jsonb(d) order by week, track) from anchor_drift d), '[]'::jsonb)
) from metrics m;
$$;

revoke all on function public.admin_model_health(int) from public, anon, authenticated;

grant execute on function public.admin_model_health(int) to service_role;
