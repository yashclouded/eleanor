import type { Template } from '../types.ts'
import { labels, levels, permutations } from './helpers.ts'

type Arrangements = { names: string[]; mode: number }
function factorial(n: number): number { let result = 1; for (let i = 2; i <= n; i++) result *= i; return result }
function arrangementCount(p: Arrangements): number {
  const n = p.names.length
  if (p.mode === 1) return factorial(n)
  if (p.mode === 2) return factorial(n - 1)
  if (p.mode === 3) return 2 * factorial(n - 1)
  if (p.mode === 4) return factorial(n) - 2 * factorial(n - 1)
  return factorial(n) / 2 - factorial(n - 1)
}
export const arrangementsTemplate: Template<Arrangements> = {
  id: 'logic.counting.arrangements', version: 1, track: 'logic', concept: 'logic.counting', family: 'permutation-constraints',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['exhibition', 'workshop'], dailyLevels: [4, 5],
  sample: (rng, level) => ({ names: labels(rng, rng.int(4, 6)), mode: level }),
  solve: arrangementCount,
  verify(p) {
    const [a, b] = p.names
    return permutations(p.names).filter((order) => {
      const i = order.indexOf(a), j = order.indexOf(b)
      if (p.mode === 1) return true
      if (p.mode === 2) return i === 0
      if (p.mode === 3) return Math.abs(i - j) === 1
      if (p.mode === 4) return Math.abs(i - j) !== 1
      return i < j && j - i !== 1
    }).length
  },
  render: (p, skin) => [
    { t: 'p', text: `An ${skin === 'exhibition' ? 'exhibition lines up distinct displays' : 'equipment workshop lines up distinct tools'} labelled ${p.names.join(', ')} in a straight row. Each appears once. Left-to-right order matters.` },
    { t: 'p', text: [
      '', 'There are no further restrictions.', `${p.names[0]} must be first.`,
      `${p.names[0]} and ${p.names[1]} must be adjacent, in either order.`,
      `${p.names[0]} and ${p.names[1]} must not be adjacent.`,
      `${p.names[0]} must be before ${p.names[1]}, and they must not be adjacent.`,
    ][p.mode] + ' How many valid arrangements are there?' },
  ],
  answer: () => ({ type: 'integer', unit: 'arrangements' }),
  misconceptions: [
    { id: 'ignore-restriction-or-order', value: (p) => p.mode === 1 ? 1 : factorial(p.names.length), feedback: (p) => p.mode === 1 ? 'Choosing all objects gives one set, but their left-to-right orders are distinct. Count permutations.' : 'Counting every permutation ignores the stated restriction. Count only orders that satisfy it.' },
    { id: 'treat-pair-as-one-fixed-block', value: (p) => factorial(p.names.length - 2), feedback: () => 'A two-item block has internal orders and an external position. Fixing both the block and its location removes arrangements the prompt permits.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'How many unrestricted orders are possible?' }], answer: (p) => factorial(p.names.length), tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: `${p.names.length}! counts successive choices of unused objects.` }] },
    { prompt: () => [{ t: 'p', text: 'How many orders put the first two named objects next to each other, in either order?' }], answer: (p) => 2 * factorial(p.names.length - 1), tolerance: { abs: 0 }, explain: () => [{ t: 'p', text: 'Treat the pair as one block, arrange the blocks, then multiply by two internal orders.' }] },
    { prompt: () => [{ t: 'p', text: 'How many orders satisfy the actual restriction?' }], answer: arrangementCount, tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: `For this restriction the count is ${arrangementCount(p)}. Use the unrestricted count, fixed-first count, adjacency block count, or its complement as appropriate.` }] },
  ],
  solution: (p) => [{ t: 'p', text: [
    '', `No restriction: ${p.names.length}! = ${arrangementCount(p)}.`,
    `Fix ${p.names[0]} first, then permute the other ${p.names.length - 1} objects: (${p.names.length - 1})! = ${arrangementCount(p)}.`,
    `Join ${p.names[0]} and ${p.names[1]} into one block. There are (${p.names.length - 1})! block orders and two internal orders: ${arrangementCount(p)}.`,
    `Subtract adjacent orders from all orders: ${p.names.length}! − 2 × (${p.names.length - 1})! = ${arrangementCount(p)}.`,
    `Exactly half the orders put ${p.names[0]} before ${p.names[1]}. Subtract the adjacent orders with that internal direction: ${p.names.length}! / 2 − (${p.names.length - 1})! = ${arrangementCount(p)}.`,
  ][p.mode] }],
}

