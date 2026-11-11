import { sql } from '../db.ts'
import { ok, body, HttpError, isUuid } from '../http.ts'
import type { Ctx } from '../router.ts'
import { CODE_PROBLEMS } from '../../_shared/registry.ts'
import { compareOutput } from '../../_shared/code/compare.ts'
import type { AnswerSpec } from '../../_shared/content/types.ts'
import {
  getJudge0Client,
  getLanguageId,
  JUDGE0_STATUS,
  type Judge0SubmissionResponse,
} from '../judge0.ts'
import { resolveAttempt } from '../resolve.ts'
import { rateLimit } from '../rate-limit.ts'
import { withTransition } from '../transition.ts'

interface CodeRunBody {
  attemptId: string
  language: 'python' | 'cpp' | 'javascript'
  source: string
  input?: string
}

function isCodeRunBody(x: unknown): x is CodeRunBody {
  if (!x || typeof x !== 'object') return false
  const b = x as Record<string, unknown>
  return (
    isUuid(b.attemptId) &&
    typeof b.language === 'string' &&
    ['python', 'cpp', 'javascript'].includes(b.language) &&
    typeof b.source === 'string' &&
    (b.input === undefined || typeof b.input === 'string')
  )
}

interface CodeSubmitBody {
  transitionId: string
  attemptId: string
  language: 'python' | 'cpp' | 'javascript'
  source: string
  confidence: number
  declaredHelp?: boolean
}

function isCodeSubmitBody(x: unknown): x is CodeSubmitBody {
  if (!x || typeof x !== 'object') return false
  const b = x as Record<string, unknown>
  return (
    isUuid(b.transitionId) &&
    isUuid(b.attemptId) &&
    typeof b.language === 'string' &&
    ['python', 'cpp', 'javascript'].includes(b.language) &&
    typeof b.source === 'string' &&
    typeof b.confidence === 'number' &&
    (b.declaredHelp === undefined || typeof b.declaredHelp === 'boolean')
  )
}

/**
 * POST /code/run
 * Rate limited to 20 per 10 minutes per user.
 * Executes learner code on custom/sample input via Judge0.
 */
export async function handleCodeRun(ctx: Ctx): Promise<Response> {
  const b = await body(ctx.req, isCodeRunBody)

  // Verify attempt exists and belongs to user
  const [attempt] = await sql`
    select a.*, i.answer_spec
    from attempts a
    join instances i on a.instance_id = i.id
    where a.id = ${b.attemptId} and a.user_id = ${ctx.userId}
  `
  if (!attempt) {
    throw new HttpError('not_found', 'Attempt not found')
  }

  const spec: AnswerSpec = typeof attempt.answer_spec === 'string' ? JSON.parse(attempt.answer_spec) : attempt.answer_spec
  if (spec.type !== 'code') throw new HttpError('invalid', 'Not a code attempt')
  await sql.begin((tx) => rateLimit(tx, ctx.userId, 'code_run', 20, '10 minutes'))

  const problem = CODE_PROBLEMS.find((p) => p.id === attempt.item_id.split('@')[0])
  const cpuSeconds = problem?.limits.cpuSeconds ?? 2.0
  const memoryKb = problem?.limits.memoryKb ?? 256000
  const langId = getLanguageId(b.language)

  const client = getJudge0Client()

  const res = await client.run(
    {
      language_id: langId,
      source_code: b.source,
      stdin: b.input ?? '',
      cpu_time_limit: cpuSeconds,
      memory_limit: memoryKb,
    },
    20_000
  )

  return ok(res)
}

/**
 * POST /code/submit
 * Submits learner code against all test groups in Judge0 as a batch.
 * Idempotent via transitionId.
 */
