export const MODEL_VERSION = 'erm-1'

export const PARAMS = {
  r0: 1200,
  rd0Learner: 350,
  rd0Concept: 250,
  rd0Item: 250,
  rdMax: 350,
  rdFloorLearner: 70,
  rdFloorItem: 30,
  c: 15,
  itemUpdateMaxLearnerRd: 150,
  provisionalRd: 110,
  leaderboardRd: 110,
  placementCount: 8,
  overallMaxRd: 150,
  echoIntervals: [1, 3, 7, 21] as const,
  maxDueEchoes: 10,
  misconceptionHalfLifeDays: 14,
  misconceptionActive: 1.5,
} as const

export type Rating = { r: number; rd: number; lastAt: Date | null }
export type Intensity = 'steady' | 'balanced' | 'stretch'

const Q = Math.log(10) / 400

function g(rd: number): number {
  return 1 / Math.sqrt(1 + (3 * Q * Q * rd * rd) / (Math.PI * Math.PI))
}

export function inflate(x: Rating, now: Date): Rating {
  if (x.lastAt === null) {
    return { r: x.r, rd: x.rd, lastAt: null }
  }
  const ms = Math.max(0, now.getTime() - x.lastAt.getTime())
  const days = ms / (1000 * 60 * 60 * 24)
  const rd = Math.min(
    PARAMS.rdMax,
    Math.sqrt(x.rd * x.rd + PARAMS.c * PARAMS.c * days),
  )
  return { r: x.r, rd, lastAt: x.lastAt }
}

export function expected(self: Rating, opp: Rating): number {
  const gOpp = g(opp.rd)
  return 1 / (1 + Math.pow(10, (-gOpp * (self.r - opp.r)) / 400))
}

export function update(
  self: Rating,
  opp: Rating,
  s: 0 | 1,
  floor: number,
  now: Date,
): Rating {
  const gOpp = g(opp.rd)
  const E = expected(self, opp)
  const d2 = 1 / (Q * Q * gOpp * gOpp * E * (1 - E))
  const varInv = 1 / (self.rd * self.rd) + 1 / d2
  const rdUnfloored = Math.sqrt(1 / varInv)
  const rdPrime = Math.max(floor, rdUnfloored)
  const rPrime = self.r + Q * (1 / varInv) * gOpp * (s - E)
  return { r: rPrime, rd: rdPrime, lastAt: now }
}

export function applyResponse(i: {
  track: Rating
  concept: Rating | null
  item: Rating & { anchor: boolean }
  s: 0 | 1
  now: Date
}): {
  track: Rating
  concept: Rating
  item: Rating
  forecast: number
  itemUpdated: boolean
  events: {
    subject: 'track' | 'concept' | 'item'
    before: Rating
    after: Rating
    expected: number
    score: 0 | 1
  }[]
} {
  const inflatedTrack = inflate(i.track, i.now)
  const baseConcept =
    i.concept ?? { r: inflatedTrack.r, rd: PARAMS.rd0Concept, lastAt: null }
  const inflatedConcept = inflate(baseConcept, i.now)

  const forecast = expected(inflatedConcept, i.item)

  const newTrack = update(
    inflatedTrack,
    i.item,
    i.s,
    PARAMS.rdFloorLearner,
    i.now,
  )
  const newConcept = update(
    inflatedConcept,
    i.item,
    i.s,
    PARAMS.rdFloorLearner,
    i.now,
  )

  const events: {
    subject: 'track' | 'concept' | 'item'
    before: Rating
    after: Rating
    expected: number
    score: 0 | 1
  }[] = [
    {
      subject: 'track',
      before: inflatedTrack,
      after: newTrack,
      expected: expected(inflatedTrack, i.item),
      score: i.s,
    },
    {
      subject: 'concept',
      before: inflatedConcept,
      after: newConcept,
      expected: forecast,
      score: i.s,
    },
  ]

  let newItem: Rating = i.item
  let itemUpdated = false

  if (!i.item.anchor && inflatedTrack.rd <= PARAMS.itemUpdateMaxLearnerRd) {
    const sItem = (1 - i.s) as 0 | 1
    newItem = update(
      i.item,
      inflatedTrack,
      sItem,
      PARAMS.rdFloorItem,
      i.now,
    )
    itemUpdated = true
    events.push({
      subject: 'item',
      before: i.item,
      after: newItem,
      expected: expected(i.item, inflatedTrack),
      score: sItem,
    })
  }

  return {
    track: newTrack,
    concept: newConcept,
    item: newItem,
    forecast,
    itemUpdated,
    events,
  }
}

