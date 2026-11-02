import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type postgres from 'postgres'
import { readFile } from 'node:fs/promises'
import { testSql } from './helpers.ts'

const database = vi.hoisted(() => ({ sql: undefined as unknown }))
vi.mock('../../supabase/functions/api/db.ts', () => ({
  get sql() { return database.sql },
}))

type Route = (req: Request, ctx: { userId: string; isAdmin: boolean; req: Request }) => Promise<Response>
let route: Route
let migration: string
let adminId: string
let learnerId: string
let itemId: string

beforeAll(async () => {
  // A dynamic path keeps Deno-only server modules out of the browser's TS project.
  const routerPath = '../../supabase/functions/api/router.ts'
  route = (await import(routerPath)).route
  migration = await readFile('supabase/migrations/0005_model_health.sql', 'utf8').catch(() => '')
})

afterAll(async () => { await testSql.end() })

async function fixture(run: (tx: postgres.TransactionSql) => Promise<void>) {
  const rollback = new Error('Roll back admin fixtures')
  try {
    await testSql.begin(async (tx) => {
      // Admin writes use savepoints so the complete fixture can be rolled back.
      database.sql = new Proxy(tx, {
        get(target, key) { return key === 'begin' ? target.savepoint.bind(target) : Reflect.get(target, key) },
      })
      const [installed] = await tx`select to_regprocedure('public.admin_model_health(integer)') as function`
      if (!installed.function && migration) await tx.unsafe(migration)
      adminId = crypto.randomUUID()
      learnerId = crypto.randomUUID()
      itemId = `admin-test-${crypto.randomUUID()}`
      for (const id of [adminId, learnerId]) {
        await tx`insert into auth.users (id) values (${id})`
        await tx`
          insert into profiles (id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at, leaderboard_visible)
          values (${id}, ${`adm_${id.slice(0, 8)}`}, now(), now(), now(), true)
        `
      }
      await tx`
        insert into items (id, kind, source_id, source_version, level, track_id, concept_id, family_id, rating, rd, status)
        select ${itemId}, kind, source_id, source_version, level, track_id, concept_id, family_id, 1200, 250, 'published'
        from items order by id limit 1
      `
      await run(tx)
      throw rollback
    })
  } catch (error) {
    if (error !== rollback) throw error
  }
}

async function request(path: string, payload?: Record<string, unknown>, isAdmin = true) {
  const req = new Request(`http://localhost/api/admin${path}`, {
    method: payload ? 'POST' : 'GET',
    ...(payload ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) } : {}),
  })
  try {
    return await route(req, { userId: adminId, isAdmin, req })
  } catch (error) {
    if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
      const statuses: Record<string, number> = { invalid: 400, not_found: 404, conflict: 409 }
      const status = statuses[error.code]
      if (status) return new Response(JSON.stringify({ error: error.message }), { status })
    }
    throw error
  }
}

function action(extra: Record<string, unknown> = {}): Record<string, unknown> & { transitionId: string; reason: string } {
  return { transitionId: crypto.randomUUID(), reason: 'Reviewed by a moderator', ...extra }
}

async function attempts(tx: postgres.TransactionSql, points: { p: number; correct: boolean; rated?: boolean; days?: number }[]) {
  const ids: string[] = []
  for (const point of points) {
    const [instance] = await tx`
      insert into instances (item_id, seed, prompt, answer_spec)
      values (${itemId}, 1, '[]', '{}') returning id
    `
    const [attempt] = await tx`
      insert into attempts (user_id, instance_id, item_id, track_id, concept_id, family_id, kind, state, outcome, rated, confidence, forecast, answer, resolved_at)
      select ${learnerId}, ${instance.id}, id, track_id, concept_id, family_id, 'selected', 'resolved',
        ${point.correct ? 'correct' : 'incorrect'}, ${point.rated ?? true}, 0.9, ${point.p}, '"PRIVATE_ANSWER"',
        now() - ${point.days ?? 0} * interval '1 day'
      from items where id = ${itemId} returning id
    `
    ids.push(attempt.id)
  }
  return ids
}

