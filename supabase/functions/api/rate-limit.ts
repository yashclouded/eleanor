import type postgres from 'npm:postgres@3.4.5'
import { HttpError } from './http.ts'

const LIMITS = {
  set: { count: 30, seconds: 3600 },
  commit: { count: 300, seconds: 3600 },
  code_run: { count: 20, seconds: 600 },
  report: { count: 5, seconds: 86400 },
} as const

export async function consumeRate(tx: postgres.TransactionSql, userId: string, kind: keyof typeof LIMITS) {
  const limit = LIMITS[kind]
  // Count and insert serialize across requests, including requests for different attempts.
  await tx`select pg_advisory_xact_lock(hashtextextended(${`rate:${userId}:${kind}`}, 0))`
  const [row] = await tx`
    select count(*)::int as n from rate_events
    where user_id = ${userId} and kind = ${kind}
      and created_at > now() - make_interval(secs => ${limit.seconds})
  `
  if (row.n >= limit.count) throw new HttpError('rate_limited', `${kind} rate limit reached`)
  await tx`insert into rate_events (user_id, kind) values (${userId}, ${kind})`
}
