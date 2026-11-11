import { describe, expect, it } from 'vitest'
import type { Template } from '../types.ts'
import { hashSeed, makeRng } from '../../rng.ts'
import { checkTemplate } from '../../../../../scripts/content-check.ts'
import { inverseInclusionTemplate, samplingAuditTemplate, captureRecaptureTemplate, throughputRankingTemplate, controlContrastTemplate, forecastAuditTemplate, VARIETY_DATA } from './variety-data.ts'

function exercise<P>(template: Template<P>) {
  describe(template.id, () => {
    it('is a deterministic draft with verified, varied visible questions', () => {
      expect(template.status).toBe('draft')
      expect(template.review.reviewer).toBeNull()
      expect(template.review.reviewedAt).toBeNull()
      expect(template.levels.length).toBeGreaterThanOrEqual(3)
      expect(template.skins.length).toBeGreaterThanOrEqual(2)
      expect(checkTemplate(template, 220)).toEqual([])
      for (const { level } of template.levels) {
        const outcomes = new Set<string>()
        for (let i = 0; i < 100; i++) {
          const seed = hashSeed(template.id, level, i)
          const p = template.sample(makeRng(seed), level)
          expect(p).toEqual(template.sample(makeRng(seed), level))
          const solved = template.solve(p)
          const verified = template.verify(p, makeRng(seed))
          if (Array.isArray(solved)) expect(solved).toEqual(verified)
          else expect(Number(solved)).toBeCloseTo(Number(verified), 6)
          const spec = template.answer(p)
          if (spec.type === 'multi' || spec.type === 'sequence') {
            const options = spec.type === 'multi' ? spec.options : spec.items
            expect(options).toHaveLength(6)
            expect(new Set(options.map(o => o.id)).size).toBe(6)
            expect(Array.isArray(solved)).toBe(true)
            expect((solved as string[]).every(id => options.some(o => o.id === id))).toBe(true)
            if (spec.type === 'sequence') expect(solved).toHaveLength(6)
            outcomes.add(JSON.stringify(solved))
          }
        }
        if (outcomes.size) expect(outcomes.size).toBeGreaterThanOrEqual(4)
      }
    })
  })
}

exercise(inverseInclusionTemplate)
exercise(samplingAuditTemplate)
exercise(captureRecaptureTemplate)
exercise(throughputRankingTemplate)
exercise(controlContrastTemplate)
exercise(forecastAuditTemplate)

describe('distinct data-inference mechanisms', () => {
  it('makes the unweighted-population misconception use raw counts consistently', () => {
    const p = { level: 3, order: [0, 1, 2, 3, 4, 5], asserted: [true, true, true, true, true, true], invited: 100, responded: 80, yes: 40, coverage: 'complete' as const, design: 'probability' as const, groups: [{ yes: 10, no: 30, pi: 25 }, { yes: 30, no: 10, pi: 100 }], threshold: 40 }
    const misconception = samplingAuditTemplate.misconceptions.find(m => m.id === 'assume-respondents-are-the-population')!
    expect(misconception.value(p)).toEqual(['c2', 'c3', 'c4', 'c6'])
  })

  it('keeps stipulated possible physical outputs nonnegative', () => {
    const p = forecastAuditTemplate.sample(makeRng(9768), 1)
    const center = p.mean + p.retention / 100 * (p.first - p.mean)
    expect(center - p.spread).toBeGreaterThanOrEqual(0)
  })

  it('does not invent a weighting difference when inclusion probabilities are equal', () => {
    const p = { level: 3, order: [0, 1, 2, 3, 4, 5], asserted: [true, true, true, true, true, true], invited: 100, responded: 80, yes: 40, coverage: 'complete' as const, design: 'probability' as const, groups: [{ yes: 15, no: 15, pi: 50 }, { yes: 29, no: 21, pi: 50 }], threshold: 29 }
    expect(samplingAuditTemplate.solve(p)).toEqual(['c2', 'c3', 'c4', 'c5'])
  })

  it('adds exactly two families per data concept with multi-select and ranking responses', () => {
    expect(VARIETY_DATA).toHaveLength(6)
    for (const concept of ['judgment.frequencies', 'judgment.estimation', 'judgment.regression']) {
      expect(VARIETY_DATA.filter(t => t.concept === concept)).toHaveLength(2)
    }
  })

  it('uses inverse inclusion and response probabilities rather than raw survey counts', () => {
    const p = { level: 1, yes: [8, 6], no: [12, 14], inclusion: [25, 50], response: [100, 100] }
    expect(inverseInclusionTemplate.solve(p)).toBe(44)
    expect(inverseInclusionTemplate.solve({ ...p, level: 2 })).toBeCloseTo(100 * 44 / 120)
    expect(inverseInclusionTemplate.solve({ ...p, level: 3, response: [50, 100] })).toBeCloseTo(38)
  })

  it('distinguishes a population estimator, bias correction and uncertain overlap', () => {
    const p = { level: 1, first: [40], second: [30], overlap: [10], ambiguous: [0] }
    expect(captureRecaptureTemplate.solve(p)).toBe(120)
    expect(captureRecaptureTemplate.solve({ ...p, level: 2 })).toBeCloseTo(1260 / 11)
    const uncertain = { level: 4, first: [40, 30], second: [30, 20], overlap: [10, 5], ambiguous: [2, 1] }
    const expected = (41 * 31 / 11 - 1 + 31 * 21 / 6 - 1) - (41 * 31 / 13 - 1 + 31 * 21 / 7 - 1)
    expect(captureRecaptureTemplate.solve(uncertain)).toBeCloseTo(expected)
  })

  it('ranks complete processes by bottleneck output and preserves the order in verify', () => {
    const plans = Array.from({ length: 6 }, (_, i) => ({ id: `p${i + 1}`, name: `Plan ${i + 1}`, rates: [10 * (i + 1), 10 * (i + 1) + 2, 100], workers: [1, 1, 1], input: 200, yield: 100, setup: 0 }))
    const p = { level: 1, plans }
    expect(throughputRankingTemplate.solve(p)).toEqual(['p6', 'p5', 'p4', 'p3', 'p2', 'p1'])
    expect(throughputRankingTemplate.verify(p, makeRng(1))).toEqual(['p6', 'p5', 'p4', 'p3', 'p2', 'p1'])
  })

  it('removes the control trend and distinguishes counterfactual from observed output', () => {
    const groups = [{ beforeT: 60, afterT: 85, beforeC: 50, afterC: 60 }, { beforeT: 80, afterT: 90, beforeC: 60, afterC: 65 }]
    expect(controlContrastTemplate.solve({ level: 1, groups, weight: 25 })).toBe(15)
    expect(controlContrastTemplate.solve({ level: 2, groups, weight: 25 })).toBe(70)
    expect(controlContrastTemplate.solve({ level: 3, groups, weight: 25 })).toBe(7.5)
    expect(controlContrastTemplate.solve({ level: 4, groups, weight: 25 })).toBe(10)
  })
})