export function targetSuccess(c: {
  placement: boolean
  intensity: Intensity
  consecutiveLosses: number
  isLastSlot: boolean
}): number {
  if (c.placement) {
    return 0.5
  }

  let p: number
  switch (c.intensity) {
    case 'steady':
      p = 0.8
      break
    case 'balanced':
      p = 0.7
      break
    case 'stretch':
      p = 0.55
      break
  }

  if (c.consecutiveLosses >= 2) {
    p += 0.1
  }

  if (c.isLastSlot) {
    p += 0.05
  }

  return Math.min(0.85, Math.round(p * 100) / 100)
}

export function targetDifficulty(rBasis: number, p: number): number {
  return rBasis + 400 * Math.log10((1 - p) / p)
}

export function nextEchoInterval(
  prev: number | null,
  correct: boolean,
): 1 | 3 | 7 | 21 {
  if (!correct) {
    return 1
  }
  if (prev === 1) {
    return 3
  }
  if (prev === 3) {
    return 7
  }
  if (prev === 7 || (prev !== null && prev >= 21)) {
    return 21
  }
  return 1
}

export function decayMisconception(
  prev: { weight: number; lastAt: Date } | null,
  now: Date,
): { weight: number; lastAt: Date } {
  if (prev === null) {
    return { weight: 1, lastAt: now }
  }
  const ms = Math.max(0, now.getTime() - prev.lastAt.getTime())
  const days = ms / (1000 * 60 * 60 * 24)
  const decayed =
    prev.weight *
    Math.pow(0.5, days / PARAMS.misconceptionHalfLifeDays)
  return { weight: decayed + 1, lastAt: now }
}

export type MasteryState =
  | 'new'
  | 'learning'
  | 'practiced'
  | 'proven'
  | 'needs_review'

export function masteryAfter(
  m: { state: MasteryState; firstCorrectAt: Date | null; echoSuccesses: number },
  ev: {
    correct: boolean
    rated: boolean
    isEcho: boolean
    itemRating: number
    entryRating: number
    now: Date
  },
): { state: MasteryState; firstCorrectAt: Date | null; echoSuccesses: number } {
  if (!ev.rated) {
    return { ...m }
  }

  let state = m.state
  let firstCorrectAt = m.firstCorrectAt
  let echoSuccesses = m.echoSuccesses

  if (ev.correct && firstCorrectAt === null) {
    firstCorrectAt = ev.now
  }

  if (state === 'new') {
    state = ev.correct ? 'practiced' : 'learning'
  } else if (state === 'learning') {
    if (ev.correct) {
      state = 'practiced'
    }
  }

  if (ev.isEcho) {
    const isQualifyingEcho = ev.correct && ev.itemRating >= ev.entryRating
    if (isQualifyingEcho) {
      echoSuccesses += 1
    }

    if (state === 'practiced') {
      const hasMinEchoes = echoSuccesses >= 2
      const has3DaysElapsed =
        firstCorrectAt !== null &&
        ev.now.getTime() - firstCorrectAt.getTime() >= 3 * 24 * 60 * 60 * 1000
      if (hasMinEchoes && has3DaysElapsed) {
        state = 'proven'
      }
    } else if (state === 'proven') {
      if (!ev.correct) {
        state = 'needs_review'
      }
    } else if (state === 'needs_review') {
      if (ev.correct) {
        state = 'proven'
      }
    }
  }

  return { state, firstCorrectAt, echoSuccesses }
}

