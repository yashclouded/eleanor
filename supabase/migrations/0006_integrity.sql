-- Preserve the actual anchor transition; updated_at also covers unrelated edits.
create function public.record_item_anchor()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.anchor then
    if tg_op = 'UPDATE' and old.anchor then
      new.anchored_at := old.anchored_at;
    else
      new.anchored_at := clock_timestamp();
    end if;
  end if;
  return new;
end;
$$;

create trigger record_item_anchor before insert or update of anchor on public.items
for each row execute function public.record_item_anchor();

revoke all on function public.record_item_anchor() from public, anon, authenticated;

-- Repair legacy declared-help flags: the live resolver already skipped their updates.
update public.attempts set rated = false
where rated and (declared_help or kind in ('daily', 'unrated'));

create index integrity_flags_recent on public.integrity_flags (user_id, track_id, kind, created_at desc);

create index rating_events_track_time on public.rating_events (user_id, subject_id, created_at)
where subject_type = 'track';

create index rating_events_item_time on public.rating_events (subject_id, created_at)
where subject_type = 'item';

create function public.scan_integrity()
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Serialize overlapping cron/manual scans so the rolling cooldown is exact.
  perform pg_catalog.pg_advisory_xact_lock(720004);

  insert into public.integrity_flags (user_id, track_id, kind, detail)
  select tr.user_id, tr.track_id, 'rapid_gain',
    jsonb_build_object('gain', tr.rating - min(re.r_before), 'days', 7, 'rd', tr.rd)
  from public.track_ratings tr
  join public.rating_events re on re.user_id = tr.user_id
    and re.subject_type = 'track' and re.subject_id = tr.track_id
    and re.created_at >= now() - interval '7 days' and re.created_at <= now()
  where tr.rd <= 110
    and not exists (
      select 1 from public.integrity_flags f where f.user_id = tr.user_id
        and f.track_id = tr.track_id and f.kind = 'rapid_gain'
        and f.created_at > now() - interval '7 days'
    )
  group by tr.user_id, tr.track_id, tr.rating, tr.rd
  having tr.rating - min(re.r_before) > 400;

  -- ponytail: normal approx, exact Poisson-binomial if flags prove noisy
  with ranked as (
    select a.user_id, a.track_id, a.forecast,
      case when a.outcome = 'correct' then 1 else 0 end as score,
      row_number() over (partition by a.user_id, a.track_id order by a.resolved_at desc, a.id desc) as rn
    from public.attempts a
    where a.rated and not a.declared_help and a.kind in ('placement', 'selected', 'echo')
      and a.state in ('resolved', 'revealed') and a.resolved_at <= now()
      and a.outcome in ('correct', 'incorrect', 'gave_up')
  ), runs as (
    select user_id, track_id, sum(score) as wins, sum(forecast) as expected,
      sum(forecast * (1 - forecast)) as variance,
      (sum(score) - sum(forecast)) / nullif(sqrt(sum(forecast * (1 - forecast))), 0) as z
    from ranked where rn <= 30
    group by user_id, track_id
    having count(*) = 30 and count(forecast) = 30
      and bool_and(forecast between 0 and 1)
  )
  insert into public.integrity_flags (user_id, track_id, kind, detail)
  select r.user_id, r.track_id, 'improbable_run',
    jsonb_build_object('n', 30, 'sumS', r.wins, 'sumE', r.expected, 'variance', r.variance, 'z', r.z, 'approximation', 'normal')
  from runs r where r.z >= 3.72 and not exists (
    select 1 from public.integrity_flags f where f.user_id = r.user_id
      and f.track_id = r.track_id and f.kind = 'improbable_run'
      and f.created_at > now() - interval '7 days'
  );
end;
$$;

revoke all on function public.scan_integrity() from public, anon, authenticated;

select cron.schedule('scan-integrity-daily', '0 4 * * *', 'select public.scan_integrity()');
