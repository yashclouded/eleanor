import type postgres from 'npm:postgres@3.4.5'
import type { Answer } from '../_shared/content/types.ts'
import type { AttemptView } from './routes/sets.ts'
import {
  applyResponse,
  decayMisconception,
  expected,
  inflate,
  masteryAfter,
  nextEchoInterval,
  PARAMS,
  type MasteryState,
  type Rating,
} from '../_shared/model.ts'
import { HttpError } from './http.ts'

export async function resolveAttempt(
  tx: postgres.TransactionSql,
  a: {
    attemptId: string
    userId: string
    now: Date
    outcome: 'correct' | 'incorrect' | 'gave_up'
    answer: Answer | null
    confidence: number | null
    declaredHelp: boolean
    misconceptionId: string | null
  }
): Promise<NonNullable<AttemptView['result']>> {
  // 1. Select attempt for update
  const [attempt] = await tx`
    select * from attempts
    where id = ${a.attemptId} and user_id = ${a.userId}
    for update
  `
  if (!attempt) {
    throw new HttpError('not_found', 'Attempt not found')
  }
  if (attempt.state !== 'presented') {
    throw new HttpError('conflict', 'Attempt is already resolved')
  }

  // 2. Determine if rated effective
  const rated_effective =
    attempt.rated &&
    !a.declaredHelp &&
    attempt.kind !== 'daily' &&
    attempt.kind !== 'unrated'

  let forecast: number
  let itemRatingVal: number
  let ratingDelta: number | null = null

  if (rated_effective) {
    // 3. Lock track_ratings, concept_ratings, items
    const [trackRow] = await tx`
      select rating, rd, n, peak, last_at
      from track_ratings
      where user_id = ${a.userId} and track_id = ${attempt.track_id}
      for update
    `
    if (!trackRow) {
      throw new HttpError('internal', 'Track rating not found')
    }

    const [conceptRow] = await tx`
      select rating, rd, n, last_at, state, first_correct_at, echo_successes, last_echo_success_at
      from concept_ratings
      where user_id = ${a.userId} and concept_id = ${attempt.concept_id}
      for update
    `

    const [itemRow] = await tx`
      select rating, rd, anchor, n
      from items
      where id = ${attempt.item_id}
      for update
    `
    if (!itemRow) {
      throw new HttpError('internal', 'Item not found')
    }

    const trackRating: Rating = {
      r: Number(trackRow.rating),
      rd: Number(trackRow.rd),
      lastAt: trackRow.last_at ? new Date(trackRow.last_at) : null,
    }
    const conceptRating: Rating | null = conceptRow
      ? {
          r: Number(conceptRow.rating),
          rd: Number(conceptRow.rd),
          lastAt: conceptRow.last_at ? new Date(conceptRow.last_at) : null,
        }
      : null
    const itemRating: Rating & { anchor: boolean } = {
      r: Number(itemRow.rating),
      rd: Number(itemRow.rd),
      lastAt: null,
      anchor: Boolean(itemRow.anchor),
    }
    const s = a.outcome === 'correct' ? 1 : 0

    const ar = applyResponse({
      track: trackRating,
      concept: conceptRating,
      item: itemRating,
      s,
      now: a.now,
    })

    // Write new track rating
    const peak = Math.max(Number(trackRow.peak), ar.track.r)
    await tx`
      update track_ratings
      set rating = ${ar.track.r},
          rd = ${ar.track.rd},
          n = n + 1,
          peak = ${peak},
          last_at = ${a.now}
      where user_id = ${a.userId} and track_id = ${attempt.track_id}
    `

    // Write new item rating if updated
    if (ar.itemUpdated) {
      await tx`
        update items
        set rating = ${ar.item.r},
            rd = ${ar.item.rd},
            n = n + 1
        where id = ${attempt.item_id}
      `
    }

    // Insert rating_events
    for (const ev of ar.events) {
      const subjectId =
        ev.subject === 'track'
          ? attempt.track_id
          : ev.subject === 'concept'
          ? attempt.concept_id
          : attempt.item_id

      await tx`
        insert into rating_events (
          attempt_id, user_id, subject_type, subject_id,
          r_before, rd_before, r_after, rd_after,
          expected, score, model_version, created_at
        ) values (
          ${a.attemptId}, ${a.userId}, ${ev.subject}, ${subjectId},
          ${ev.before.r}, ${ev.before.rd}, ${ev.after.r}, ${ev.after.rd},
          ${ev.expected}, ${ev.score}, 'erm-1', ${a.now}
        )
      `
    }

    ratingDelta = ar.track.r - trackRating.r
    forecast = ar.forecast
    itemRatingVal = itemRating.r

    // 5. Mastery
    const [cRow] = await tx`
      select entry_rating from concepts where id = ${attempt.concept_id}
    `
    const entryRating = cRow ? Number(cRow.entry_rating) : 1000

    const currentMastery: {
      state: MasteryState
      firstCorrectAt: Date | null
      echoSuccesses: number
    } = conceptRow
      ? {
          state: conceptRow.state as MasteryState,
          firstCorrectAt: conceptRow.first_correct_at
            ? new Date(conceptRow.first_correct_at)
            : null,
          echoSuccesses: Number(conceptRow.echo_successes),
        }
      : { state: 'new', firstCorrectAt: null, echoSuccesses: 0 }

    const newMastery = masteryAfter(currentMastery, {
      correct: a.outcome === 'correct',
      rated: true,
      isEcho: attempt.kind === 'echo',
      itemRating: itemRatingVal,
      entryRating,
      now: a.now,
    })

    const isQualifyingEcho =
      attempt.kind === 'echo' &&
      a.outcome === 'correct' &&
      itemRatingVal >= entryRating
    const lastEchoSuccessAt = isQualifyingEcho
      ? a.now
      : conceptRow?.last_echo_success_at
      ? new Date(conceptRow.last_echo_success_at)
      : null

    if (conceptRow) {
      await tx`
        update concept_ratings
        set rating = ${ar.concept.r},
            rd = ${ar.concept.rd},
            n = n + 1,
            last_at = ${a.now},
            state = ${newMastery.state},
            first_correct_at = ${newMastery.firstCorrectAt},
            echo_successes = ${newMastery.echoSuccesses},
            last_echo_success_at = ${lastEchoSuccessAt}
        where user_id = ${a.userId} and concept_id = ${attempt.concept_id}
      `
    } else {
      await tx`
        insert into concept_ratings (
          user_id, concept_id, rating, rd, n, last_at,
          state, first_correct_at, echo_successes, last_echo_success_at
        ) values (
          ${a.userId}, ${attempt.concept_id}, ${ar.concept.r}, ${ar.concept.rd}, 1, ${a.now},
          ${newMastery.state}, ${newMastery.firstCorrectAt}, ${newMastery.echoSuccesses}, ${lastEchoSuccessAt}
        )
      `
    }

    // 6. Misconception
    if (a.misconceptionId) {
      const [miscRow] = await tx`
        select weight, last_at
        from misconception_stats
        where user_id = ${a.userId} and misconception_id = ${a.misconceptionId}
      `
      const prevMisc = miscRow
        ? { weight: Number(miscRow.weight), lastAt: new Date(miscRow.last_at) }
        : null
      const decayed = decayMisconception(prevMisc, a.now)

      await tx`
        insert into misconception_stats (
          user_id, misconception_id, concept_id, weight, last_at
        ) values (
          ${a.userId}, ${a.misconceptionId}, ${attempt.concept_id}, ${decayed.weight}, ${decayed.lastAt}
        )
        on conflict (user_id, misconception_id) do update
        set weight = excluded.weight,
            last_at = excluded.last_at,
            concept_id = excluded.concept_id
      `
    }

    // 7. Echoes
    if (attempt.kind === 'echo' && attempt.echo_id) {
      const [echoRow] = await tx`
        select interval_days
        from echoes
        where id = ${attempt.echo_id}
      `
      const prevInterval = echoRow ? Number(echoRow.interval_days) : null
      const nextInterval = nextEchoInterval(
        prevInterval,
        a.outcome === 'correct'
      )
      const dueAt = new Date(
        a.now.getTime() + nextInterval * 24 * 60 * 60 * 1000
      )

      await tx`
        update echoes
        set status = 'done',
            done_attempt_id = ${a.attemptId}
        where id = ${attempt.echo_id}
      `

      await tx`
        insert into echoes (
          user_id, track_id, concept_id, family_id, source_attempt_id,
          interval_days, due_at, status
        ) values (
          ${a.userId}, ${attempt.track_id}, ${attempt.concept_id}, ${attempt.family_id}, ${a.attemptId},
          ${nextInterval}, ${dueAt}, 'due'
        )
        on conflict (user_id, family_id) where status = 'due' do nothing
      `
    } else {
      const dueAt = new Date(a.now.getTime() + 1 * 24 * 60 * 60 * 1000)
      await tx`
        insert into echoes (
          user_id, track_id, concept_id, family_id, source_attempt_id,
          interval_days, due_at, status
        ) values (
          ${a.userId}, ${attempt.track_id}, ${attempt.concept_id}, ${attempt.family_id}, ${a.attemptId},
          1, ${dueAt}, 'due'
        )
        on conflict (user_id, family_id) where status = 'due' do nothing
      `
    }

    // Drop oldest due echoes beyond 10
    await tx`
      update echoes
      set status = 'dropped'
      where id in (
        select id from echoes
        where user_id = ${a.userId} and status = 'due'
        order by due_at desc
        offset 10
      )
    `
  } else {
    // 4. Not rated effective: compute forecast and item rating without changing database
    const [trackRow] = await tx`
      select rating, rd, last_at
      from track_ratings
      where user_id = ${a.userId} and track_id = ${attempt.track_id}
    `
    const [conceptRow] = await tx`
      select rating, rd, last_at
      from concept_ratings
      where user_id = ${a.userId} and concept_id = ${attempt.concept_id}
    `
    const [itemRow] = await tx`
      select rating, rd
      from items
      where id = ${attempt.item_id}
    `

    const inflatedTrack = inflate(
      {
        r: Number(trackRow?.rating ?? 1200),
        rd: Number(trackRow?.rd ?? PARAMS.rd0Learner),
        lastAt: trackRow?.last_at ? new Date(trackRow.last_at) : null,
      },
      a.now
    )

    const baseConcept: Rating = conceptRow
      ? {
          r: Number(conceptRow.rating),
          rd: Number(conceptRow.rd),
          lastAt: conceptRow.last_at ? new Date(conceptRow.last_at) : null,
        }
      : { r: inflatedTrack.r, rd: PARAMS.rd0Concept, lastAt: null }

    const inflatedConcept = inflate(baseConcept, a.now)
    itemRatingVal = Number(itemRow?.rating ?? 1200)
    const itemRatingObj: Rating = {
      r: itemRatingVal,
      rd: Number(itemRow?.rd ?? PARAMS.rd0Item),
      lastAt: null,
    }

    forecast = expected(inflatedConcept, itemRatingObj)
    ratingDelta = null
  }

  // 8. Update attempt
  await tx`
    update attempts
    set state = 'resolved',
        outcome = ${a.outcome},
        answer = ${a.answer !== null ? JSON.stringify(a.answer) : null}::jsonb,
        confidence = ${a.confidence},
        declared_help = ${a.declaredHelp},
        misconception_id = ${a.misconceptionId},
        forecast = ${forecast},
        item_rating = ${itemRatingVal},
        rating_delta = ${ratingDelta},
        resolved_at = ${a.now}
    where id = ${a.attemptId}
  `

  // 9. Fetch secrets for result view
  let misconception: { id: string; feedback: string } | null = null
  if (a.misconceptionId) {
    const [secRow] = await tx`
      select misconceptions from instance_secrets where instance_id = ${attempt.instance_id}
    `
    if (secRow?.misconceptions) {
      const mList =
        typeof secRow.misconceptions === 'string'
          ? JSON.parse(secRow.misconceptions)
          : secRow.misconceptions
      const m = mList.find((x: any) => x.id === a.misconceptionId)
      if (m) {
        misconception = { id: m.id, feedback: m.feedback }
      }
    }
  }

  const [secSteps] = await tx`
    select steps from instance_secrets where instance_id = ${attempt.instance_id}
  `
  const stepsList = secSteps?.steps
    ? typeof secSteps.steps === 'string'
      ? JSON.parse(secSteps.steps)
      : secSteps.steps
    : []

  return {
    outcome: a.outcome,
    answer: a.answer,
    confidence: a.confidence,
    misconception,
    forecast,
    itemRating: itemRatingVal,
    ratingDelta,
    repairStep: 0,
    repairTotal: Array.isArray(stepsList) ? stepsList.length : 0,
  }
}
