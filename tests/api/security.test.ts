import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type postgres from 'postgres'
import { testSql } from './helpers.ts'
import { fail, HttpError } from '../../supabase/functions/api/http.ts'

const database = vi.hoisted(() => ({ sql: undefined as unknown }))
vi.mock('../../supabase/functions/api/db.ts', () => ({ get sql() { return database.sql } }))
type Route = (req: Request, ctx: { req: Request; userId: string; isAdmin: boolean }) => Promise<Response>
let route: Route
beforeAll(async () => { const path = '../../supabase/functions/api/router.ts'; route = (await import(path)).route })
afterAll(async () => { await testSql.end() })

async function request(path: string, userId: string, payload?: Record<string, unknown>, isAdmin = false) {
  const req = new Request(`http://localhost/api${path}`, {
    method: payload ? 'POST' : 'GET',
    body: payload ? JSON.stringify(payload) : undefined,
  })
  try { return await route(req, { req, userId, isAdmin }) }
  catch (error) { if (error instanceof HttpError) return fail(error.code, error.message); throw error }
}

async function profile(tx: postgres.Sql | postgres.TransactionSql, id: string) {
  await tx`insert into auth.users (id) values (${id})`
  await tx`
    insert into profiles (id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at, leaderboard_visible)
    values (${id}, ${`sec_${id.slice(0, 8)}`}, now(), now(), now(), false)
  `
}

async function fixture(run: (tx: postgres.TransactionSql, userId: string, attemptId: string, otherId: string, otherAttemptId: string) => Promise<void>) {
  const rollback = new Error('rollback security fixtures')
  try {
    await testSql.begin(async (tx) => {
      database.sql = new Proxy(tx, { get(target, key) { return key === 'begin' ? target.savepoint.bind(target) : Reflect.get(target, key) } })
      const userId = crypto.randomUUID(), otherId = crypto.randomUUID()
      const ids: string[] = []
      for (const id of [userId, otherId]) {
        await profile(tx, id)
        await tx`insert into track_ratings (user_id, track_id, rating, rd, n, peak) values (${id}, 'judgment', 1000, 350, 0, 1000)`
        const [instance] = await tx`
          insert into instances (item_id, seed, prompt, answer_spec)
          select id, 1, '[]', '{"type":"integer"}' from items where kind = 'generated' and track_id = 'judgment' order by id limit 1 returning id, item_id
        `
        await tx`insert into instance_secrets (instance_id, answer, misconceptions, steps, solution) values (${instance.id}, '4', '[]', '[]', '[]')`
        const [attempt] = await tx`
          insert into attempts (user_id, instance_id, item_id, track_id, concept_id, family_id, kind, state, rated)
          select ${id}, ${instance.id}, i.id, i.track_id, i.concept_id, i.family_id, 'selected', 'presented', true from items i where i.id = ${instance.item_id} returning id
        `
        ids.push(attempt.id)
      }
      await run(tx, userId, ids[0], otherId, ids[1])
      throw rollback
    })
  } catch (error) { if (error !== rollback) throw error }
}

it('rejects malformed path identifiers before querying the database', async () => {
  database.sql = undefined
  const userId = crypto.randomUUID()
  for (const path of ['/attempts/not-a-uuid', '/code/submissions/not-a-uuid']) {
    expect((await request(path, userId)).status).toBe(400)
  }
  expect((await request('/sets/%E0%A4/next', userId, { transitionId: crypto.randomUUID() })).status).toBe(400)
  expect((await request('/admin/items/not-an-item/anchor', userId, { transitionId: crypto.randomUUID(), reason: 'Reviewed the item' }, true)).status).toBe(400)
})

