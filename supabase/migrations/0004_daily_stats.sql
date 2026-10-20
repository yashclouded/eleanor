-- Daily Crux crowd stats RPC
create or replace function public.daily_stats(p_day date, p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := coalesce(auth.uid(), p_user_id);
  v_instance_id uuid;
  v_number int;
  v_answer_spec jsonb;
  v_caller_outcome text;
  v_caller_conf double precision;
  v_n int;
  v_correct_count int;
  v_pct_correct double precision;
  v_mean_conf_corr double precision;
  v_mean_conf_inc double precision;
  v_caller_percentile double precision;
  v_top_answers jsonb;
  v_misc_shares jsonb;
begin
  if v_caller_id is null then
    return null;
  end if;

  -- 1. Find daily instance for p_day
  select instance_id, number into v_instance_id, v_number
  from public.daily
  where day = p_day;

  if v_instance_id is null then
    return null;
  end if;

  -- 2. Verify caller has a resolved daily attempt for this day
  select outcome, confidence into v_caller_outcome, v_caller_conf
  from public.attempts
  where user_id = v_caller_id
    and instance_id = v_instance_id
    and state in ('resolved', 'revealed');

  if v_caller_outcome is null then
    return null;
  end if;

  -- 3. Fetch answer_spec for tolerance rounding
  select answer_spec into v_answer_spec
  from public.instances
  where id = v_instance_id;

  -- 4. Compute stats across all resolved attempts for this daily instance
  select
    count(*),
    count(*) filter (where outcome = 'correct'),
    avg(confidence) filter (where outcome = 'correct'),
    avg(confidence) filter (where outcome in ('incorrect', 'gave_up'))
  into v_n, v_correct_count, v_mean_conf_corr, v_mean_conf_inc
  from public.attempts
  where instance_id = v_instance_id
    and state in ('resolved', 'revealed');

  if v_n = 0 then
    v_pct_correct := 0;
  else
    v_pct_correct := round((v_correct_count::numeric / v_n::numeric) * 100, 1);
  end if;

  -- Caller percentile among correct solvers
  if v_caller_outcome = 'correct' and v_correct_count > 0 then
    select
      round((count(*) filter (where outcome = 'correct' and confidence < v_caller_conf)::numeric / v_correct_count::numeric) * 100, 1)
    into v_caller_percentile
    from public.attempts
    where instance_id = v_instance_id
      and state in ('resolved', 'revealed');
  else
    v_caller_percentile := null;
  end if;

  -- Top answers: top 5 answers by count (after rounding to tolerance if numeric)
  select coalesce(jsonb_agg(ans), '[]'::jsonb)
  into v_top_answers
  from (
    select
      case
        when jsonb_typeof(answer) = 'number'
             and v_answer_spec is not null
             and (v_answer_spec->'tolerance'->>'abs')::numeric > 0 then
          to_jsonb(round(answer::text::numeric / (v_answer_spec->'tolerance'->>'abs')::numeric) * (v_answer_spec->'tolerance'->>'abs')::numeric)
        else answer
      end as answer,
      count(*) as count
    from public.attempts
    where instance_id = v_instance_id
      and state in ('resolved', 'revealed')
      and answer is not null
    group by 1
    order by count desc
    limit 5
  ) ans;

  -- Misconception shares: share of attempts matching each misconception
  select coalesce(jsonb_object_agg(misconception_id, share), '{}'::jsonb)
  into v_misc_shares
  from (
    select misconception_id, round((count(*)::numeric / v_n::numeric), 3) as share
    from public.attempts
    where instance_id = v_instance_id
      and state in ('resolved', 'revealed')
      and misconception_id is not null
    group by misconception_id
  ) m;

  return jsonb_build_object(
    'number', v_number,
    'day', p_day,
    'n', v_n,
    'pctCorrect', v_pct_correct,
    'meanConfidenceCorrect', v_mean_conf_corr,
    'meanConfidenceIncorrect', v_mean_conf_inc,
    'topAnswers', v_top_answers,
    'misconceptionShares', v_misc_shares,
    'callerPercentile', v_caller_percentile,
    'callerOutcome', v_caller_outcome,
    'callerConfidence', v_caller_conf
  );
end;
$$;

grant execute on function public.daily_stats(date, uuid) to authenticated, anon;