export async function handleCodeSubmit(ctx: Ctx): Promise<Response> {
  const b = await body(ctx.req, isCodeSubmitBody)

  // Enforce confidence range [0, 1]
  if (!Number.isFinite(b.confidence) || b.confidence < 0 || b.confidence > 1) {
    throw new HttpError('invalid', 'Confidence must be between 0 and 1')
  }

  return await sql.begin(async (tx) => {
    // Lock before replay checks so concurrent retries see the completed transition.
    const [attempt] = await tx`
      select a.*, i.answer_spec
      from attempts a
      join instances i on a.instance_id = i.id
      where a.id = ${b.attemptId} and a.user_id = ${ctx.userId}
      for update of a
    `
    if (!attempt) {
      throw new HttpError('not_found', 'Attempt not found')
    }
    const result = await withTransition(tx, {
      id: b.transitionId, userId: ctx.userId, kind: 'code_submit', attemptId: b.attemptId,
    }, async () => {
      if (attempt.state !== 'presented' && attempt.state !== 'resolved') {
        throw new HttpError('conflict', 'Attempt is not in presented state')
      }

      const spec: AnswerSpec =
        typeof attempt.answer_spec === 'string'
          ? JSON.parse(attempt.answer_spec)
          : attempt.answer_spec
      if (spec.type !== 'code') {
        throw new HttpError('invalid', 'Not a code attempt')
      }

      // Determine if rated: true when attempt is rated, state was presented, no declared help,
      // and no earlier evaluated submission exists (ignoring compile_error and judge_error).
      const [earlierEvaluated] = await tx`
        select count(*)::int as count
        from code_submissions
        where attempt_id = ${b.attemptId}
          and verdict is not null
          and verdict not in ('compile_error', 'judge_error')
      `
      const isRated = Boolean(
        attempt.state === 'presented' &&
        attempt.rated &&
        !b.declaredHelp &&
        earlierEvaluated.count === 0
      )

      // Fetch test groups for this problem item
      const testGroups = await tx`
        select group_idx, label, fingerprint, input, expected
        from code_tests
        where item_id = ${attempt.item_id}
        order by group_idx asc
      `
      if (testGroups.length === 0) {
        throw new HttpError('internal', `No code tests found for item ${attempt.item_id}`)
      }

      await rateLimit(tx, ctx.userId, 'commit', 300, '1 hour')

      const problem = CODE_PROBLEMS.find((p) => p.id === attempt.item_id.split('@')[0])
      const cpuSeconds = problem?.limits.cpuSeconds ?? 2.0
      const memoryKb = problem?.limits.memoryKb ?? 256000
      const langId = getLanguageId(b.language)

      const client = getJudge0Client()

      let batchResults: { token: string }[]
      try {
        batchResults = await client.createBatchSubmissions(
          testGroups.map((g) => ({
            language_id: langId,
            source_code: b.source,
            stdin: g.input,
            cpu_time_limit: cpuSeconds,
            memory_limit: memoryKb,
          }))
        )
      } catch {
        // Judge0 failure on submit -> attempt stays presented, learner can resubmit
        throw new HttpError(
          'internal',
          'Code judging is unavailable. Please retry.'
        )
      }

      const tokens = batchResults.map((r) => r.token)
      const submissionId = crypto.randomUUID()

      await tx`
        insert into code_submissions (
          id, attempt_id, user_id, language, source, confidence,
          rated, status, judge_tokens, created_at
        ) values (
          ${submissionId}, ${b.attemptId}, ${ctx.userId}, ${b.language}, ${b.source}, ${b.confidence},
          ${isRated}, 'queued', ${tokens}, now()
        )
      `

      if (attempt.state === 'presented') {
        await tx`
          update attempts
          set state = 'judging',
              declared_help = ${attempt.declared_help || Boolean(b.declaredHelp)}
          where id = ${b.attemptId}
        `
      } else {
        await tx`
          update attempts
          set declared_help = ${attempt.declared_help || Boolean(b.declaredHelp)}
          where id = ${b.attemptId}
        `
      }

      return { submissionId }
    })
    return ok(result.response)
  })
}

/**
 * GET /code/submissions/:id
 * Polled by client until finished or timeout.
 * Resolves rated submissions on verdict.
 */