it('enforces 30 new sets per hour, ignores old events, and charges a retry once', () => fixture(async (tx, userId) => {
  await tx`insert into rate_events (user_id, kind) select ${userId}, 'set_create' from generate_series(1, 30)`
  const payload = { transitionId: crypto.randomUUID(), track: 'judgment', mode: 'unrated' }
  expect((await request('/sets', userId, payload)).status).toBe(429)
  expect(await tx`select id from transitions where id = ${payload.transitionId}`).toHaveLength(0)
  await tx`update rate_events set created_at = now() - interval '61 minutes' where user_id = ${userId}`
  expect((await request('/sets', userId, payload)).status).toBe(200)
  expect((await request('/sets', userId, payload)).status).toBe(200)
  const [count] = await tx`select count(*)::int as n from rate_events where user_id = ${userId} and created_at >= now() - interval '1 hour'`
  expect(count.n).toBe(1)
}))

it('enforces 300 commits per hour without resolving or rating a blocked attempt', () => fixture(async (tx, userId, attemptId) => {
  await tx`insert into rate_events (user_id, kind) select ${userId}, 'commit' from generate_series(1, 300)`
  const payload = { transitionId: crypto.randomUUID(), answer: '4', confidence: 0.8 }
  expect((await request(`/attempts/${attemptId}/commit`, userId, payload)).status).toBe(429)
  expect((await request(`/attempts/${attemptId}/give-up`, userId, { transitionId: crypto.randomUUID() })).status).toBe(429)
  const [attempt] = await tx`select state from attempts where id = ${attemptId}`
  expect(attempt.state).toBe('presented')
  expect(await tx`select id from rating_events where attempt_id = ${attemptId}`).toHaveLength(0)
  await tx`update rate_events set created_at = now() - interval '61 minutes' where user_id = ${userId}`
  expect((await request(`/attempts/${attemptId}/commit`, userId, payload)).status).toBe(200)
  expect((await request(`/attempts/${attemptId}/commit`, userId, payload)).status).toBe(200)
  const [count] = await tx`select count(*)::int as n from rate_events where user_id = ${userId} and created_at >= now() - interval '1 hour'`
  expect(count.n).toBe(1)
}))

it('refuses transition reuse across actions and attempts', () => fixture(async (tx, userId, attemptId, _otherId, otherAttemptId) => {
  await tx`update attempts set user_id = ${userId} where id = ${otherAttemptId}`
  for (const action of ['commit', 'give-up']) {
    const transitionId = crypto.randomUUID()
    await tx`insert into transitions (id, user_id, kind, attempt_id, response) values (${transitionId}, ${userId}, ${action === 'commit' ? 'commit_attempt' : 'give_up_attempt'}, ${otherAttemptId}, '{}')`
    expect((await request(`/attempts/${attemptId}/${action}`, userId, { transitionId, answer: '4', confidence: 0.8 })).status).toBe(409)
  }
}))

it('keeps another learner’s attempts and sets inaccessible without consuming rate events', () => fixture(async (tx, userId, _attemptId, otherId, otherAttemptId) => {
  const [set] = await tx`insert into sets (user_id, track_id, mode, size, rng_seed) values (${otherId}, 'judgment', 'unrated', 3, 1) returning id`
  for (const [path, payload] of [
    [`/attempts/${otherAttemptId}`, undefined],
    [`/sets/${set.id}/next`, { transitionId: crypto.randomUUID() }],
    [`/attempts/${otherAttemptId}/commit`, { transitionId: crypto.randomUUID(), answer: '4', confidence: 0.8 }],
    ['/code/run', { attemptId: otherAttemptId, language: 'python', source: 'print(1)' }],
  ] as const) expect((await request(path, userId, payload)).status).toBe(404)
  expect(await tx`select user_id from rate_events where user_id = ${userId}`).toHaveLength(0)
}))

it('serializes concurrent rate consumption at the last available set slot', async () => {
  const userId = crypto.randomUUID()
  database.sql = testSql
  await profile(testSql, userId)
  try {
    await testSql`insert into rate_events (user_id, kind) select ${userId}, 'set_create' from generate_series(1, 29)`
    const responses = await Promise.all([1, 2].map(() => request('/sets', userId, { transitionId: crypto.randomUUID(), track: 'judgment', mode: 'unrated' })))
    expect(responses.map((res) => res.status).sort()).toEqual([200, 429])
    expect(await testSql`select id from sets where user_id = ${userId}`).toHaveLength(1)
  } finally { await testSql`delete from auth.users where id = ${userId}` }
})
