import type postgres from 'npm:postgres@3.4.5'
import { HttpError } from './http.ts'

export async function rateLimit(
  tx: postgres.TransactionSql, userId: string, kind: string, limit: number, window: string
): Promise<void> {
  // Serialize count and insert across concurrent requests for the same quota.
  await tx`select pg_advisory_xact_lock(hashtextextended(${`${userId}:rate:${kind}`}, 0))`
  const [row] = await tx`
    select count(*)::int as count from rate_events
    where user_id = ${userId} and kind = ${kind} and created_at >= now() - ${window}::interval
  `
  if (row.count >= limit) throw new HttpError('rate_limited', `Limit reached: ${limit} per ${window}`)
  await tx`insert into rate_events (user_id, kind) values (${userId}, ${kind})`
}
