import type postgres from 'npm:postgres@3.4.5'
import type {
  SelectionInput,
  ConceptState,
  ItemRow,
  DueEcho,
} from '../_shared/select.ts'
import type { TrackId } from '../_shared/content/types.ts'
import { PARAMS, type Intensity, type MasteryState } from '../_shared/model.ts'

export interface SetDbRow {
  id: string
  user_id: string
  track_id: string
  mode: string
  size: number
  rng_seed: number | string
  created_at: string | Date
  closed_at: string | Date | null
  close_reason: string | null
}

export async function loadSelectionInput(
  tx: postgres.TransactionSql | postgres.Sql,
  userId: string,
  track: TrackId,
  set: SetDbRow,
  now: Date = new Date()
): Promise<SelectionInput> {
  // 1. Profile and track rating
  const [profile] = await tx`
    select intensity from profiles where id = ${userId}
  `
  const intensity: Intensity =
    (profile?.intensity as Intensity) ?? 'balanced'

  const [trackRow] = await tx`
    select rating, n from track_ratings where user_id = ${userId} and track_id = ${track}
  `
  const trackRating = trackRow ? Number(trackRow.rating) : 1200
  const trackN = trackRow ? Number(trackRow.n) : 0
  const placement = set.mode === 'rated' && trackN < 8

  // 2. Existing attempts in this set
  const existingAttempts = await tx`
    select slot, concept_id, kind, outcome, rated, resolved_at
    from attempts
    where set_id = ${set.id}
    order by slot asc
  `
  const slotIndex = existingAttempts.length
  const echoesInSet = existingAttempts.filter((a) => a.kind === 'echo').length
  const conceptsUsedInSet = existingAttempts.map((a) => String(a.concept_id))
  const lastConcept =
    existingAttempts.length > 0
      ? String(existingAttempts[existingAttempts.length - 1].concept_id)
      : null

  let consecutiveLosses = 0
  for (let i = existingAttempts.length - 1; i >= 0; i--) {
    const a = existingAttempts[i]
    if (a.rated && a.resolved_at) {
      if (a.outcome === 'incorrect' || a.outcome === 'gave_up') {
        consecutiveLosses++
      } else {
        break
      }
    }
  }

  // 3. Concepts for this track
  const trackConcepts = await tx`
    select id, prereqs, entry_rating
    from concepts
    where track_id = ${track}
    order by sort asc
  `

  const conceptRatings = await tx`
    select concept_id, rating, rd, n, last_at, state
    from concept_ratings
    where user_id = ${userId}
  `
  const conceptRatingMap = new Map<string, any>()
  for (const cr of conceptRatings) {
    conceptRatingMap.set(cr.concept_id, cr)
  }

  const misconceptionStats = await tx`
    select concept_id, weight, last_at
    from misconception_stats
    where user_id = ${userId}
  `
  const activeMisconceptionConcepts = new Set<string>()
  for (const ms of misconceptionStats) {
    if (ms.last_at) {
      const elapsedDays =
        Math.max(0, now.getTime() - new Date(ms.last_at).getTime()) /
        (1000 * 60 * 60 * 24)
      const currentWeight =
        Number(ms.weight) *
        Math.pow(0.5, elapsedDays / PARAMS.misconceptionHalfLifeDays)
      if (currentWeight >= 1.5) {
        activeMisconceptionConcepts.add(ms.concept_id)
      }
    }
  }

  const concepts: ConceptState[] = trackConcepts.map((c) => {
    const cr = conceptRatingMap.get(c.id)
    return {
      id: c.id,
      prereqs: c.prereqs ?? [],
      entryRating: Number(c.entry_rating),
      rating: cr ? Number(cr.rating) : null,
      rd: cr ? Number(cr.rd) : null,
      lastPractisedAt: cr?.last_at ? new Date(cr.last_at) : null,
      attempted: (cr?.n ?? 0) > 0,
      mastery: (cr?.state as MasteryState) ?? 'new',
      misconceptionActive: activeMisconceptionConcepts.has(c.id),
    }
  })

  // 4. Published items for this track
  const itemRows = await tx`
    select id, concept_id, family_id, rating, status
    from items
    where track_id = ${track} and status = 'published'
  `
  const items: ItemRow[] = itemRows.map((r) => ({
    id: r.id,
    conceptId: r.concept_id,
    familyId: r.family_id,
    rating: Number(r.rating),
    status: r.status as 'published' | 'retired',
  }))

  // 5. Family last exposure
  const exposures = await tx`
    select family_id, max(resolved_at) as last_resolved
    from attempts
    where user_id = ${userId} and resolved_at is not null
    group by family_id
  `
  const familyLastExposure: Record<string, Date> = {}
  for (const exp of exposures) {
    if (exp.last_resolved) {
      familyLastExposure[exp.family_id] = new Date(exp.last_resolved)
    }
  }

  // 6. Due echoes
  const dueEchoRows = await tx`
    select id, family_id, concept_id, due_at
    from echoes
    where user_id = ${userId}
      and track_id = ${track}
      and status = 'due'
      and due_at <= ${now}
    order by due_at asc
  `
  const dueEchoes: DueEcho[] = dueEchoRows.map((e) => ({
    id: e.id,
    familyId: e.family_id,
    conceptId: e.concept_id,
    dueAt: new Date(e.due_at),
  }))

  return {
    now,
    placement,
    intensity,
    slotIndex,
    setSize: set.size,
    consecutiveLosses,
    trackRating,
    concepts,
    items,
    familyLastExposure,
    dueEchoes,
    echoesInSet,
    conceptsUsedInSet,
    lastConcept,
  }
}
