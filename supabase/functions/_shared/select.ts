import type { Intensity, MasteryState } from './model.ts'
import { targetDifficulty, targetSuccess } from './model.ts'
import type { Rng } from './rng.ts'

export type ConceptState = {
  id: string
  prereqs: string[]
  entryRating: number
  rating: number | null
  rd: number | null
  lastPractisedAt: Date | null
  attempted: boolean
  mastery: MasteryState
  misconceptionActive: boolean
}

export type ItemRow = {
  id: string
  conceptId: string
  familyId: string
  rating: number
  status: 'published' | 'retired'
}

export type DueEcho = {
  id: string
  familyId: string
  conceptId: string
  dueAt: Date
}

export type SelectionInput = {
  now: Date
  placement: boolean
  intensity: Intensity
  slotIndex: number
  setSize: number
  consecutiveLosses: number
  trackRating: number
  concepts: ConceptState[]
  items: ItemRow[]
  familyLastExposure: Record<string, Date>
  dueEchoes: DueEcho[]
  echoesInSet: number
  conceptsUsedInSet: string[]
  lastConcept: string | null
}

export type Selection =
  | {
      kind: 'echo'
      echoId: string
      itemId: string
      conceptId: string
      pStar: number
      bStar: number
    }
  | {
      kind: 'new'
      itemId: string
      conceptId: string
      pStar: number
      bStar: number
    }
  | {
      kind: 'none'
      reason: 'no_unlocked_concepts' | 'no_items'
    }

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

/**
 * Returns the list of concepts that are currently unlocked for the learner.
 * - Concepts with no prerequisites are always unlocked.
 * - If trackRating >= entryRating + 100, the concept unlocks regardless of prereqs.
 * - Otherwise, every prerequisite must be at least practiced ('practiced', 'proven', or 'needs_review').
 */
export function unlocked(concepts: ConceptState[], trackRating: number): ConceptState[] {
  const conceptMap = new Map<string, ConceptState>()
  for (const c of concepts) {
    conceptMap.set(c.id, c)
  }

  return concepts.filter((c) => {
    if (c.prereqs.length === 0) {
      return true
    }
    if (trackRating >= c.entryRating + 100) {
      return true
    }
    return c.prereqs.every((prereqId) => {
      const prereq = conceptMap.get(prereqId)
      if (!prereq) return false
      return (
        prereq.mastery === 'practiced' ||
        prereq.mastery === 'proven' ||
        prereq.mastery === 'needs_review'
      )
    })
  })
}

/**
 * Computes selection priority for a concept according to doc.md §6.4:
 * priority = 0.6·misconception_active + 0.4·weakness + 0.3·uncertainty + 0.3·staleness + 0.2·novelty − 1.0·used_in_this_set
 */
export function priority(
  c: ConceptState,
  i: { trackRating: number; now: Date; conceptsUsedInSet: string[] },
): number {
  const misconceptionActive = c.misconceptionActive ? 1 : 0
  const rConcept = c.rating ?? i.trackRating
  const weakness = clamp((i.trackRating - rConcept) / 200, 0, 1)

  // Unseen concept counts as uncertainty 1
  const uncertainty = !c.attempted || c.rd === null ? 1 : clamp((c.rd - 70) / 180, 0, 1)

  // Staleness = clamp(days_since_concept_practised / 14, 0, 1)
  let staleness = 0
  if (c.lastPractisedAt !== null) {
    const ms = Math.max(0, i.now.getTime() - c.lastPractisedAt.getTime())
    const days = ms / (1000 * 60 * 60 * 24)
    staleness = clamp(days / 14, 0, 1)
  }

  // Novelty = 1 if the concept has never been attempted, else 0
  const novelty = !c.attempted ? 1 : 0

  const usedInThisSet = i.conceptsUsedInSet.includes(c.id) ? 1 : 0

  return (
    0.6 * misconceptionActive +
    0.4 * weakness +
    0.3 * uncertainty +
    0.3 * staleness +
    0.2 * novelty -
    1.0 * usedInThisSet
  )
}

function sampleConcept(candidates: ConceptState[], input: SelectionInput, rng: Rng): ConceptState {
  if (candidates.length === 1) {
    return candidates[0]
  }

  const priorities = candidates.map((c) =>
    priority(c, {
      trackRating: input.trackRating,
      now: input.now,
      conceptsUsedInSet: input.conceptsUsedInSet,
    }),
  )

  const T = 0.15
  const maxP = Math.max(...priorities)
  const weights = priorities.map((p) => Math.exp((p - maxP) / T))
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  const roll = rng.next() * totalWeight
  let acc = 0
  for (let i = 0; i < candidates.length; i++) {
    acc += weights[i]
    if (roll <= acc || i === candidates.length - 1) {
      return candidates[i]
    }
  }

  return candidates[candidates.length - 1]
}

/**
 * Selects the next problem for a set slot according to ERM-1 (§6.4).
 */