type Inclusion = { a: number; b: number; both: number; neither: number; mode: number }
function inclusionCount(p: Inclusion): number {
  if (p.mode === 1) return p.a + p.b - p.both
  if (p.mode === 2) return p.neither
  if (p.mode === 3) return p.a + p.b - 2 * p.both
  if (p.mode === 4) return p.a - p.both
  return p.both
}
export const inclusionExclusionTemplate: Template<Inclusion> = {
  id: 'logic.counting.inclusion-exclusion', version: 1, track: 'logic', concept: 'logic.counting', family: 'overlapping-sets',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['classes', 'features'], dailyLevels: [4, 5],
  sample(rng, level) {
    const both = rng.int(2, 15)
    return { a: both + rng.int(5, 30), b: both + rng.int(5, 30), both, neither: rng.int(2, 20), mode: level }
  },
  solve: inclusionCount,
  verify(p) {
    const members = [
      ...Array.from({ length: p.a - p.both }, () => [true, false]),
      ...Array.from({ length: p.b - p.both }, () => [false, true]),
      ...Array.from({ length: p.both }, () => [true, true]),
      ...Array.from({ length: p.neither }, () => [false, false]),
    ]
    return members.filter(([a, b]) => p.mode === 1 ? a || b : p.mode === 2 ? !a && !b : p.mode === 3 ? a !== b : p.mode === 4 ? a && !b : a && b).length
  },
  render: (p, skin) => [
    { t: 'p', text: `${skin === 'classes' ? 'A community centre tracks attendance at classes A and B' : 'A workshop tracks products with features A and B'}. There are ${p.a + p.b - p.both + p.neither} distinct ${skin === 'classes' ? 'people' : 'products'} in total. ${p.a} have A, ${p.b} have B, and ${p.mode === 5 ? `${p.a + p.b - p.both} have at least one` : `${p.both} have both`}. The A and B counts include those with both.` },
    { t: 'p', text: `${p.mode === 1 ? 'How many have at least one of A and B' : p.mode === 2 ? 'How many have neither A nor B' : p.mode === 3 ? 'How many have exactly one of A and B' : p.mode === 4 ? 'How many have A but not B' : 'How many have both A and B'}?` },
  ],
  answer: () => ({ type: 'integer', unit: 'items' }),
  misconceptions: [
    { id: 'add-overlapping-totals', value: (p) => p.a + p.b, feedback: () => 'Adding the two totals counts the overlap twice. Split the population into A only, B only, both, and neither.' },
    { id: 'use-intersection-as-requested-group', value: (p) => p.mode === 5 ? p.a + p.b - p.both : p.both, feedback: () => 'The overlap and union count different regions. Draw A only, B only, both, and neither before selecting the requested region.' },
  ],
  steps: [
    { prompt: (p) => [{ t: 'p', text: p.mode === 5 ? 'What is the sum of the A and B counts, counting overlap twice?' : 'How many have A only?' }], answer: (p) => p.mode === 5 ? p.a + p.b : p.a - p.both, tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: p.mode === 5 ? `${p.a} + ${p.b} = ${p.a + p.b}.` : `${p.a} − ${p.both} = ${p.a - p.both}.` }] },
    { prompt: (p) => [{ t: 'p', text: p.mode === 5 ? 'How many have at least one property?' : 'How many have B only?' }], answer: (p) => p.mode === 5 ? p.a + p.b - p.both : p.b - p.both, tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: p.mode === 5 ? `The union is given as ${p.a + p.b - p.both}.` : `${p.b} − ${p.both} = ${p.b - p.both}.` }] },
    { prompt: () => [{ t: 'p', text: 'Using the disjoint regions, what is the requested count?' }], answer: inclusionCount, tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: `The regions are A only ${p.a - p.both}, B only ${p.b - p.both}, both ${p.both}, neither ${p.neither}. Select the requested regions to obtain ${inclusionCount(p)}.` }] },
  ],
  solution: (p) => [{ t: 'p', text: `Draw four disjoint regions: A only = ${p.a} − ${p.both} = ${p.a - p.both}; B only = ${p.b} − ${p.both} = ${p.b - p.both}; both = ${p.both}; neither = total − (${p.a} + ${p.b} − ${p.both}) = ${p.neither}. ${p.mode === 1 ? 'Add A only, B only, and both.' : p.mode === 2 ? 'Subtract the union from the total.' : p.mode === 3 ? 'Add A only and B only; exclude both.' : p.mode === 4 ? 'Use A only.' : `Subtract the given union from A + B to recover the overlap: ${p.a + p.b} − ${p.a + p.b - p.both}.`} The answer is ${inclusionCount(p)}.` }],
}

