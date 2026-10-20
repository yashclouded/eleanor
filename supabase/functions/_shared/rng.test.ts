import { describe, expect, it } from 'vitest'
import { hashSeed, makeRng } from './rng.ts'

describe('makeRng', () => {
  it('produces the same first 5 values on every run for seed 42', () => {
    const rng = makeRng(42)
    const first5 = [rng.next(), rng.next(), rng.next(), rng.next(), rng.next()]

    // Rerunning with seed 42 produces the identical sequence
    const rng2 = makeRng(42)
    const first5Again = [rng2.next(), rng2.next(), rng2.next(), rng2.next(), rng2.next()]
    expect(first5).toEqual(first5Again)

    // Snapshot of the mulberry32 outputs for seed 42
    expect(first5).toEqual([
      0.6011037519201636,
      0.44829055899754167,
      0.8524657934904099,
      0.6697340414393693,
      0.17481389874592423,
    ])
  })

  it('int(1,6) stays in [1,6] over 10,000 draws and hits every value', () => {
    const rng = makeRng(12345)
    const seen = new Set<number>()
    let min = Infinity
    let max = -Infinity
    let allIntegers = true
    for (let i = 0; i < 10000; i++) {
      const val = rng.int(1, 6)
      if (val < min) min = val
      if (val > max) max = val
      if (!Number.isInteger(val)) allIntegers = false
      seen.add(val)
    }
    expect(min).toBeGreaterThanOrEqual(1)
    expect(max).toBeLessThanOrEqual(6)
    expect(allIntegers).toBe(true)
    expect(seen.size).toBe(6)
    for (let i = 1; i <= 6; i++) {
      expect(seen.has(i)).toBe(true)
    }
  })

  it('pick selects an element from array', () => {
    const rng = makeRng(99)
    const items = ['apple', 'banana', 'cherry']
    const picked = rng.pick(items)
    expect(items).toContain(picked)
  })
})

describe('hashSeed', () => {
  it('computes deterministic FNV-1a 32-bit hash', () => {
    expect(hashSeed('a', 1)).toBe(hashSeed('a', 1))
    expect(hashSeed('a', 1)).not.toBe(hashSeed('a', 2))
  })
})
