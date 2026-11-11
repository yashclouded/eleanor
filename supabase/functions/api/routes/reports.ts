import { sql } from '../db.ts'
import { ok, body, HttpError } from '../http.ts'
import { rateLimit } from '../rate-limit.ts'
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
    await rateLimit(tx, ctx.userId, 'report', 5, '24 hours')

    const [newReport] = await tx`
      insert into reports (reporter_id, target_id, reason, created_at)
      values (${ctx.userId}, ${target.id}, ${b.reason.trim()}, now())
      returning id
    `

    return ok({ id: newReport.id })
  })
}
