import { describe, expect, it } from 'vitest'
import { buildInstance, itemId } from './instance.ts'
import { baseRateScreeningTemplate } from './content/judgment/base-rate-screening.ts'
import { knightsTwoTemplate } from './content/logic/knights-two.ts'
import { templateFor } from './registry.ts'
import { makeRng } from './rng.ts'

describe('itemId and registry', () => {
  it('formats item IDs as id@version#level', () => {
    expect(itemId({ id: 'judgment.base-rate.screening', version: 1 }, 2)).toBe(
      'judgment.base-rate.screening@1#2',
    )
  })

  it('resolves templates from item IDs via templateFor', () => {
    const res = templateFor('judgment.base-rate.screening@1#2')
    expect(res.template.id).toBe('judgment.base-rate.screening')
    expect(res.level).toBe(2)

    const logicRes = templateFor('logic.knights.two@1#1')
    expect(logicRes.template.id).toBe('logic.knights.two')
    expect(logicRes.level).toBe(1)
  })

  it('rejects invalid item IDs', () => {
    expect(() => templateFor('no-hash-or-at')).toThrow()
    expect(() => templateFor('unknown.template@1#1')).toThrow()
    expect(() => templateFor('judgment.base-rate.screening@1#99')).toThrow()
  })
})

describe('base-rate screening template instance', () => {
  it('level-2 factory fixture (1%, 90%, 10%) gives answer ~8.333% and misconceptions 90 and 100', () => {
    // Seed 35 samples baseRate: 1%, sensitivity: 90%, FPR: 10%
    const seed = 35
    const instance = buildInstance(baseRateScreeningTemplate, 2, seed, 'factory')

    expect(instance.skin).toBe('factory')
    expect(typeof instance.secret.answer).toBe('number')
    expect(instance.secret.answer).toBeCloseTo(8.333333333333334, 5)

    const miscs = instance.secret.misconceptions
    expect(miscs).toHaveLength(2)

    const baseRateNeglect = miscs.find((m) => m.id === 'base-rate-neglect')
    expect(baseRateNeglect).toBeDefined()
    expect(baseRateNeglect?.value).toBe(90)

    const ignoredFp = miscs.find((m) => m.id === 'ignored-false-positives')
    expect(ignoredFp).toBeDefined()
    expect(ignoredFp?.value).toBe(100)

    // JSON round-trip equality: ensures plain JSON without functions/undefined
    const roundTripped = JSON.parse(JSON.stringify(instance))
    expect(roundTripped).toEqual(instance)
  })
})

describe('knights-two template', () => {
  it('every sampled instance has exactly one consistent assignment', () => {
    for (const level of [1, 2, 3]) {
      for (let s = 1; s <= 100; s++) {
        const seed = s * 1000 + level
        const rng = makeRng(seed)
        const params = knightsTwoTemplate.sample(rng, level)

        const solved = knightsTwoTemplate.solve(params)
        const verified = knightsTwoTemplate.verify(params, rng)

        // Must uniquely solve and match verify
        expect(solved).toEqual(verified)

        const built = buildInstance(knightsTwoTemplate, level, seed, 'island')
        expect(built.secret.answer).toEqual(solved)

        // JSON round-trip
        const json = JSON.parse(JSON.stringify(built))
        expect(json).toEqual(built)
      }
    }
  })
})
