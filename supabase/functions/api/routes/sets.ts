import type postgres from 'npm:postgres@3.4.5'
import { sql } from '../db.ts'
import { ok, body, HttpError, isUuid } from '../http.ts'
import { withTransition } from '../transition.ts'
import { loadSelectionInput, type SetDbRow } from '../load.ts'
import { selectSlot, unlocked, priority, type ConceptState } from '../../_shared/select.ts'
import { hashSeed, makeRng } from '../../_shared/rng.ts'
import { templateFor } from '../../_shared/registry.ts'
import { buildInstance } from '../../_shared/instance.ts'
import type { TrackId, Block, AnswerSpec, Answer, Tolerance } from '../../_shared/content/types.ts'
import type { Ctx } from '../router.ts'

export type AttemptView = {
  id: string
  setId: string | null
  slot: number | null
  kind: string
  rated: boolean
  state: string
  track: TrackId
  concept: { id: string; name: string }
  prompt: Block[]
  answerSpec: AnswerSpec
  result?: {
    outcome: 'correct' | 'incorrect' | 'gave_up' | 'abandoned'
    answer: Answer | null
    confidence: number | null
    misconception: { id: string; feedback: string } | null
    forecast: number | null
    itemRating: number | null
    ratingDelta: number | null
    repairStep: number
    repairTotal: number
    repair?: { index: number; prompt: Block[]; tolerance: Tolerance } | null
  }
  repair?: { index: number; prompt: Block[]; tolerance: Tolerance } | null
  reveal?: {
    solution: Block[]
    answer: Answer
    playbookNote: string | null
    earlierNote: string | null
  }
}

export function parseJsonIfNeeded<T>(val: T | string): T {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val)
    } catch {
      return val as any
    }
  }
  return val as T
}

export function toAttemptView(
  attempt: any,
  instance: any,
  concept: { id: string; name: string },
  secrets?: any,
  earlierNote: string | null = null,
  playbookNote: string | null = null
): AttemptView {
  const view: AttemptView = {
    id: attempt.id,
    setId: attempt.set_id ?? null,
    slot: attempt.slot !== null ? Number(attempt.slot) : null,
    kind: attempt.kind,
    rated: attempt.rated,
    state: attempt.state,
    track: attempt.track_id,
    concept: {
      id: concept.id,
      name: concept.name,
    },
    prompt: parseJsonIfNeeded(instance.prompt),
    answerSpec: parseJsonIfNeeded(instance.answer_spec ?? instance.answerSpec),
  }

  if (attempt.state === 'resolved' || attempt.state === 'revealed') {
    let misconception: { id: string; feedback: string } | null = null
    if (attempt.misconception_id && secrets?.misconceptions) {
      const m = secrets.misconceptions.find(
        (x: any) => x.id === attempt.misconception_id
      )
      if (m) {
        misconception = { id: m.id, feedback: m.feedback }
      }
    }

    const stepsList = secrets?.steps ? parseJsonIfNeeded(secrets.steps) : []

    view.result = {
      outcome: attempt.outcome,
      answer: attempt.answer ?? null,
      confidence: attempt.confidence ?? null,
      misconception,
      forecast: attempt.forecast ?? null,
      itemRating: attempt.item_rating ?? null,
      ratingDelta: attempt.rating_delta ?? null,
      repairStep: attempt.repair_step ?? 0,
      repairTotal: Array.isArray(stepsList) ? stepsList.length : 0,
    }

    const stepIndex = attempt.repair_step ?? 0
    if (
      attempt.state === 'resolved' &&
      Array.isArray(stepsList) &&
      (attempt.outcome === 'incorrect' || attempt.outcome === 'gave_up') &&
      stepIndex < stepsList.length
    ) {
      const step = stepsList[stepIndex]
      view.repair = {
        index: stepIndex,
        prompt: step.prompt,
        tolerance: step.tolerance,
      }
    }
  }

  if (attempt.state === 'revealed' && secrets) {
    view.reveal = {
      solution: secrets.solution,
      answer: secrets.answer,
      playbookNote,
      earlierNote: attempt.kind === 'echo' ? earlierNote : null,
    }
  }

  return view
}

