import { hashSeed, makeRng, type Rng } from '../supabase/functions/_shared/rng.ts'
import {
  applyResponse,
  PARAMS,
  type Rating,
} from '../supabase/functions/_shared/model.ts'
import {
  type ConceptState,
  type ItemRow,
  selectSlot,
} from '../supabase/functions/_shared/select.ts'

export type SimulationOptions = {
  numLearners?: number
  totalResponses?: number
  learn?: number
  seed?: number
}

export type MilestoneResult = {
  responses: number
  medianLearnerError: number
  p90LearnerError: number
  postPlacementSuccessRate: number
  medianItemError: number
  itemsWithMinResponses: number
}

export type SimulationReport = {
  options: Required<SimulationOptions>
  milestones: MilestoneResult[]
  gatePassed: boolean
  gateFailures: string[]
}

function makeNormal(rng: Rng): () => number {
  let hasSpare = false
  let spare = 0
  return () => {
    if (hasSpare) {
      hasSpare = false
      return spare
    }
    let u = 0
    let v = 0
    while (u === 0) u = rng.next()
    while (v === 0) v = rng.next()
    const r = Math.sqrt(-2.0 * Math.log(u))
    const theta = 2.0 * Math.PI * v
    spare = r * Math.sin(theta)
    hasSpare = true
    return r * Math.cos(theta)
  }
}

function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base])
  }
  return sorted[base]
}

