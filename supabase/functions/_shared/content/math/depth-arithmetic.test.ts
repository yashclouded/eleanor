import { describe, expect, it } from 'vitest'
import type { Template } from '../types.ts'
import { makeRng, hashSeed } from '../../rng.ts'
import { checkTemplate } from '../../../../../scripts/content-check.ts'
import { isCorrect, parseAnswer } from '../../grading.ts'
import { MATH_ARITHMETIC, ratioFoundation, integerBlendTemplate, journeyRankingTemplate, nestedPartitionTemplate, percentFoundation, affineRecurrenceTemplate, couponPolicyTemplate, percentClaimsTemplate, linearFoundation, diophantineTemplate, parameterPencilTemplate, absoluteLocusTemplate } from './depth-arithmetic.ts'

function exercise<P>(t: Template<P>) {
  describe(t.id, () => {
    it('is a varied, verified deterministic draft', () => {
      expect(t.status).toBe('draft')
      expect(t.review.reviewer).toBeNull()
      expect(t.review.reviewedAt).toBeNull()
      expect(t.skins.length).toBeGreaterThanOrEqual(2)
      expect(checkTemplate(t, 2000)).toEqual([])
      for (const { level } of t.levels) {
        const answerPatterns = new Set<string>()
        let alreadyOrdered = 0
        for (let i = 0; i < 100; i++) {
          const seed = hashSeed(t.id, level, i), p = t.sample(makeRng(seed), level)
          expect(p).toEqual(t.sample(makeRng(seed), level))
          const answer = t.solve(p), spec = t.answer(p)
          expect(isCorrect(spec, answer, t.verify(p, makeRng(seed)))).toBe(true)
          if (spec.type === 'choice' || spec.type === 'multi' || spec.type === 'sequence') {
            const options = spec.type === 'sequence' ? spec.items : spec.options
            expect(options).toHaveLength(6)
            expect(new Set(options.map(o => o.label)).size).toBe(6)
            answerPatterns.add(JSON.stringify(answer))
            if (spec.type === 'sequence' && JSON.stringify(answer) === JSON.stringify(options.map(o => o.id))) alreadyOrdered++
          }
        }
        if (answerPatterns.size) expect(answerPatterns.size).toBeGreaterThanOrEqual(4)
        expect(alreadyOrdered).toBeLessThan(20)
      }
    })
  })
}
exercise(ratioFoundation)
exercise(integerBlendTemplate)
exercise(journeyRankingTemplate)
exercise(nestedPartitionTemplate)
exercise(percentFoundation)
exercise(affineRecurrenceTemplate)
exercise(couponPolicyTemplate)
exercise(percentClaimsTemplate)
exercise(linearFoundation)
exercise(diophantineTemplate)
exercise(parameterPencilTemplate)
exercise(absoluteLocusTemplate)