export async function computeSetSummary(
  tx: postgres.TransactionSql | postgres.Sql,
  userId: string,
  set: SetDbRow
) {
  const attempts = await tx`
    select a.slot, a.concept_id, a.outcome, a.item_rating, a.rating_delta, a.misconception_id, a.kind, c.name as concept_name
    from attempts a
    join concepts c on a.concept_id = c.id
    where a.set_id = ${set.id}
    order by a.slot asc
  `

  const [trackRow] = await tx`
    select rating from track_ratings where user_id = ${userId} and track_id = ${set.track_id}
  `
  const currentRating = trackRow ? Number(trackRow.rating) : 1200
  const totalDelta = attempts.reduce(
    (acc, a) => acc + (a.rating_delta ? Number(a.rating_delta) : 0),
    0
  )
  const ratingBefore = currentRating - totalDelta
  const ratingAfter = currentRating

  const echoesPassed = attempts.filter(
    (a) => a.kind === 'echo' && a.outcome === 'correct'
  ).length

  // Suggested concept: unlocked concept with highest priority
  const input = await loadSelectionInput(tx, userId, set.track_id as TrackId, set)
  const unlockedConcepts = unlocked(input.concepts, currentRating)
  let highestConcept: ConceptState | null = null
  let highestPriority = -Infinity
  for (const c of unlockedConcepts) {
    const p = priority(c, {
      trackRating: currentRating,
      now: input.now,
      conceptsUsedInSet: input.conceptsUsedInSet,
    })
    if (p > highestPriority) {
      highestPriority = p
      highestConcept = c
    }
  }

  let suggestedConcept = null
  if (highestConcept) {
    const [cRow] = await tx`select name from concepts where id = ${highestConcept.id}`
    suggestedConcept = {
      id: highestConcept.id,
      name: cRow ? cRow.name : highestConcept.id,
    }
  }

  return {
    track: set.track_id,
    ratingBefore,
    ratingAfter,
    attempts: attempts.map((a) => ({
      concept: { id: a.concept_id, name: a.concept_name },
      outcome: a.outcome,
      itemRating: a.item_rating ? Number(a.item_rating) : null,
      ratingDelta: a.rating_delta ? Number(a.rating_delta) : null,
      fingerprintId: a.misconception_id ?? null,
    })),
    echoesPassed,
    suggestedConcept,
  }
}

interface CreateSetBody {
  transitionId: string
  track: TrackId
  mode: 'rated' | 'unrated'
}

const VALID_TRACKS: TrackId[] = ['judgment', 'logic', 'math', 'code']

function isCreateSetBody(x: unknown): x is CreateSetBody {
  if (!x || typeof x !== 'object') return false
  const b = x as Record<string, unknown>
  return (
    isUuid(b.transitionId) &&
    typeof b.track === 'string' &&
    VALID_TRACKS.includes(b.track as TrackId) &&
    (b.mode === 'rated' || b.mode === 'unrated')
  )
}

export async function handleCreateSet(ctx: Ctx): Promise<Response> {
  const b = await body(ctx.req, isCreateSetBody)

  return await sql.begin(async (tx) => {
    const res = await withTransition(
      tx,
      { id: b.transitionId, userId: ctx.userId, kind: 'create_set' },
      async () => {
        // If an open rated set exists for this track, return it (resume)
        if (b.mode === 'rated') {
          const openSets = await tx`
            select * from sets
            where user_id = ${ctx.userId}
              and track_id = ${b.track}
              and mode = 'rated'
              and closed_at is null
          `
          if (openSets.length > 0) {
            return { set: openSets[0] }
          }
        }

        const [profile] = await tx`
          select set_size from profiles where id = ${ctx.userId}
        `
        const size = profile?.set_size ? Number(profile.set_size) : 5
        const setId = crypto.randomUUID()
        const rngSeed = hashSeed(setId)

        const [newSet] = await tx`
          insert into sets (id, user_id, track_id, mode, size, rng_seed, created_at)
          values (${setId}, ${ctx.userId}, ${b.track}, ${b.mode}, ${size}, ${rngSeed}, now())
          returning *
        `

        return { set: newSet }
      }
    )

    return ok(res.response)
  })
}

interface NextProblemBody {
  transitionId: string
  resume?: boolean
}

function isNextProblemBody(x: unknown): x is NextProblemBody {
  if (!x || typeof x !== 'object') return false
  const b = x as Record<string, unknown>
  return (
    isUuid(b.transitionId) &&
    (b.resume === undefined || typeof b.resume === 'boolean')
  )
}

