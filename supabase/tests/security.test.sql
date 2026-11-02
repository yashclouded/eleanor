begin;
create extension if not exists pgtap;
select plan(8);

select is((select relkind::text from pg_class where oid = 'public.leaderboard'::regclass), 'v', 'Data API exposes a read-only leaderboard view');
select is((select relkind::text from pg_class where oid = to_regclass('private.leaderboard')), 'm', 'Leaderboard snapshot is outside the exposed API schema');
select ok(has_table_privilege('anon', 'public.leaderboard', 'select'), 'Public leaderboard remains readable signed out');
select ok(coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.leaderboard'::regclass), false), 'Leaderboard view uses caller privileges');
select ok(not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in ('daily_stats', 'close_stale_sets', 'scan_integrity', 'admin_model_health')
    and has_function_privilege('anon', p.oid, 'execute')
), 'Anonymous callers cannot run server-only statistics or maintenance');
select ok(not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in ('daily_stats', 'close_stale_sets', 'scan_integrity', 'admin_model_health')
    and has_function_privilege('authenticated', p.oid, 'execute')
), 'Authenticated callers cannot bypass Edge ownership checks through RPC');
select ok(has_function_privilege('anon', 'public.public_profile(text)', 'execute'), 'Public profile RPC remains available');
select ok((select command = 'refresh materialized view concurrently private.leaderboard' from cron.job where jobname = 'refresh-leaderboard'), 'Scheduled refresh targets the private snapshot');

select * from finish();
rollback;