export async function handleGetCodeSubmission(ctx: Ctx): Promise<Response> {
  const id = ctx.params.id
  if (!isUuid(id)) {
    throw new HttpError('invalid', 'Invalid submission id')
  }

  const [sub] = await sql`
    select * from code_submissions where id = ${id} and user_id = ${ctx.userId}
  `
  if (!sub) {
    throw new HttpError('not_found', 'Submission not found')
  }

  if (sub.status === 'done') {
    return ok({
      status: 'done',
      verdict: sub.verdict,
      failedGroup: sub.failed_group,
      compileOutput: sub.compile_output,
      rated: Boolean(sub.rated),
    })
  }

  if (sub.status === 'error') {
    return ok({
      status: 'error',
      verdict: sub.verdict,
    })
  }

  // Status is 'queued': poll Judge0 batch results
  const client = getJudge0Client()

  let batchResults: Judge0SubmissionResponse[]
  try {
    batchResults = await client.getBatchSubmissions(sub.judge_tokens)
  } catch {
    // Review Focus 5: Judge0 network / server failure -> judge_error
    return await sql.begin(async (tx) => {
      const [locked] = await tx`
        select * from code_submissions where id = ${sub.id} for update
      `
      if (locked.status === 'done') {
        return ok({
          status: 'done',
          verdict: locked.verdict,
          failedGroup: locked.failed_group,
          compileOutput: locked.compile_output,
        })
      }
      await tx`
        update code_submissions
        set status = 'error', verdict = 'judge_error', rated = false, finished_at = now()
        where id = ${sub.id}
      `
      await tx`
        update attempts
        set state = 'presented'
        where id = ${sub.attempt_id}
      `
      return ok({ status: 'error', verdict: 'judge_error' })
    })
  }

  // Check for Judge0 internal errors (13, 14)
  const hasJudgeError = batchResults.some(
    (r) =>
      r.status.id === JUDGE0_STATUS.INTERNAL_ERROR ||
      r.status.id === JUDGE0_STATUS.EXEC_FORMAT_ERROR
  )
  if (hasJudgeError) {
    return await sql.begin(async (tx) => {
      const [locked] = await tx`
        select * from code_submissions where id = ${sub.id} for update
      `
      if (locked.status === 'done') {
        return ok({
          status: 'done',
          verdict: locked.verdict,
          failedGroup: locked.failed_group,
          compileOutput: locked.compile_output,
        })
      }
      await tx`
        update code_submissions
        set status = 'error', verdict = 'judge_error', rated = false, finished_at = now()
        where id = ${sub.id}
      `
      await tx`
        update attempts
        set state = 'presented'
        where id = ${sub.attempt_id}
      `
      return ok({ status: 'error', verdict: 'judge_error' })
    })
  }

  // Check if any submission is still In Queue or Processing
  const isStillQueued = batchResults.some(
    (r) =>
      r.status.id === JUDGE0_STATUS.IN_QUEUE ||
      r.status.id === JUDGE0_STATUS.PROCESSING
  )
  if (isStillQueued) {
    return ok({ status: 'queued' })
  }

  // All tokens finished: execute resolution in a single transaction
  return await sql.begin(async (tx) => {
    // Row lock ensures concurrent polling resolves exactly once
    const [lockedSub] = await tx`
      select * from code_submissions where id = ${sub.id} for update
    `
    if (lockedSub.status === 'done') {
      return ok({
        status: 'done',
        verdict: lockedSub.verdict,
        failedGroup: lockedSub.failed_group,
        compileOutput: lockedSub.compile_output,
      })
    }
    if (lockedSub.status === 'error') {
      return ok({
        status: 'error',
        verdict: lockedSub.verdict,
      })
    }

    const [attempt] = await tx`
      select * from attempts where id = ${sub.attempt_id} for update
    `
    const tests = await tx`
      select * from code_tests where item_id = ${attempt.item_id} order by group_idx asc
    `
    const problem = CODE_PROBLEMS.find((p) => p.id === attempt.item_id.split('@')[0])
    const checker = problem?.checker ?? { kind: 'tokens' }

    // 1. Any status 6 means compile_error
    const compileErrSub = batchResults.find(
      (r) => r.status.id === JUDGE0_STATUS.COMPILATION_ERROR
    )
    if (compileErrSub) {
      await tx`
        update code_submissions
        set status = 'done',
            verdict = 'compile_error',
            rated = false,
            compile_output = ${compileErrSub.compile_output},
            finished_at = now()
        where id = ${sub.id}
      `
      // The attempt goes back to presented, unrated
      await tx`
        update attempts
        set state = 'presented'
        where id = ${sub.attempt_id}
      `
      return ok({
        status: 'done',
        verdict: 'compile_error',
        compileOutput: compileErrSub.compile_output,
      })
    }

    // 2. Iterate test groups in order
    let verdict: 'accepted' | 'wrong_answer' | 'time_limit' | 'runtime_error' = 'accepted'
    let failedGroup: number | null = null
    let failingFingerprint: string | null = null

    for (let idx = 0; idx < tests.length; idx++) {
      const test = tests[idx]
      const res = batchResults[idx]
      const stId = res.status.id

      if (stId === JUDGE0_STATUS.TIME_LIMIT_EXCEEDED) {
        verdict = 'time_limit'
        failedGroup = idx
        failingFingerprint = test.fingerprint
        break
      } else if (stId >= 7 && stId <= 12) {
        verdict = 'runtime_error'
        failedGroup = idx
        failingFingerprint = test.fingerprint
        break
      } else {
        const matches = compareOutput(test.expected, res.stdout ?? '', checker)
        if (!matches) {
          verdict = 'wrong_answer'
          failedGroup = idx
          failingFingerprint = test.fingerprint
          break
        }
      }
    }

    // Record verdict on submission row
    await tx`
      update code_submissions
      set status = 'done',
          verdict = ${verdict},
          failed_group = ${failedGroup},
          finished_at = now()
      where id = ${sub.id}
    `

    // For a non-compile-error result on a rated submission, resolve the attempt!
    if (lockedSub.rated) {
      const outcome = verdict === 'accepted' ? 'correct' : 'incorrect'
      const misconceptionId = failingFingerprint ? `code:${failingFingerprint}` : null

      await resolveAttempt(tx, {
        attemptId: attempt.id,
        userId: ctx.userId,
        now: new Date(),
        outcome,
        answer: sub.source,
        confidence: sub.confidence,
        declaredHelp: attempt.declared_help,
        misconceptionId,
      })
    } else {
      // Non-rated repair submission only stores the verdict.
      if (attempt.state === 'judging') {
        const outcome = verdict === 'accepted' ? 'correct' : 'incorrect'
        await tx`
          update attempts
          set state = 'resolved', outcome = ${outcome}
          where id = ${attempt.id}
        `
      }
    }

    return ok({
      status: 'done',
      verdict,
      failedGroup,
      compileOutput: null,
      rated: Boolean(lockedSub.rated),
    })
  })
}
