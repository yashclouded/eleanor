import { sql } from '../db.ts'
import { ok, HttpError } from '../http.ts'
import type { Ctx } from '../router.ts'
import { hashSeed } from '../../_shared/rng.ts'
import { templateFor } from '../../_shared/registry.ts'
import { buildInstance } from '../../_shared/instance.ts'
import { toAttemptView } from './sets.ts'
import {
  formatUtcDate,
  getEffectiveNow,
  computeDayDetails,
} from '../../_shared/daily.ts'

export async function handleGetDaily(ctx: Ctx): Promise<Response> {
  const now = getEffectiveNow(ctx.req, Deno.env.get('ELEANOR_TEST_CLOCK'))
  const { dayStr, dayNumber, track } = computeDayDetails(now)

  return await sql.begin(async (tx) => {
    // 1. Transaction-level advisory lock to serialize daily instance creation per day
    await tx`select pg_advisory_xact_lock(hashtext('daily:' || ${dayStr}))`

    // 2. Select existing daily row if present
    let [dailyRow] = await tx`
      select day, number, instance_id, item_id
      from daily
      where day = ${dayStr}
    `

    if (!dailyRow) {
      // 3. List eligible items for this track
      const eligibleItems = await tx`
        select id, family_id, concept_id
        from items
        where daily_eligible = true
          and status = 'published'
          and track_id = ${track}
          and rating >= 1300 and rating <= 1700
        order by id asc
      `

      if (eligibleItems.length === 0) {
        throw new HttpError('internal', `No daily eligible items found for track ${track}`)
      }

      const itemIndex = hashSeed('daily', dayStr) % eligibleItems.length
      const chosenItem = eligibleItems[itemIndex]
      const { template, level } = templateFor(chosenItem.id)
      const instanceSeed = hashSeed('daily', dayStr)
      const skinIndex = ((dayNumber % template.skins.length) + template.skins.length) % template.skins.length
      const skin = template.skins[skinIndex]
      const built = buildInstance(template, level, instanceSeed, skin)
      const instanceId = crypto.randomUUID()

      await tx`
        insert into instances (id, item_id, seed, skin, prompt, answer_spec, created_at)
        values (${instanceId}, ${chosenItem.id}, ${instanceSeed}, ${skin},
                ${JSON.stringify(built.prompt)}::jsonb, ${JSON.stringify(built.answerSpec)}::jsonb, now())
      `

      await tx`
        insert into instance_secrets (instance_id, answer, misconceptions, steps, solution)
        values (${instanceId}, ${JSON.stringify(built.secret.answer)}::jsonb,
                ${JSON.stringify(built.secret.misconceptions)}::jsonb,
                ${JSON.stringify(built.secret.steps)}::jsonb,
                ${JSON.stringify(built.secret.solution)}::jsonb)
      `

      await tx`
        insert into daily (day, number, instance_id, item_id)
        values (${dayStr}, ${dayNumber}, ${instanceId}, ${chosenItem.id})
        on conflict (day) do nothing
      `

      const [res] = await tx`
        select day, number, instance_id, item_id
        from daily
        where day = ${dayStr}
      `
      dailyRow = res
    }

    // 4. Upsert caller's daily attempt
    const [itemInfo] = await tx`
      select track_id, concept_id, family_id from items where id = ${dailyRow.item_id}
    `

    const attemptId = crypto.randomUUID()
    await tx`
      insert into attempts (
        id, user_id, set_id, slot, instance_id, item_id,
        track_id, concept_id, family_id, kind, echo_id,
        state, rated, presented_at
      ) values (
        ${attemptId}, ${ctx.userId}, null, null, ${dailyRow.instance_id}, ${dailyRow.item_id},
        ${itemInfo.track_id}, ${itemInfo.concept_id}, ${itemInfo.family_id}, 'daily', null,
        'presented', false, now()
      )
      on conflict (user_id, instance_id) do nothing
    `

    // 5. Select attempt row to build AttemptView
    const [attempt] = await tx`
      select a.*, i.prompt, i.answer_spec, c.name as concept_name
      from attempts a
      join instances i on a.instance_id = i.id
      join concepts c on a.concept_id = c.id
      where a.user_id = ${ctx.userId} and a.instance_id = ${dailyRow.instance_id}
    `

    let secrets = null
    let earlierNote: string | null = null
    let playbookNote: string | null = null

    if (attempt.state === 'resolved' || attempt.state === 'revealed') {
      const [sec] = await tx`
        select * from instance_secrets where instance_id = ${attempt.instance_id}
      `
      secrets = sec
      if (attempt.state === 'revealed') {
        const [pb] = await tx`
          select text from playbook where user_id = ${ctx.userId} and attempt_id = ${attempt.id}
        `
        playbookNote = pb?.text ?? null
      }
    }

    const view = toAttemptView(
      attempt,
      attempt,
      { id: attempt.concept_id, name: attempt.concept_name },
      secrets,
      earlierNote,
      playbookNote
    )

    return ok({
      number: dailyRow.number,
      day: dayStr,
      instanceId: dailyRow.instance_id,
      attempt: view,
    })
  })
}

export async function handleGetDailyStats(ctx: Ctx): Promise<Response> {
  const url = new URL(ctx.req.url)
  const now = getEffectiveNow(ctx.req, Deno.env.get('ELEANOR_TEST_CLOCK'))
  const queryDay = url.searchParams.get('day')
  const dayStr = queryDay || formatUtcDate(now)

  const [statsRow] = await sql`
    select public.daily_stats(${dayStr}::date, ${ctx.userId}::uuid) as stats
  `

  const stats = statsRow?.stats
  if (!stats) {
    throw new HttpError('forbidden', 'Daily stats are only available after resolving today\'s daily problem')
  }

  const appOrigin = Deno.env.get('APP_ORIGIN') ?? 'http://127.0.0.1:5173'

  const symbol = stats.callerOutcome === 'correct' ? '✅' : '❌'
  const confPct = Math.round((Number(stats.callerConfidence) || 0) * 100)
  const solvedPct = Math.round(Number(stats.pctCorrect) || 0)
  const shareText = `Eleanor Daily #${stats.number} ${symbol} · ${confPct}% sure · solved by ${solvedPct}% · ${appOrigin}/daily`

  return ok({
    ...stats,
    shareText,
  })
}
