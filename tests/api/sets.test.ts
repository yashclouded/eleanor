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

  it('completing every slot through real commits closes the set as completed and returns a summary with correct deltas', async () => {
    // Insert temporary published items for different concepts and families
    const testItemIds = [
      'judgment.base-rate.screening@1#1_freq',
      'judgment.base-rate.screening@1#2_freq',
      'judgment.base-rate.screening@1#3_freq',
      'judgment.base-rate.screening@1#1_freq2',
      'judgment.base-rate.screening@1#2_freq2',
      'judgment.base-rate.screening@1#3_freq2',
      'judgment.base-rate.screening@1#1_est',
      'judgment.base-rate.screening@1#2_est',
      'judgment.base-rate.screening@1#3_est',
      'judgment.base-rate.screening@1#1_est2',
      'judgment.base-rate.screening@1#2_est2',
      'judgment.base-rate.screening@1#3_est2',
      'judgment.base-rate.screening@1#1_cond',
      'judgment.base-rate.screening@1#2_cond',
      'judgment.base-rate.screening@1#3_cond',
      'judgment.base-rate.screening@1#1_exp',
      'judgment.base-rate.screening@1#2_exp',
      'judgment.base-rate.screening@1#3_exp',
      'judgment.base-rate.screening@1#1_base',
      'judgment.base-rate.screening@1#2_base',
      'judgment.base-rate.screening@1#3_base',
    ]

    await testSql`
      insert into families (id, concept_id)
      values
        ('fam_freq', 'judgment.frequencies'),
        ('fam_freq2', 'judgment.frequencies'),
        ('fam_est', 'judgment.estimation'),
        ('fam_est2', 'judgment.estimation'),
        ('fam_cond', 'judgment.conditional'),
        ('fam_exp', 'judgment.expected-value'),
        ('fam_base', 'judgment.base-rates')
      on conflict (id) do nothing
    `

    await testSql`
      insert into items (id, kind, source_id, source_version, level, track_id, concept_id, family_id, rating, rd, status, anchor)
      values
        ('judgment.base-rate.screening@1#1_freq', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.frequencies', 'fam_freq', 1200, 250, 'published', true),
        ('judgment.base-rate.screening@1#2_freq', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.frequencies', 'fam_freq', 1500, 250, 'published', true),
        ('judgment.base-rate.screening@1#3_freq', 'generated', 'judgment.base-rate.screening', 1, 3, 'judgment', 'judgment.frequencies', 'fam_freq', 1800, 250, 'published', true),
        ('judgment.base-rate.screening@1#1_freq2', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.frequencies', 'fam_freq2', 1200, 250, 'published', true),
        ('judgment.base-rate.screening@1#2_freq2', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.frequencies', 'fam_freq2', 1500, 250, 'published', true),
        ('judgment.base-rate.screening@1#3_freq2', 'generated', 'judgment.base-rate.screening', 1, 3, 'judgment', 'judgment.frequencies', 'fam_freq2', 1800, 250, 'published', true),
        ('judgment.base-rate.screening@1#1_est', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.estimation', 'fam_est', 1200, 250, 'published', true),
        ('judgment.base-rate.screening@1#2_est', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.estimation', 'fam_est', 1500, 250, 'published', true),
        ('judgment.base-rate.screening@1#3_est', 'generated', 'judgment.base-rate.screening', 1, 3, 'judgment', 'judgment.estimation', 'fam_est', 1800, 250, 'published', true),
        ('judgment.base-rate.screening@1#1_est2', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.estimation', 'fam_est2', 1200, 250, 'published', true),
        ('judgment.base-rate.screening@1#2_est2', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.estimation', 'fam_est2', 1500, 250, 'published', true),
        ('judgment.base-rate.screening@1#3_est2', 'generated', 'judgment.base-rate.screening', 1, 3, 'judgment', 'judgment.estimation', 'fam_est2', 1800, 250, 'published', true),
        ('judgment.base-rate.screening@1#1_cond', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.conditional', 'fam_cond', 1200, 250, 'published', true),
        ('judgment.base-rate.screening@1#2_cond', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.conditional', 'fam_cond', 1500, 250, 'published', true),
        ('judgment.base-rate.screening@1#3_cond', 'generated', 'judgment.base-rate.screening', 1, 3, 'judgment', 'judgment.conditional', 'fam_cond', 1800, 250, 'published', true),
        ('judgment.base-rate.screening@1#1_exp', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.expected-value', 'fam_exp', 1200, 250, 'published', true),
        ('judgment.base-rate.screening@1#2_exp', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.expected-value', 'fam_exp', 1500, 250, 'published', true),
        ('judgment.base-rate.screening@1#3_exp', 'generated', 'judgment.base-rate.screening', 1, 3, 'judgment', 'judgment.expected-value', 'fam_exp', 1800, 250, 'published', true),
        ('judgment.base-rate.screening@1#1_base', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.base-rates', 'fam_base', 1200, 250, 'published', true),
        ('judgment.base-rate.screening@1#2_base', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.base-rates', 'fam_base', 1500, 250, 'published', true),
        ('judgment.base-rate.screening@1#3_base', 'generated', 'judgment.base-rate.screening', 1, 3, 'judgment', 'judgment.base-rates', 'fam_base', 1800, 250, 'published', true)
      on conflict (id) do update set status = 'published'
    `

    try {
      const user = await onboardUser('set_user_complete')
      const setRes = await call(
        '/sets',
        { transitionId: crypto.randomUUID(), track: 'judgment', mode: 'rated' },
        user.token
      )
      const set = setRes.data.data.set
      const setSize = set.size

      for (let slot = 0; slot < setSize; slot++) {
        const nextRes = await call(`/sets/${set.id}/next`, { transitionId: crypto.randomUUID() }, user.token)
        expect(nextRes.status).toBe(200)
        expect(nextRes.data.ok).toBe(true)
        const attempt = nextRes.data.data
        expect(attempt.slot).toBe(slot)

        // Real commit with secret answer
        const [sec] = await testSql`
          select answer from instance_secrets
          where instance_id = (select instance_id from attempts where id = ${attempt.id})
        `
        const commitRes = await call(
          `/attempts/${attempt.id}/commit`,
          {
            transitionId: crypto.randomUUID(),
            answer: String(sec.answer),
            confidence: 0.9,
            declaredHelp: false,
          },
          user.token
        )
        expect(commitRes.status).toBe(200)
        expect(commitRes.data.ok).toBe(true)
      }

      // Calling next after all slots resolved marks set completed and returns summary
      const finalNext = await call(`/sets/${set.id}/next`, { transitionId: crypto.randomUUID() }, user.token)
      expect(finalNext.status).toBe(200)
      expect(finalNext.data.ok).toBe(true)
      expect(finalNext.data.data.done).toBe(true)
      expect(finalNext.data.data.summary).toBeDefined()
      expect(finalNext.data.data.summary.attempts).toHaveLength(setSize)
      expect(finalNext.data.data.summary.ratingAfter).toBeGreaterThan(finalNext.data.data.summary.ratingBefore)

      const [closedSet] = await testSql`select * from sets where id = ${set.id}`
      expect(closedSet.closed_at).not.toBeNull()
      expect(closedSet.close_reason).toBe('completed')
    } finally {
      await testSql`update items set status = 'retired' where id = any(${testItemIds})`
    }
  })
})