describe('Task 7.1: admin model health and moderation', () => {
  it('rejects a non-admin on every route before reading or validating input', async () => {
    const routes: [string, Record<string, unknown>?][] = [
      ['/model-health'], ['/items?flagged=1'], ['/items/test/retire', {}],
      ['/items/test/anchor', {}], ['/flags'], ['/flags/test/resolve', {}],
      ['/reports'], ['/users/test/action', {}],
    ]
    for (const [path, payload] of routes) {
      expect((await request(path, payload, false)).status).toBe(403)
    }
  })

  it('computes model Brier, log loss, bins and counts from rated resolved forecasts only', () => fixture(async (tx) => {
    const baseline = (await (await request('/model-health?days=30')).json()).data
    await attempts(tx, [
      { p: 0.8, correct: true }, { p: 0.6, correct: false },
      { p: 0, correct: true, rated: false }, { p: 0, correct: true, days: 31 },
    ])
    const res = await request('/model-health?days=30')
    expect(res.status).toBe(200)
    const health = (await res.json()).data
    expect(health.n).toBe(baseline.n + 2)
    expect(health.brier).toBeCloseTo(((baseline.brier ?? 0) * baseline.n + 0.04 + 0.36) / health.n, 12)
    expect(health.logLoss).toBeCloseTo(((baseline.logLoss ?? 0) * baseline.n - Math.log(0.8) - Math.log(0.4)) / health.n, 12)
    expect(health.bins.reduce((sum: number, bin: { n: number }) => sum + bin.n, 0)).toBe(health.n)
    expect(health.perTrack.reduce((sum: number, track: { n: number }) => sum + track.n, 0)).toBe(health.n)
    expect(health.calError).toEqual(expect.any(Number))
    expect(health.overconfidence).toEqual(expect.any(Number))
    expect(JSON.stringify(health)).not.toContain('PRIVATE_ANSWER')
    for (const days of ['0', '-1', '1.5', '366', 'nope', '']) {
      expect((await request(`/model-health?days=${days}`)).status).toBe(400)
    }
  }))

  it('includes only items with at least 50 item events and absolute residual above 0.15', () => fixture(async (tx) => {
    const [attemptId] = await attempts(tx, [{ p: 0.5, correct: true }])
    async function events(n: number, expected: number) {
      await tx`
        insert into rating_events (attempt_id, user_id, subject_type, subject_id, r_before, rd_before, r_after, rd_after, expected, score, model_version)
        select ${attemptId}, ${learnerId}, 'item', ${itemId}, 1200, 100, 1201, 100, ${expected}, 1, 'erm-1'
        from generate_series(1, ${n})
      `
    }
    await events(40, 0.7)
    let rows = (await (await request('/items?flagged=1')).json()).data.items
    expect(rows.find((row: { id: string }) => row.id === itemId)).toBeUndefined()
    await events(20, 0.7)
    rows = (await (await request('/items?flagged=1')).json()).data.items
    expect(rows.find((row: { id: string }) => row.id === itemId)).toMatchObject({ n: 60, residual: expect.closeTo(0.3, 12) })
    await tx`update rating_events set expected = 0.9 where subject_id = ${itemId}`
    rows = (await (await request('/items?flagged=1')).json()).data.items
    expect(rows.find((row: { id: string }) => row.id === itemId)).toBeUndefined()
  }))

  it('uses one final weekly rating per stable learner and monitors frozen anchors without item events', () => fixture(async (tx) => {
    const baseline = (await (await request('/model-health')).json()).data
    const ids = await attempts(tx, Array.from({ length: 101 }, (_, i) => ({ p: 0.75, correct: true, days: i === 100 ? 0 : 1 })))
    await tx`
      insert into rating_events (attempt_id, user_id, subject_type, subject_id, r_before, rd_before, r_after, rd_after, expected, score, model_version, created_at)
      select a.id, a.user_id, 'track', a.track_id, 1200, 100,
        case when a.id = ${ids[100]}::uuid then 1400 else 1300 end, 100, 0.75, 1, 'erm-1', a.resolved_at
      from attempts a where a.user_id = ${learnerId}
    `
    await tx`update items set anchor = true where id = ${itemId}`
    await tx`update items set anchored_at = now() - interval '12 hours' where id = ${itemId}`
    const health = (await (await request('/model-health')).json()).data
    const [item] = await tx`select track_id from items where id = ${itemId}`
    const [clock] = await tx`select date_trunc('week', now() at time zone 'UTC')::date::text as week`
    const drift = health.learnerDrift.find((point: { track: string; week: string }) => point.track === item.track_id && point.week === clock.week)
    const before = baseline.learnerDrift.find((point: { track: string; week: string }) => point.track === item.track_id && point.week === drift.week)
    expect(drift.n).toBe((before?.n ?? 0) + 1)
    expect(drift.meanRating).toBeCloseTo(((before?.meanRating ?? 0) * (before?.n ?? 0) + 1400) / drift.n, 10)
    const anchor = health.anchorDrift.find((point: { track: string; week: string }) => point.track === item.track_id && point.week === clock.week)
    const anchorBefore = baseline.anchorDrift.find((point: { track: string; week: string }) => point.track === item.track_id && point.week === anchor.week)
    expect(anchor.n).toBe((anchorBefore?.n ?? 0) + 1)
    expect(anchor.residual).toBeCloseTo(((anchorBefore?.residual ?? 0) * (anchorBefore?.n ?? 0) + 0.25) / anchor.n, 10)
  }))

  it('denies browser roles direct access to the diagnostic view and function', () => fixture(async (tx) => {
    for (const role of ['anon', 'authenticated']) {
      const [permissions] = await tx`
        select has_function_privilege(${role}, 'public.admin_model_health(integer)', 'execute') as execute,
          has_table_privilege(${role}, 'public.admin_item_residuals', 'select') as read
      `
      expect(permissions).toEqual({ execute: false, read: false })
    }
  }))

  it('requires 200 responses before anchoring, records the freeze, and replays retries once', () => fixture(async (tx) => {
    expect((await request(`/items/${itemId}/anchor`, action())).status).toBe(409)
    await tx`update items set n = 200 where id = ${itemId}`
    const payload = action()
    expect((await request(`/items/${itemId}/anchor`, payload)).status).toBe(200)
    expect((await request(`/items/${itemId}/anchor`, payload)).status).toBe(200)
    const [item] = await tx`select anchor, anchored_at, rating, rd from items where id = ${itemId}`
    expect(item).toMatchObject({ anchor: true, rating: 1200, rd: 250 })
    expect(item.anchored_at).not.toBeNull()
    const notes = await tx`select params from moderation_actions where admin_id = ${adminId}`
    expect(notes).toHaveLength(1)
    expect(notes[0].params).toMatchObject({ itemId, operation: 'anchor', rating: 1200, rd: 250 })
  }))

  it('retires an item with an audit note and leaves its attempts intact', () => fixture(async (tx) => {
    const [attemptId] = await attempts(tx, [{ p: 0.5, correct: true }])
    expect((await request(`/items/${itemId}/retire`, action())).status).toBe(200)
    const [item] = await tx`select status from items where id = ${itemId}`
    expect(item.status).toBe('retired')
    expect(await tx`select id from attempts where id = ${attemptId}`).toHaveLength(1)
    const [note] = await tx`select action, params from moderation_actions where admin_id = ${adminId}`
    expect(note).toMatchObject({ action: 'note', params: { itemId, operation: 'retire', replayPending: true } })
  }))

  it('ban hides a learner after leaderboard refresh; unban restores eligibility and both actions are logged', () => fixture(async (tx) => {
    await tx`
      insert into track_ratings (user_id, track_id, rating, rd, n, peak, last_at)
      values (${learnerId}, 'judgment', 1400, 80, 25, 1400, now())
    `
    const [profile] = await tx`select handle from profiles where id = ${learnerId}`
    await tx`refresh materialized view leaderboard`
    expect(await tx`select handle from leaderboard where handle = ${profile.handle}`).not.toHaveLength(0)
    expect((await request(`/users/${learnerId}/action`, action({ action: 'ban' }))).status).toBe(200)
    await tx`refresh materialized view leaderboard`
    expect(await tx`select handle from leaderboard where handle = ${profile.handle}`).toHaveLength(0)
    expect((await request(`/users/${learnerId}/action`, action({ action: 'unban' }))).status).toBe(200)
    await tx`refresh materialized view leaderboard`
    expect(await tx`select handle from leaderboard where handle = ${profile.handle}`).not.toHaveLength(0)
    expect(await tx`select id from moderation_actions where user_id = ${learnerId}`).toHaveLength(2)
  }))

  it('unrates only resolved attempts in the selected period, preserves history, and queues replay once', () => fixture(async (tx) => {
    const [recentId, oldId] = await attempts(tx, [{ p: 0.5, correct: true }, { p: 0.5, correct: false, days: 10 }])
    const payload = action({ action: 'unrate', from: new Date(Date.now() - 86400000).toISOString() })
    expect((await request(`/users/${learnerId}/action`, payload)).status).toBe(200)
    expect((await request(`/users/${learnerId}/action`, payload)).status).toBe(200)
    const rows = await tx`select id, rated, answer from attempts where user_id = ${learnerId}`
    expect(rows.find((row) => row.id === recentId)).toMatchObject({ rated: false, answer: 'PRIVATE_ANSWER' })
    expect(rows.find((row) => row.id === oldId)?.rated).toBe(true)
    const notes = await tx`select action, params from moderation_actions where user_id = ${learnerId}`
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({ action: 'unrate', params: { from: payload.from, replayPending: true, affected: 1 } })
  }))

  it('validates identifiers, reasons, transitions, actions, and ISO dates without partial writes', () => fixture(async (tx) => {
    const path = `/users/${learnerId}/action`
    for (const payload of [
      action({ reason: ' ' }), action({ reason: 'x'.repeat(1001) }),
      action({ action: 'delete' }), action({ transitionId: 'bad' }),
      action({ action: 'unrate', from: 'yesterday' }),
      action({ action: 'unrate', from: '2026-02-30T00:00:00Z' }),
      action({ action: 'unrate', from: '2026-01-01' }),
    ]) expect((await request(path, payload)).status).toBe(400)
    expect((await request('/users/not-a-uuid/action', action({ action: 'ban' }))).status).toBe(400)
    expect((await request(`/users/${crypto.randomUUID()}/action`, action({ action: 'ban' }))).status).toBe(404)
    expect(await tx`select id from moderation_actions where admin_id = ${adminId}`).toHaveLength(0)
  }))

  it('queues flags and reports with handles and statistics only and audits flag resolution', () => fixture(async (tx) => {
    const [flag] = await tx`
      insert into integrity_flags (user_id, track_id, kind, detail)
      values (${learnerId}, 'judgment', 'rapid_gain', '{"gain":450,"answer":"PRIVATE_ANSWER","code":"PRIVATE_CODE"}') returning id
    `
    await tx`insert into reports (reporter_id, target_id, reason) values (${adminId}, ${learnerId}, 'Please review these outcomes')`
    for (const path of ['/flags', '/reports', '/items']) {
      const res = await request(path)
      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).not.toContain('PRIVATE_ANSWER')
      expect(text).not.toContain('PRIVATE_CODE')
      expect(text).toContain(path === '/items' ? itemId : `adm_${learnerId.slice(0, 8)}`)
    }
    const payload = action()
    expect((await request(`/flags/${flag.id}/resolve`, payload)).status).toBe(200)
    expect((await request(`/flags/${flag.id}/resolve`, payload)).status).toBe(200)
    const [resolved] = await tx`select resolved_at, resolution from integrity_flags where id = ${flag.id}`
    expect(resolved.resolved_at).not.toBeNull()
    expect(resolved.resolution).toBe(payload.reason)
    expect(await tx`select id from moderation_actions where admin_id = ${adminId}`).toHaveLength(1)
  }))
})
