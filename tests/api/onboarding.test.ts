import { describe, it, expect, afterAll } from 'vitest'
import { call, createTestUser, testSql } from './helpers.ts'
import { withTransition } from '../../supabase/functions/api/transition.ts'

describe('API: Onboarding and transitions', () => {
  afterAll(async () => {
    await testSql.end()
  })

  it('unauthenticated -> 401', async () => {
    const res = await call('/me')
    expect(res.status).toBe(401)
  })

  it('a missing leaderboardVisible -> 400', async () => {
    const { token } = await createTestUser('valid_user_missing_lb')
    const res = await call(
      '/onboarding',
      {
        handle: 'valid_user_1',
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        tracks: ['judgment', 'logic'],
      },
      token
    )
    expect(res.status).toBe(400)
    expect(res.data.ok).toBe(false)
    expect(res.data.error.code).toBe('invalid')
  })

  it("a bad handle 'Ab!' -> 400", async () => {
    const { token } = await createTestUser('bad_handle_user')
    const res = await call(
      '/onboarding',
      {
        handle: 'Ab!',
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: true,
        tracks: ['logic'],
      },
      token
    )
    expect(res.status).toBe(400)
    expect(res.data.ok).toBe(false)
    expect(res.data.error.code).toBe('invalid')
  })

  it('success creates track ratings at 1200/350', async () => {
    const { token } = await createTestUser('good_user')
    const handle = `user_${Date.now().toString(36).slice(-6)}`
    const res = await call(
      '/onboarding',
      {
        handle,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: true,
        tracks: ['logic', 'math'],
        intensity: 'balanced',
      },
      token
    )
    expect(res.status).toBe(201)
    expect(res.data.ok).toBe(true)

    // GET /me should return profile and track ratings
    const meRes = await call('/me', undefined, token)
    expect(meRes.status).toBe(200)
    expect(meRes.data.ok).toBe(true)
    expect(meRes.data.data.profile).toBeDefined()
    expect(meRes.data.data.profile.handle).toBe(handle)

    const ratings = meRes.data.data.trackRatings
    expect(ratings).toHaveLength(2)
    for (const r of ratings) {
      expect(r.rating).toBe(1200)
      expect(r.rd).toBe(350)
      expect(r.peak).toBe(1200)
      expect(r.n).toBe(0)
      expect(r.effectiveRd).toBe(350)
      expect(r.provisional).toBe(true)
    }
  })

  it('onboarding twice -> 409', async () => {
    const { token } = await createTestUser('twice_user')
    const handle = `user_${Date.now().toString(36).slice(-6)}_a`
    const res1 = await call(
      '/onboarding',
      {
        handle,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: false,
        tracks: ['logic'],
      },
      token
    )
    expect(res1.status).toBe(201)

    const res2 = await call(
      '/onboarding',
      {
        handle: `user_${Date.now().toString(36).slice(-6)}_b`,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: false,
        tracks: ['logic'],
      },
      token
    )
    expect(res2.status).toBe(409)
    expect(res2.data.ok).toBe(false)
    expect(res2.data.error.code).toBe('conflict')
  })

  it('a taken handle -> 409', async () => {
    const handle = `shared_${Date.now().toString(36).slice(-6)}`
    const u1 = await createTestUser('owner_user')
    const u2 = await createTestUser('claimant_user')

    const res1 = await call(
      '/onboarding',
      {
        handle,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: true,
        tracks: ['judgment'],
      },
      u1.token
    )
    expect(res1.status).toBe(201)

    const res2 = await call(
      '/onboarding',
      {
        handle,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: true,
        tracks: ['judgment'],
      },
      u2.token
    )
    expect(res2.status).toBe(409)
    expect(res2.data.ok).toBe(false)
    expect(res2.data.error.code).toBe('conflict')
  })

  it('a second handle change within 30 days -> 409', async () => {
    const { token } = await createTestUser('change_user')
    const initialHandle = `h1_${Date.now().toString(36).slice(-6)}`
    await call(
      '/onboarding',
      {
        handle: initialHandle,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: true,
        tracks: ['math'],
      },
      token
    )

    const secondHandle = `h2_${Date.now().toString(36).slice(-6)}`
    const change1 = await call('/handle', { handle: secondHandle }, token)
    expect(change1.status).toBe(200)
    expect(change1.data.ok).toBe(true)
    expect(change1.data.data.profile.handle).toBe(secondHandle)

    const thirdHandle = `h3_${Date.now().toString(36).slice(-6)}`
    const change2 = await call('/handle', { handle: thirdHandle }, token)
    expect(change2.status).toBe(409)
    expect(change2.data.ok).toBe(false)
    expect(change2.data.error.code).toBe('conflict')
  })

  describe('withTransition', () => {
    it('the same transition id twice returns replayed: true with an identical response; a different user reusing the id -> 409', async () => {
      const u1 = await createTestUser('trans_user_1')
      const u2 = await createTestUser('trans_user_2')
      const h1 = `trans1_${Date.now().toString(36).slice(-5)}`
      const h2 = `trans2_${Date.now().toString(36).slice(-5)}`
      await call(
        '/onboarding',
        {
          handle: h1,
          ageConfirmed: true,
          termsAccepted: true,
          pledgeAccepted: true,
          leaderboardVisible: true,
          tracks: ['judgment'],
        },
        u1.token
      )
      await call(
        '/onboarding',
        {
          handle: h2,
          ageConfirmed: true,
          termsAccepted: true,
          pledgeAccepted: true,
          leaderboardVisible: true,
          tracks: ['judgment'],
        },
        u2.token
      )
      const transitionId = crypto.randomUUID()

      // First run: calls run() and stores response
      const res1 = await testSql.begin(async (tx) => {
        return await withTransition(
          tx,
          { id: transitionId, userId: u1.user.id, kind: 'test_action' },
          async () => ({ answer: 42, text: 'hello' })
        )
      })
      expect(res1.replayed).toBe(false)
      expect(res1.response).toEqual({ answer: 42, text: 'hello' })

      // Second run with same id, user, and kind: returns replayed: true with identical response
      let runCalled = false
      const res2 = await testSql.begin(async (tx) => {
        return await withTransition(
          tx,
          { id: transitionId, userId: u1.user.id, kind: 'test_action' },
          async () => {
            runCalled = true
            return { answer: 99, text: 'modified' }
          }
        )
      })
      expect(runCalled).toBe(false)
      expect(res2.replayed).toBe(true)
      expect(res2.response).toEqual({ answer: 42, text: 'hello' })

      // Third run with different user reusing the transition id -> 409 conflict
      await expect(
        testSql.begin(async (tx) => {
          return await withTransition(
            tx,
            { id: transitionId, userId: u2.user.id, kind: 'test_action' },
            async () => ({ answer: 1 })
          )
        })
      ).rejects.toMatchObject({ code: 'conflict' })
    })
  })
})
