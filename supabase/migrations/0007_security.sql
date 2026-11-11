-- Keep the public aggregate interface without exposing a materialized view in the Data API.
create schema if not exists private;

alter materialized view public.leaderboard set schema private;

create view public.leaderboard with (security_invoker = true) as
  select track_id, handle, rating, n, rank from private.leaderboard;

grant usage on schema private to anon, authenticated;

grant select on private.leaderboard to anon, authenticated;

revoke all on public.leaderboard from anon, authenticated;

grant select on public.leaderboard to anon, authenticated;

select cron.alter_job(jobid, command := 'refresh materialized view concurrently private.leaderboard')
from cron.job where jobname = 'refresh-leaderboard';

-- Only Edge functions may supply a learner ID to crowd statistics or run maintenance.
drop function if exists public.daily_stats(date);

alter function public.daily_stats(date, uuid) set search_path = '';

revoke all on function public.daily_stats(date, uuid) from public, anon, authenticated;

revoke all on function public.close_stale_sets() from public, anon, authenticated;

grant execute on function public.daily_stats(date, uuid), public.close_stale_sets() to service_role;
