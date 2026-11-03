import type { Rng } from '../types.ts'

export const levels = [1, 2, 3, 4, 5].map((level) => ({ level, initialRating: 600 + 200 * level }))

export function labels(rng: Rng, count: number): string[] {
  const pool = 'ABCDEFGHIJKL'.split('')
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

export function permutations<T>(items: T[]): T[][] {
  if (items.length === 0) return [[]]
  return items.flatMap((item, i) => permutations(items.filter((_, j) => i !== j)).map((rest) => [item, ...rest]))
}
