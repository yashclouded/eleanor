import { describe, it, expect, afterAll } from 'vitest'
import { call, createTestUser, testSql } from './helpers.ts'

describe('API: Sets and next problem', () => {
  afterAll(async () => {
    await testSql.end()
  })

  let seq = 0
  async function onboardUser(prefix: string) {
    const user = await createTestUser(prefix)
    const cleanPrefix = prefix.slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '')
    const id = `${seq++}_${(Date.now() % 10000).toString(36)}`
    const handle = `u_${cleanPrefix}_${id}`.slice(0, 20)
    const res = await call(
      '/onboarding',
      {
        handle,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: true,
        tracks: ['judgment', 'logic'],
        intensity: 'balanced',
      },
      user.token
    )
    if (res.status !== 201) {
      throw new Error(`onboarding failed (${res.status}): ${JSON.stringify(res.data)}`)
    }
    return user
  }

  it('starting a rated set twice returns the same set', async () => {
    const user = await onboardUser('set_user1')
    const tId1 = crypto.randomUUID()
    const res1 = await call('/sets', { transitionId: tId1, track: 'judgment', mode: 'rated' }, user.token)
    expect(res1.status).toBe(200)
    expect(res1.data.ok).toBe(true)
    const set1 = res1.data.data.set

    const tId2 = crypto.randomUUID()
    const res2 = await call('/sets', { transitionId: tId2, track: 'judgment', mode: 'rated' }, user.token)
    expect(res2.status).toBe(200)
    expect(res2.data.ok).toBe(true)
    const set2 = res2.data.data.set

    expect(set1.id).toBe(set2.id)
  })

  it('next twice without resolving returns the same attempt (same id, same prompt)', async () => {
    const user = await onboardUser('set_user2')
    const setRes = await call(
      '/sets',
      { transitionId: crypto.randomUUID(), track: 'judgment', mode: 'rated' },
      user.token
    )
    const set = setRes.data.data.set

    const tId1 = crypto.randomUUID()
    const next1 = await call(`/sets/${set.id}/next`, { transitionId: tId1 }, user.token)
    expect(next1.status).toBe(200)
    expect(next1.data.ok).toBe(true)
    const att1 = next1.data.data

    const tId2 = crypto.randomUUID()
    const next2 = await call(`/sets/${set.id}/next`, { transitionId: tId2 }, user.token)
    expect(next2.status).toBe(200)
    expect(next2.data.ok).toBe(true)
    const att2 = next2.data.data

    expect(att1.id).toBe(att2.id)
    expect(att1.prompt).toEqual(att2.prompt)
  })

  it('the first attempts in a new track are kind placement', async () => {
    const user = await onboardUser('set_user3')
    const setRes = await call(
      '/sets',
      { transitionId: crypto.randomUUID(), track: 'judgment', mode: 'rated' },
      user.token
    )
    const set = setRes.data.data.set

    const nextRes = await call(`/sets/${set.id}/next`, { transitionId: crypto.randomUUID() }, user.token)
    expect(nextRes.status).toBe(200)
    expect(nextRes.data.ok).toBe(true)
    expect(nextRes.data.data.kind).toBe('placement')
    expect(nextRes.data.data.rated).toBe(true)
  })

  it('the response JSON for a presented attempt contains none of: "answer", "solution", "steps", "misconceptions", "forecast", "itemRating"', async () => {
    const user = await onboardUser('set_user4')
    const setRes = await call(
      '/sets',
      { transitionId: crypto.randomUUID(), track: 'judgment', mode: 'rated' },
      user.token
    )
    const set = setRes.data.data.set

    const nextRes = await call(`/sets/${set.id}/next`, { transitionId: crypto.randomUUID() }, user.token)
    expect(nextRes.status).toBe(200)
    expect(nextRes.data.ok).toBe(true)

    const raw = await nextRes.text()
    const forbidden = ['"answer"', '"solution"', '"steps"', '"misconceptions"', '"forecast"', '"itemRating"']
    for (const key of forbidden) {
      expect(raw).not.toContain(key)
    }
  })

  it("another user's set or attempt -> 404", async () => {
    const u1 = await onboardUser('user_owner')
    const u2 = await onboardUser('user_intruder')

    const setRes = await call(
      '/sets',
      { transitionId: crypto.randomUUID(), track: 'judgment', mode: 'rated' },
      u1.token
    )
    const set = setRes.data.data.set

    const nextRes = await call(`/sets/${set.id}/next`, { transitionId: crypto.randomUUID() }, u1.token)
    const attempt = nextRes.data.data

    // User 2 accessing User 1's set -> 404
    const badSet = await call(`/sets/${set.id}/next`, { transitionId: crypto.randomUUID() }, u2.token)
    expect(badSet.status).toBe(404)

    // User 2 accessing User 1's attempt -> 404
    const badAtt = await call(`/attempts/${attempt.id}`, undefined, u2.token)
    expect(badAtt.status).toBe(404)
  })

  it("with every published item retired -> next returns done with reason 'no_items' and the set is closed 'exhausted'", async () => {
    const user = await onboardUser('set_user_retired')
    const setRes = await call(
      '/sets',
      { transitionId: crypto.randomUUID(), track: 'logic', mode: 'rated' },
      user.token
    )
    const set = setRes.data.data.set

    // Temporarily retire all items for logic track
    await testSql`update items set status = 'retired' where track_id = 'logic'`

    try {
      const nextRes = await call(`/sets/${set.id}/next`, { transitionId: crypto.randomUUID() }, user.token)
      expect(nextRes.status).toBe(200)
      expect(nextRes.data.ok).toBe(true)
      expect(nextRes.data.data.done).toBe(true)
      expect(nextRes.data.data.reason).toBe('no_items')

      // Check DB that set is marked exhausted
      const [closedSet] = await testSql`select * from sets where id = ${set.id}`
      expect(closedSet.closed_at).not.toBeNull()
      expect(closedSet.close_reason).toBe('exhausted')
    } finally {
      // Restore items
      await testSql`update items set status = 'published' where track_id = 'logic'`
    }
  })

  it('an unrated set creates attempts with rated = false', async () => {
    const user = await onboardUser('set_user_unrated')
    const setRes = await call(
      '/sets',
      { transitionId: crypto.randomUUID(), track: 'judgment', mode: 'unrated' },
      user.token
    )
    const set = setRes.data.data.set
    expect(set.mode).toBe('unrated')

    const nextRes = await call(`/sets/${set.id}/next`, { transitionId: crypto.randomUUID() }, user.token)
    expect(nextRes.status).toBe(200)
    expect(nextRes.data.ok).toBe(true)
    expect(nextRes.data.data.rated).toBe(false)
    expect(nextRes.data.data.kind).toBe('unrated')
  })

  it('a stub test for resolving all slots marks the set completed', async () => {
    const user = await onboardUser('set_user_complete')
    const setRes = await call(
      '/sets',
      { transitionId: crypto.randomUUID(), track: 'judgment', mode: 'rated' },
      user.token
    )
    const set = setRes.data.data.set
    const setSize = set.size

    // First slot via next
    const next0 = await call(`/sets/${set.id}/next`, { transitionId: crypto.randomUUID() }, user.token)
    expect(next0.status).toBe(200)
    expect(next0.data.ok).toBe(true)
    const attempt0 = next0.data.data
    expect(attempt0.slot).toBe(0)

    // Stub resolution of slot 0 by direct SQL
    await testSql`
      update attempts
      set state = 'resolved',
          outcome = 'correct',
          confidence = 0.9,
          item_rating = 1200,
          rating_delta = 15,
          resolved_at = now()
      where id = ${attempt0.id}
    `

    // Stub remaining slots of the set directly in SQL (as content has only 1 template for judgment)
    for (let slot = 1; slot < setSize; slot++) {
      const instId = crypto.randomUUID()
      await testSql`
        insert into instances (id, item_id, seed, skin, prompt, answer_spec, created_at)
        values (${instId}, 'judgment.base-rate.screening@1#1', ${slot}, 'factory', '[]'::jsonb, '{}'::jsonb, now())
      `
      await testSql`
        insert into attempts (
          id, user_id, set_id, slot, instance_id, item_id,
          track_id, concept_id, family_id, kind, state, rated,
          outcome, confidence, item_rating, rating_delta, resolved_at, presented_at
        ) values (
          ${crypto.randomUUID()}, ${set.user_id}, ${set.id}, ${slot}, ${instId}, 'judgment.base-rate.screening@1#1',
          'judgment', 'judgment.base-rates', 'base-rate-screening', 'selected', 'resolved', true,
          'correct', 0.85, 1200, 10, now(), now()
        )
      `
    }

    // Calling next after all slots resolved should mark set completed
    const finalNext = await call(`/sets/${set.id}/next`, { transitionId: crypto.randomUUID() }, user.token)
    expect(finalNext.status).toBe(200)
    expect(finalNext.data.ok).toBe(true)
    expect(finalNext.data.data.done).toBe(true)
    expect(finalNext.data.data.summary).toBeDefined()

    const [closedSet] = await testSql`select * from sets where id = ${set.id}`
    expect(closedSet.closed_at).not.toBeNull()
    expect(closedSet.close_reason).toBe('completed')
  })
})
