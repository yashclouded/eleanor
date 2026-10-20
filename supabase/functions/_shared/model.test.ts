import { describe, expect, it } from 'vitest'
import {
  applyResponse,
  calibration,
  decayMisconception,
  displayState,
  expected,
  inflate,
  isProvisional,
  masteryAfter,
  nextEchoInterval,
  overallRating,
  targetDifficulty,
  targetSuccess,
  title,
  update,
} from './model.ts'
import type { MasteryState, Rating } from './model.ts'

describe('ERM-1 model', () => {
  const now = new Date('2026-10-20T12:00:00Z')

  describe('1. Reference vectors (doc.md §6.2)', () => {
    const vectors: [string, Rating, Rating, 0 | 1, number, number, number, number][] = [
      ['New learner wins against a new item', { r: 1200, rd: 350, lastAt: null }, { r: 1200, rd: 250, lastAt: null }, 1, 70, 0.5000, 1370.21, 274.75],
      ['New learner loses against a new item', { r: 1200, rd: 350, lastAt: null }, { r: 1200, rd: 250, lastAt: null }, 0, 70, 0.5000, 1029.79, 274.75],
      ['Settled learner wins against a harder item', { r: 1500, rd: 70, lastAt: null }, { r: 1650, rd: 40, lastAt: null }, 1, 70, 0.2981, 1519.01, 70.00],
      ['Settled learner loses against a harder item', { r: 1500, rd: 70, lastAt: null }, { r: 1650, rd: 40, lastAt: null }, 0, 70, 0.2981, 1491.93, 70.00],
      ['Settled learner wins at about 70%', { r: 1500, rd: 70, lastAt: null }, { r: 1353, rd: 40, lastAt: null }, 1, 70, 0.6984, 1508.17, 70.00],
      ['Settled learner loses at about 70%', { r: 1500, rd: 70, lastAt: null }, { r: 1353, rd: 40, lastAt: null }, 0, 70, 0.6984, 1481.10, 70.00],
      ['Item loses to a learner', { r: 1650, rd: 40, lastAt: null }, { r: 1500, rd: 70, lastAt: null }, 0, 30, 0.6991, 1643.78, 39.79],
      ['Mid-RD learner loses', { r: 1400, rd: 120, lastAt: null }, { r: 1300, rd: 60, lastAt: null }, 0, 70, 0.6377, 1353.06, 114.08],
    ]

    for (const [name, self, opp, s, floor, expE, expr, exprd] of vectors) {
      it(name, () => {
        const E = expected(self, opp)
        expect(E).toBeCloseTo(expE, 2)

        const res = update(self, opp, s, floor, now)
        expect(res.r).toBeCloseTo(expr, 2)
        expect(res.rd).toBeCloseTo(exprd, 2)
        expect(res.lastAt).toBe(now)
      })
    }
  })

  describe('2. Inactivity inflation', () => {
    it('inflates RD over time, caps at 350, and preserves null lastAt', () => {
      const T = new Date('2026-01-01T00:00:00Z')
      const T30 = new Date(T.getTime() + 30 * 24 * 60 * 60 * 1000)
      const T10000 = new Date(T.getTime() + 10000 * 24 * 60 * 60 * 1000)

      const res30 = inflate({ r: 1500, rd: 70, lastAt: T }, T30)
      expect(res30.rd).toBeCloseTo(107.94, 2)
      expect(res30.r).toBe(1500)
      expect(res30.lastAt).toEqual(T)

      const res10000 = inflate({ r: 1500, rd: 70, lastAt: T }, T10000)
      expect(res10000.rd).toBe(350)

      const resNull = inflate({ r: 1500, rd: 70, lastAt: null }, T30)
      expect(resNull.rd).toBe(70)
      expect(resNull.lastAt).toBeNull()
    })
  })

  describe('3. Target difficulty', () => {
    it('computes difficulty basis + 400*log10((1-p)/p)', () => {
      expect(targetDifficulty(1500, 0.5)).toBeCloseTo(1500, 2)
      expect(targetDifficulty(1500, 0.55)).toBeCloseTo(1465.14, 2)
      expect(targetDifficulty(1500, 0.7)).toBeCloseTo(1352.81, 2)
      expect(targetDifficulty(1500, 0.8)).toBeCloseTo(1259.18, 2)
      expect(targetDifficulty(1500, 0.85)).toBeCloseTo(1198.67, 2)
    })
  })

  describe('4. Target success probability (flow controller)', () => {
    it('evaluates flow controller targets based on placement, intensity, losses, and slot', () => {
      expect(targetSuccess({ placement: true, intensity: 'steady', consecutiveLosses: 3, isLastSlot: true })).toBe(0.5)
      expect(targetSuccess({ placement: false, intensity: 'balanced', consecutiveLosses: 0, isLastSlot: false })).toBe(0.7)
      expect(targetSuccess({ placement: false, intensity: 'steady', consecutiveLosses: 0, isLastSlot: false })).toBe(0.8)
      expect(targetSuccess({ placement: false, intensity: 'stretch', consecutiveLosses: 0, isLastSlot: false })).toBe(0.55)
      expect(targetSuccess({ placement: false, intensity: 'balanced', consecutiveLosses: 2, isLastSlot: false })).toBe(0.8)
      expect(targetSuccess({ placement: false, intensity: 'balanced', consecutiveLosses: 2, isLastSlot: true })).toBe(0.85)
      expect(targetSuccess({ placement: false, intensity: 'steady', consecutiveLosses: 0, isLastSlot: true })).toBe(0.85)
    })
  })

  describe('5. applyResponse', () => {
    it('handles anchor items, high learner rd, null concept initialization, and events', () => {
      // Anchor item does not change
      const anchorItem = { r: 1400, rd: 50, lastAt: null, anchor: true }
      const resAnchor = applyResponse({
        track: { r: 1300, rd: 80, lastAt: null },
        concept: { r: 1300, rd: 80, lastAt: null },
        item: anchorItem,
        s: 1,
        now,
      })
      expect(resAnchor.itemUpdated).toBe(false)
      expect(resAnchor.item.r).toBe(1400)
      expect(resAnchor.events.length).toBe(2)

      // Learner with track RD > 150 does not update item
      const resHighRd = applyResponse({
        track: { r: 1200, rd: 200, lastAt: null },
        concept: { r: 1200, rd: 100, lastAt: null },
        item: { r: 1200, rd: 100, lastAt: null, anchor: false },
        s: 1,
        now,
      })
      expect(resHighRd.itemUpdated).toBe(false)
      expect(resHighRd.events.length).toBe(2)

      // Null concept starts from track rating with rd 250
      const resNullConcept = applyResponse({
        track: { r: 1500, rd: 80, lastAt: null },
        concept: null,
        item: { r: 1500, rd: 80, lastAt: null, anchor: false },
        s: 1,
        now,
      })
      expect(resNullConcept.forecast).toBeCloseTo(expected({ r: 1500, rd: 250, lastAt: null }, { r: 1500, rd: 80, lastAt: null }), 4)
      expect(resNullConcept.itemUpdated).toBe(true)
      expect(resNullConcept.events.length).toBe(3)
    })
  })

  describe('6. nextEchoInterval', () => {
    it('advances intervals on correct and resets on failure', () => {
      expect(nextEchoInterval(null, true)).toBe(1)
      expect(nextEchoInterval(1, true)).toBe(3)
      expect(nextEchoInterval(3, true)).toBe(7)
      expect(nextEchoInterval(7, true)).toBe(21)
      expect(nextEchoInterval(21, true)).toBe(21)
      expect(nextEchoInterval(7, false)).toBe(1)
    })
  })

  describe('7. decayMisconception', () => {
    it('decays weight with 14-day half-life and increments by 1', () => {
      const T = new Date('2026-05-01T00:00:00Z')
      const T14 = new Date(T.getTime() + 14 * 24 * 60 * 60 * 1000)
      const T28 = new Date(T.getTime() + 28 * 24 * 60 * 60 * 1000)

      expect(decayMisconception(null, T)).toEqual({ weight: 1, lastAt: T })
      expect(decayMisconception({ weight: 1, lastAt: T }, T14).weight).toBeCloseTo(1.5, 4)
      expect(decayMisconception({ weight: 1, lastAt: T }, T28).weight).toBeCloseTo(1.25, 4)
    })
  })

  describe('8. masteryAfter & displayState', () => {
    it('transitions mastery states correctly', () => {
      const t0 = new Date('2026-06-01T00:00:00Z')
      const t1 = new Date(t0.getTime() + 1 * 24 * 60 * 60 * 1000)
      const t4 = new Date(t0.getTime() + 4 * 24 * 60 * 60 * 1000)

      // unrated events change nothing
      const init: { state: MasteryState; firstCorrectAt: Date | null; echoSuccesses: number } = {
        state: 'learning',
        firstCorrectAt: null,
        echoSuccesses: 0,
      }
      expect(
        masteryAfter(init, { correct: true, rated: false, isEcho: false, itemRating: 1200, entryRating: 1000, now: t0 })
      ).toEqual(init)

      // learning -> practiced on first rated correct answer
      const practiced = masteryAfter(init, {
        correct: true,
        rated: true,
        isEcho: false,
        itemRating: 1200,
        entryRating: 1000,
        now: t0,
      })
      expect(practiced.state).toBe('practiced')
      expect(practiced.firstCorrectAt).toEqual(t0)
      expect(practiced.echoSuccesses).toBe(0)

      // echo success only counts when itemRating >= entryRating
      const echoLow = masteryAfter(practiced, {
        correct: true,
        rated: true,
        isEcho: true,
        itemRating: 900,
        entryRating: 1000,
        now: t1,
      })
      expect(echoLow.echoSuccesses).toBe(0)
      expect(echoLow.state).toBe('practiced')

      // echo 1 >= entryRating
      const echo1 = masteryAfter(practiced, {
        correct: true,
        rated: true,
        isEcho: true,
        itemRating: 1050,
        entryRating: 1000,
        now: t1,
      })
      expect(echo1.echoSuccesses).toBe(1)
      expect(echo1.state).toBe('practiced')

      // echo 2 >= entryRating but < 3 days after firstCorrectAt
      const echo2Early = masteryAfter(echo1, {
        correct: true,
        rated: true,
        isEcho: true,
        itemRating: 1100,
        entryRating: 1000,
        now: t1,
      })
      expect(echo2Early.echoSuccesses).toBe(2)
      expect(echo2Early.state).toBe('practiced') // not proven yet because < 3 days

      // echo 2 at t4 (>= 3 days) -> proven
      const proven = masteryAfter(echo1, {
        correct: true,
        rated: true,
        isEcho: true,
        itemRating: 1100,
        entryRating: 1000,
        now: t4,
      })
      expect(proven.state).toBe('proven')
      expect(proven.echoSuccesses).toBe(2)

      // incorrect rated echo while proven -> needs_review
      const needsReview = masteryAfter(proven, {
        correct: false,
        rated: true,
        isEcho: true,
        itemRating: 1100,
        entryRating: 1000,
        now: t4,
      })
      expect(needsReview.state).toBe('needs_review')

      // correct echo from needs_review -> proven
      const recovered = masteryAfter(needsReview, {
        correct: true,
        rated: true,
        isEcho: true,
        itemRating: 1100,
        entryRating: 1000,
        now: t4,
      })
      expect(recovered.state).toBe('proven')

      // displayState: proven + >45 days -> needs_review
      const t50d = new Date(t4.getTime() + 50 * 24 * 60 * 60 * 1000)
      expect(displayState('proven', t4, t50d)).toBe('needs_review')
      expect(displayState('proven', t4, new Date(t4.getTime() + 10 * 24 * 60 * 60 * 1000))).toBe('proven')
    })
  })

  describe('9. calibration', () => {
    it('computes calibration metrics and bins', () => {
      expect(calibration([])).toBeNull()

      const points: { p: number; y: 0 | 1 }[] = [
        { p: 0.9, y: 1 },
        { p: 0.9, y: 0 },
        { p: 0.5, y: 1 },
        { p: 0.1, y: 0 },
      ]
      const res = calibration(points)!
      expect(res).not.toBeNull()
      expect(res.n).toBe(4)
      expect(res.brier).toBeCloseTo(0.27, 4)
      expect(res.overconfidence).toBeCloseTo(0.1, 4)

      // Check bins: [0, .2), [.4, .6), [.8, 1.0]
      expect(res.bins.length).toBe(3)
      expect(res.bins[0]).toEqual({ lo: 0, hi: 0.2, n: 1, meanP: 0.1, meanY: 0 })
      expect(res.bins[1]).toEqual({ lo: 0.4, hi: 0.6, n: 1, meanP: 0.5, meanY: 1 })
      expect(res.bins[2]).toEqual({ lo: 0.8, hi: 1.0, n: 2, meanP: 0.9, meanY: 0.5 })

      // p = 1.0 falls in the last bin
      const resWith1 = calibration([{ p: 1.0, y: 1 }])!
      expect(resWith1.bins[0].lo).toBe(0.8)
      expect(resWith1.bins[0].hi).toBe(1.0)
    })
  })

  describe('10. title, overallRating, isProvisional', () => {
    it('assigns titles, overall rating, and provisional flags correctly', () => {
      expect(title(999)).toBe('Novice')
      expect(title(1000)).toBe('Apprentice')
      expect(title(1200)).toBe('Thinker')
      expect(title(1400)).toBe('Analyst')
      expect(title(1600)).toBe('Strategist')
      expect(title(1800)).toBe('Expert')
      expect(title(2000)).toBe('Master')
      expect(title(2200)).toBe('Grandmaster')
      expect(title(2400)).toBe('Legend')

      expect(isProvisional(111)).toBe(true)
      expect(isProvisional(110)).toBe(false)
      expect(isProvisional(70)).toBe(false)

      // overallRating ignores tracks with rd > 150
      expect(overallRating([{ r: 1500, rd: 200 }])).toBeNull()
      expect(overallRating([])).toBeNull()

      const tracks = [
        { r: 1500, rd: 50 },
        { r: 1300, rd: 100 },
        { r: 1800, rd: 200 }, // ignored
      ]
      // weights: 1/2500 = 0.0004, 1/10000 = 0.0001 -> sumWeight = 0.0005
      // sumWeightedR = 1500 * 0.0004 + 1300 * 0.0001 = 0.6 + 0.13 = 0.73
      // overall = 0.73 / 0.0005 = 1460
      expect(overallRating(tracks)).toBeCloseTo(1460, 2)
    })
  })
})
