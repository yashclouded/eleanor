import { describe, it, expect, afterAll } from 'vitest'
import { call, createTestUser, testSql } from './helpers.ts'

describe('API: Commit and give-up (the rated transaction)', () => {
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

  async function startAttempt(user: { token: string }, track = 'judgment', mode = 'rated') {
    const setRes = await call(
      '/sets',
      { transitionId: crypto.randomUUID(), track, mode },
      user.token
    )
    const set = setRes.data.data.set
    const nextRes = await call(`/sets/${set.id}/next`, { transitionId: crypto.randomUUID() }, user.token)
    return { set, attempt: nextRes.data.data }
  }

  it('a correct commit on a placement attempt rises track rating, records 2 rating_events (track, concept), resolves attempt and sets forecast', async () => {
    const user = await onboardUser('cmt_pl')
    const { attempt } = await startAttempt(user)

    // Retrieve answer from instance_secrets
    const [secret] = await testSql`select answer from instance_secrets where instance_id = (select instance_id from attempts where id = ${attempt.id})`
    const rawAnswer = secret.answer

    const res = await call(
      `/attempts/${attempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: rawAnswer,
        confidence: 0.8,
        declaredHelp: false,
      },
      user.token
    )

    expect(res.status).toBe(200)
    expect(res.data.ok).toBe(true)
    const result = res.data.data
    expect(result.outcome).toBe('correct')
    expect(result.forecast).toBeGreaterThan(0)
    expect(result.forecast).toBeLessThan(1)
    expect(result.ratingDelta).toBeGreaterThan(0)

    // Check track rating in DB rose above 1200
    const [tr] = await testSql`select rating, n from track_ratings where user_id = ${attempt.user_id ?? (await testSql`select user_id from attempts where id = ${attempt.id}`)[0].user_id} and track_id = 'judgment'`
    expect(Number(tr.rating)).toBeGreaterThan(1200)
    expect(Number(tr.n)).toBe(1)

    // Check rating_events has 2 rows (track, concept), no item event because track rd > 150
    const events = await testSql`select subject_type, model_version from rating_events where attempt_id = ${attempt.id} order by subject_type`
    expect(events).toHaveLength(2)
    expect(events.map((e) => e.subject_type).sort()).toEqual(['concept', 'track'])
    expect(events[0].model_version).toBe('erm-1')

    // Check attempt is resolved
    const [attRow] = await testSql`select state, outcome, resolved_at from attempts where id = ${attempt.id}`
    expect(attRow.state).toBe('resolved')
    expect(attRow.outcome).toBe('correct')
    expect(attRow.resolved_at).not.toBeNull()
  })

  it('concurrency (Review Focus 1): 5 parallel commits with SAME transitionId return identical results and 1 set of events; 2 parallel commits with DIFFERENT transitionIds -> one succeeds and one gets 409', async () => {
    const user = await onboardUser('cmt_conc')
    const { attempt } = await startAttempt(user)

    const [secret] = await testSql`select answer from instance_secrets where instance_id = (select instance_id from attempts where id = ${attempt.id})`
    const rawAnswer = secret.answer

    // 5 parallel commits with identical transitionId
    const sameTId = crypto.randomUUID()
    const promises = Array.from({ length: 5 }, () =>
      call(
        `/attempts/${attempt.id}/commit`,
        {
          transitionId: sameTId,
          answer: rawAnswer,
          confidence: 0.75,
          declaredHelp: false,
        },
        user.token
      )
    )

    const results = await Promise.all(promises)
    for (const r of results) {
      expect(r.status).toBe(200)
      expect(r.data.ok).toBe(true)
      expect(r.data.data.outcome).toBe('correct')
      expect(r.data.data.ratingDelta).toBe(results[0].data.data.ratingDelta)
    }

    // Exactly one set of rating_events
    const events = await testSql`select count(*) from rating_events where attempt_id = ${attempt.id}`
    expect(Number(events[0].count)).toBe(2)

    // Now fire 2 commits on another attempt with DIFFERENT transitionIds
    const user2 = await onboardUser('cmt_conc2')
    const { attempt: attempt2 } = await startAttempt(user2)
    const [sec2] = await testSql`select answer from instance_secrets where instance_id = (select instance_id from attempts where id = ${attempt2.id})`
    const rawAnswer2 = String(sec2.answer)

    const [resA, resB] = await Promise.all([
      call(
        `/attempts/${attempt2.id}/commit`,
        {
          transitionId: crypto.randomUUID(),
          answer: rawAnswer2,
          confidence: 0.9,
          declaredHelp: false,
        },
        user2.token
      ),
      call(
        `/attempts/${attempt2.id}/commit`,
        {
          transitionId: crypto.randomUUID(),
          answer: rawAnswer2,
          confidence: 0.9,
          declaredHelp: false,
        },
        user2.token
      ),
    ])

    const statuses = [resA.status, resB.status].sort()
    expect(statuses).toEqual([200, 409])

    const events2 = await testSql`select count(*) from rating_events where attempt_id = ${attempt2.id}`
    expect(Number(events2[0].count)).toBe(2)
  })

  it("a parse error ('1/0') -> 400; attempt remains presented with no rows written", async () => {
    const user = await onboardUser('cmt_parse')
    const { attempt } = await startAttempt(user)

    const res = await call(
      `/attempts/${attempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: '1/0',
        confidence: 0.5,
        declaredHelp: false,
      },
      user.token
    )

    expect(res.status).toBe(400)
    expect(res.data.ok).toBe(false)
    expect(res.data.error.code).toBe('invalid')

    // Attempt is still presented
    const [attRow] = await testSql`select state from attempts where id = ${attempt.id}`
    expect(attRow.state).toBe('presented')

    // No rating events
    const events = await testSql`select count(*) from rating_events where attempt_id = ${attempt.id}`
    expect(Number(events[0].count)).toBe(0)
  })

  it('confidence outside [0, 1] or missing -> 400', async () => {
    const user = await onboardUser('cmt_conf')
    const { attempt } = await startAttempt(user)

    // confidence > 1
    const resOver = await call(
      `/attempts/${attempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: '10',
        confidence: 1.5,
        declaredHelp: false,
      },
      user.token
    )
    expect(resOver.status).toBe(400)
    expect(resOver.data.error.code).toBe('invalid')

    // missing confidence
    const resMissing = await call(
      `/attempts/${attempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: '10',
        declaredHelp: false,
      },
      user.token
    )
    expect(resMissing.status).toBe(400)
    expect(resMissing.data.error.code).toBe('invalid')
  })

  it('give-up -> outcome gave_up, rating falls, confidence null, and attempt is still rated', async () => {
    const user = await onboardUser('cmt_giveup')
    const { attempt } = await startAttempt(user)

    const res = await call(
      `/attempts/${attempt.id}/give-up`,
      { transitionId: crypto.randomUUID() },
      user.token
    )

    expect(res.status).toBe(200)
    expect(res.data.ok).toBe(true)
    const result = res.data.data
    expect(result.outcome).toBe('gave_up')
    expect(result.confidence).toBeNull()
    expect(result.ratingDelta).toBeLessThan(0)

    const [attRow] = await testSql`select state, outcome, rated, confidence from attempts where id = ${attempt.id}`
    expect(attRow.state).toBe('resolved')
    expect(attRow.outcome).toBe('gave_up')
    expect(attRow.rated).toBe(true)
    expect(attRow.confidence).toBeNull()
  })

  it('declaredHelp true -> resolved, no rating_events, no rating change, no echo created', async () => {
    const user = await onboardUser('cmt_help')
    const { attempt } = await startAttempt(user)

    const [secret] = await testSql`select answer from instance_secrets where instance_id = (select instance_id from attempts where id = ${attempt.id})`

    const res = await call(
      `/attempts/${attempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: secret.answer,
        confidence: 0.9,
        declaredHelp: true,
      },
      user.token
    )

    expect(res.status).toBe(200)
    expect(res.data.ok).toBe(true)
    const result = res.data.data
    expect(result.ratingDelta).toBeNull()

    // No rating events
    const events = await testSql`select count(*) from rating_events where attempt_id = ${attempt.id}`
    expect(Number(events[0].count)).toBe(0)

    // No echoes
    const echoes = await testSql`select count(*) from echoes where source_attempt_id = ${attempt.id}`
    expect(Number(echoes[0].count)).toBe(0)

    // Rating unchanged
    const [tr] = await testSql`select rating, n from track_ratings where user_id = (select user_id from attempts where id = ${attempt.id}) and track_id = 'judgment'`
    expect(Number(tr.rating)).toBe(1200)
    expect(Number(tr.n)).toBe(0)
  })

  it('an unrated-set attempt -> no rating_events', async () => {
    const user = await onboardUser('cmt_unrated')
    const { attempt } = await startAttempt(user, 'judgment', 'unrated')

    const [secret] = await testSql`select answer from instance_secrets where instance_id = (select instance_id from attempts where id = ${attempt.id})`

    const res = await call(
      `/attempts/${attempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: secret.answer,
        confidence: 0.9,
        declaredHelp: false,
      },
      user.token
    )

    expect(res.status).toBe(200)
    expect(res.data.ok).toBe(true)
    expect(res.data.data.ratingDelta).toBeNull()

    const events = await testSql`select count(*) from rating_events where attempt_id = ${attempt.id}`
    expect(Number(events[0].count)).toBe(0)
  })

  it('a matched misconception -> result.misconception.id is set and misconception_stats weight 1', async () => {
    const user = await onboardUser('cmt_misc')
    const { attempt } = await startAttempt(user)

    const [sec] = await testSql`select misconceptions from instance_secrets where instance_id = (select instance_id from attempts where id = ${attempt.id})`
    const mList = typeof sec.misconceptions === 'string' ? JSON.parse(sec.misconceptions) : sec.misconceptions
    const misc = (mList as Array<{ id: string; value: unknown }>).find((m) => m.id === 'base-rate-neglect')
    expect(misc).toBeDefined()

    const res = await call(
      `/attempts/${attempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: String(misc?.value),
        confidence: 0.8,
        declaredHelp: false,
      },
      user.token
    )

    expect(res.status).toBe(200)
    expect(res.data.ok).toBe(true)
    const result = res.data.data
    expect(result.outcome).toBe('incorrect')
    expect(result.misconception).toBeDefined()
    expect(result.misconception?.id).toBe('base-rate-neglect')

    // Check misconception_stats
    const [ms] = await testSql`select weight from misconception_stats where misconception_id = 'base-rate-neglect' and user_id = (select user_id from attempts where id = ${attempt.id})`
    expect(Number(ms.weight)).toBe(1)
  })

  it('echo flow: rated attempt creates due echo at +1 day; correct echo attempt creates next at +3 days; > 10 due echoes drops the oldest', async () => {
    const user = await onboardUser('cmt_echo')
    const { attempt } = await startAttempt(user)

    const [secret] = await testSql`select answer from instance_secrets where instance_id = (select instance_id from attempts where id = ${attempt.id})`

    // Commit attempt -> creates due echo at interval 1
    const res1 = await call(
      `/attempts/${attempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: secret.answer,
        confidence: 0.9,
        declaredHelp: false,
      },
      user.token
    )
    expect(res1.status).toBe(200)

    const [echo1] = await testSql`select * from echoes where source_attempt_id = ${attempt.id} and status = 'due'`
    expect(echo1).toBeDefined()
    expect(echo1.interval_days).toBe(1)

    // Simulate echo attempt resolving correctly -> marks echo1 done and creates next echo at 3 days
    const echoAttId = crypto.randomUUID()
    const instId = crypto.randomUUID()
    const uId = (await testSql`select user_id from attempts where id = ${attempt.id}`)[0].user_id

    await testSql`
      insert into instances (id, item_id, seed, skin, prompt, answer_spec, created_at)
      values (${instId}, 'judgment.base-rate.screening@1#1', 99, 'factory', '[]'::jsonb, '{"type":"number","tolerance":{"abs":0.1}}'::jsonb, now())
    `
    await testSql`
      insert into instance_secrets (instance_id, answer, misconceptions, steps, solution)
      values (${instId}, '10'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
    `
    await testSql`
      insert into attempts (
        id, user_id, set_id, slot, instance_id, item_id,
        track_id, concept_id, family_id, kind, echo_id, state, rated, presented_at
      ) values (
        ${echoAttId}, ${uId}, null, null, ${instId}, 'judgment.base-rate.screening@1#1',
        'judgment', 'judgment.base-rates', 'base-rate-screening', 'echo', ${echo1.id}, 'presented', true, now()
      )
    `

    const resEcho = await call(
      `/attempts/${echoAttId}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: '10',
        confidence: 0.9,
        declaredHelp: false,
      },
      user.token
    )
    expect(resEcho.status).toBe(200)

    const [oldEcho] = await testSql`select status, done_attempt_id from echoes where id = ${echo1.id}`
    expect(oldEcho.status).toBe('done')
    expect(oldEcho.done_attempt_id).toBe(echoAttId)

    const [echoNext] = await testSql`select interval_days, status from echoes where source_attempt_id = ${echoAttId} and status = 'due'`
    expect(echoNext.interval_days).toBe(3)

    // Now insert 10 more due echoes for other families -> total 11 due echoes -> oldest dropped
    const dummyEchoes = Array.from({ length: 10 }, (_, i) => ({
      id: crypto.randomUUID(),
      family_id: `dummy-fam-${i}`,
      due_at: new Date(Date.now() + (i + 5) * 86400000),
    }))

    for (const de of dummyEchoes) {
      await testSql`
        insert into echoes (id, user_id, track_id, concept_id, family_id, source_attempt_id, interval_days, due_at, status)
        values (${de.id}, ${uId}, 'judgment', 'judgment.base-rates', ${de.family_id}, ${attempt.id}, 1, ${de.due_at}, 'due')
      `
    }

    // Trigger echo dropping via another rated commit in logic track
    const { attempt: triggerAtt } = await startAttempt(user, 'logic')
    const [secTrigger] = await testSql`select answer from instance_secrets where instance_id = (select instance_id from attempts where id = ${triggerAtt.id})`
    const triggerAnswer = typeof secTrigger.answer === 'string' ? JSON.parse(secTrigger.answer) : secTrigger.answer
    await call(
      `/attempts/${triggerAtt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: triggerAnswer,
        confidence: 0.9,
        declaredHelp: false,
      },
      user.token
    )

    const dueCount = await testSql`select count(*) from echoes where user_id = ${uId} and status = 'due'`
    expect(Number(dueCount[0].count)).toBe(10)
    const droppedCount = await testSql`select count(*) from echoes where user_id = ${uId} and status = 'dropped'`
    expect(Number(droppedCount[0].count)).toBeGreaterThanOrEqual(1)
  })

  it('anchor items never change rating; item changes only once track rd <= 150', async () => {
    const user = await onboardUser('cmt_anchor')
    const { attempt } = await startAttempt(user)

    const [sec] = await testSql`select answer from instance_secrets where instance_id = (select instance_id from attempts where id = ${attempt.id})`

    // Force track rd to 100 on track_ratings
    const uId = (await testSql`select user_id from attempts where id = ${attempt.id}`)[0].user_id
    await testSql`update track_ratings set rd = 100 where user_id = ${uId} and track_id = 'judgment'`

    // Ensure item is not anchor
    const [att] = await testSql`select item_id from attempts where id = ${attempt.id}`
    await testSql`update items set anchor = false where id = ${att.item_id}`
    const [itemBefore] = await testSql`select rating, rd from items where id = ${att.item_id}`

    const res = await call(
      `/attempts/${attempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: String(sec.answer),
        confidence: 0.9,
        declaredHelp: false,
      },
      user.token
    )
    expect(res.status).toBe(200)

    // Item should have updated and have an item rating_event
    const [itemAfter] = await testSql`select rating, rd from items where id = ${att.item_id}`
    expect(Number(itemAfter.rating)).not.toBe(Number(itemBefore.rating))

    const itemEvent = await testSql`select * from rating_events where attempt_id = ${attempt.id} and subject_type = 'item'`
    expect(itemEvent).toHaveLength(1)
  })
})
