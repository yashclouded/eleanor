export type Rng = {
  next(): number /* [0,1) */
  int(lo: number, hi: number): number /* inclusive */
  pick<T>(xs: readonly T[]): T
}

export function makeRng(seed: number): Rng {
  let s = seed >>> 0

  function next(): number {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  function int(lo: number, hi: number): number {
    if (!Number.isInteger(lo) || !Number.isInteger(hi)) {
      throw new Error('Bounds must be integers')
    }
    if (hi < lo) {
      throw new Error('Upper bound must be greater than or equal to lower bound')
    }
    return lo + Math.floor(next() * (hi - lo + 1))
  }

  function pick<T>(xs: readonly T[]): T {
    if (xs.length === 0) {
      throw new Error('Cannot pick from empty array')
    }
    return xs[int(0, xs.length - 1)]
  }

  return { next, int, pick }
}

export function hashSeed(...parts: (string | number)[]): number {
  const str = parts.join('|')
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
