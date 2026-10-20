import { sql } from '../db.ts'
import { ok, body, HttpError } from '../http.ts'
import { withTransition } from '../transition.ts'
import { parseAnswer, isCorrect, matchMisconception, parseNumber } from '../../_shared/grading.ts'
import type { AnswerSpec, RawAnswer, Block, Tolerance } from '../../_shared/content/types.ts'
import { toAttemptView, parseJsonIfNeeded } from './sets.ts'
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

interface RepairBody {
  transitionId: string
  stepIndex: number
  answer: string
}

function isRepairBody(x: unknown): x is RepairBody {
  if (!x || typeof x !== 'object') return false
  const b = x as Record<string, unknown>
  return (
    isUuid(b.transitionId) &&
    typeof b.stepIndex === 'number' &&
    Number.isInteger(b.stepIndex) &&
    b.stepIndex >= 0 &&
    typeof b.answer === 'string'
  )
}

export async function handleRepairAttempt(ctx: Ctx): Promise<Response> {
  const attemptId = ctx.params.id
  if (!isUuid(attemptId)) {
    throw new HttpError('invalid', 'Invalid attempt id')
  }

  const b = await body(ctx.req, isRepairBody)

  return await sql.begin(async (tx) => {
    // 1. Exclusively lock the attempt row
    const [attempt] = await tx`
      select a.*, s.steps
      from attempts a
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

    // 3. Preconditions
    if (attempt.state !== 'resolved') {
      throw new HttpError('conflict', 'Attempt is not in resolved state')
    }
    if (attempt.outcome !== 'incorrect' && attempt.outcome !== 'gave_up') {
      throw new HttpError('conflict', 'Repair is only allowed for incorrect or gave up attempts')
    }
    if (b.stepIndex !== attempt.repair_step) {
      throw new HttpError('conflict', 'Step index out of order')
    }

    const steps: Array<{
      prompt: Block[]
      answer: number
      tolerance: Tolerance
      explain: Block[]
    }> = typeof attempt.steps === 'string' ? JSON.parse(attempt.steps) : attempt.steps ?? []

    if (b.stepIndex >= steps.length) {
      throw new HttpError('conflict', 'No more steps to repair')
    }

    const currentStep = steps[b.stepIndex]
    const parsed = parseNumber(b.answer)
    if (!parsed.ok) {
      throw new HttpError('invalid', parsed.error)
    }

    const absTol = currentStep.tolerance?.abs ?? 0
    const relTol = currentStep.tolerance?.rel ?? 0
    const tol = Math.max(absTol, relTol * Math.abs(currentStep.answer)) + 1e-9
    const correct = Math.abs(parsed.value - currentStep.answer) <= tol
    const explain = correct ? null : currentStep.explain

    const nextIndex = b.stepIndex + 1
    let next: { index: number; prompt: Block[]; tolerance: Tolerance } | null = null
    if (nextIndex < steps.length) {
      const nextStep = steps[nextIndex]
      next = {
        index: nextIndex,
        prompt: nextStep.prompt,
        tolerance: nextStep.tolerance,
      }
    }

    const res = await withTransition(
      tx,
      {
        id: b.transitionId,
        userId: ctx.userId,
        kind: 'repair_step',
        attemptId,
      },
      async () => {
        await tx`
          update attempts
          set repair_step = repair_step + 1
          where id = ${attemptId}
        `
        return {
          correct,
          explain,
          next,
        }
      }
    )

    return ok(res.response)
  })
}

interface RevealBody {
  transitionId: string
}

function isRevealBody(x: unknown): x is RevealBody {
  if (!x || typeof x !== 'object') return false
  const b = x as Record<string, unknown>
  return isUuid(b.transitionId)
}

export async function handleRevealAttempt(ctx: Ctx): Promise<Response> {
  const attemptId = ctx.params.id
  if (!isUuid(attemptId)) {
    throw new HttpError('invalid', 'Invalid attempt id')
  }

  const b = await body(ctx.req, isRevealBody)

  return await sql.begin(async (tx) => {
    // 1. Exclusively lock the attempt row
    const [attempt] = await tx`
      select a.*, i.prompt, i.answer_spec, c.name as concept_name,
             s.solution, s.answer as secret_answer, s.misconceptions, s.steps
      from attempts a
      join instances i on a.instance_id = i.id
      join instance_secrets s on a.instance_id = s.instance_id
      join concepts c on a.concept_id = c.id
      where a.id = ${attemptId} and a.user_id = ${ctx.userId}
      for update of a
    `
    if (!attempt) {
      throw new HttpError('not_found', 'Attempt not found')
    }

    // 2. Check replayed transition
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

    // 3. Preconditions
    if (attempt.state !== 'resolved') {
      throw new HttpError('conflict', 'Attempt must be in resolved state to reveal')
    }

    const res = await withTransition(
      tx,
      {
        id: b.transitionId,
        userId: ctx.userId,
        kind: 'reveal_attempt',
        attemptId,
      },
      async () => {
        await tx`
          update attempts
          set state = 'revealed', revealed_at = now()
          where id = ${attemptId}
        `
        attempt.state = 'revealed'
        attempt.revealed_at = new Date()

        // Fetch playbookNote for this attempt if any
        const [pb] = await tx`
          select text from playbook where user_id = ${ctx.userId} and attempt_id = ${attempt.id}
        `
        const playbookNote = pb?.text ?? null

        // Fetch earlierNote if echo attempt
        let earlierNote: string | null = null
        if (attempt.kind === 'echo') {
          const [en] = await tx`
            select p.text
            from attempts a
            join playbook p on p.attempt_id = a.id
            where a.user_id = ${ctx.userId}
              and a.family_id = ${attempt.family_id}
              and a.id != ${attempt.id}
            order by a.presented_at desc
            limit 1
          `
          earlierNote = en?.text ?? null
        }

        const secrets = {
          solution: parseJsonIfNeeded(attempt.solution),
          answer: parseJsonIfNeeded(attempt.secret_answer),
          misconceptions: parseJsonIfNeeded(attempt.misconceptions),
          steps: parseJsonIfNeeded(attempt.steps),
        }

        return toAttemptView(
          attempt,
          attempt,
          { id: attempt.concept_id, name: attempt.concept_name },
          secrets,
          earlierNote,
          playbookNote
        )
      }
    )

    return ok(res.response)
  })
}

