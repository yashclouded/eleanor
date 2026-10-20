import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  call,
  testSql,
  adminClient,
} from './helpers.ts'

describe('Task 3.6: Export, account deletion, and reports', () => {
  beforeAll(async () => {
    // Ensure clean state
  })

  afterAll(async () => {
    await testSql.end()
  })

  it("export contains user's attempts and playbook, no other user's ids, and no instance_secrets for a presented attempt", async () => {
    // 1. Create User A and User B
    const userA = await createTestUser('export_a')
    const userB = await createTestUser('export_b')

    const handleA = `export_a_${Math.random().toString(36).slice(2, 8)}`
    const handleB = `export_b_${Math.random().toString(36).slice(2, 8)}`

    await call(
      '/onboarding',
      {
        handle: handleA,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: true,
        tracks: ['judgment'],
        intensity: 'balanced',
      },
      userA.token
    )

    await call(
      '/onboarding',
      {
        handle: handleB,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: true,
        tracks: ['judgment'],
        intensity: 'balanced',
      },
      userB.token
    )

    // 2. User A starts a set to get a presented attempt
    const setResA = await call(
      '/sets',
      {
        transitionId: crypto.randomUUID(),
        track: 'judgment',
        mode: 'rated',
      },
      userA.token,
      'POST'
    )
    expect(setResA.status).toBe(200)
    const setIdA = setResA.data.data.set.id

    const nextResA = await call(
      `/sets/${setIdA}/next`,
      { transitionId: crypto.randomUUID() },
      userA.token,
      'POST'
    )
    expect(nextResA.status).toBe(200)
    const presentedAttemptA = nextResA.data.data

    // Insert a unique secret answer for this presented instance
    const secretKeyword = `SECRET_PRESENTED_${Date.now()}_XYZ`
    await testSql`
      update instance_secrets
      set answer = ${JSON.stringify(secretKeyword)}::jsonb
      where instance_id = (select instance_id from attempts where id = ${presentedAttemptA.id})
    `

    // 3. User A creates a second attempt that resolves and adds a playbook entry
    const playbookText = `My special playbook insight ${Date.now()}`
    const resolvedAttemptId = crypto.randomUUID()
    const instId = crypto.randomUUID()
    await testSql`
      insert into instances (id, item_id, seed, skin, prompt, answer_spec)
      values (${instId}, 'judgment.base-rate.screening@1#1', 1, 'factory', '[]'::jsonb, '{"type":"number","tolerance":{"abs":0.1}}'::jsonb)
    `
    await testSql`
      insert into instance_secrets (instance_id, answer, misconceptions, steps, solution)
      values (${instId}, '10'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
    `
    await testSql`
      insert into attempts (
        id, user_id, set_id, slot, instance_id, item_id, track_id, concept_id, family_id,
        kind, state, outcome, rated, answer, confidence, presented_at, resolved_at, revealed_at
      ) values (
        ${resolvedAttemptId}, ${userA.user.id}, ${setIdA}, 99, ${instId}, 'judgment.base-rate.screening@1#1',
        'judgment', 'judgment.base-rates', 'base-rate-screening', 'selected',
        'revealed', 'correct', true, '10'::jsonb, 0.9, now(), now(), now()
      )
    `
    await testSql`
      insert into playbook (id, user_id, attempt_id, concept_id, text)
      values (${crypto.randomUUID()}, ${userA.user.id}, ${resolvedAttemptId}, 'judgment.base-rates', ${playbookText})
    `

    // 4. User B also starts a set
    await call(
      '/sets',
      {
        transitionId: crypto.randomUUID(),
        track: 'judgment',
        mode: 'rated',
      },
      userB.token,
      'POST'
    )

    // 5. Call GET /export as User A
    const exportRes = await call(
      '/export',
      undefined,
      userA.token,
      'GET'
    )
    expect(exportRes.status).toBe(200)

    const contentDisp = exportRes.headers.get('content-disposition') || ''
    expect(contentDisp).toContain('attachment')
    expect(contentDisp).toContain(`eleanor-export-${handleA}-`)

    const exportRawText = typeof exportRes.data === 'string'
      ? exportRes.data
      : JSON.stringify(exportRes.data)

    const exportDoc = typeof exportRes.data === 'string'
      ? JSON.parse(exportRes.data)
      : exportRes.data

    expect(exportDoc.schemaVersion).toBe(1)
    expect(exportDoc.profile.handle).toBe(handleA)

    // Contains user's playbook
    expect(exportRawText).toContain(playbookText)

    // Contains user's attempts
    expect(exportDoc.attempts.length).toBeGreaterThanOrEqual(2)

    // Does NOT contain other user's ID
    expect(exportRawText).not.toContain(userB.user.id)

    // Does NOT contain secrets for a presented attempt
    expect(exportRawText).not.toContain(secretKeyword)
  })

  it('delete with wrong handle → 400; delete with right handle → auth user gone, zero rows in public tables, leaderboard clean, handle reusable', async () => {
    // 1. Create and onboard user
    const user = await createTestUser('del_user')
    const handle = `del_${Math.random().toString(36).slice(2, 8)}`

    await call(
      '/onboarding',
      {
        handle,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: true,
        tracks: ['judgment'],
        intensity: 'balanced',
      },
      user.token
    )

    // 2. Start a set so the user has rows in sets, attempts, etc.
    await call(
      '/sets',
      {
        transitionId: crypto.randomUUID(),
        track: 'judgment',
        mode: 'rated',
      },
      user.token,
      'POST'
    )

    // 3. Delete with wrong handle -> 400
    const wrongRes = await call(
      '/account/delete',
      { confirmHandle: 'wrong_handle_123' },
      user.token,
      'POST'
    )
    expect(wrongRes.status).toBe(400)

    // Verify user still exists
    const stillHere = await adminClient.auth.admin.getUserById(user.user.id)
    expect(stillHere.data.user).toBeDefined()

    // 4. Delete with right handle -> 200
    const rightRes = await call(
      '/account/delete',
      { confirmHandle: handle },
      user.token,
      'POST'
    )
    expect(rightRes.status).toBe(200)

    // 5. Verify auth user is gone
    const goneUser = await adminClient.auth.admin.getUserById(user.user.id)
    expect(goneUser.data.user).toBeNull()

    // 6. Query each public table for user's id
    const tables = [
      'profiles',
      'sets',
      'attempts',
      'transitions',
      'track_ratings',
      'concept_ratings',
      'rating_events',
      'echoes',
      'misconception_stats',
      'playbook',
      'code_submissions',
      'rate_events',
      'integrity_flags',
    ]

    for (const table of tables) {
      const col = table === 'profiles' ? 'id' : 'user_id'
      const rows = await testSql.unsafe(
        `select count(*)::int as count from public.${table} where ${col} = '${user.user.id}'`
      )
      expect(rows[0].count).toBe(0)
    }

    // 7. Verify leaderboard does not list the handle
    const lbRows = await testSql`
      select count(*)::int as count from public.leaderboard where handle = ${handle}
    `
    expect(lbRows[0].count).toBe(0)

    // 8. Re-register the same handle with a new user -> succeeds
    const newUser = await createTestUser('reuse_handle')
    const reOnboardRes = await call(
      '/onboarding',
      {
        handle,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: true,
        tracks: ['judgment'],
        intensity: 'balanced',
      },
      newUser.token
    )
    expect([200, 201]).toContain(reOnboardRes.status)
    expect(reOnboardRes.data.data.profile.handle).toBe(handle)
  })

  it('reports: the 6th report in a day → 429', async () => {
    // 1. Create reporter and target user
    const reporter = await createTestUser('reporter')
    const target = await createTestUser('target')

    const reporterHandle = `rep_${Math.random().toString(36).slice(2, 8)}`
    const targetHandle = `tgt_${Math.random().toString(36).slice(2, 8)}`

    await call(
      '/onboarding',
      {
        handle: reporterHandle,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: true,
        tracks: ['judgment'],
        intensity: 'balanced',
      },
      reporter.token
    )

    await call(
      '/onboarding',
      {
        handle: targetHandle,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: true,
        tracks: ['judgment'],
        intensity: 'balanced',
      },
      target.token
    )

    // 2. Submit 5 reports -> all 200
    for (let i = 1; i <= 5; i++) {
      const res = await call(
        '/reports',
        {
          handle: targetHandle,
          reason: `Valid report reason number ${i} for test`,
        },
        reporter.token,
        'POST'
      )
      expect(res.status).toBe(200)
      expect(res.data.ok).toBe(true)
    }

    // 3. Submit 6th report in the same day -> 429
    const sixthRes = await call(
      '/reports',
      {
        handle: targetHandle,
        reason: 'This is the 6th report attempt and should fail',
      },
      reporter.token,
      'POST'
    )
    expect(sixthRes.status).toBe(429)
    expect(sixthRes.data.ok).toBe(false)
  })
})