export function displayState(
  state: MasteryState,
  lastEchoSuccessAt: Date | null,
  now: Date,
): MasteryState {
  if (state === 'proven') {
    if (lastEchoSuccessAt === null) {
      return 'needs_review'
    }
    const ms = Math.max(0, now.getTime() - lastEchoSuccessAt.getTime())
    const days = ms / (1000 * 60 * 60 * 24)
    if (days > 45) {
      return 'needs_review'
    }
  }
  return state
}

export type CalPoint = { p: number; y: 0 | 1 }

export function calibration(points: CalPoint[]): null | {
  n: number
  brier: number
  calError: number
  overconfidence: number
  bins: { lo: number; hi: number; n: number; meanP: number; meanY: number }[]
} {
  const n = points.length
  if (n === 0) {
    return null
  }

  let sumBrier = 0
  let sumP = 0
  let sumY = 0

  const binDefs = [
    { lo: 0.0, hi: 0.2 },
    { lo: 0.2, hi: 0.4 },
    { lo: 0.4, hi: 0.6 },
    { lo: 0.6, hi: 0.8 },
    { lo: 0.8, hi: 1.0 },
  ]

  const binPoints: CalPoint[][] = [[], [], [], [], []]

  for (const pt of points) {
    sumBrier += (pt.p - pt.y) * (pt.p - pt.y)
    sumP += pt.p
    sumY += pt.y

    if (pt.p < 0.2) {
      binPoints[0].push(pt)
    } else if (pt.p < 0.4) {
      binPoints[1].push(pt)
    } else if (pt.p < 0.6) {
      binPoints[2].push(pt)
    } else if (pt.p < 0.8) {
      binPoints[3].push(pt)
    } else {
      binPoints[4].push(pt)
    }
  }

  const brier = sumBrier / n
  const overconfidence = sumP / n - sumY / n

  const bins: {
    lo: number
    hi: number
    n: number
    meanP: number
    meanY: number
  }[] = []

  let weightedCalDiffSum = 0

  for (let i = 0; i < 5; i++) {
    const pts = binPoints[i]
    if (pts.length > 0) {
      const binN = pts.length
      const binSumP = pts.reduce((acc, p) => acc + p.p, 0)
      const binSumY = pts.reduce((acc, p) => acc + p.y, 0)
      const meanP = binSumP / binN
      const meanY = binSumY / binN
      weightedCalDiffSum += binN * Math.abs(meanP - meanY)
      bins.push({
        lo: binDefs[i].lo,
        hi: binDefs[i].hi,
        n: binN,
        meanP,
        meanY,
      })
    }
  }

  const calError = weightedCalDiffSum / n

  return { n, brier, calError, overconfidence, bins }
}

export function title(
  r: number,
):
  | 'Novice'
  | 'Apprentice'
  | 'Thinker'
  | 'Analyst'
  | 'Strategist'
  | 'Expert'
  | 'Master'
  | 'Grandmaster'
  | 'Legend' {
  if (r < 1000) return 'Novice'
  if (r < 1200) return 'Apprentice'
  if (r < 1400) return 'Thinker'
  if (r < 1600) return 'Analyst'
  if (r < 1800) return 'Strategist'
  if (r < 2000) return 'Expert'
  if (r < 2200) return 'Master'
  if (r < 2400) return 'Grandmaster'
  return 'Legend'
}

export function overallRating(tracks: { r: number; rd: number }[]): number | null {
  const eligible = tracks.filter((t) => t.rd <= PARAMS.overallMaxRd)
  if (eligible.length === 0) {
    return null
  }
  let sumWeight = 0
  let sumWeightedR = 0
  for (const t of eligible) {
    const w = 1 / (t.rd * t.rd)
    sumWeight += w
    sumWeightedR += t.r * w
  }
  return sumWeightedR / sumWeight
}

export function isProvisional(rd: number): boolean {
  return rd > PARAMS.provisionalRd
}
