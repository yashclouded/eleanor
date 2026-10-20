import { describe, it, expect, afterAll } from 'vitest'
import { call, createTestUser, createUserClient, testSql } from './helpers.ts'

describe('API: Repair ladder, reveal and playbook', () => {
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
        tracks: ['judgment'],
        intensity: 'balanced',
      },
      user.token
    )
    if (res.status !== 201) {
      throw new Error(`onboarding failed (${res.status}): ${JSON.stringify(res.data)}`)
    }
    return user
  }

  async function startAttempt(user: { token: string }) {
    const setRes = await call(
      '/sets',
      { transitionId: crypto.randomUUID(), track: 'judgment', mode: 'rated' },
      user.token
    )
    const set = setRes.data.data.set
    const nextRes = await call(
      `/sets/${set.id}/next`,
      { transitionId: crypto.randomUUID() },
      user.token
    )
    return { set, attempt: nextRes.data.data }
  }

  it('repair on a presented attempt -> 409; repair on a correct attempt -> 409', async () => {
    const user = await onboardUser('rep_pres')
    const { attempt } = await startAttempt(user)

    // Attempt is presented -> repair gives 409
    const repairPres = await call(
      `/attempts/${attempt.id}/repair`,
      { transitionId: crypto.randomUUID(), stepIndex: 0, answer: '10' },
      user.token
    )
    expect(repairPres.status).toBe(409)

    // Commit correctly -> attempt is resolved with outcome 'correct'
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

    // Repair on a correct attempt gives 409
    const repairCorr = await call(
      `/attempts/${attempt.id}/repair`,
      { transitionId: crypto.randomUUID(), stepIndex: 0, answer: '10' },
      user.token
    )
    expect(repairCorr.status).toBe(409)
  })

  it('a wrong step returns its explanation and advances; a correct step returns explain null; stepIndex out of order -> 409', async () => {
    const user = await onboardUser('rep_step')
    const { attempt } = await startAttempt(user)

    // Commit incorrectly
    const commitRes = await call(
      `/attempts/${attempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: '999999',
        confidence: 0.8,
        declaredHelp: false,
      },
      user.token
    )
    expect(commitRes.status).toBe(200)
    expect(commitRes.data.data.outcome).toBe('incorrect')

    const [sec] = await testSql`
      select steps from instance_secrets
      where instance_id = (select instance_id from attempts where id = ${attempt.id})
    `
    const steps = typeof sec.steps === 'string' ? JSON.parse(sec.steps) : sec.steps
    expect(steps.length).toBeGreaterThan(1)

    // 1. Calling stepIndex out of order (stepIndex = 1 when repair_step = 0) -> 409
    const outOfOrderRes = await call(
      `/attempts/${attempt.id}/repair`,
      { transitionId: crypto.randomUUID(), stepIndex: 1, answer: String(steps[1].answer) },
      user.token
    )
    expect(outOfOrderRes.status).toBe(409)

    // 2. Submit wrong answer on step 0 -> correct: false, returns explain and next: step 1
    const wrongStepRes = await call(
      `/attempts/${attempt.id}/repair`,
      { transitionId: crypto.randomUUID(), stepIndex: 0, answer: '999999' },
      user.token
    )
    expect(wrongStepRes.status).toBe(200)
    expect(wrongStepRes.data.ok).toBe(true)
    expect(wrongStepRes.data.data.correct).toBe(false)
    expect(wrongStepRes.data.data.explain).toBeDefined()
    expect(wrongStepRes.data.data.explain.length).toBeGreaterThan(0)
    expect(wrongStepRes.data.data.next).toEqual({
      index: 1,
      prompt: steps[1].prompt,
      tolerance: steps[1].tolerance,
    })

    // Calling stepIndex 0 again now that repair_step is 1 -> 409
    const replayOldStep = await call(
      `/attempts/${attempt.id}/repair`,
      { transitionId: crypto.randomUUID(), stepIndex: 0, answer: '10' },
      user.token
    )
    expect(replayOldStep.status).toBe(409)

    // 3. Submit correct answer on step 1 -> correct: true, explain null, next: step 2
    const correctStepRes = await call(
      `/attempts/${attempt.id}/repair`,
      { transitionId: crypto.randomUUID(), stepIndex: 1, answer: String(steps[1].answer) },
      user.token
    )
    expect(correctStepRes.status).toBe(200)
    expect(correctStepRes.data.ok).toBe(true)
    expect(correctStepRes.data.data.correct).toBe(true)
    expect(correctStepRes.data.data.explain).toBeNull()
    if (steps.length > 2) {
      expect(correctStepRes.data.data.next.index).toBe(2)
    }
  })

  it('the last step gives next null; repair never changes track_ratings (compare before and after)', async () => {
    const user = await onboardUser('rep_last')
    const { attempt } = await startAttempt(user)

    // Give up attempt -> resolved as gave_up
    const giveUpRes = await call(
      `/attempts/${attempt.id}/give-up`,
      { transitionId: crypto.randomUUID() },
      user.token
    )
    expect(giveUpRes.status).toBe(200)

    // Snapshot track rating right after give-up
    const [ratingBefore] = await testSql`
      select rating, rd, n from track_ratings
      where user_id = ${user.user.id} and track_id = 'judgment'
    `

    const [sec] = await testSql`
      select steps from instance_secrets
      where instance_id = (select instance_id from attempts where id = ${attempt.id})
    `
    const steps = typeof sec.steps === 'string' ? JSON.parse(sec.steps) : sec.steps

    // Step through each step
    for (let i = 0; i < steps.length; i++) {
      const stepRes = await call(
        `/attempts/${attempt.id}/repair`,
        { transitionId: crypto.randomUUID(), stepIndex: i, answer: String(steps[i].answer) },
        user.token
      )
      expect(stepRes.status).toBe(200)
      expect(stepRes.data.ok).toBe(true)

      if (i === steps.length - 1) {
        expect(stepRes.data.data.next).toBeNull()
      } else {
        expect(stepRes.data.data.next).not.toBeNull()
        expect(stepRes.data.data.next.index).toBe(i + 1)
      }
    }

    // Snapshot track rating after all repairs
    const [ratingAfter] = await testSql`
      select rating, rd, n from track_ratings
      where user_id = ${user.user.id} and track_id = 'judgment'
    `
    expect(ratingAfter.rating).toBe(ratingBefore.rating)
    expect(ratingAfter.rd).toBe(ratingBefore.rd)
    expect(ratingAfter.n).toBe(ratingBefore.n)
  })

  it('reveal before resolve -> 409; reveal after resolve returns the solution and answer; reveal twice with the same transitionId replays', async () => {
    const user = await onboardUser('rev_flow')
    const { attempt } = await startAttempt(user)

    // 1. Reveal on presented attempt -> 409
    const revealPres = await call(
      `/attempts/${attempt.id}/reveal`,
      { transitionId: crypto.randomUUID() },
      user.token
    )
    expect(revealPres.status).toBe(409)

    // 2. Commit attempt
    await call(
      `/attempts/${attempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: '999999',
        confidence: 0.5,
        declaredHelp: false,
      },
      user.token
    )

    // 3. Reveal after resolve
    const tId = crypto.randomUUID()
    const revealRes1 = await call(
      `/attempts/${attempt.id}/reveal`,
      { transitionId: tId },
      user.token
    )
    expect(revealRes1.status).toBe(200)
    expect(revealRes1.data.ok).toBe(true)
    const view1 = revealRes1.data.data
    expect(view1.state).toBe('revealed')
    expect(view1.reveal).toBeDefined()
    expect(view1.reveal.solution).toBeDefined()
    expect(view1.reveal.solution.length).toBeGreaterThan(0)
    expect(view1.reveal.answer).toBeDefined()

    // 4. Reveal twice with same transitionId -> replays identically
    const revealRes2 = await call(
      `/attempts/${attempt.id}/reveal`,
      { transitionId: tId },
      user.token
    )
    expect(revealRes2.status).toBe(200)
    expect(revealRes2.data.ok).toBe(true)
    expect(revealRes2.data.data).toEqual(view1)
  })

  it('earlierNote: create a playbook entry on attempt 1 (family F), then reveal an echo attempt in family F -> earlierNote equals that text; it is absent before reveal', async () => {
    const user = await onboardUser('rev_echo')
    const { set: set1, attempt: attempt1 } = await startAttempt(user)

    // Commit attempt 1 and reveal it
    const commit1 = await call(
      `/attempts/${attempt1.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: '999999',
        confidence: 0.5,
        declaredHelp: false,
      },
      user.token
    )
    expect(commit1.status).toBe(200)

    await call(
      `/attempts/${attempt1.id}/reveal`,
      { transitionId: crypto.randomUUID() },
      user.token
    )

    // Insert a playbook note on attempt 1
    const noteText = 'Always compute the false positive population first!'
    await testSql`
      insert into playbook (user_id, attempt_id, concept_id, text)
      values (${user.user.id}, ${attempt1.id}, ${attempt1.concept.id}, ${noteText})
    `

    // Make the generated echo immediately due and set attempt1 resolved 2 hours ago
    await testSql`
      update echoes
      set due_at = now() - interval '1 hour'
      where user_id = ${user.user.id} and family_id = ${attempt1.familyId ?? 'base-rate-screening'}
    `
    await testSql`
      update attempts
      set resolved_at = now() - interval '2 hours'
      where id = ${attempt1.id}
    `

    // Close set 1 so a new set can start
    await testSql`
      update sets
      set closed_at = now(), close_reason = 'completed'
      where id = ${set1.id}
    `

    // Start set 2 -> slot 0 will pick the due echo
    const setRes2 = await call(
      '/sets',
      { transitionId: crypto.randomUUID(), track: 'judgment', mode: 'rated' },
      user.token
    )
    const set2 = setRes2.data.data.set

    const echoNextRes = await call(
      `/sets/${set2.id}/next`,
      { transitionId: crypto.randomUUID() },
      user.token
    )
    expect(echoNextRes.status).toBe(200)
    const echoAttempt = echoNextRes.data.data
    expect(echoAttempt.kind).toBe('echo')

    // Before reveal: reveal and earlierNote are absent
    expect(echoAttempt.reveal).toBeUndefined()

    // Commit the echo attempt
    const echoCommit = await call(
      `/attempts/${echoAttempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: '999999',
        confidence: 0.6,
        declaredHelp: false,
      },
      user.token
    )
    expect(echoCommit.status).toBe(200)
    expect(echoCommit.data.data.reveal).toBeUndefined()

    // Reveal the echo attempt -> earlierNote equals the playbook note from attempt 1
    const echoReveal = await call(
      `/attempts/${echoAttempt.id}/reveal`,
      { transitionId: crypto.randomUUID() },
      user.token
    )
    expect(echoReveal.status).toBe(200)
    expect(echoReveal.data.data.reveal).toBeDefined()
    expect(echoReveal.data.data.reveal.earlierNote).toBe(noteText)
  })

  it('RLS: a playbook insert by the client succeeds after reveal (use a user-scoped supabase-js client in the test)', async () => {
    const user = await onboardUser('rev_rls')
    const { attempt } = await startAttempt(user)

    // Commit attempt -> state is 'resolved' (not revealed yet)
    await call(
      `/attempts/${attempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: '999999',
        confidence: 0.5,
        declaredHelp: false,
      },
      user.token
    )

    const client = createUserClient(user.token)

    // 1. Attempt insert before reveal -> fails with RLS policy violation
    const { error: errorBefore } = await client
      .from('playbook')
      .insert({
        user_id: user.user.id,
        attempt_id: attempt.id,
        concept_id: attempt.concept.id,
        text: 'This should fail before reveal',
      })
    expect(errorBefore).toBeDefined()

    // 2. Reveal the attempt
    const revealRes = await call(
      `/attempts/${attempt.id}/reveal`,
      { transitionId: crypto.randomUUID() },
      user.token
    )
    expect(revealRes.status).toBe(200)

    // 3. Attempt insert after reveal -> succeeds
    const { data: inserted, error: errorAfter } = await client
      .from('playbook')
      .insert({
        user_id: user.user.id,
        attempt_id: attempt.id,
        concept_id: attempt.concept.id,
        text: 'This should succeed after reveal',
      })
      .select()
    expect(errorAfter).toBeNull()
    expect(inserted).toHaveLength(1)
    expect(inserted![0].text).toBe('This should succeed after reveal')
  })
})
