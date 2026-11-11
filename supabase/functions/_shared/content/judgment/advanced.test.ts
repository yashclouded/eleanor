import { describe, expect, it } from 'vitest'
import { checkBank, checkTemplate } from '../../../../../scripts/content-check.ts'
import { CONCEPTS } from '../../catalog.ts'
import { hashSeed, makeRng } from '../../rng.ts'
import type { Template } from '../types.ts'
import { JUDGMENT_ADVANCED, mixtureTemplate, boundedEstimateTemplate, selectionTemplate, dependentTestsTemplate, informationTemplate, allocationTemplate, commonCauseTemplate, precisionTemplate, competingHypothesesTemplate } from './advanced.ts'

describe('advanced Judgment ladders', () => {
  it('covers all nine concepts with draft ladders through rating 2700', () => {
    expect(JUDGMENT_ADVANCED).toHaveLength(9)
    expect(new Set(JUDGMENT_ADVANCED.map(t => t.concept)).size).toBe(9)
    expect(checkBank([...JUDGMENT_ADVANCED], CONCEPTS)).toEqual([])
    for (const t of JUDGMENT_ADVANCED) {
      expect(t.status).toBe('draft')
      expect(t.review.reviewer).toBeNull()
      expect(t.review.reviewedAt).toBeNull()
      expect(t.levels.map(l => l.initialRating)).toEqual([1800, 2100, 2400, 2700])
    }
  })

  function exercise<P>(t: Template<P>) {
    it(`${t.id}: independently verifies every level across 250 seeds`, () => {
      expect(checkTemplate(t, 250)).toEqual([])
    })
    it(`${t.id}: repeats seeds exactly and visibly varies meaningful data`, () => {
      for (const { level } of t.levels) {
        const seen = new Set<string>()
        for (let i = 0; i < 1000; i++) {
          const seed = hashSeed(t.id, level, i)
          const params = t.sample(makeRng(seed), level)
          expect(params).toEqual(t.sample(makeRng(seed), level))
          seen.add(JSON.stringify(t.render(params, t.skins[0])))
        }
        expect(seen.size).toBeGreaterThan(900)
      }
    })
  }
  exercise(mixtureTemplate)
  exercise(boundedEstimateTemplate)
  exercise(selectionTemplate)
  exercise(dependentTestsTemplate)
  exercise(informationTemplate)
  exercise(allocationTemplate)
  exercise(commonCauseTemplate)
  exercise(precisionTemplate)
  exercise(competingHypothesesTemplate)

  it('standardizes unequal strata and solves the mixture crossover', () => {
    const p = { level: 3, a: [80, 30], b: [60, 20], nA: [100, 300], nB: [300, 100], weight: 40 }
    expect(mixtureTemplate.solve(p)).toBeCloseTo(14)
    expect(mixtureTemplate.solve({ ...p, level: 4, a: [80, 20], b: [60, 40] })).toBeCloseTo(50)
  })

  it('preserves joint bounds instead of multiplying incompatible extremes', () => {
    const p = { level: 3, sites: 10, low: 20, high: 40, uses: 3, litres: 2, reuse: 0, supply: 0, total: 50, otherUses: 5, reserve: 20 }
    expect(boundedEstimateTemplate.solve(p)).toBe(4200)
  })

  it('does not buy an extra tank at an exact integer capacity boundary', () => {
    const p = { level: 4, sites: 72, low: 28, high: 52, uses: 11, otherUses: 21, litres: 10, reuse: 41, supply: 10400, reserve: 25, total: 80 }
    expect(boundedEstimateTemplate.solve(p)).toBe(733)
  })

  it('conditions on selection using all four source cells', () => {
    const p = { level: 1, a: 50, b: 50, selected: [10, 80, 20, 90], sensitivity: 80, fpr: 20 }
    expect(selectionTemplate.solve(p)).toBeCloseTo(85)
  })

  it('keeps selection misconception values aligned with the requested statistic', () => {
    const p = { level: 3, a: 30, b: 70, selected: [10, 80, 20, 90], sensitivity: 80, fpr: 20 }
    const unweighted = selectionTemplate.misconceptions.find(m => m.id === 'unweighted-selection-cells')!
    expect(unweighted.value(p)).toBeCloseTo(-1.75)
    expect(unweighted.value({ ...p, level: 4 })).toBeCloseTo(100 * 88 / 106)
  })

  it('uses conditional second-test rates instead of squaring first-test rates', () => {
    const p = { level: 1, prior: 10, positive: [[80, 70, 30], [20, 40, 10]], third: [[90, 50], [30, 10]], threshold: 80 }
    expect(dependentTestsTemplate.solve(p)).toBeCloseTo(100 * 0.056 / (0.056 + 0.072))
  })

  it('never values imperfect information above perfect information', () => {
    const p = { level: 2, prior: 50, payoffs: [[100, -100], [0, 0]], sensitivity: 80, specificity: 80, fee: 0, secondFee: 0 }
    expect(informationTemplate.solve(p)).toBeCloseTo(30)
    expect(informationTemplate.solve({ ...p, level: 1 })).toBeCloseTo(50)
  })

  it('allocates indivisible protection within both budget and capacity', () => {
    const p = { level: 2, risks: [100, 200], reduction: [50, 50], costs: [3, 5], limits: [4, 3], budget: 13, harm: [0, 0], loss: 1000, target: 1 }
    expect(allocationTemplate.solve(p)).toBeCloseTo(25)
  })

  it('mixes shared environments before conditioning on failures', () => {
    const p = { level: 1, storm: 20, normal: [10, 20], severe: [50, 60], sensitivity: 80, fpr: 10 }
    expect(commonCauseTemplate.solve(p)).toBeCloseTo(7.6)
  })

  it('combines precision rather than averaging variances or noisy scores', () => {
    const p = { level: 1, mean: 50, variance: 100, scores: [80, 20], errors: [100, 400], biases: [0, 0], futureBias: 0, futureScale: 1, target: 60 }
    expect(precisionTemplate.solve(p)).toBeCloseTo(60)
  })

  it('normalizes three competing hypotheses and computes threshold prior odds', () => {
    const p = { level: 1, weights: [1, 2, 3], first: [80, 20, 10], second: [70, 40, 30], third: [60, 20, 10], target: 80 }
    expect(competingHypothesesTemplate.solve(p)).toBeCloseTo(100 * 0.8 / 1.5)
    expect(competingHypothesesTemplate.solve({ ...p, level: 4 })).toBeGreaterThan(0)
  })
})