export function runSimulation(options: SimulationOptions = {}): SimulationReport {
  const numLearners = options.numLearners ?? 500
  const totalResponses = options.totalResponses ?? 120
  const learn = options.learn ?? 0.5
  const seed = options.seed ?? 42

  const rng = makeRng(hashSeed('sim', seed))
  const normal = makeNormal(rng)

  // 1. One synthetic track with 6 concepts (no prereqs)
  const conceptsConfig = [0, 1, 2, 3, 4, 5].map((i) => ({
    id: `concept_${i}`,
    prereqs: [],
    entryRating: 800,
    sort: i + 1,
  }))

  // 2. 300 items spread uniformly over true difficulty 500–2500
  // Each item's initial rating = true + N(0,150)
  // 10% anchors: initial rating = true + N(0,40), rd 30, never updated
  type SimItem = {
    id: string
    conceptId: string
    familyId: string
    trueDifficulty: number
    rating: Rating
    anchor: boolean
    n: number
  }

  const items: SimItem[] = []
  for (let i = 0; i < 300; i++) {
    const trueDifficulty = 500 + (2000 * i) / 299
    const anchor = i % 10 === 0
    const rErr = normal() * (anchor ? 40 : 150)
    const initialR = trueDifficulty + rErr
    items.push({
      id: `item_${i}`,
      conceptId: `concept_${i % 6}`,
      familyId: `family_${i % 6}`,
      trueDifficulty,
      rating: {
        r: initialR,
        rd: anchor ? 30 : PARAMS.rd0Item,
        lastAt: null,
      },
      anchor,
      n: 0,
    })
  }

  const itemMap = new Map(items.map((it) => [it.id, it]))
  const itemRows: ItemRow[] = items.map((it) => ({
    id: it.id,
    conceptId: it.conceptId,
    familyId: it.familyId,
    rating: it.rating.r,
    status: 'published',
  }))

  // 3. Learners with true ability N(1300,300), start 1200/350, intensity balanced
  type SimLearner = {
    id: number
    trueAbility: number
    track: Rating
    concepts: Map<
      string,
      {
        rating: number | null
        rd: number | null
        lastPractisedAt: Date | null
        attempted: boolean
        mastery: ConceptState['mastery']
      }
    >
    consecutiveLosses: number
    conceptsUsedInSet: string[]
    lastConcept: string | null
    familyLastExposure: Record<string, Date>
  }

  const learners: SimLearner[] = []
  for (let i = 0; i < numLearners; i++) {
    const trueAbility = 1300 + normal() * 300
    const conceptMap = new Map<
      string,
      {
        rating: number | null
        rd: number | null
        lastPractisedAt: Date | null
        attempted: boolean
        mastery: ConceptState['mastery']
      }
    >()
    for (const c of conceptsConfig) {
      conceptMap.set(c.id, {
        rating: null,
        rd: null,
        lastPractisedAt: null,
        attempted: false,
        mastery: 'new',
      })
    }
    learners.push({
      id: i,
      trueAbility,
      track: { r: 1200, rd: 350, lastAt: null },
      concepts: conceptMap,
      consecutiveLosses: 0,
      conceptsUsedInSet: [],
      lastConcept: null,
      familyLastExposure: {},
    })
  }

  const now = new Date('2026-10-20T12:00:00Z')
  let postPlacementAttempts = 0
  let postPlacementSuccesses = 0

  const milestoneSteps = [8, 20, 40, 60, 120].filter((m) => m <= totalResponses)
  const milestoneResults: MilestoneResult[] = []

  // 4. Run responses step by step
  for (let step = 0; step < totalResponses; step++) {
    const isPlacement = step < 8
    const slotIndex = step % 5
    const isLastSlot = slotIndex === 4

    for (let l = 0; l < numLearners; l++) {
      const learner = learners[l]

      const conceptStates: ConceptState[] = conceptsConfig.map((c) => {
        const state = learner.concepts.get(c.id)!
        return {
          id: c.id,
          prereqs: c.prereqs,
          entryRating: c.entryRating,
          rating: state.rating,
          rd: state.rd,
          lastPractisedAt: state.lastPractisedAt,
          attempted: state.attempted,
          mastery: state.mastery,
          misconceptionActive: false,
        }
      })

      // Sync latest item ratings
      for (let idx = 0; idx < items.length; idx++) {
        itemRows[idx].rating = items[idx].rating.r
      }

      // Echoes disabled in synthetic check
      const sel = selectSlot(
        {
          now,
          placement: isPlacement,
          intensity: 'balanced',
          slotIndex,
          setSize: 5,
          consecutiveLosses: learner.consecutiveLosses,
          trackRating: learner.track.r,
          concepts: conceptStates,
          items: itemRows,
          familyLastExposure: {},
          dueEchoes: [],
          echoesInSet: 0,
          conceptsUsedInSet: learner.conceptsUsedInSet,
          lastConcept: learner.lastConcept,
        },
        rng,
      )

      if (sel.kind !== 'new') {
        continue
      }

      const chosenItem = itemMap.get(sel.itemId)!
      const pTrue =
        1 /
        (1 +
          Math.pow(10, (chosenItem.trueDifficulty - learner.trueAbility) / 400))
      const s: 0 | 1 = rng.next() < pTrue ? 1 : 0

      if (!isPlacement) {
        postPlacementAttempts++
        if (s === 1) postPlacementSuccesses++
      }

      const cState = learner.concepts.get(sel.conceptId)!
      const conceptRating: Rating | null =
        cState.rating !== null
          ? {
              r: cState.rating,
              rd: cState.rd ?? 250,
              lastAt: cState.lastPractisedAt,
            }
          : null

      const resp = applyResponse({
        track: learner.track,
        concept: conceptRating,
        item: { ...chosenItem.rating, anchor: chosenItem.anchor },
        s,
        now,
      })

      learner.track = resp.track
      cState.rating = resp.concept.r
      cState.rd = resp.concept.rd
      cState.lastPractisedAt = now
      cState.attempted = true
      if (s === 1) cState.mastery = 'practiced'

      if (resp.itemUpdated) {
        chosenItem.rating = resp.item
      }
      chosenItem.n++

      learner.trueAbility += learn
      learner.conceptsUsedInSet.push(sel.conceptId)
      learner.lastConcept = sel.conceptId

      if (s === 0) learner.consecutiveLosses++
      else learner.consecutiveLosses = 0

      if (isLastSlot) {
        learner.conceptsUsedInSet = []
        learner.lastConcept = null
        learner.consecutiveLosses = 0
      }
    }

    const currentResp = step + 1
    if (milestoneSteps.includes(currentResp)) {
      const errors = learners.map((l) => Math.abs(l.track.r - l.trueAbility))
      const medError = quantile(errors, 0.5)
      const p90Error = quantile(errors, 0.9)
      const succRate =
        postPlacementAttempts > 0
          ? postPlacementSuccesses / postPlacementAttempts
          : 0
      const itemErrors = items
        .filter((it) => it.n >= 30)
        .map((it) => Math.abs(it.rating.r - it.trueDifficulty))
      const medItemError = itemErrors.length > 0 ? quantile(itemErrors, 0.5) : 0

      milestoneResults.push({
        responses: currentResp,
        medianLearnerError: medError,
        p90LearnerError: p90Error,
        postPlacementSuccessRate: succRate,
        medianItemError: medItemError,
        itemsWithMinResponses: itemErrors.length,
      })
    }
  }

  // 5. Evaluate pass/fail gate if default learn (0.5) and at least 60 responses
  const gateFailures: string[] = []
  const at60 = milestoneResults.find((m) => m.responses === 60)
  if (at60 && learn === 0.5) {
    if (at60.medianLearnerError > 60) {
      gateFailures.push(
        `Median rating error at 60 responses (${at60.medianLearnerError.toFixed(
          1,
        )}) exceeds gate threshold (≤ 60)`,
      )
    }
    if (at60.p90LearnerError > 140) {
      gateFailures.push(
        `P90 rating error at 60 responses (${at60.p90LearnerError.toFixed(
          1,
        )}) exceeds gate threshold (≤ 140)`,
      )
    }
    if (
      at60.postPlacementSuccessRate < 0.66 ||
      at60.postPlacementSuccessRate > 0.74
    ) {
      gateFailures.push(
        `Post-placement success rate at 60 responses (${(
          at60.postPlacementSuccessRate * 100
        ).toFixed(1)}%) outside gate range ([66%, 74%])`,
      )
    }
    if (at60.medianItemError > 60) {
      gateFailures.push(
        `Median item difficulty error at 60 responses (${at60.medianItemError.toFixed(
          1,
        )}) exceeds gate threshold (≤ 60)`,
      )
    }
  }

  return {
    options: { numLearners, totalResponses, learn, seed },
    milestones: milestoneResults,
    gatePassed: gateFailures.length === 0,
    gateFailures,
  }
}

