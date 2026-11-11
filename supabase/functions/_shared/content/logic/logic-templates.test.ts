import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../../registry.ts'
import { makeRng } from '../../rng.ts'
import { checkTemplate } from '../../../../../scripts/content-check.ts'

const ids = [
  'deduction.chains', 'deduction.contrapositive', 'conditionals.card-selection',
  'knights.two', 'knights.three-statements', 'ordering.line-up', 'ordering.schedule',
  'counting.arrangements', 'counting.inclusion-exclusion', 'pigeonhole.guarantee',
  'invariants.parity-moves', 'games.take-away',
].map((id) => `logic.${id}`)

describe('Task 6.3 logic drafts', () => {
  it('registers exactly the twelve requested templates', () => {
    expect(TEMPLATES.filter((t) => t.track === 'logic').map((t) => t.id).sort()).toEqual([...ids].sort())
  })
  for (const id of ids) {
    it(`${id}: draft metadata, formats, independent answers and seed coverage`, () => {
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
      for (const level of t.dailyLevels ?? []) {
        const rating = t.levels.find((l) => l.level === level)?.initialRating ?? 0
        expect(rating).toBeGreaterThanOrEqual(1300)
        expect(rating).toBeLessThanOrEqual(1700)
      }
      expect(checkTemplate(t, 200)).toEqual([])
      for (const { level } of t.levels) {
        for (let seed = 0; seed < 30; seed++) {
          const p = t.sample(makeRng(seed), level)
          const answer = t.solve(p)
          const verified = t.verify(p, makeRng(seed + 99))
          // Unlike the bank checker, sequence verification must preserve order.
          expect(verified).toEqual(answer)
          expect(t.sample(makeRng(seed), level)).toEqual(p)
          for (const skin of t.skins) expect(t.render(p, skin)).not.toEqual([])
          const spec = t.answer(p)
          if (id.endsWith('deduction.chains')) expect(spec.type).toBe('choice')
          if (id.endsWith('contrapositive') || id.endsWith('card-selection')) expect(spec.type).toBe('multi')
          if (id.endsWith('line-up')) expect(spec.type).toBe('sequence')
          if (id.endsWith('take-away')) expect(spec.type).toBe('integer')
        }
      }
    })
  }
})

// Fixed cases catch shared mistaken assumptions in solve and verify.
describe('logic boundary examples', () => {
  function template(id: string) {
    const t = TEMPLATES.find((t) => t.id === `logic.${id}`)
    if (!t) throw new Error(`Missing ${id}`)
    return t
  }
  it('counts constrained permutations and disjoint set regions', () => {
    const arrangements = template('counting.arrangements')
    for (const [mode, expected] of [[1, 24], [2, 6], [3, 12], [4, 12], [5, 6]]) {
      const p = { names: ['A', 'B', 'C', 'D'], mode }
      expect(arrangements.solve(p)).toBe(expected)
      expect(arrangements.verify(p, makeRng(1))).toBe(expected)
    }
    const inclusion = template('counting.inclusion-exclusion')
    for (const [mode, expected] of [[1, 15], [2, 4], [3, 12], [4, 7], [5, 3]]) {
      const p = { a: 10, b: 8, both: 3, neither: 4, mode }
      expect(inclusion.solve(p)).toBe(expected)
      expect(inclusion.verify(p, makeRng(1))).toBe(expected)
    }
  })
  it('rounds guarantees at the capacity boundary', () => {
    const t = template('pigeonhole.guarantee')
    for (const [batch, expected] of [[1, 4], [2, 2], [3, 2], [4, 1]]) {
      const p = { boxes: 3, target: 2, batch }
      expect(t.solve(p)).toBe(expected)
      expect(t.verify(p, makeRng(1))).toBe(expected)
    }
  })
  it('distinguishes adjacent flips from arbitrary pair flips and rejects odd parity', () => {
    const t = template('invariants.parity-moves')
    for (const [target, expected] of [[[1, 0, 1, 0], 2], [[1, 0, 0, 1], 3], [[0, 0, 0, 1], -1], [[0, 0, 0, 0], 0]] as const) {
      const p = { names: ['A', 'B', 'C', 'D'], start: [0, 0, 0, 0], target: [...target] }
      expect(t.solve(p)).toBe(expected)
      expect(t.verify(p, makeRng(1))).toBe(expected)
    }
  })
  it('uses the correct terminal rule for normal and last-object-loses games', () => {
    const t = template('games.take-away')
    for (const [stones, misere, expected] of [[1, true, -1], [2, true, 1], [9, true, -1], [10, true, 1], [8, false, -1], [10, false, 2]] as const) {
      const p = { stones, maximum: 3, misere }
      expect(t.solve(p)).toBe(expected)
      expect(t.verify(p, makeRng(1))).toBe(expected)
    }
  })
  it('checks three statements against one mixed truth assignment', () => {
    const t = template('knights.three-statements')
    const p = { names: ['A', 'B', 'C'], claims: [
      { speaker: 0, left: 1, right: 2, kind: 'knave' },
      { speaker: 1, left: 2, right: 0, kind: 'knight' },
      { speaker: 2, left: 0, right: 1, kind: 'and' },
    ] }
    expect(t.solve(p)).toEqual(['A'])
    expect(t.verify(p, makeRng(1))).toEqual(['A'])
  })
})