type Pigeonhole = { boxes: number; target: number; batch: number }
function draws(p: Pigeonhole): number { return Math.ceil((p.boxes * (p.target - 1) + 1) / p.batch) }
export const pigeonholeTemplate: Template<Pigeonhole> = {
  id: 'logic.pigeonhole.guarantee', version: 1, track: 'logic', concept: 'logic.pigeonhole', family: 'worst-case-collision',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['labels', 'storage'], dailyLevels: [4, 5],
  sample: (rng, level) => ({ boxes: rng.int(3, 24), target: rng.int(2, level + 4), batch: level <= 2 ? 1 : rng.int(2, level) }),
  solve: draws,
  verify(p) {
    let rounds = 0
    while (Math.ceil(rounds * p.batch / p.boxes) < p.target) rounds++
    return rounds
  },
  render: (p, skin) => [
    { t: 'p', text: `${skin === 'labels' ? 'Each incoming parcel receives exactly one of' : 'Each incoming object is placed in exactly one of'} ${p.boxes} ${skin === 'labels' ? 'labels' : 'bins'}. There is no limit on how many can receive one label or occupy one bin. Initially there are no objects.` },
    { t: 'p', text: `Each round adds exactly ${p.batch} objects, assigned in any way. What is the smallest number of complete rounds that guarantees at least ${p.target} objects in one category, even in the worst case?` },
  ],
  answer: () => ({ type: 'integer', unit: 'rounds' }),
  misconceptions: [
    { id: 'capacity-without-extra-object', value: (p) => Math.floor(p.boxes * (p.target - 1) / p.batch), feedback: () => 'Up to target − 1 objects can fit in every category without reaching the target. The guarantee requires exceeding that total capacity.' },
    { id: 'best-case-single-category', value: (p) => Math.ceil(p.target / p.batch), feedback: () => 'That can work if objects land together, but a guarantee must allow an adversary to spread them across every category.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'How many objects can one category hold without reaching the target?' }], answer: (p) => p.target - 1, tolerance: { abs: 0 }, explain: () => [{ t: 'p', text: 'One fewer than the target is the largest safe occupancy.' }] },
    { prompt: () => [{ t: 'p', text: 'How many objects can all categories hold while avoiding the target?' }], answer: (p) => p.boxes * (p.target - 1), tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: `${p.boxes} × ${p.target - 1} objects can be spread evenly without reaching the target.` }] },
    { prompt: () => [{ t: 'p', text: 'What is the smallest number of complete rounds exceeding that capacity?' }], answer: draws, tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: `Round up (${p.boxes * (p.target - 1)} + 1) / ${p.batch} to ${draws(p)}.` }] },
  ],
  solution: (p) => [{ t: 'p', text: `The worst case places ${p.target - 1} objects in each of ${p.boxes} categories, holding ${p.boxes * (p.target - 1)} objects without success. One more forces a category to reach ${p.target}. Each round adds ${p.batch}, so the minimum is ceil((${p.boxes * (p.target - 1)} + 1) / ${p.batch}) = ${draws(p)} rounds. Before that round the total still fits within the safe capacities.` }],
}