// CLI Execution
if (process.argv[1]?.endsWith('simulate.ts')) {
  const learnArg = process.argv.find((a) => a.startsWith('--learn='))
  const learnVal = learnArg ? parseFloat(learnArg.split('=')[1]) : 0.5

  console.log(`Starting ERM-1 model simulation (learn = ${learnVal})...`)
  const report = runSimulation({ learn: learnVal })

  console.log('\n--- Simulation Results ---')
  for (const m of report.milestones) {
    console.log(
      `After ${String(m.responses).padStart(3)} responses: ` +
        `medLearnerErr = ${m.medianLearnerError.toFixed(1).padStart(5)}, ` +
        `p90LearnerErr = ${m.p90LearnerError.toFixed(1).padStart(5)}, ` +
        `postPlacementSuccess = ${(m.postPlacementSuccessRate * 100).toFixed(1).padStart(4)}%, ` +
        `medItemErr = ${m.medianItemError.toFixed(1).padStart(5)} (items >= 30: ${m.itemsWithMinResponses})`,
    )
  }

  if (learnVal === 0.5) {
    if (report.gatePassed) {
      console.log('\n✅ Model simulation gate passed successfully.')
      process.exit(0)
    } else {
      console.error('\n❌ Model simulation gate FAILED:')
      for (const f of report.gateFailures) {
        console.error(`  - ${f}`)
      }
      process.exit(1)
    }
  } else {
    console.log(
      `\nℹ️ Drift simulation completed (learn = ${learnVal}). Gate not enforced.`,
    )
    process.exit(0)
  }
}