export async function handleNextProblem(ctx: Ctx): Promise<Response> {
  const setId = ctx.params.id
  if (!isUuid(setId)) {
    throw new HttpError('invalid', 'Invalid set id')
  }
  const b = await body(ctx.req, isNextProblemBody)

  return await sql.begin(async (tx) => {
    const [set] = await tx`
      select * from sets where id = ${setId} for update
    `
    if (!set || set.user_id !== ctx.userId) {
      throw new HttpError('not_found', 'Set not found')
    }

    if (set.closed_at) {
      const summary = await computeSetSummary(tx, ctx.userId, set as SetDbRow)
      return ok({ done: true, summary, reason: set.close_reason })
    }

    // Check existing attempts
    const existingAttempts = await tx`
      select a.*, i.prompt, i.answer_spec, c.name as concept_name
      from attempts a
      join instances i on a.instance_id = i.id
      join concepts c on a.concept_id = c.id
      where a.set_id = ${setId}
      order by a.slot asc
    `

    // Resume logic: if resume is requested, return current slot state (presented, resolved, revealed)
    if (b.resume && existingAttempts.length > 0) {
      const current = existingAttempts[existingAttempts.length - 1]
      if (current.state === 'presented' || current.state === 'judging') {
        const view = toAttemptView(
          current,
          current,
          { id: current.concept_id, name: current.concept_name }
        )
        return ok(view)
      }

      // If resolved or revealed, load secrets and notes for full view
      let secrets = null
      let earlierNote: string | null = null
      let playbookNote: string | null = null

      const [sec] = await tx`
        select * from instance_secrets where instance_id = ${current.instance_id}
      `
      secrets = sec

      if (current.state === 'revealed') {
        const [pb] = await tx`
          select text from playbook where user_id = ${ctx.userId} and attempt_id = ${current.id}
        `
        playbookNote = pb?.text ?? null

        if (current.kind === 'echo') {
          const [en] = await tx`
            select p.text
            from attempts a
            join playbook p on p.user_id = a.user_id and p.attempt_id = a.id
            where a.user_id = ${ctx.userId}
              and a.family_id = ${current.family_id}
              and a.id != ${current.id}
            order by a.presented_at desc
            limit 1
          `
          earlierNote = en?.text ?? null
        }
      }

      const view = toAttemptView(
        current,
        current,
        { id: current.concept_id, name: current.concept_name },
        secrets,
        earlierNote,
        playbookNote
      )
      return ok(view)
    }

    // If current slot's attempt is not yet resolved, return it (no reroll)
    if (existingAttempts.length > 0) {
      const current = existingAttempts[existingAttempts.length - 1]
      if (current.state === 'presented' || current.state === 'judging') {
        const view = toAttemptView(
          current,
          current,
          { id: current.concept_id, name: current.concept_name }
        )
        return ok(view)
      }
    }

    // If all slots are resolved, close the set as completed and return done
    if (existingAttempts.length >= set.size) {
      await tx`
        update sets
        set closed_at = now(), close_reason = 'completed'
        where id = ${setId}
      `
      const summary = await computeSetSummary(tx, ctx.userId, set as SetDbRow)
      return ok({ done: true, summary })
    }

    // Otherwise, inside withTransition, select slot and insert instance/attempt
    const res = await withTransition(
      tx,
      { id: b.transitionId, userId: ctx.userId, kind: 'next_slot' },
      async () => {
        const slot = existingAttempts.length
        const input = await loadSelectionInput(
          tx,
          ctx.userId,
          set.track_id as TrackId,
          set as SetDbRow
        )
        const rng = makeRng(hashSeed(set.rng_seed, slot))
        const selection = selectSlot(input, rng)

        if (selection.kind === 'none') {
          await tx`
            update sets
            set closed_at = now(), close_reason = 'exhausted'
            where id = ${setId}
          `
          const summary = await computeSetSummary(tx, ctx.userId, set as SetDbRow)
          return { done: true, summary, reason: selection.reason }
        }

        const [item] = await tx`
          select family_id from items where id = ${selection.itemId}
        `
        const { template, level } = templateFor(selection.itemId)

        // Select skin not used in last 5 attempts on that template
        const recentAttempts = await tx`
          select i.skin
          from attempts a
          join instances i on a.instance_id = i.id
          where a.user_id = ${ctx.userId}
            and a.item_id like ${template.id + '@' + template.version + '%'}
          order by a.presented_at desc
          limit 5
        `
        const usedSkins = new Set(recentAttempts.map((r) => r.skin))
        const availableSkins = template.skins.filter((s: string) => !usedSkins.has(s))
        const skinPool = availableSkins.length > 0 ? availableSkins : template.skins
        const skinRng = makeRng(hashSeed(set.id, slot, 'skin'))
        const chosenSkin = skinPool[Math.floor(skinRng.next() * skinPool.length)]

        const instanceSeed = hashSeed(set.id, slot, 'instance')
        const built = buildInstance(template, level, instanceSeed, chosenSkin)

        const instanceId = crypto.randomUUID()
        await tx`
          insert into instances (id, item_id, seed, skin, prompt, answer_spec, created_at)
          values (${instanceId}, ${selection.itemId}, ${instanceSeed}, ${chosenSkin},
                  ${JSON.stringify(built.prompt)}::jsonb, ${JSON.stringify(built.answerSpec)}::jsonb, now())
        `

        await tx`
          insert into instance_secrets (instance_id, answer, misconceptions, steps, solution)
          values (${instanceId}, ${JSON.stringify(built.secret.answer)}::jsonb,
                  ${JSON.stringify(built.secret.misconceptions)}::jsonb,
                  ${JSON.stringify(built.secret.steps)}::jsonb,
                  ${JSON.stringify(built.secret.solution)}::jsonb)
        `

        let kind: 'placement' | 'selected' | 'echo' | 'unrated'
        if (set.mode === 'unrated') {
          kind = 'unrated'
        } else if (selection.kind === 'echo') {
          kind = 'echo'
        } else if (input.placement) {
          kind = 'placement'
        } else {
          kind = 'selected'
        }

        const attemptId = crypto.randomUUID()
        const [newAttempt] = await tx`
          insert into attempts (
            id, user_id, set_id, slot, instance_id, item_id,
            track_id, concept_id, family_id, kind, echo_id,
            state, rated, presented_at
          ) values (
            ${attemptId}, ${ctx.userId}, ${setId}, ${slot}, ${instanceId}, ${selection.itemId},
            ${set.track_id}, ${selection.conceptId}, ${item.family_id}, ${kind},
            ${selection.kind === 'echo' ? selection.echoId : null},
            'presented', ${set.mode === 'rated'}, now()
          )
          returning *
        `

        const [cRow] = await tx`
          select name from concepts where id = ${selection.conceptId}
        `

        return toAttemptView(newAttempt, built, {
          id: selection.conceptId,
          name: cRow ? cRow.name : selection.conceptId,
        })
      }
    )

    return ok(res.response)
  })
}

