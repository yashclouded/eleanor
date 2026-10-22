import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import { call, createTestUser, testSql } from './helpers.ts'

describe('API: Judge0-backed code judging (Task 5.2)', () => {
  let server: http.Server
  let fakeJudgeUrl: string
  let tokenSeq = 0

  interface ScriptedToken {
    status: { id: number; description: string }
    stdout?: string | null
    stderr?: string | null
    compile_output?: string | null
    time?: string | null
    memory?: number | null
  }

  interface DbTestGroup {
    group_idx: number
    label: string
    fingerprint: string
    expected: string
  }

  const tokenMap = new Map<string, ScriptedToken>()
  let nextBatchResponses: ScriptedToken[] = []
  let nextBatchGetStatus: number | null = null

  beforeAll(async () => {
    server = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

      // Batch submit
      if (req.method === 'POST' && url.pathname === '/submissions/batch') {
        let bodyStr = ''
        for await (const chunk of req) bodyStr += chunk
        const parsed = JSON.parse(bodyStr)
        const subs = parsed.submissions ?? []
        const tokens = subs.map((_: unknown, idx: number) => {
          const token = `token_${++tokenSeq}_grp_${idx}`
          const response = nextBatchResponses[idx] ?? {
            status: { id: 3, description: 'Accepted' },
            stdout: '',
          }
          tokenMap.set(token, response)
          return { token }
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(tokens))
        return
      }

      // Batch get
      if (req.method === 'GET' && url.pathname === '/submissions/batch') {
        if (nextBatchGetStatus) {
          res.writeHead(nextBatchGetStatus, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Service Unavailable' }))
          return
        }
        const tokensParam = url.searchParams.get('tokens') ?? ''
        const tokens = tokensParam.split(',').filter(Boolean)
        const submissions = tokens.map((t) => {
          const data = tokenMap.get(t) ?? {
            status: { id: 3, description: 'Accepted' },
            stdout: '',
          }
          return {
            token: t,
            status: data.status,
            stdout:
              data.stdout !== null && data.stdout !== undefined
                ? Buffer.from(data.stdout).toString('base64')
                : null,
            stderr:
              data.stderr !== null && data.stderr !== undefined
                ? Buffer.from(data.stderr).toString('base64')
                : null,
            compile_output:
              data.compile_output !== null && data.compile_output !== undefined
                ? Buffer.from(data.compile_output).toString('base64')
                : null,
            time: data.time ?? '0.010',
            memory: data.memory ?? 1024,
          }
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ submissions }))
        return
      }

      // Single submit (for /code/run)
      if (req.method === 'POST' && url.pathname === '/submissions') {
        req.resume()
        const token = `single_token_${++tokenSeq}`
        tokenMap.set(token, {
          status: { id: 3, description: 'Accepted' },
          stdout: 'run_output_success\n',
          time: '0.005',
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ token }))
        return
      }

      // Single get (for /code/run polling)
      if (req.method === 'GET' && url.pathname.startsWith('/submissions/')) {
        const token = url.pathname.replace('/submissions/', '').split('?')[0]
        const data = tokenMap.get(token) ?? {
          status: { id: 3, description: 'Accepted' },
          stdout: 'run_output_success\n',
          time: '0.005',
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            token,
            status: data.status,
            stdout:
              data.stdout !== null && data.stdout !== undefined
                ? Buffer.from(data.stdout).toString('base64')
                : null,
            stderr:
              data.stderr !== null && data.stderr !== undefined
                ? Buffer.from(data.stderr).toString('base64')
                : null,
            compile_output:
              data.compile_output !== null && data.compile_output !== undefined
                ? Buffer.from(data.compile_output).toString('base64')
                : null,
            time: data.time ?? '0.005',
            memory: 1024,
          })
        )
        return
      }

      res.writeHead(404)
      res.end()
    })

    await new Promise<void>((resolve) => {
      server.listen(0, '0.0.0.0', () => {
        const addr = server.address()
        if (typeof addr === 'object' && addr !== null) {
          fakeJudgeUrl = `http://host.docker.internal:${addr.port}`
        }
        resolve()
      })
    })
  })

  afterAll(async () => {
    if (server) {
      server.close()
    }
    await testSql.end()
  })

  let seq = 0
  async function onboardCodeUser(prefix: string) {
    const user = await createTestUser(prefix)
    const cleanPrefix = prefix.slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '')
    const id = `${seq++}_${crypto.randomUUID().slice(0, 6)}`
    const handle = `u_${cleanPrefix}_${id}`.slice(0, 20)
    const res = await call(
      '/onboarding',
      {
        handle,
        ageConfirmed: true,
        termsAccepted: true,
        pledgeAccepted: true,
        leaderboardVisible: true,
        tracks: ['code', 'judgment'],
        intensity: 'balanced',
      },
      user.token
    )
    if (res.status !== 201) {
      throw new Error(`onboarding failed (${res.status}): ${JSON.stringify(res.data)}`)
    }
    return user
  }

  async function createCodeAttempt(user: { user: { id: string }; token: string }) {
    const itemId = 'code.prefix.range-sums@1#1'
    const instanceId = crypto.randomUUID()
    const prompt = [{ t: 'p', text: 'Solve range sums' }]
    const answerSpec = { type: 'code', languages: ['python', 'cpp', 'javascript'] }

    await testSql`
      insert into instances (id, item_id, seed, skin, prompt, answer_spec)
      values (${instanceId}, ${itemId}, 12345, 'default', ${JSON.stringify(prompt)}, ${JSON.stringify(answerSpec)})
    `
    await testSql`
      insert into instance_secrets (instance_id, answer, misconceptions, steps, solution)
      values (${instanceId}, '[]', '[]', '[]', '[]')
    `
    const attemptId = crypto.randomUUID()
    const [attempt] = await testSql`
      insert into attempts (
        id, user_id, instance_id, item_id, track_id, concept_id, family_id, kind, state, rated
      ) values (
        ${attemptId}, ${user.user.id}, ${instanceId}, ${itemId}, 'code', 'code.prefix', 'range-sums',
        'selected', 'presented', true
      )
      returning *
    `
    return { attempt }
  }

  it('commit returns 400 for code attempts', async () => {
    const user = await onboardCodeUser('cmt_code')
    const { attempt } = await createCodeAttempt(user)

    const res = await call(
      `/attempts/${attempt.id}/commit`,
      {
        transitionId: crypto.randomUUID(),
        answer: 'print(42)',
        confidence: 0.8,
      },
      user.token
    )

    expect(res.status).toBe(400)
    expect(res.data.error.code).toBe('invalid')
    expect(res.data.error.message).toMatch(/\/code\/submit/i)
  })

  it('source over 64 KB → 400', async () => {
    const user = await onboardCodeUser('large_src')
    const { attempt } = await createCodeAttempt(user)
    const hugeSource = 'a'.repeat(65537)

    // Run with oversized source
    const runRes = await call(
      '/code/run',
      {
        attemptId: attempt.id,
        language: 'python',
        source: hugeSource,
        input: '',
      },
      user.token,
      'POST',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(runRes.status).toBe(400)
    expect(runRes.data.error.code).toBe('invalid')

    // Submit with oversized source
    const submitRes = await call(
      '/code/submit',
      {
        transitionId: crypto.randomUUID(),
        attemptId: attempt.id,
        language: 'python',
        source: hugeSource,
        confidence: 0.8,
      },
      user.token,
      'POST',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(submitRes.status).toBe(400)
    expect(submitRes.data.error.code).toBe('invalid')
  })

  it('the 21st run within 10 minutes → 429', async () => {
    const user = await onboardCodeUser('rate_run')
    const { attempt } = await createCodeAttempt(user)

    // Clear any existing rate_events for this user
    await testSql`delete from rate_events where user_id = ${user.user.id}`

    // 1 successful real run
    const runRes = await call(
      '/code/run',
      {
        attemptId: attempt.id,
        language: 'python',
        source: 'print(1)',
        input: '',
      },
      user.token,
      'POST',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(runRes.status).toBe(200)
    expect(runRes.data.data.status.id).toBe(3)

    // Seed remaining 19 events to reach 20 in 10 minutes
    for (let i = 1; i < 20; i++) {
      await testSql`insert into rate_events (user_id, kind) values (${user.user.id}, 'code_run')`
    }

    // 21st run within 10 minutes must return 429
    const limitedRes = await call(
      '/code/run',
      {
        attemptId: attempt.id,
        language: 'python',
        source: 'print(1)',
        input: '',
      },
      user.token,
      'POST',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(limitedRes.status).toBe(429)
    expect(limitedRes.data.error.code).toBe('rate_limited')
  })

  it('an accepted submission → resolved correct, rated, rating_events present', async () => {
    const user = await onboardCodeUser('acc_sub')
    const { attempt } = await createCodeAttempt(user)

    // Load expected outputs for all test groups
    const testGroups = await testSql`
      select group_idx, label, fingerprint, expected
      from code_tests
      where item_id = (select item_id from attempts where id = ${attempt.id})
      order by group_idx asc
    `
    expect(testGroups.length).toBeGreaterThan(0)

    nextBatchResponses = (testGroups as unknown as DbTestGroup[]).map((g) => ({
      status: { id: 3, description: 'Accepted' },
      stdout: g.expected,
    }))
    nextBatchGetStatus = null

    const transitionId = crypto.randomUUID()
    const submitRes = await call(
      '/code/submit',
      {
        transitionId,
        attemptId: attempt.id,
        language: 'python',
        source: 'print("solution")',
        confidence: 0.9,
      },
      user.token,
      'POST',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(submitRes.status).toBe(200)
    const submissionId = submitRes.data.data.submissionId
    expect(submissionId).toBeDefined()

    // Poll submission
    const getRes = await call(
      `/code/submissions/${submissionId}`,
      undefined,
      user.token,
      'GET',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(getRes.status).toBe(200)
    expect(getRes.data.data.status).toBe('done')
    expect(getRes.data.data.verdict).toBe('accepted')
    expect(getRes.data.data.failedGroup).toBeNull()

    // Assert attempt is resolved correct
    const [attRow] = await testSql`select * from attempts where id = ${attempt.id}`
    expect(attRow.state).toBe('resolved')
    expect(attRow.outcome).toBe('correct')
    expect(attRow.confidence).toBe(0.9)

    // Assert rating_events exist
    const ratingEvents = await testSql`
      select * from rating_events where attempt_id = ${attempt.id}
    `
    expect(ratingEvents.length).toBeGreaterThan(0)

    // Assert AttemptView carries verdict
    const viewRes = await call(`/attempts/${attempt.id}`, undefined, user.token)
    expect(viewRes.data.data.result.verdict).toBe('accepted')
    expect(viewRes.data.data.result.failedGroupLabel).toBeNull()
  })

  it('wrong answer on group 3 → incorrect with misconception "code:<fingerprint of group 3>" and failedGroupLabel set', async () => {
    const user = await onboardCodeUser('wa_grp3')
    const { attempt } = await createCodeAttempt(user)

    const testGroups = await testSql`
      select group_idx, label, fingerprint, expected
      from code_tests
      where item_id = (select item_id from attempts where id = ${attempt.id})
      order by group_idx asc
    `
    expect(testGroups.length).toBeGreaterThanOrEqual(4)

    // Groups 0, 1, 2 pass; group 3 outputs wrong answer
    nextBatchResponses = (testGroups as unknown as DbTestGroup[]).map((g, idx: number) => ({
      status: { id: 3, description: 'Accepted' },
      stdout: idx === 3 ? 'wrong_output_mismatch' : g.expected,
    }))
    nextBatchGetStatus = null

    const submitRes = await call(
      '/code/submit',
      {
        transitionId: crypto.randomUUID(),
        attemptId: attempt.id,
        language: 'python',
        source: 'print("bad_overflow")',
        confidence: 0.75,
      },
      user.token,
      'POST',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(submitRes.status).toBe(200)
    const submissionId = submitRes.data.data.submissionId

    const getRes = await call(
      `/code/submissions/${submissionId}`,
      undefined,
      user.token,
      'GET',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(getRes.status).toBe(200)
    expect(getRes.data.data.status).toBe('done')
    expect(getRes.data.data.verdict).toBe('wrong_answer')
    expect(getRes.data.data.failedGroup).toBe(3)

    // Assert attempt resolved incorrect with misconception
    const [attRow] = await testSql`select * from attempts where id = ${attempt.id}`
    expect(attRow.state).toBe('resolved')
    expect(attRow.outcome).toBe('incorrect')
    expect(attRow.misconception_id).toBe(`code:${testGroups[3].fingerprint}`)

    // Assert AttemptView carries verdict and failedGroupLabel
    const viewRes = await call(`/attempts/${attempt.id}`, undefined, user.token)
    expect(viewRes.data.data.result.verdict).toBe('wrong_answer')
    expect(viewRes.data.data.result.failedGroupLabel).toBe(testGroups[3].label)
  })

  it('a compile error → the attempt is back to presented, no rating events, and the next submission is the rated one', async () => {
    const user = await onboardCodeUser('ce_sub')
    const { attempt } = await createCodeAttempt(user)

    const testGroups = await testSql`
      select group_idx, label, fingerprint, expected
      from code_tests
      where item_id = (select item_id from attempts where id = ${attempt.id})
      order by group_idx asc
    `

    // 1st submission gets compilation error (status 6)
    nextBatchResponses = testGroups.map(() => ({
      status: { id: 6, description: 'Compilation Error' },
      compile_output: 'syntax error on line 1: unexpected token',
    }))
    nextBatchGetStatus = null

    const submitRes1 = await call(
      '/code/submit',
      {
        transitionId: crypto.randomUUID(),
        attemptId: attempt.id,
        language: 'python',
        source: 'def syntax error',
        confidence: 0.5,
      },
      user.token,
      'POST',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(submitRes1.status).toBe(200)
    const subId1 = submitRes1.data.data.submissionId

    const getRes1 = await call(
      `/code/submissions/${subId1}`,
      undefined,
      user.token,
      'GET',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(getRes1.status).toBe(200)
    expect(getRes1.data.data.status).toBe('done')
    expect(getRes1.data.data.verdict).toBe('compile_error')
    expect(getRes1.data.data.compileOutput).toBe('syntax error on line 1: unexpected token')

    // Attempt must be back to presented!
    const [attAfterCE] = await testSql`select * from attempts where id = ${attempt.id}`
    expect(attAfterCE.state).toBe('presented')
    expect(attAfterCE.outcome).toBeNull()

    // No rating events exist
    const ratingEvents1 = await testSql`
      select * from rating_events where attempt_id = ${attempt.id}
    `
    expect(ratingEvents1.length).toBe(0)

    // The CE submission must have rated = false
    const [subRow1] = await testSql`select * from code_submissions where id = ${subId1}`
    expect(subRow1.rated).toBe(false)

    // 2nd submission: compiles and passes all tests
    nextBatchResponses = (testGroups as unknown as DbTestGroup[]).map((g) => ({
      status: { id: 3, description: 'Accepted' },
      stdout: g.expected,
    }))

    const submitRes2 = await call(
      '/code/submit',
      {
        transitionId: crypto.randomUUID(),
        attemptId: attempt.id,
        language: 'python',
        source: 'def valid(): pass',
        confidence: 0.85,
      },
      user.token,
      'POST',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(submitRes2.status).toBe(200)
    const subId2 = submitRes2.data.data.submissionId

    // The second submission IS rated because earlier submission was compile error!
    const [subRow2] = await testSql`select * from code_submissions where id = ${subId2}`
    expect(subRow2.rated).toBe(true)

    // Poll 2nd submission
    const getRes2 = await call(
      `/code/submissions/${subId2}`,
      undefined,
      user.token,
      'GET',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(getRes2.status).toBe(200)
    expect(getRes2.data.data.verdict).toBe('accepted')

    // Now attempt is resolved and rated!
    const [attAfterAcc] = await testSql`select * from attempts where id = ${attempt.id}`
    expect(attAfterAcc.state).toBe('resolved')
    expect(attAfterAcc.outcome).toBe('correct')

    const ratingEvents2 = await testSql`
      select * from rating_events where attempt_id = ${attempt.id}
    `
    expect(ratingEvents2.length).toBeGreaterThan(0)
  })

  it('Review Focus 5: the fake judge returns 503 → judge_error, the attempt is presented, nothing is rated, and resubmitting works', async () => {
    const user = await onboardCodeUser('rf5_judge_err')
    const { attempt } = await createCodeAttempt(user)

    const testGroups = await testSql`
      select group_idx, label, fingerprint, expected
      from code_tests
      where item_id = (select item_id from attempts where id = ${attempt.id})
      order by group_idx asc
    `

    // Initial batch submit succeeds, but GET returns 503
    nextBatchResponses = testGroups.map(() => ({
      status: { id: 3, description: 'Accepted' },
      stdout: '',
    }))
    nextBatchGetStatus = 503

    const submitRes = await call(
      '/code/submit',
      {
        transitionId: crypto.randomUUID(),
        attemptId: attempt.id,
        language: 'python',
        source: 'print(1)',
        confidence: 0.8,
      },
      user.token,
      'POST',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(submitRes.status).toBe(200)
    const subId = submitRes.data.data.submissionId

    // Polling receives 503 from Judge0 -> returns judge_error
    const pollRes = await call(
      `/code/submissions/${subId}`,
      undefined,
      user.token,
      'GET',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(pollRes.status).toBe(200)
    expect(pollRes.data.data.status).toBe('error')
    expect(pollRes.data.data.verdict).toBe('judge_error')

    // Attempt returns to presented and nothing is rated
    const [attAfterErr] = await testSql`select * from attempts where id = ${attempt.id}`
    expect(attAfterErr.state).toBe('presented')
    expect(attAfterErr.outcome).toBeNull()

    const ratingEvents = await testSql`
      select * from rating_events where attempt_id = ${attempt.id}
    `
    expect(ratingEvents.length).toBe(0)

    // Resubmitting works!
    nextBatchGetStatus = null
    nextBatchResponses = (testGroups as unknown as DbTestGroup[]).map((g) => ({
      status: { id: 3, description: 'Accepted' },
      stdout: g.expected,
    }))

    const resubmitRes = await call(
      '/code/submit',
      {
        transitionId: crypto.randomUUID(),
        attemptId: attempt.id,
        language: 'python',
        source: 'print("resubmitted")',
        confidence: 0.95,
      },
      user.token,
      'POST',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(resubmitRes.status).toBe(200)
    const subId2 = resubmitRes.data.data.submissionId

    const pollRes2 = await call(
      `/code/submissions/${subId2}`,
      undefined,
      user.token,
      'GET',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(pollRes2.status).toBe(200)
    expect(pollRes2.data.data.verdict).toBe('accepted')

    const [attFinal] = await testSql`select * from attempts where id = ${attempt.id}`
    expect(attFinal.state).toBe('resolved')
    expect(attFinal.outcome).toBe('correct')
  })

  it('polling the same finished submission 5 times in parallel → one resolution', async () => {
    const user = await onboardCodeUser('par_poll')
    const { attempt } = await createCodeAttempt(user)

    const testGroups = await testSql`
      select group_idx, label, fingerprint, expected
      from code_tests
      where item_id = (select item_id from attempts where id = ${attempt.id})
      order by group_idx asc
    `
    nextBatchResponses = (testGroups as unknown as DbTestGroup[]).map((g) => ({
      status: { id: 3, description: 'Accepted' },
      stdout: g.expected,
    }))
    nextBatchGetStatus = null

    const submitRes = await call(
      '/code/submit',
      {
        transitionId: crypto.randomUUID(),
        attemptId: attempt.id,
        language: 'python',
        source: 'print("parallel")',
        confidence: 0.8,
      },
      user.token,
      'POST',
      { 'x-judge0-url': fakeJudgeUrl }
    )
    expect(submitRes.status).toBe(200)
    const submissionId = submitRes.data.data.submissionId

    // 5 parallel polls
    const results = await Promise.all([
      call(`/code/submissions/${submissionId}`, undefined, user.token, 'GET', {
        'x-judge0-url': fakeJudgeUrl,
      }),
      call(`/code/submissions/${submissionId}`, undefined, user.token, 'GET', {
        'x-judge0-url': fakeJudgeUrl,
      }),
      call(`/code/submissions/${submissionId}`, undefined, user.token, 'GET', {
        'x-judge0-url': fakeJudgeUrl,
      }),
      call(`/code/submissions/${submissionId}`, undefined, user.token, 'GET', {
        'x-judge0-url': fakeJudgeUrl,
      }),
      call(`/code/submissions/${submissionId}`, undefined, user.token, 'GET', {
        'x-judge0-url': fakeJudgeUrl,
      }),
    ])

    for (const res of results) {
      expect(res.status).toBe(200)
      expect(res.data.data.status).toBe('done')
      expect(res.data.data.verdict).toBe('accepted')
    }

    // Exactly one set of rating events
    const ratingEvents = await testSql`
      select * from rating_events where attempt_id = ${attempt.id}
    `
    // Track rating event + concept rating event = 2 events
    expect(ratingEvents.length).toBe(2)
  })
})