describe('arithmetic mechanisms', () => {
  it('provides four distinct families per assigned concept', () => {
    expect(MATH_ARITHMETIC).toHaveLength(12)
    for (const concept of ['math.ratios', 'math.percent-change', 'math.linear']) expect(MATH_ARITHMETIC.filter(t => t.concept === concept)).toHaveLength(4)
    expect(new Set(MATH_ARITHMETIC.map(t => t.family)).size).toBe(12)
  })

  it('has at least 50,000 genuinely visible first-skin advanced prompts per level', () => {
    function visibleCapacity<P>(t: Template<P>) {
      for (const { level } of t.levels) {
        const prompts = new Set<string>()
        for (let i = 0; i < 60000; i++) prompts.add(JSON.stringify(t.render(t.sample(makeRng(hashSeed(t.id, level, i)), level), t.skins[0])))
        expect(prompts.size, `${t.id} level ${level}`).toBeGreaterThanOrEqual(50000)
      }
    }
    visibleCapacity(integerBlendTemplate)
    visibleCapacity(affineRecurrenceTemplate)
    visibleCapacity(diophantineTemplate)
  }, 20000)

  it('keeps numerical advanced and variety levels free of a dominant constant-answer shortcut', () => {
    function modalFrequency<P>(t: Template<P>) {
      for (const { level } of t.levels) {
        const counts = new Map<string, number>()
        let empty = 0
        for (let i = 0; i < 1000; i++) {
          const p = t.sample(makeRng(hashSeed('math-modal-audit', t.id, level, i)), level), answer = t.solve(p)
          if (typeof answer !== 'number') continue
          const key = String(Math.round(answer * 1e8) / 1e8)
          counts.set(key, (counts.get(key) ?? 0) + 1)
          if (answer === 0 || answer === -1) empty++
        }
        if (counts.size) {
          expect(Math.max(...counts.values()), `${t.id} L${level} modal count`).toBeLessThan(750)
          expect(empty, `${t.id} L${level} empty count`).toBeLessThan(400)
        }
      }
    }
    modalFrequency(integerBlendTemplate)
    modalFrequency(nestedPartitionTemplate)
    modalFrequency(affineRecurrenceTemplate)
    modalFrequency(diophantineTemplate)
    modalFrequency(parameterPencilTemplate)
    modalFrequency(absoluteLocusTemplate)
  })

  it('respects indivisible exact-blend containers and inclusive stock/demand bounds', () => {
    const p = { level: 2, low: 20, high: 80, target: 50, massLow: 2, massHigh: 3, demand: 25, stockLow: 10, stockHigh: 10, priceLow: 2, priceHigh: 3, budget: 100 }
    expect(integerBlendTemplate.solve(p)).toBe(6)
    expect(integerBlendTemplate.solve({ ...p, level: 3 })).toBe(36)
    expect(integerBlendTemplate.solve({ ...p, level: 4 })).toBe(1)
  })

  it('inverts repeated affine changes and enforces every intermediate floor', () => {
    const p = { level: 1, rate: 10, periods: 2, initial: 100, delta: 10, final: { n: 142, d: 1 }, cash: [-10, -10], floors: [100, 100] }
    expect(affineRecurrenceTemplate.solve(p)).toBeCloseTo(100)
    expect(affineRecurrenceTemplate.solve({ ...p, level: 2 })).toBeCloseTo(10)
    expect(affineRecurrenceTemplate.solve({ ...p, level: 4 })).toBe(10)
    expect(affineRecurrenceTemplate.solve({ ...p, level: 3, rate: 25 })).toBe(88)
  })

  it('counts integer equation solutions before applying congruences and costs', () => {
    const p = { level: 1, a: 3, b: 5, total: 40, maxX: 6, maxY: 6, modulus: 3, residue: 1, costX: 2, costY: 3 }
    expect(diophantineTemplate.solve(p)).toBe(3)
    expect(diophantineTemplate.solve({ ...p, level: 2 })).toBe(1)
    expect(diophantineTemplate.solve({ ...p, level: 3 })).toBe(1)
    expect(diophantineTemplate.solve({ ...p, level: 4 })).toBe(25)
  })

  it('uses changed-ratio equations and packet divisibility rather than unreduced ratio terms', () => {
    const p = { level: 5, a: 2, b: 3, c: 4, total: 25, given: 10, post: [14, 15] }
    expect(ratioFoundation.solve(p)).toBe(25)
    expect(ratioFoundation.steps.map(s => s.answer(p))).toEqual([12, 5, 25])
    expect(ratioFoundation.solve({ ...p, level: 6, post: [6, 19] })).toBe(10)
    const partition = { level: 1, a: 2, b: 4, c: 6, d: 8, e: 1, f: 1, demand: 11, packet: 3 }
    expect(nestedPartitionTemplate.solve(partition)).toBe(17)
    expect(nestedPartitionTemplate.misconceptions[1].value(partition)).toBe(68)
    expect(nestedPartitionTemplate.solve({ ...partition, level: 3, a: 1, b: 1, c: 1, d: 1 })).toBe(12)
  })

  it('compares complete capped, eligible and taxed invoices', () => {
    const p = { level: 3, price: 200, tax: 10, offers: [
      { id: 'p1', discount: 20, fee: 0, cap: 30, minimum: 0, credit: 10, feeTaxed: true },
      { id: 'p2', discount: 30, fee: 10, cap: 100, minimum: 200, credit: 10, feeTaxed: false },
      { id: 'p3', discount: 50, fee: 80, cap: 100, minimum: 250, credit: 0, feeTaxed: true },
      { id: 'p4', discount: 10, fee: 0, cap: 100, minimum: 0, credit: 0, feeTaxed: false },
      { id: 'p5', discount: 20, fee: 30, cap: 100, minimum: 0, credit: 0, feeTaxed: true },
      { id: 'p6', discount: 25, fee: 20, cap: 40, minimum: 0, credit: 0, feeTaxed: true },
    ] }
    expect(couponPolicyTemplate.solve(p)).toBe('p2')
    expect(couponPolicyTemplate.verify(p, makeRng(1))).toBe('p2')
    expect(couponPolicyTemplate.steps[2].answer(p)).toBe(153)
    expect(couponPolicyTemplate.solve({ ...p, offers: p.offers.map(o => o.id === 'p2' ? { ...o, minimum: 201 } : o) })).toBe('p1')
  })

  it('audits exact percentage identities with an updated base and a fee tax base', () => {
    const p = { level: 2, base: 100, rate: 20, second: 20, fee: 10, claims: [{ n: 120, d: 1 }, { n: 96, d: 1 }, { n: 0, d: 1 }, { n: 100, d: 1 }, { n: 20, d: 1 }, { n: 24, d: 25 }] }
    expect(percentClaimsTemplate.solve(p)).toEqual(['c1', 'c2', 'c4', 'c6'])
    expect(percentClaimsTemplate.verify(p, makeRng(1))).toEqual(['c1', 'c2', 'c4', 'c6'])
    const taxed = { ...p, level: 3, second: 10, claims: [80, 90, 9, 99, 98, 1].map(n => ({ n, d: 1 })) }
    expect(percentClaimsTemplate.solve(taxed)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6'])
  })

  it('accepts percentage inputs only for the percentage-valued branches', () => {
    for (const level of [2, 3, 5, 6]) {
      const p = percentFoundation.sample(makeRng(7), level)
      expect(parseAnswer(percentFoundation.answer(p), `${percentFoundation.solve(p)}%`).ok).toBe(true)
    }
    const p = affineRecurrenceTemplate.sample(makeRng(9), 4)
    expect(parseAnswer(affineRecurrenceTemplate.answer(p), `${affineRecurrenceTemplate.solve(p)}%`).ok).toBe(true)
  })

  it('distinguishes proportional rows, an extra total constraint and bounded integer intersections', () => {
    const p = { level: 1, a: 3, b: 1, c: 11, d: 2, e: 18, total: 5, lo: 1, hi: 10, bound: 10 }
    expect(parameterPencilTemplate.solve(p)).toBe(2 / 3)
    expect(parameterPencilTemplate.solve({ ...p, level: 2 })).toBe(6)
    expect(parameterPencilTemplate.solve({ ...p, level: 3 })).toBe(2)
    expect(parameterPencilTemplate.verify({ ...p, level: 3 }, makeRng(1))).toBe(2)
    const balance = { level: 6, a: 3, b: 4, c: 2, d: 5, rhs: 17 }
    expect(linearFoundation.solve(balance)).toBe(12)
    expect(linearFoundation.steps.map(s => s.answer(balance))).toEqual([3, 36, 12])
  })

  it('handles inclusive absolute-value boundaries and fractional interval endpoints', () => {
    const p = { level: 3, a: 0, b: 4, c: 10, radius: 7 }
    // The real interval is [-1.5,5.5], containing precisely -1 through 5.
    expect(absoluteLocusTemplate.solve(p)).toBe(7)
    expect(absoluteLocusTemplate.solve({ ...p, level: 4, radius: 14 })).toBe(2)
    expect(absoluteLocusTemplate.solve({ ...p, level: 4, radius: 19 })).toBe(0)
    expect(absoluteLocusTemplate.solve({ ...p, level: 4, radius: 22 })).toBe(-1)
    for (const radius of [14, 19, 22]) expect(absoluteLocusTemplate.verify({ ...p, level: 4, radius }, makeRng(1))).toBe(absoluteLocusTemplate.solve({ ...p, level: 4, radius }))
  })
})
