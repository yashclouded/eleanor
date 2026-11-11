import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { adminClient, call, createTestUser, testSql } from './helpers.ts'

describe('API request hardening', () => {
  let learner: Awaited<ReturnType<typeof createTestUser>>
  const handle = `sec_${crypto.randomUUID().slice(0, 8)}`
  beforeAll(async () => {
    learner = await createTestUser('security')
    expect((await call('/onboarding', {
      handle, ageConfirmed: true, termsAccepted: true, pledgeAccepted: true,
      leaderboardVisible: false, tracks: ['judgment', 'logic'], intensity: 'balanced',
    }, learner.token)).status).toBe(201)
  })
  afterAll(async () => {
    if (learner) await adminClient.auth.admin.deleteUser(learner.user.id)
    await testSql.end()
  })

  it('rejects oversized envelopes before writes and disallowed origins on real requests', async () => {
    const oversized = await call('/handle', { handle: 'changed_handle', padding: 'é'.repeat(4096) }, learner.token)
    expect(oversized.status).toBe(400)
    expect(oversized.data.error.message).toContain('8 KB')
    const foreign = await call('/handle', { handle: 'changed_handle' }, learner.token, 'POST', { Origin: 'https://hostile.invalid' })
    expect(foreign.status).toBe(403)
    const me = await call('/me', undefined, learner.token)
    expect(me.data.data.profile.handle).toBe(handle)
  })

  it('rejects malformed UUIDs and percent escapes as client errors', async () => {
    for (const id of ['not-a-uuid', '%E0%A4%A']) {
      expect((await call(`/attempts/${id}`, undefined, learner.token)).status).toBe(400)
    }
  })

  it('enforces the set limit across concurrent requests and permits idempotent retry', async () => {
    await testSql`insert into rate_events (user_id, kind) select ${learner.user.id}, 'set' from generate_series(1,29)`
    const bodies = Array.from({ length: 4 }, () => ({ transitionId: crypto.randomUUID(), track: 'judgment', mode: 'unrated' }))
    const responses = await Promise.all(bodies.map((b) => call('/sets', b, learner.token)))
    expect(responses.map((r) => r.status).sort()).toEqual([200, 429, 429, 429])
    const success = responses.findIndex((r) => r.status === 200)
    const retry = await call('/sets', bodies[success], learner.token)
    expect(retry.data).toEqual(responses[success].data)
    const [row] = await testSql`select count(*)::int as n from rate_events where user_id=${learner.user.id} and kind='set'`
    expect(row.n).toBe(30)
    await testSql`delete from rate_events where user_id=${learner.user.id} and kind='set'`
  })

  it('caps commits across different attempts atomically without charging retries', async () => {
    const attempts = []
    for (const track of ['judgment', 'judgment']) {
      const set = await call('/sets', { transitionId: crypto.randomUUID(), track, mode: 'unrated' }, learner.token)
      const next = await call(`/sets/${set.data.data.set.id}/next`, { transitionId: crypto.randomUUID() }, learner.token)
      const id = next.data.data.id
      const [secret] = await testSql`select s.answer from attempts a join instance_secrets s on s.instance_id=a.instance_id where a.id=${id}`
      attempts.push({ id, payload: { transitionId: crypto.randomUUID(), answer: Array.isArray(secret.answer) ? secret.answer : String(secret.answer), confidence: 0.8 } })
    }
    await testSql`insert into rate_events (user_id, kind) select ${learner.user.id}, 'commit' from generate_series(1,299)`
    const responses = await Promise.all(attempts.map((a) => call(`/attempts/${a.id}/commit`, a.payload, learner.token)))
    expect(responses.map((r) => r.status).sort(), JSON.stringify(responses.map((r) => r.data))).toEqual([200, 429])
    const success = responses.findIndex((r) => r.status === 200)
    const winner = attempts[success]
    expect((await call(`/attempts/${winner.id}/commit`, winner.payload, learner.token)).data).toEqual(responses[success].data)
    const [row] = await testSql`select count(*)::int as n from rate_events where user_id=${learner.user.id} and kind='commit'`
    expect(row.n).toBe(300)
    const other = attempts[1 - success]
    const [untouched] = await testSql`select state from attempts where id=${other.id}`
    expect(untouched.state).toBe('presented')
    const reused = await call(`/attempts/${other.id}/give-up`, { transitionId: winner.payload.transitionId }, learner.token)
    expect(reused.status).toBe(409)
  })
})
