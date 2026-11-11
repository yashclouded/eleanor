import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../../registry.ts'
import { makeRng } from '../../rng.ts'
import { buildInstance } from '../../instance.ts'
import { CONCEPTS } from '../../catalog.ts'
import { checkBank, checkTemplate } from '../../../../../scripts/content-check.ts'

const ids = [
  'ratios.rates-work', 'ratios.unit-conversion', 'percent-change.successive',
  'percent-change.reverse', 'linear.word-equations', 'linear.two-unknowns',
  'geometry.similar-triangles', 'geometry.pythagoras-applied',
  'sequences.arithmetic-geometric', 'divisibility.gcd-lcm-word',
  'functions.linear-vs-exponential', 'optimization.fence-area',
].map((id) => `math.${id}`)

describe('Task 6.4 math drafts', () => {
  it('preserves the twelve original math templates with valid concepts', () => {
    const bank = TEMPLATES.filter((t) => ids.includes(t.id))
    expect(bank.map((t) => t.id).sort()).toEqual([...ids].sort())
    expect(checkBank(bank, CONCEPTS)).toEqual([])
  })
  for (const id of ids) {
    it(`${id}: reviewed metadata is blank; generated answers and ladders agree`, () => {
      const t = TEMPLATES.find((t) => t.id === id)
      expect(t).toBeDefined()
      if (!t) return
      expect(t.status).toBe('draft')
      expect(t.review.reviewer).toBeNull()
      expect(t.review.reviewedAt).toBeNull()
      expect(t.levels.length).toBeGreaterThanOrEqual(3)
      expect(t.levels.length).toBeLessThanOrEqual(6)
      expect(t.skins.length).toBeGreaterThanOrEqual(2)
      expect(t.misconceptions.length).toBeGreaterThanOrEqual(2)
      expect(t.steps.length).toBeGreaterThanOrEqual(3)
      expect(t.steps.length).toBeLessThanOrEqual(5)
      expect(t.dailyLevels?.length).toBeGreaterThan(0)
      expect(checkTemplate(t, 200)).toEqual([])
      for (const { level } of t.levels) {
        for (let seed = 1; seed <= 20; seed++) {
          const p = t.sample(makeRng(seed), level)
          expect(t.sample(makeRng(seed), level)).toEqual(p)
          const answer = t.solve(p)
          if (typeof answer !== 'number') throw new Error('Math templates must have numeric answers')
          expect(t.verify(p, makeRng(seed + 1))).toBeCloseTo(answer, 7)
          expect(t.steps.at(-1)?.answer(p)).toBeCloseTo(answer, 7)
          for (const skin of t.skins) {
            const instance = buildInstance(t, level, seed, skin)
            expect(instance.prompt.length).toBeGreaterThan(0)
            expect(JSON.parse(JSON.stringify(instance))).toEqual(instance)
          }
        }
      }
      for (const level of t.dailyLevels ?? []) {
        const rating = t.levels.find((l) => l.level === level)?.initialRating ?? 0
        expect(rating).toBeGreaterThanOrEqual(1300)
        expect(rating).toBeLessThanOrEqual(1700)
      }
    })
  }
})

// Fixed examples test the interpretation, not just agreement between two implementations.
describe('math worked examples', () => {
  function check(id: string, params: unknown, expected: number) {
    const t = TEMPLATES.find((t) => t.id === `math.${id}`)
    if (!t) throw new Error(`Missing ${id}`)
    expect(t.solve(params)).toBeCloseTo(expected, 7)
    expect(t.verify(params, makeRng(1))).toBeCloseTo(expected, 7)
    expect(t.steps.at(-1)?.answer(params)).toBeCloseTo(expected, 7)
  }
  it('accounts for early work, a pause, and multiple workers', () => {
    check('ratios.rates-work', { workersA: 2, rateA: 3, workersB: 3, rateB: 2, delay: 2, idle: 1, work: 60 }, 7)
  })
  it('converts lengths, compound units, squared units, and tank volumes', () => {
    for (const [mode, expected] of [[1, 1.2], [2, 432], [3, 0.012], [4, 7.2], [5, 12]]) {
      check('ratios.unit-conversion', { mode, value: 120, width: 20, height: 50, flow: 10 }, expected)
    }
  })
  it('does not cancel equal percentage rises and falls', () => {
    check('percent-change.successive', { initial: 100, changes: [20, -20], net: false }, 96)
    check('percent-change.successive', { initial: 100, changes: [20, -20], net: true }, -4)
    check('percent-change.reverse', { final: 106, changes: [20, -20], fee: 10 }, 100)
  })
  it('expands batches and isolates a count appearing in both quotes', () => {
    check('linear.word-equations', { a: 12, b: 15, c: 2, d: 85, groups: 3 }, 7)
  })
  it('undoes discounts on both the fee and items before eliminating B', () => {
    // A=7, B=11; item subtotals 25 and 43; add fee 5 then discount 20%.
    check('linear.two-unknowns', { a: 2, b: 1, c: 3, d: 2, total1: 24, total2: 38.4, fee: 5, discount: 20 }, 7)
  })
  it('squares length scales for area and takes square roots of area ratios', () => {
    for (const [mode, expected] of [[1, 9], [2, 4], [3, 54], [4, 9], [5, 6]]) {
      check('geometry.similar-triangles', { base: 4, height: 3, largeBase: 12, mode }, expected)
    }
  })
  it('distinguishes diagonal, leg, saving, extra section, and return journey', () => {
    for (const [mode, expected] of [[1, 5], [2, 4], [3, 2], [4, 3], [5, 10]]) {
      check('geometry.pythagoras-applied', { a: 3, b: 4, diagonal: 5, extension: 1, mode }, expected)
    }
  })
  it('counts sequence transitions and includes every term in sums', () => {
    for (const [mode, expected] of [[1, 14], [2, 32], [3, 40], [4, 62], [5, 77]]) {
      check('sequences.arithmetic-geometric', { first: 2, step: 3, ratio: 2, count: 5, mode }, expected)
    }
  })
  it('excludes minute zero, includes the final minute, and counts overlaps once', () => {
    for (const [mode, expected] of [[1, 6], [2, 36], [3, 5], [4, 2], [5, 8]]) {
      check('divisibility.gcd-lcm-word', { a: 12, b: 18, horizon: 72, mode }, expected)
    }
  })
  it('requires strict exponential overtaking, including the setup cost', () => {
    for (const [mode, expected] of [[1, 26], [2, 8], [3, -18], [4, 5], [5, 6]]) {
      check('functions.linear-vs-exponential', { startA: 20, step: 2, startB: 1, ratio: 2, time: 3, fee: mode === 5 ? 20 : 0, mode }, expected)
    }
  })
  it('optimizes the actual fenced sides, dividers, and gate opening', () => {
    check('optimization.fence-area', { length: 40, crossFences: 0, wall: false, gate: 0, mode: 1 }, 100)
    check('optimization.fence-area', { length: 40, crossFences: 0, wall: true, gate: 0, mode: 2 }, 200)
    check('optimization.fence-area', { length: 48, crossFences: 1, wall: true, gate: 0, mode: 3 }, 192)
    check('optimization.fence-area', { length: 44, crossFences: 2, wall: true, gate: 4, mode: 5 }, 144)
  })
})
