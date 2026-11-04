import type { Template } from '../types.ts'
import { display, exact, levels } from './common.ts'

type Sequence = { first: number; step: number; ratio: number; count: number; mode: number }
function lastTerm(p: Sequence): number {
  if (p.mode === 1 || p.mode === 3) return p.first + (p.count - 1) * p.step
  if (p.mode === 5) return p.first * p.ratio ** (p.count - 1) + p.step * (p.ratio ** (p.count - 1) - 1) / (p.ratio - 1)
  return p.first * p.ratio ** (p.count - 1)
}
function sequenceAnswer(p: Sequence): number {
  if (p.mode === 3) return p.count * (p.first + lastTerm(p)) / 2
  if (p.mode === 4) return p.first * (p.ratio ** p.count - 1) / (p.ratio - 1)
  return lastTerm(p)
}
export const sequencesTemplate: Template<Sequence> = {
  id: 'math.sequences.arithmetic-geometric', version: 1, track: 'math', concept: 'math.sequences', family: 'sequence-recurrence',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['production', 'storage'], dailyLevels: [4, 5],
  sample: (rng, level) => ({ first: rng.int(2, 30), step: rng.int(1, 12), ratio: rng.int(2, 4), count: rng.int(3, 9), mode: level }),
  solve: sequenceAnswer,
  verify(p) {
    const terms = [p.first]
    while (terms.length < p.count) {
      const last = terms[terms.length - 1]
      terms.push(p.mode === 1 || p.mode === 3 ? last + p.step : p.mode === 5 ? last * p.ratio + p.step : last * p.ratio)
    }
    return p.mode === 3 || p.mode === 4 ? terms.reduce((a, b) => a + b, 0) : terms[terms.length - 1]
  },
  render: (p, skin) => [
    { t: 'p', text: `${skin === 'production' ? 'A production plan' : 'A storage expansion plan'} records a quantity for each stage. Stage 1 has ${p.first} units. ${p.mode === 1 || p.mode === 3 ? `Each new stage adds ${p.step} units to the previous stage’s quantity.` : `Each new stage multiplies the previous stage’s quantity by ${p.ratio}${p.mode === 5 ? `, then adds ${p.step} units` : ''}.`} This rule holds exactly.` },
    { t: 'p', text: p.mode === 3 || p.mode === 4 ? `What is the sum of the quantities at stages 1 through ${p.count}, inclusive?` : `What quantity is recorded at stage ${p.count}?` },
  ],
  answer: () => ({ type: 'integer', unit: 'units' }),
  misconceptions: [
    { id: 'omit-initial-or-ignore-growth-type', value: (p) => p.mode === 1 ? (p.count - 1) * p.step : p.mode === 2 || p.mode === 5 ? p.first + (p.count - 1) * p.ratio : lastTerm(p) * p.count, feedback: () => 'Keep the initial term and distinguish adding a fixed amount from multiplying by a fixed ratio. For a sum, the stages do not all equal the last stage.' },
    { id: 'off-by-one-stage', value: (p) => {
      const shifted = { ...p, count: p.count + (p.mode === 3 || p.mode === 4 ? -1 : 1) }
      return sequenceAnswer(shifted)
    }, feedback: () => 'Stage 1 is already the initial term. Stage n uses n − 1 transitions, and a sum through stage n includes exactly n terms.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'How many transitions lead from stage 1 to the final requested stage?' }], answer: (p) => p.count - 1, tolerance: exact, explain: () => [{ t: 'p', text: 'There is one fewer transition than stages when the initial stage is numbered 1.' }] },
    { prompt: () => [{ t: 'p', text: 'What is the quantity at the final requested stage, before any summation?' }], answer: lastTerm, tolerance: exact, explain: (p) => [{ t: 'p', text: `Apply the stated recurrence ${p.count - 1} times to obtain ${lastTerm(p)}.` }] },
    { prompt: () => [{ t: 'p', text: 'What is the requested term or sum?' }], answer: sequenceAnswer, tolerance: exact, explain: (p) => [{ t: 'p', text: `The requested result is ${sequenceAnswer(p)} units. ${p.mode === 3 || p.mode === 4 ? 'Sum all stages, not just the endpoints.' : 'No summation is required.'}` }] },
  ],
  solution: (p) => [{ t: 'p', text: p.mode === 1 || p.mode === 3
    ? `Arithmetic terms have a_n = ${p.first} + (n − 1) × ${p.step}. Thus a_${p.count} = ${lastTerm(p)}.${p.mode === 3 ? ` Pairing first and last gives sum = ${p.count} × (${p.first} + ${lastTerm(p)}) / 2 = ${sequenceAnswer(p)}.` : ''}`
    : p.mode === 5 ? `For a_next = ${p.ratio}a + ${p.step}, add ${display(p.step / (p.ratio - 1))} to each term to get a pure geometric sequence. Therefore a_n = ${p.first} × ${p.ratio}^(n − 1) + ${p.step} × (${p.ratio}^(n − 1) − 1) / (${p.ratio} − 1). At n = ${p.count}, this gives ${sequenceAnswer(p)}.`
      : `Geometric terms have a_n = ${p.first} × ${p.ratio}^(n − 1). ${p.mode === 4 ? `Subtracting the sum from ${p.ratio} times itself gives sum = ${p.first} × (${p.ratio}^${p.count} − 1) / (${p.ratio} − 1) = ${sequenceAnswer(p)}.` : `At n = ${p.count}, this is ${sequenceAnswer(p)}.`}` }],
}

type Divisibility = { a: number; b: number; horizon: number; mode: number }
function gcd(a: number, b: number): number { while (b) [a, b] = [b, a % b]; return a }
function divisorAnswer(p: Divisibility): number {
  const divisor = gcd(p.a, p.b), period = p.a * p.b / divisor
  if (p.mode === 1) return divisor
  if (p.mode === 2) return period
  if (p.mode === 3) return (p.a + p.b) / divisor
  if (p.mode === 4) return Math.floor(p.horizon / period)
  // Count events in either stream; simultaneous events are counted only once.
  return Math.floor(p.horizon / p.a) + Math.floor(p.horizon / p.b) - Math.floor(p.horizon / period)
}
export const gcdLcmTemplate: Template<Divisibility> = {
  id: 'math.divisibility.gcd-lcm-word', version: 1, track: 'math', concept: 'math.divisibility', family: 'gcd-lcm-groups-cycles',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['workshop', 'community-centre'], dailyLevels: [4, 5],
  sample(rng, level) {
    const common = rng.int(2, 8)
    return { a: common * rng.int(2, 15), b: common * rng.int(2, 15), horizon: rng.int(100, 900), mode: level }
  },
  solve: divisorAnswer,
  verify(p) {
    if (p.mode === 1 || p.mode === 3) {
      let groups = Math.min(p.a, p.b)
      while (p.a % groups || p.b % groups) groups--
      return p.mode === 1 ? groups : p.a / groups + p.b / groups
    }
    if (p.mode === 2) {
      let minute = Math.max(p.a, p.b)
      while (minute % p.a || minute % p.b) minute++
      return minute
    }
    let count = 0
    for (let minute = 1; minute <= p.horizon; minute++) {
      if (p.mode === 4 ? minute % p.a === 0 && minute % p.b === 0 : minute % p.a === 0 || minute % p.b === 0) count++
    }
    return count
  },
  render: (p, skin) => p.mode === 1 || p.mode === 3 ? [
    { t: 'p', text: `A ${skin === 'workshop' ? 'workshop' : 'community centre'} has ${p.a} blue parts and ${p.b} red parts. All parts must go into the largest possible number of identical packs, with no leftovers. Each pack has the same blue count and the same red count.` },
    { t: 'p', text: p.mode === 1 ? 'What is the maximum number of packs?' : 'How many parts, blue and red combined, are in each pack?' },
  ] : [
    { t: 'p', text: `At a ${skin === 'workshop' ? 'workshop' : 'community centre'}, signal A repeats every ${p.a} minutes and signal B every ${p.b} minutes. Both occur at minute 0. Their schedules then repeat exactly.` },
    { t: 'p', text: p.mode === 2 ? 'At what positive minute do both signals next occur together?' : p.mode === 4 ? `How many simultaneous occurrences are there after minute 0 up to and including minute ${p.horizon}?` : `How many distinct minutes after 0 up to and including ${p.horizon} have at least one signal? Count a minute with both signals only once.` },
  ],
  answer: () => ({ type: 'integer' }),
  misconceptions: [
    { id: 'swap-gcd-and-lcm', value: (p) => p.mode === 1 || p.mode === 3 ? p.a * p.b / gcd(p.a, p.b) : gcd(p.a, p.b), feedback: () => 'Equal packs need a common divisor. Repeating schedules align at common multiples. Choose the operation that matches the setting.' },
    { id: 'use-product-without-common-factor', value: (p) => p.mode === 1 || p.mode === 3 ? p.a + p.b : p.mode === 2 ? p.a * p.b : Math.floor(p.horizon / p.a) + Math.floor(p.horizon / p.b), feedback: () => 'A shared factor changes the common period. For a union of schedules, subtract simultaneous events so they are not counted twice.' },
    { id: 'count-initial-event-or-extra-pack', value: (p) => divisorAnswer(p) + 1, feedback: () => 'Minute 0 is explicitly excluded for event counts. For packs, one extra group must still divide both supplies without leftovers.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'What is the greatest common divisor of the two supplied counts or periods?' }], answer: (p) => gcd(p.a, p.b), tolerance: exact, explain: () => [{ t: 'p', text: 'Repeatedly replace the larger number by its remainder until the remainder is zero.' }] },
    { prompt: (p) => [{ t: 'p', text: p.mode === 1 || p.mode === 3 ? 'How many parts are there in total?' : 'What is the least common multiple of the two periods?' }], answer: (p) => p.mode === 1 || p.mode === 3 ? p.a + p.b : p.a * p.b / gcd(p.a, p.b), tolerance: exact, explain: () => [{ t: 'p', text: 'For packs, add the supplies. For cycles, LCM = product / GCD.' }] },
    { prompt: () => [{ t: 'p', text: 'What is the requested pack count, pack size, period, or event count?' }], answer: divisorAnswer, tolerance: exact, explain: (p) => [{ t: 'p', text: `Apply the appropriate grouping or schedule rule to get ${divisorAnswer(p)}. Exclude minute 0 and count boundary events at the final minute.` }] },
  ],
  solution: (p) => [{ t: 'p', text: `GCD(${p.a}, ${p.b}) = ${gcd(p.a, p.b)}; LCM = ${p.a} × ${p.b} / ${gcd(p.a, p.b)} = ${p.a * p.b / gcd(p.a, p.b)}. ${p.mode === 1 ? 'The greatest divisor is the maximum identical-pack count.' : p.mode === 3 ? `Divide total parts ${p.a + p.b} by the maximum pack count.` : p.mode === 2 ? 'The least positive common multiple is the next simultaneous event.' : p.mode === 4 ? `Count positive multiples of the LCM up to ${p.horizon}.` : `Count multiples of each period up to ${p.horizon}, then subtract multiples of their LCM.`} The requested answer is ${divisorAnswer(p)}.` }],
}