export async function handleGetAttempt(ctx: Ctx): Promise<Response> {
  const attemptId = ctx.params.id
  if (!isUuid(attemptId)) {
    throw new HttpError('invalid', 'Invalid attempt id')
  }

  const [attempt] = await sql`
    select a.*, i.prompt, i.answer_spec, c.name as concept_name
    from attempts a
    join instances i on a.instance_id = i.id
    join concepts c on a.concept_id = c.id
    where a.id = ${attemptId}
  `

  if (!attempt || attempt.user_id !== ctx.userId) {
    throw new HttpError('not_found', 'Attempt not found')
  }

  let secrets = null
  let earlierNote: string | null = null
  let playbookNote: string | null = null

  if (attempt.state === 'resolved' || attempt.state === 'revealed') {
    const [sec] = await sql`
      select * from instance_secrets where instance_id = ${attempt.instance_id}
    `
    secrets = sec

    if (attempt.state === 'revealed') {
      const [pb] = await sql`
        select text from playbook where user_id = ${ctx.userId} and attempt_id = ${attempt.id}
      `
      playbookNote = pb?.text ?? null

      if (attempt.kind === 'echo') {
        const [en] = await sql`
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
    }
  }

  const view = toAttemptView(
    attempt,
    attempt,
    { id: attempt.concept_id, name: attempt.concept_name },
    secrets,
    earlierNote,
    playbookNote
  )

  return ok(view)
}
