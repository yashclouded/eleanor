import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { adminClient, call, createTestUser, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, testSql } from './helpers.ts'

describe('Task 7.1: Admin model health and moderation', () => {
  let admin: Awaited<ReturnType<typeof createTestUser>>
  let learner: Awaited<ReturnType<typeof createTestUser>>
  let target: Awaited<ReturnType<typeof createTestUser>>
  const prefix = `ad71_${crypto.randomUUID().slice(0, 8)}`
  const counts = [60, 40, 200, 200]
  const items = counts.map((n, index) => `${prefix}_${n}_${index}@1#1`)

  beforeAll(async () => {
    admin = await createTestUser('admin71')
    learner = await createTestUser('learner71')
    target = await createTestUser('target71')
    for (const [index, account] of [admin, learner, target].entries()) {
      expect((await call('/onboarding', {
        handle: `${prefix}_${index}`, ageConfirmed: true, termsAccepted: true,
        pledgeAccepted: true, leaderboardVisible: true, tracks: ['judgment'],
      }, account.token)).status).toBe(201)
    }
    await adminClient.auth.admin.updateUserById(admin.user.id, { app_metadata: { role: 'admin' } })
    const { data } = await adminClient.auth.admin.generateLink({ type: 'magiclink', email: admin.user.email! })
    const fresh = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: signedIn, error } = await fresh.auth.verifyOtp({ token_hash: data.properties!.hashed_token, type: 'magiclink' })
    if (error || !signedIn.session) throw new Error(error?.message ?? 'No admin session')
    admin.token = signedIn.session.access_token
    for (const [index, n] of counts.entries()) {
      await testSql`
        insert into items (id, kind, source_id, source_version, level, track_id, concept_id,
          family_id, rating, rd, n, anchor, status, daily_eligible)
        select ${items[index]}, kind, source_id, source_version, level, track_id, concept_id,
          family_id, rating, rd, ${n}, false, status, false from items
        where id = 'judgment.base-rate.screening@1#1'
      `
      await seed(items[index], n, 0.7)
    }
    await testSql`delete from rating_events where subject_type = 'item' and subject_id = ${items[3]}`
    await testSql`update items set n = 0 where id = ${items[3]}`
  })

  afterAll(async () => {
    if (admin) await testSql`delete from moderation_actions where admin_id = ${admin.user.id}`
    for (const account of [target, learner, admin]) if (account) await adminClient.auth.admin.deleteUser(account.user.id)
    await testSql`delete from instances where item_id in ${testSql(items)}`
    await testSql`delete from items where id in ${testSql(items)}`
    await testSql`refresh materialized view private.leaderboard`
    await testSql.end()
  })

  async function seed(item: string, count: number, forecast: number, outcome = 'correct') {
    await testSql`
      with instances_inserted as (
        insert into instances (item_id, seed, skin, prompt, answer_spec)
        select ${item}, g, 'factory', '[]'::jsonb,
          '{"type":"number","tolerance":{"abs":0.1}}'::jsonb from generate_series(1, ${count}) g
        returning id
      ), attempts_inserted as (
        insert into attempts (user_id, instance_id, item_id, track_id, concept_id, family_id,
          kind, state, outcome, rated, confidence, forecast, answer, resolved_at)
        select ${target.user.id}, id, ${item}, 'judgment', 'judgment.base-rates', 'base-rate-screening',
          'selected', 'resolved', ${outcome}, true, 0.9, ${forecast}, '"PRIVATE_ANSWER"'::jsonb, now()
        from instances_inserted returning id
      )
      insert into rating_events (attempt_id, user_id, subject_type, subject_id, r_before, rd_before,
        r_after, rd_after, expected, score, model_version)
      select id, ${target.user.id}, 'item', ${item}, 1200, 100, 1201, 99, ${forecast}, ${outcome === 'correct' ? 1 : 0}, 'erm-1'
      from attempts_inserted
    `
  }

  it('denies non-admins on every admin route, including mutations', async () => {
    const cases: [string, unknown?][] = [
      ['/admin/model-health'], ['/admin/items?flagged=1'], ['/admin/flags'], ['/admin/reports'],
      [`/admin/items/${encodeURIComponent(items[0])}/retire`, { reason: 'Review item' }],
      [`/admin/items/${encodeURIComponent(items[0])}/anchor`, { reason: 'Review anchor' }],
      [`/admin/flags/${crypto.randomUUID()}/resolve`, { reason: 'Reviewed flag' }],
      [`/admin/users/${target.user.id}/action`, { action: 'ban', reason: 'Confirmed issue' }],
    ]
    for (const [path, body] of cases) expect((await call(path, body, learner.token)).status).toBe(403)
  })

  it('scores stored forecasts, returns track counts and drift, and validates the window', async () => {
    const baseline = await call('/admin/model-health?days=30', undefined, admin.token)
    expect(baseline.status).toBe(200)
    await seed(items[1], 1, 0.8)
    await seed(items[1], 1, 0.6, 'incorrect')
    const response = await call('/admin/model-health?days=30', undefined, admin.token)
    expect(response.status).toBe(200)
    // The two new responses contribute (.8-1)^2 + (.6-0)^2 = .04 + .36 = .4.
    const before = baseline.data.data
    const brier = (before.brier * before.n + 0.4) / (before.n + 2)
    expect(response.data.data.n).toBe(before.n + 2)
    expect(response.data.data.brier).toBeCloseTo(brier, 12)
    expect(response.data.data.bins).toHaveLength(5)
    expect(response.data.data.perTrack).toHaveLength(4)
    expect(response.data.data.learnerDrift).toBeInstanceOf(Array)
    expect(response.data.data.anchorDrift).toBeInstanceOf(Array)
    expect(JSON.stringify(response.data)).not.toContain('PRIVATE_ANSWER')
    for (const window of ['0', '-1', '366', '1.5', 'invalid']) {
      expect((await call(`/admin/model-health?days=${window}`, undefined, admin.token)).status).toBe(400)
    }
  })

  it('flags residual .3 at n=60, excludes n=40, and requires 200 responses to anchor', async () => {
    const response = await call('/admin/items?flagged=1', undefined, admin.token)
    expect(response.status).toBe(200)
    const listed = response.data.data.items
    expect(listed.find((item: { id: string }) => item.id === items[0])).toMatchObject({ n: 60 })
    expect(listed.some((item: { id: string }) => item.id === items[1])).toBe(false)
    expect((await call(`/admin/items/${encodeURIComponent(items[0])}/anchor`, { reason: 'Stable item review' }, admin.token)).status).toBe(409)
    expect((await call(`/admin/items/${encodeURIComponent(items[3])}/anchor`, { reason: 'Provisional responses only' }, admin.token)).status).toBe(409)
    expect((await call(`/admin/items/${encodeURIComponent(items[2])}/anchor`, { reason: 'Stable item review' }, admin.token)).status).toBe(200)
    const [anchored] = await testSql`select anchor, anchored_at from items where id = ${items[2]}`
    expect(anchored.anchor).toBe(true)
    expect(anchored.anchored_at).not.toBeNull()
    expect((await call(`/admin/items/${encodeURIComponent(items[0])}/retire`, { reason: 'Defective test item' }, admin.token)).status).toBe(200)
    const [retired] = await testSql`select status from items where id = ${items[0]}`
    expect(retired.status).toBe('retired')
    expect((await call('/admin/items?flagged=oops', undefined, admin.token)).status).toBe(400)
  })

  it('lists handles and statistics in queues, resolves a flag, and logs the reason', async () => {
    const [flag] = await testSql`
      insert into integrity_flags (user_id, track_id, kind, detail)
      values (${target.user.id}, 'judgment', 'improbable_run', '{"n":30,"z":5.48}'::jsonb) returning id
    `
    const [report] = await testSql`
      insert into reports (reporter_id, target_id, reason)
      values (${learner.user.id}, ${target.user.id}, 'Please review this account') returning id
    `
    const flags = await call('/admin/flags', undefined, admin.token)
    expect(flags.status).toBe(200)
    expect(flags.data.data.flags.find((f: { id: string }) => f.id === flag.id)).toMatchObject({ handle: `${prefix}_2` })
    const reports = await call('/admin/reports', undefined, admin.token)
    expect(reports.status).toBe(200)
    expect(reports.data.data.reports.find((r: { id: string }) => r.id === report.id)).toMatchObject({ handle: `${prefix}_2` })
    expect(JSON.stringify([flags.data, reports.data])).not.toContain('PRIVATE_ANSWER')
    expect((await call(`/admin/flags/${flag.id}/resolve`, { reason: 'Reviewed outcomes; no action' }, admin.token)).status).toBe(200)
    expect((await call(`/admin/flags/${flag.id}/resolve`, { reason: 'Duplicate review' }, admin.token)).status).toBe(409)
    const logs = await testSql`select reason, params from moderation_actions where admin_id = ${admin.user.id} and reason = 'Reviewed outcomes; no action'`
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ reason: 'Reviewed outcomes; no action', params: { flagId: flag.id } })
  })

  it('ban removes leaderboard eligibility, unban restores it, and unrate queues replay without deletion', async () => {
    await testSql`update track_ratings set n = 30, rd = 80, last_at = now() where user_id = ${target.user.id}`
    await testSql`refresh materialized view private.leaderboard`
    expect((await testSql`select handle from leaderboard where handle = ${`${prefix}_2`} and track_id = 'judgment'`).length).toBe(1)
    const action = (name: string, extra = {}) => call(`/admin/users/${target.user.id}/action`, { action: name, reason: 'Reviewed account evidence', ...extra }, admin.token)
    expect((await action('ban')).status).toBe(200)
    await testSql`refresh materialized view private.leaderboard`
    expect((await testSql`select handle from leaderboard where handle = ${`${prefix}_2`}`).length).toBe(0)
    expect((await action('unban')).status).toBe(200)
    const [before] = await testSql`select count(*)::int as n from attempts where user_id = ${target.user.id}`
    expect((await action('unrate', { from: new Date(Date.now() - 60_000).toISOString() })).status).toBe(200)
    const [after] = await testSql`select count(*)::int as n, count(*) filter (where rated)::int as rated from attempts where user_id = ${target.user.id}`
    expect(after).toEqual({ n: before.n, rated: 0 })
    const [log] = await testSql`select params from moderation_actions where admin_id = ${admin.user.id} and action = 'unrate'`
    expect(log.params).toMatchObject({ replayRequired: true })
  })

  it('rejects invalid IDs, dates, actions and empty reasons without mutations', async () => {
    for (const data of [
      { action: 'ban', reason: '' }, { action: 'delete', reason: 'Invalid action' },
      { action: ['ban'], reason: 'Invalid action type' },
      { action: 'unrate', reason: 'Invalid cutoff', from: 'yesterday' },
      { action: 'unrate', reason: 'Invalid cutoff', from: '2026-02-30T00:00:00Z' },
    ]) expect((await call(`/admin/users/${target.user.id}/action`, data, admin.token)).status).toBe(400)
    expect((await call('/admin/users/nope/action', { action: 'ban', reason: 'Review account' }, admin.token)).status).toBe(400)
    expect((await call(`/admin/items/${encodeURIComponent(items[1])}/retire`, {}, admin.token)).status).toBe(400)
    expect((await call(`/admin/users/${crypto.randomUUID()}/action`, { action: 'ban', reason: 'Review account' }, admin.token)).status).toBe(404)
  })
})
