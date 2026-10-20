import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  call,
  testSql,
} from './helpers.ts'
import { getEffectiveNow } from '../../supabase/functions/_shared/daily.ts'

describe('Task 3.5: Daily Crux and crowd stats', () => {
  let user1Token: string
  let user1Id: string
  let user2Token: string
  let user2Id: string

  beforeAll(async () => {
    // 1. Ensure test users exist and are onboarded
    const u1 = await createTestUser('daily_u1')
    user1Token = u1.token
    user1Id = u1.user.id
    await call(
      '/onboarding',
      {
        handle: `daily_u1_${Math.random().toString(36).slice(2, 8)}`,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: true,
        tracks: ['judgment', 'logic', 'math'],
        intensity: 'balanced',
      },
      user1Token
    )

    const u2 = await createTestUser('daily_u2')
    user2Token = u2.token
    user2Id = u2.user.id
    await call(
      '/onboarding',
      {
        handle: `daily_u2_${Math.random().toString(36).slice(2, 8)}`,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: true,
        tracks: ['judgment', 'logic', 'math'],
        intensity: 'balanced',
      },
      user2Token
    )

    // 2. Clean up test dates in daily table and any invalid test items
    await testSql`
      delete from daily
      where day in ('2026-11-01', '2026-11-02', '2026-11-03', '2026-11-10', '2026-11-15', '2026-11-16', '2026-11-20')
    `
    await testSql`
      delete from items
      where id = 'logic.knights.two@1#4'
    `

    // 3. Ensure daily eligible items exist in judgment, logic, and math with rating in [1300, 1700]
    await testSql`
      update items
      set daily_eligible = true, rating = 1400, status = 'published'
      where id = 'judgment.base-rate.screening@1#2'
    `

    await testSql`
      update items
      set daily_eligible = true, rating = 1400, status = 'published'
      where id = 'logic.knights.two@1#2'
    `

    await testSql`
      update items
      set track_id = 'math', daily_eligible = true, rating = 1500, status = 'published'
      where id = 'judgment.base-rate.screening@1#4'
    `
  })

  afterAll(async () => {
    await testSql.end()
  })

  it('unit: test-clock header is ignored when ELEANOR_TEST_CLOCK is off or undefined', () => {
    const fakeReq = new Request('http://127.0.0.1:54321/functions/v1/api/daily', {
      headers: {
        'x-test-clock': '2026-11-01T00:00:00Z',
      },
    })

    const nowMs = Date.now()
    const targetMs = new Date('2026-11-01T00:00:00Z').getTime()

    // When flag is undefined
    const whenUndefined = getEffectiveNow(fakeReq, undefined)
    expect(Math.abs(whenUndefined.getTime() - nowMs)).toBeLessThan(5000)
    expect(whenUndefined.getTime()).not.toBe(targetMs)

    // When flag is '0'
    const whenOff = getEffectiveNow(fakeReq, '0')
    expect(Math.abs(whenOff.getTime() - nowMs)).toBeLessThan(5000)
    expect(whenOff.getTime()).not.toBe(targetMs)

    // When flag is '1'
    const whenOn = getEffectiveNow(fakeReq, '1')
    expect(whenOn.getTime()).toBe(targetMs)
  })

  it('two users calling GET /daily on the same day get the same instance id and the same prompt, but different attempt ids', async () => {
    const clock = '2026-11-10T12:00:00Z'
    const res1 = await call(
      '/daily',
      undefined,
      user1Token,
      'GET',
      { 'x-test-clock': clock }
    )
    expect(res1.status).toBe(200)
    expect(res1.data.ok).toBe(true)

    const res2 = await call(
      '/daily',
      undefined,
      user2Token,
      'GET',
      { 'x-test-clock': clock }
    )
    expect(res2.status).toBe(200)
    expect(res2.data.ok).toBe(true)

    const d1 = res1.data.data
    const d2 = res2.data.data

    expect(d1.day).toBe('2026-11-10')
    expect(d2.day).toBe('2026-11-10')
    expect(d1.number).toBe(d2.number)
    expect(d1.instanceId).toBe(d2.instanceId)

    // Same instance prompt
    expect(d1.attempt.prompt).toEqual(d2.attempt.prompt)

    // Different attempt ids
    expect(d1.attempt.id).not.toBe(d2.attempt.id)

    // Verify in database that attempts belong to each user with same instance_id
    const [a1] = await testSql`select instance_id, user_id from attempts where id = ${d1.attempt.id}`
    const [a2] = await testSql`select instance_id, user_id from attempts where id = ${d2.attempt.id}`
    expect(a1.instance_id).toBe(a2.instance_id)
    expect(a1.user_id).toBe(user1Id)
    expect(a2.user_id).toBe(user2Id)
  })

  it('20 parallel first calls create exactly one daily row', async () => {
    const clock = '2026-11-20T12:00:00Z'
    const calls = Array.from({ length: 20 }, (_, i) => {
      const token = i % 2 === 0 ? user1Token : user2Token
      return call(
        '/daily',
        undefined,
        token,
        'GET',
        { 'x-test-clock': clock }
      )
    })

    const results = await Promise.all(calls)
    for (const r of results) {
      expect(r.status).toBe(200)
      expect(r.data.ok).toBe(true)
      expect(r.data.data.day).toBe('2026-11-20')
    }

    const [countRow] = await testSql`
      select count(*)::int as count from daily where day = '2026-11-20'
    `
    expect(countRow.count).toBe(1)
  })

  it('daily commits create no rating_events and no echoes', async () => {
    const clock = '2026-11-15T12:00:00Z'
    const dailyRes = await call(
      '/daily',
      undefined,
      user1Token,
      'GET',
      { 'x-test-clock': clock }
    )
    expect(dailyRes.status).toBe(200)
    const attempt = dailyRes.data.data.attempt

    const rawAnswer = attempt.answerSpec.type === 'multi' ? ['A'] : '10'

    const commitRes = await call(
      `/attempts/${attempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: rawAnswer,
        confidence: 0.8,
      },
      user1Token,
      'POST'
    )
    expect(commitRes.status).toBe(200)
    expect(commitRes.data.ok).toBe(true)

    const ratingEvents = await testSql`
      select * from rating_events where attempt_id = ${attempt.id}
    `
    expect(ratingEvents.length).toBe(0)

    const echoes = await testSql`
      select * from echoes where source_attempt_id = ${attempt.id}
    `
    expect(echoes.length).toBe(0)
  })

  it('stats before committing → null/403; after committing → n, pctCorrect and shareText present; shareText contains no answer value', async () => {
    const clock = '2026-11-16T12:00:00Z'

    // User 1 gets daily
    const dailyRes = await call(
      '/daily',
      undefined,
      user1Token,
      'GET',
      { 'x-test-clock': clock }
    )
    expect(dailyRes.status).toBe(200)
    const attempt = dailyRes.data.data.attempt
    const instanceId = dailyRes.data.data.instanceId

    // Before committing: stats -> 403
    const statsBefore = await call(
      '/daily/stats',
      undefined,
      user1Token,
      'GET',
      { 'x-test-clock': clock }
    )
    expect(statsBefore.status).toBe(403)

    // User commits
    const rawAnswer = attempt.answerSpec.type === 'multi' ? ['A'] : '10'
    const commitRes = await call(
      `/attempts/${attempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: rawAnswer,
        confidence: 0.9,
      },
      user1Token,
      'POST'
    )
    expect(commitRes.status).toBe(200)

    // After committing: stats -> 200 with n, pctCorrect, shareText
    const statsAfter = await call(
      '/daily/stats',
      undefined,
      user1Token,
      'GET',
      { 'x-test-clock': clock }
    )
    expect(statsAfter.status).toBe(200)
    expect(statsAfter.data.ok).toBe(true)

    const stats = statsAfter.data.data
    expect(typeof stats.n).toBe('number')
    expect(stats.n).toBeGreaterThanOrEqual(1)
    expect(typeof stats.pctCorrect).toBe('number')
    expect(typeof stats.shareText).toBe('string')
    expect(stats.shareText.length).toBeGreaterThan(0)

    // Query secret answer to verify shareText does not leak it
    const [attRow] = await testSql`select instance_id from attempts where id = ${attempt.id}`
    const targetInstanceId = instanceId ?? attRow.instance_id
    const [secretRow] = await testSql`
      select answer from instance_secrets where instance_id = ${targetInstanceId}
    `
    const secretAnswerStr = JSON.stringify(secretRow.answer)
    expect(stats.shareText).not.toContain(secretAnswerStr)
  })

  it('with fixed clock injected, days 0, 1 and 2 rotate judgment → logic → math', async () => {
    // Day 0: 2026-11-01 -> judgment
    const resDay0 = await call(
      '/daily',
      undefined,
      user1Token,
      'GET',
      { 'x-test-clock': '2026-11-01T00:00:00Z' }
    )
    expect(resDay0.status).toBe(200)
    expect(resDay0.data.data.attempt.track).toBe('judgment')

    // Day 1: 2026-11-02 -> logic
    const resDay1 = await call(
      '/daily',
      undefined,
      user1Token,
      'GET',
      { 'x-test-clock': '2026-11-02T00:00:00Z' }
    )
    expect(resDay1.status).toBe(200)
    expect(resDay1.data.data.attempt.track).toBe('logic')

    // Day 2: 2026-11-03 -> math
    const resDay2 = await call(
      '/daily',
      undefined,
      user1Token,
      'GET',
      { 'x-test-clock': '2026-11-03T00:00:00Z' }
    )
    expect(resDay2.status).toBe(200)
    expect(resDay2.data.data.attempt.track).toBe('math')
  })
})
