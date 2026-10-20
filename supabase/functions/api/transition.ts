import type postgres from 'npm:postgres@3.4.5'
import { HttpError, isUuid } from './http.ts'

export async function withTransition<T>(
  tx: postgres.TransactionSql,
  t: { id: string; userId: string; kind: string; attemptId?: string },
  run: () => Promise<T>
): Promise<{ replayed: boolean; response: T }> {
  if (!isUuid(t.id)) {
    throw new HttpError('invalid', 'Invalid transition id')
  }

  const inserted = await tx`
    insert into transitions (id, user_id, kind, attempt_id, response)
    values (${t.id}, ${t.userId}, ${t.kind}, ${t.attemptId ?? null}, '{}'::jsonb)
    on conflict (id) do nothing
    returning id
  `

  if (inserted.length === 0) {
    const existing = await tx`
      select user_id, kind, response
      from transitions
      where id = ${t.id}
    `
    if (existing.length === 0) {
      throw new HttpError('conflict', 'Transition not found')
    }
    const row = existing[0]
    if (row.user_id !== t.userId || row.kind !== t.kind) {
      throw new HttpError('conflict', 'Transition ID already exists for another user or action')
    }
    const response = typeof row.response === 'string' ? JSON.parse(row.response) : row.response
    return { replayed: true, response: response as T }
  }

  const result = await run()

  await tx`
    update transitions
    set response = ${JSON.stringify(result)}::jsonb
    where id = ${t.id}
  `

  return { replayed: false, response: result }
}
