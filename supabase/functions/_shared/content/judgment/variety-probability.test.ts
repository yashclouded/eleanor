import { describe, expect, it } from 'vitest'
import { checkBank, checkTemplate } from '../../../../../scripts/content-check.ts'
import { CONCEPTS } from '../../catalog.ts'
import { parseAnswer, isCorrect } from '../../grading.ts'
import { hashSeed, makeRng } from '../../rng.ts'
import type { Template } from '../types.ts'
import { VARIETY_PROBABILITY, hostProtocolTemplate, reportProtocolTemplate, inversePrevalenceTemplate, operatingPointTemplate, jointLawTemplate, reliabilityOrderTemplate } from './variety-probability.ts'

function templateCase<P>(t: Template<P>) {
  return {
    id: t.id,
    answerType: t.answer(t.sample(makeRng(12), 1)).type,
    run() {
      expect(t.status).toBe('draft')
      expect(t.review.reviewer).toBeNull()
      expect(checkTemplate(t, 200)).toEqual([])
      for (const { level } of t.levels) {
        const answers = new Set<string>()
        for (let i = 0; i < 100; i++) {
          const p = t.sample(makeRng(hashSeed(t.id, level, i)), level)
          expect(p).toEqual(t.sample(makeRng(hashSeed(t.id, level, i)), level))
          const answer = t.solve(p)
          const spec = t.answer(p)
          const parsed = parseAnswer(spec, typeof answer === 'number' ? String(answer) : answer)
          expect(parsed.ok).toBe(true)
          if (parsed.ok) expect(isCorrect(spec, answer, parsed.value)).toBe(true)
          if (spec.type === 'choice' || spec.type === 'multi') expect(spec.options).toHaveLength(6)
          if (spec.type === 'sequence') {
            expect(spec.items).toHaveLength(6)
            expect(t.verify(p, makeRng(1))).toEqual(answer)
          }
          answers.add(JSON.stringify(answer))
        }
        expect(answers.size).toBeGreaterThanOrEqual(4)
      }
    },
  }
}
const cases = [templateCase(hostProtocolTemplate), templateCase(reportProtocolTemplate), templateCase(inversePrevalenceTemplate), templateCase(operatingPointTemplate), templateCase(jointLawTemplate), templateCase(reliabilityOrderTemplate)]

describe('Judgment probability task variety', () => {
  it('adds two genuinely different tasks for each of three concepts', () => {
    expect(VARIETY_PROBABILITY).toHaveLength(6)
    expect(checkBank([...VARIETY_PROBABILITY], CONCEPTS)).toEqual([])
    for (const concept of ['conditional', 'base-rates', 'independence']) expect(VARIETY_PROBABILITY.filter(t => t.concept === `judgment.${concept}`)).toHaveLength(2)
    expect(cases.map(t => t.answerType)).toEqual(['number', 'choice', 'number', 'choice', 'multi', 'sequence'])
  })

  it('distinguishes informed and blind hosts in a classic three-door fixture', () => {
    const params = { level: 1, weights: [1, 1, 1], open: 1, chooseB: 50, informed: 100, offerSelected: 100, offerOther: 100 }
    expect(hostProtocolTemplate.solve(params)).toBeCloseTo(200 / 3, 10)
    expect(hostProtocolTemplate.solve({ ...params, level: 3, informed: 0 })).toBeCloseTo(50, 10)
    expect(hostProtocolTemplate.verify({ ...params, level: 3, informed: 0 }, makeRng(1))).toBeCloseTo(50, 10)
  })

  it('inverts aggregate flags and then undoes case-enriched sampling', () => {
    const params = { level: 3, cases: 20, noncases: 80, sensitivity: 80, falsePositive: 10, enrichment: 1 }
    expect(inversePrevalenceTemplate.solve(params)).toBeCloseTo(20, 10)
    expect(inversePrevalenceTemplate.solve({ ...params, level: 4, enrichment: 3 })).toBeCloseTo(20, 10)
  })

  it('diagnoses the report protocol instead of offering six numeric guesses', () => {
    const params = { level: 1, first: 20, second: 70, chooseFirst: 40, archiveFirst: 100, archiveOther: 100, target: 0, order: [0, 1, 2, 3, 4, 5] }
    expect(reportProtocolTemplate.solve(params)).toBe('option-1')
    expect(reportProtocolTemplate.verify(params, makeRng(1))).toBe('option-1')
    expect(reportProtocolTemplate.answer(params).type).toBe('choice')
  })

  it('recognises a pairwise-independent law that fails mutual independence', () => {
    const weights = [10, 90, 90, 10, 90, 10, 10, 90]
    const params = { level: 1, weights, claimOrder: [0, 1, 2, 3, 4, 5] }
    expect(jointLawTemplate.solve(params)).toEqual(['claim-1', 'claim-2', 'claim-3'])
    expect(jointLawTemplate.verify(params, makeRng(1))).toEqual(['claim-1', 'claim-2', 'claim-3'])
  })

  for (const t of cases) it(`${t.id} has valid, variable canonical answers and independent verification`, t.run)

  it('chooses the least expected loss among feasible operating settings', () => {
    const p = { level: 4, prior: 20, missCost: 10, falseCost: 1, capacity: 40, rates: [{ sensitivity: 0, falsePositive: 0 }, { sensitivity: 30, falsePositive: 2 }, { sensitivity: 60, falsePositive: 10 }, { sensitivity: 80, falsePositive: 20 }, { sensitivity: 95, falsePositive: 40 }, { sensitivity: 100, falsePositive: 100 }], order: [0, 1, 2, 3, 4, 5] }
    expect(operatingPointTemplate.solve(p)).toBe('setting-4')
    expect(operatingPointTemplate.verify(p, makeRng(1))).toBe('setting-4')
  })

  it('orders six non-equivalent architectures with no ties in a known fixture', () => {
    const p = { level: 1, good: [20, 60, 90, 50], bad: [20, 60, 90, 50], goodPercent: 100, order: [0, 1, 2, 3, 4, 5] }
    expect(reliabilityOrderTemplate.solve(p)).toEqual(['network-4', 'network-3', 'network-6', 'network-1', 'network-5', 'network-2'])
    expect(reliabilityOrderTemplate.verify(p, makeRng(1))).toEqual(reliabilityOrderTemplate.solve(p))
  })
})
