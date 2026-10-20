import { sql } from '../db.ts'
import { ok, body, HttpError } from '../http.ts'
import type { Ctx } from '../router.ts'

interface CreateReportBody {
  handle: string
  reason: string
}

function isCreateReportBody(x: unknown): x is CreateReportBody {
  if (!x || typeof x !== 'object') return false
  const b = x as Record<string, unknown>
  return (
    typeof b.handle === 'string' &&
    typeof b.reason === 'string' &&
    b.reason.trim().length >= 5 &&
    b.reason.trim().length <= 1000
  )
}

export async function handleCreateReport(ctx: Ctx): Promise<Response> {
  const b = await body(ctx.req, isCreateReportBody)

  const [target] = await sql`
    select id from profiles where handle = ${b.handle}
  `
  if (!target) {
    throw new HttpError('not_found', 'Target handle not found')
  }

  return await sql.begin(async (tx) => {
    // Rate limit: max 5 reports per user per day (past 24h)
    const [rateCountRow] = await tx`
      select count(*)::int as count
      from rate_events
      where user_id = ${ctx.userId}
        and kind = 'report'
        and created_at >= (now() - interval '24 hours')
    `
    if (rateCountRow.count >= 5) {
      throw new HttpError('rate_limited', 'Daily report limit reached (maximum 5 reports per day)')
    }

    await tx`
      insert into rate_events (user_id, kind, created_at)
      values (${ctx.userId}, 'report', now())
    `

    const [newReport] = await tx`
      insert into reports (reporter_id, target_id, reason, created_at)
      values (${ctx.userId}, ${target.id}, ${b.reason.trim()}, now())
      returning id
    `

    return ok({ id: newReport.id })
  })
}
