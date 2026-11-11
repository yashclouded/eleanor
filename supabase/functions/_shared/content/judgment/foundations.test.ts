import { describe, expect, it } from 'vitest'
import { checkBank, checkTemplate } from '../../../../../scripts/content-check.ts'
import { CONCEPTS } from '../../catalog.ts'
import { hashSeed, makeRng } from '../../rng.ts'
import {
  JUDGMENT_FOUNDATIONS, frequenciesFoundation, estimationFoundation,
  conditionalFoundation, baseRatesFoundation, expectedValueFoundation,
  riskFoundation, independenceFoundation, regressionFoundation, oddsFoundation,
} from './foundations.ts'

describe('Judgment foundations', () => {
  it('covers every Judgment concept with a six-level, unpublished entry ladder', () => {
    expect(JUDGMENT_FOUNDATIONS).toHaveLength(9)
    expect(new Set(JUDGMENT_FOUNDATIONS.map(t => t.concept))).toEqual(new Set(CONCEPTS.filter(c => c.track === 'judgment').map(c => c.id)))
    expect(checkBank([...JUDGMENT_FOUNDATIONS], CONCEPTS)).toEqual([])
    for (const t of JUDGMENT_FOUNDATIONS) {
      expect(t.status).toBe('draft')
      expect(t.review.reviewer).toBeNull()
      expect(t.review.reviewedAt).toBeNull()
      expect(t.levels.map(l => l.initialRating)).toEqual([400, 600, 800, 1000, 1200, 1400])
    }
  })

  it('uses visual source data for category, risk and paired-reading questions', () => {
    const counts = { level: 4, a: 10, b: 20, c: 30, d: 40 }
    expect(frequenciesFoundation.render(counts, 'workshop').some(b => b.t === 'chart' && b.kind === 'bar')).toBe(true)
    expect(riskFoundation.render({ level: 3, before: 40, after: 30, population: 1000, cost: 1 }, 'packaging').some(b => b.t === 'chart' && b.kind === 'bar')).toBe(true)
    expect(regressionFoundation.render({ level: 3, mean: 50, signal: 10, noise: 4, retention: 100, sdX: 1, sdY: 1, meanY: 0, followup: 0 }, 'machines').some(b => b.t === 'chart' && b.kind === 'line')).toBe(true)
  })

  it('matches independently calculated fixtures across the nine concepts', () => {
    expect(frequenciesFoundation.solve({ level: 4, a: 10, b: 20, c: 30, d: 40 })).toBe(50)
    expect(estimationFoundation.solve({ level: 6, people: 1000, percent: 20, trips: 2, units: 3, days: 5, capacity: 100, utilization: 60 })).toBe(100)
    expect(conditionalFoundation.solve({ level: 6, a: 2, b: 3, c: 4, d: 1 })).toBeCloseTo(100 * 28 / 90, 10)
    expect(baseRatesFoundation.solve({ level: 6, a: 20, b: 5, c: 30, d: 45, multiplier: 1, sensitivity: 80, falsePositive: 10 })).toBeCloseTo(1600 / 19, 10)
    expect(expectedValueFoundation.solve({ level: 5, percent: 50, secondPercent: 0, high: 100, low: 0, third: 0, fee: 10, sure: 0 })).toBe(60)
    expect(riskFoundation.solve({ level: 6, before: 40, after: 30, population: 1000, cost: 12 })).toBe(1200)
    expect(independenceFoundation.solve({ level: 6, probabilities: [50, 50, 50], k: 1 })).toBeCloseTo(300 / 7, 10)
    expect(regressionFoundation.solve({ level: 5, mean: 50, signal: 20, noise: 0, retention: 50, sdX: 10, sdY: 20, meanY: 100, followup: 0 })).toBe(120)
    expect(oddsFoundation.solve({ level: 5, a: 1, b: 9, likelihood: 6, counter: 2, threshold: 50 })).toBeCloseTo(25, 10)
  })

  for (const t of JUDGMENT_FOUNDATIONS) {
    it(`${t.id} is deterministic and independently verified across 200 seeds per level`, () => {
      expect(checkTemplate(t, 200)).toEqual([])
      for (const { level } of t.levels) {
        const seed = hashSeed(t.id, level, 'fixture')
        const first = t.sample(makeRng(seed), level)
        expect(first).toEqual(t.sample(makeRng(seed), level))
        expect(JSON.parse(JSON.stringify(first))).toEqual(first)
      }
    })
  }
})
