import { sql } from '../db.ts'
import { ok, body, HttpError } from '../http.ts'
import { withTransition } from '../transition.ts'
import { parseAnswer, isCorrect, matchMisconception } from '../../_shared/grading.ts'
import type { AnswerSpec, RawAnswer } from '../../_shared/content/types.ts'
import { resolveAttempt } from '../resolve.ts'
import type { Ctx } from '../router.ts'

function isUuid(str: unknown): str is string {
  return (
    typeof str === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      str
    )
  )
}

interface CommitBody {
  transitionId: string
  answer: RawAnswer
  confidence: number
  declaredHelp?: boolean
}

function isCommitBody(x: unknown): x is CommitBody {
  if (!x || typeof x !== 'object') return false
  const b = x as Record<string, unknown>
  return isUuid(b.transitionId) && 'answer' in b
}

export async function handleCommitAttempt(ctx: Ctx): Promise<Response> {
  const attemptId = ctx.params.id
  if (!isUuid(attemptId)) {
    throw new HttpError('invalid', 'Invalid attempt id')
  }

  const b = await body(ctx.req, isCommitBody)

  // Validate confidence: finite number within [0, 1]
  if (
    typeof b.confidence !== 'number' ||
    !Number.isFinite(b.confidence) ||
    b.confidence < 0 ||
    b.confidence > 1
  ) {
    throw new HttpError(
      'invalid',
      'Confidence must be a finite number between 0 and 1'
    )
  }

  return await sql.begin(async (tx) => {
    // 1. Exclusively lock the attempt row to serialize concurrent commits on the same attempt
    const [attempt] = await tx`
      select a.*, i.answer_spec, s.answer as secret_answer, s.misconceptions
      from attempts a
      join instances i on a.instance_id = i.id
      join instance_secrets s on a.instance_id = s.instance_id
      where a.id = ${attemptId} and a.user_id = ${ctx.userId}
      for update of a
    `

    if (!attempt) {
      throw new HttpError('not_found', 'Attempt not found')
    }

    // 2. Check if this transition was already completed while waiting for the lock
    const [existingTransition] = await tx`
      select * from transitions where id = ${b.transitionId} for update
    `
    if (existingTransition) {
      if (existingTransition.user_id !== ctx.userId) {
        throw new HttpError('conflict', 'Transition ID already used by another user')
      }
      const response =
        typeof existingTransition.response === 'string'
          ? JSON.parse(existingTransition.response)
          : existingTransition.response
      return ok(response)
    }

    // 3. If not replayed, attempt must still be presented
    if (attempt.state !== 'presented') {
      throw new HttpError('conflict', 'Attempt is already resolved')
    }

    const spec: AnswerSpec =
      typeof attempt.answer_spec === 'string'
        ? JSON.parse(attempt.answer_spec)
        : attempt.answer_spec

    const parsed = parseAnswer(spec, b.answer)
    if (!parsed.ok) {
      throw new HttpError('invalid', parsed.error)
    }

    const res = await withTransition(
      tx,
      {
        id: b.transitionId,
        userId: ctx.userId,
        kind: 'commit_attempt',
        attemptId,
      },
      async () => {
        const secretAnswer =
          typeof attempt.secret_answer === 'string'
            ? JSON.parse(attempt.secret_answer)
            : attempt.secret_answer

        const misconceptions =
          typeof attempt.misconceptions === 'string'
            ? JSON.parse(attempt.misconceptions)
            : attempt.misconceptions ?? []

        const correct = isCorrect(spec, secretAnswer, parsed.value)
        const outcome = correct ? 'correct' : 'incorrect'
        const misconceptionId = matchMisconception(
          spec,
          misconceptions,
          parsed.value,
          secretAnswer
        )

        return await resolveAttempt(tx, {
          attemptId,
          userId: ctx.userId,
          now: new Date(),
          outcome,
          answer: parsed.value,
          confidence: b.confidence,
          declaredHelp: Boolean(b.declaredHelp),
          misconceptionId,
        })
      }
    )

    return ok(res.response)
  })
}

interface GiveUpBody {
  transitionId: string
}

function isGiveUpBody(x: unknown): x is GiveUpBody {
  if (!x || typeof x !== 'object') return false
  const b = x as Record<string, unknown>
  return isUuid(b.transitionId)
}

export async function handleGiveUpAttempt(ctx: Ctx): Promise<Response> {
  const attemptId = ctx.params.id
  if (!isUuid(attemptId)) {
    throw new HttpError('invalid', 'Invalid attempt id')
  }

  const b = await body(ctx.req, isGiveUpBody)

  return await sql.begin(async (tx) => {
    // 1. Exclusively lock the attempt row
    const [attempt] = await tx`
      select * from attempts
      where id = ${attemptId} and user_id = ${ctx.userId}
      for update
    `

    if (!attempt) {
      throw new HttpError('not_found', 'Attempt not found')
    }

    // 2. Check if this transition was already completed while waiting for the lock
    const [existingTransition] = await tx`
      select * from transitions where id = ${b.transitionId} for update
    `
    if (existingTransition) {
      if (existingTransition.user_id !== ctx.userId) {
        throw new HttpError('conflict', 'Transition ID already used by another user')
      }
      const response =
        typeof existingTransition.response === 'string'
          ? JSON.parse(existingTransition.response)
          : existingTransition.response
      return ok(response)
    }

    // 3. If not replayed, attempt must still be presented
    if (attempt.state !== 'presented') {
      throw new HttpError('conflict', 'Attempt is already resolved')
    }

    const res = await withTransition(
      tx,
      {
        id: b.transitionId,
        userId: ctx.userId,
        kind: 'give_up_attempt',
        attemptId,
      },
      async () => {
        return await resolveAttempt(tx, {
          attemptId,
          userId: ctx.userId,
          now: new Date(),
          outcome: 'gave_up',
          answer: null,
          confidence: null,
          declaredHelp: false,
          misconceptionId: null,
        })
      }
    )

    return ok(res.response)
  })
}