export function selectSlot(input: SelectionInput, rng: Rng): Selection {
  // 1. Due echoes first (at most 2 per set, oldest dueAt first, distinct families)
  if (input.echoesInSet < 2 && input.dueEchoes.length > 0) {
    const sortedEchoes = [...input.dueEchoes].sort(
      (a, b) => a.dueAt.getTime() - b.dueAt.getTime(),
    )

    for (const echo of sortedEchoes) {
      // Echoes in a set must come from distinct families; skip if already exposed in this set
      const lastExp = input.familyLastExposure[echo.familyId]
      if (lastExp) {
        const diffHours = (input.now.getTime() - lastExp.getTime()) / (1000 * 60 * 60)
        if (diffHours < 1) {
          continue
        }
      }

      const echoConcept = input.concepts.find((c) => c.id === echo.conceptId)
      const pStar = targetSuccess({
        placement: input.placement,
        intensity: input.intensity,
        consecutiveLosses: input.consecutiveLosses,
        isLastSlot: input.slotIndex === input.setSize - 1,
      })
      const rBasis = input.placement
        ? input.trackRating
        : (echoConcept?.rating ?? input.trackRating)
      const bStar = targetDifficulty(rBasis, pStar)

      // Items for this echo come from its family and must be published
      const familyItems = input.items.filter(
        (item) => item.familyId === echo.familyId && item.status === 'published',
      )

      if (familyItems.length === 0) {
        continue
      }

      let minGap = Infinity
      for (const item of familyItems) {
        const gap = Math.abs(item.rating - bStar)
        if (gap < minGap) {
          minGap = gap
        }
      }

      if (minGap > 300) {
        continue
      }

      const pool = familyItems.filter(
        (item) => Math.abs(item.rating - bStar) <= minGap + 50,
      )
      const chosenItem = rng.pick(pool)

      return {
        kind: 'echo',
        echoId: echo.id,
        itemId: chosenItem.id,
        conceptId: echo.conceptId,
        pStar,
        bStar,
      }
    }
  }

  // 2. Unlocked concepts check
  const unlockedList = unlocked(input.concepts, input.trackRating)
  if (unlockedList.length === 0) {
    return { kind: 'none', reason: 'no_unlocked_concepts' }
  }

  // 3. Prevent consecutive slots on the same concept unless it is the only unlocked candidate
  let candidates = unlockedList
  if (input.lastConcept !== null) {
    const filtered = unlockedList.filter((c) => c.id !== input.lastConcept)
    if (filtered.length > 0) {
      candidates = filtered
    }
  }

  // 4. Sample top concept with seeded softmax (temperature 0.15), and prepare fallbacks
  const topConcept = sampleConcept(candidates, input, rng)
  const otherCandidates = candidates
    .filter((c) => c.id !== topConcept.id)
    .sort((a, b) => {
      const priA = priority(a, {
        trackRating: input.trackRating,
        now: input.now,
        conceptsUsedInSet: input.conceptsUsedInSet,
      })
      const priB = priority(b, {
        trackRating: input.trackRating,
        now: input.now,
        conceptsUsedInSet: input.conceptsUsedInSet,
      })
      return priB - priA
    })

  const orderedConcepts = [topConcept, ...otherCandidates]

  // 5. Try each concept in priority order
  for (const c of orderedConcepts) {
    const pStar = targetSuccess({
      placement: input.placement,
      intensity: input.intensity,
      consecutiveLosses: input.consecutiveLosses,
      isLastSlot: input.slotIndex === input.setSize - 1,
    })
    const rBasis = input.placement
      ? input.trackRating
      : (c.rating ?? input.trackRating)
    const bStar = targetDifficulty(rBasis, pStar)

    // Items for this concept: published, not retired, no family exposure within 72h
    const eligibleItems = input.items.filter((item) => {
      if (item.conceptId !== c.id || item.status !== 'published') {
        return false
      }
      const lastExp = input.familyLastExposure[item.familyId]
      if (lastExp) {
        const diffHours = (input.now.getTime() - lastExp.getTime()) / (1000 * 60 * 60)
        if (diffHours < 72) {
          return false
        }
      }
      return true
    })

    if (eligibleItems.length === 0) {
      continue
    }

    let minGap = Infinity
    for (const item of eligibleItems) {
      const gap = Math.abs(item.rating - bStar)
      if (gap < minGap) {
        minGap = gap
      }
    }

    if (minGap > 300) {
      continue // Fall back to next concept
    }

    const pool = eligibleItems.filter(
      (item) => Math.abs(item.rating - bStar) <= minGap + 50,
    )
    const chosenItem = rng.pick(pool)

    return {
      kind: 'new',
      itemId: chosenItem.id,
      conceptId: c.id,
      pStar,
      bStar,
    }
  }

  // 6. No eligible items across all concepts
  return { kind: 'none', reason: 'no_items' }
}
