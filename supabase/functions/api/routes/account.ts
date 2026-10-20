import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { sql } from '../db.ts'
import { ok, body, HttpError } from '../http.ts'
import type { Ctx } from '../router.ts'

export async function handleExport(ctx: Ctx): Promise<Response> {
  const [profile] = await sql`
    select id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at,
           leaderboard_visible, intensity, set_size, rating_reveal, reduced_motion,
           theme, weekly_goal, tracks, created_at
    from profiles
    where id = ${ctx.userId}
  `

  if (!profile) {
    throw new HttpError('not_found', 'Profile not found')
  }

  const trackRatings = await sql`
    select track_id, rating, rd, n, peak, last_at
    from track_ratings
    where user_id = ${ctx.userId}
    order by track_id asc
  `

  const conceptRatings = await sql`
    select concept_id, rating, rd, n, last_at, state, first_correct_at, echo_successes, last_echo_success_at
    from concept_ratings
    where user_id = ${ctx.userId}
    order by concept_id asc
  `

  const ratingEvents = await sql`
    select id, attempt_id, subject_type, subject_id, r_before, rd_before,
           r_after, rd_after, expected, score, model_version, created_at
    from rating_events
    where user_id = ${ctx.userId}
    order by created_at asc
  `

  const sets = await sql`
    select id, track_id, mode, size, created_at, closed_at, close_reason
    from sets
    where user_id = ${ctx.userId}
    order by created_at asc
  `

  const attempts = await sql`
    select a.id, a.set_id, a.slot, a.item_id, a.track_id, a.concept_id, a.family_id,
           a.kind, a.state, a.outcome, a.rated, a.answer, a.confidence, a.declared_help,
           a.misconception_id, a.forecast, a.item_rating, a.rating_delta, a.repair_step,
           a.presented_at, a.resolved_at, a.revealed_at,
           i.prompt, i.answer_spec,
           case when a.state in ('resolved', 'revealed') then s.answer else null end as secret_answer,
           case when a.state in ('resolved', 'revealed') then s.solution else null end as solution
    from attempts a
    join instances i on a.instance_id = i.id
    left join instance_secrets s on s.instance_id = a.instance_id
    where a.user_id = ${ctx.userId}
    order by a.presented_at asc
  `

  const playbook = await sql`
    select id, attempt_id, concept_id, text, created_at, updated_at
    from playbook
    where user_id = ${ctx.userId}
    order by created_at asc
  `

  const echoes = await sql`
    select id, track_id, concept_id, family_id, source_attempt_id, interval_days,
           due_at, status, done_attempt_id
    from echoes
    where user_id = ${ctx.userId}
    order by due_at asc
  `

  const codeSubmissions = await sql`
    select id, attempt_id, language, source, confidence, rated, status, verdict,
           failed_group, compile_output, created_at, finished_at
    from code_submissions
    where user_id = ${ctx.userId}
    order by created_at asc
  `

  const misconceptionStats = await sql`
    select misconception_id, concept_id, weight, last_at
    from misconception_stats
    where user_id = ${ctx.userId}
    order by misconception_id asc
  `

  const exportDoc = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile,
    trackRatings,
    conceptRatings,
    ratingEvents,
    sets,
    attempts,
    playbook,
    echoes,
    codeSubmissions,
    misconceptionStats,
  }

  const handle = profile.handle
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `eleanor-export-${handle}-${dateStr}.json`

  return new Response(JSON.stringify(exportDoc, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

interface DeleteAccountBody {
  confirmHandle: string
}

function isDeleteAccountBody(x: unknown): x is DeleteAccountBody {
  if (!x || typeof x !== 'object') return false
  const b = x as Record<string, unknown>
  return typeof b.confirmHandle === 'string'
}

export async function handleDeleteAccount(ctx: Ctx): Promise<Response> {
  const b = await body(ctx.req, isDeleteAccountBody)

  const [profile] = await sql`
    select handle from profiles where id = ${ctx.userId}
  `

  if (!profile || b.confirmHandle !== profile.handle) {
    throw new HttpError('invalid', 'Handle does not match')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321'
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY') ??
    ''

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Delete auth user (cascades to public.profiles and all referencing public rows)
  const { error } = await adminClient.auth.admin.deleteUser(ctx.userId)
  if (error) {
    throw new HttpError('internal', `Failed to delete user: ${error.message}`)
  }

  // 2. Explicitly ensure profile row is removed in case of replication/trigger delay
  await sql`delete from public.profiles where id = ${ctx.userId}`

  // 3. Refresh leaderboard materialized view concurrently
  await sql`refresh materialized view concurrently public.leaderboard`

  return ok({ deleted: true })
}
