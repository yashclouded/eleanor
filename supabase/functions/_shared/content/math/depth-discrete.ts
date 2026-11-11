import type { Block, Option, Rng, Step, Template } from '../types.ts'

const review = { author: 'GPT-6', reviewer: null, reviewedAt: null }
const foundationLevels = [1, 2, 3, 4, 5, 6].map(level => ({ level, initialRating: 200 + 200 * level }))
const advancedLevels = [1800, 2100, 2400, 2700].map((initialRating, i) => ({ level: i + 1, initialRating }))
const varietyLevels = [1000, 1600, 2200].map((initialRating, i) => ({ level: i + 1, initialRating }))
const exact = { abs: 0.000001 }
const paragraph = (text: string): Block[] => [{ t: 'p', text }]
const show = (n: number): string => String(Number(n.toPrecision(12)))
function numberStep<P>(prompt: (p: P) => string, answer: (p: P) => number, explain: (p: P) => string): Step<P> { return { prompt: p => paragraph(prompt(p)), answer, tolerance: exact, explain: p => paragraph(explain(p)) } }
function shuffle<T>(values: readonly T[], rng: Rng): T[] { const result = [...values]; for (let i = result.length - 1; i > 0; i--) { const j = rng.int(0, i); [result[i], result[j]] = [result[j], result[i]] } return result }
function gcd(a: number, b: number): number { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a }
function mod(a: number, m: number): number { return ((a % m) + m) % m }
function inverse(a: number, m: number): number {
  let oldR = a, r = m, oldS = 1, s = 0
  while (r) { const q = Math.floor(oldR / r); [oldR, r] = [r, oldR - q * r]; [oldS, s] = [s, oldS - q * s] }
  if (oldR !== 1) throw new Error('Modular inverse requires coprimality')
  return mod(oldS, m)
}
function crt(a: number, m: number, b: number, n: number): { residue: number; period: number } | null {
  const g = gcd(m, n)
  if ((b - a) % g) return null
  const reduced = n / g, period = m * reduced
  const multiplier = reduced === 1 ? 0 : mod((b - a) / g * inverse(m / g, reduced), reduced)
  return { residue: mod(a + m * multiplier, period), period }
}
function powerMod(base: number, exponent: number, modulus: number): number { let result = 1; base = mod(base, modulus); while (exponent) { if (exponent % 2) result = result * base % modulus; base = base * base % modulus; exponent = Math.floor(exponent / 2) } return result % modulus }
function valuation(n: number, prime: number): number { let count = 0; while (n % prime === 0) { count++; n /= prime } return count }
function factorialValuation(n: number, prime: number): number { let result = 0; while (n) { n = Math.floor(n / prime); result += n } return result }

type BasicSequence = { level: number; first: number; step: number; curvature: number; ratio: number; count: number; block: number[] }
function basicSequenceAnswer(p: BasicSequence): number {
  if (p.level === 3) return p.block[(p.count - 1) % p.block.length]
  if (p.level === 6) return Math.floor(p.count / p.block.length) * p.block.reduce((a, b) => a + b, 0) + p.block.slice(0, p.count % p.block.length).reduce((a, b) => a + b, 0)
  if (p.level === 5) return p.first * p.ratio ** (p.count - 1)
  return p.first + (p.count - 1) * p.step + (p.count - 1) * (p.count - 2) / 2 * p.curvature
}
export const sequenceFoundation: Template<BasicSequence> = {
  id: 'math.sequences.foundation.differences-and-blocks', version: 1, track: 'math', concept: 'math.sequences', family: 'basic-differences-periodic-blocks', status: 'draft', review,
  levels: foundationLevels, skins: ['number-board', 'stage-record'], dailyLevels: [6],
  sample: (rng, level) => ({ level, first: level === 3 || level === 6 ? 0 : rng.int(1, 20), step: level === 1 || level === 2 || level === 4 ? rng.int(1, 10) : 0, curvature: level === 4 ? rng.int(1, 8) : 0, ratio: level === 5 ? rng.int(2, 4) : 1, count: level === 1 ? 4 : level === 5 ? rng.int(3, 7) : rng.int(5, level === 6 ? 200 : 40), block: level === 3 || level === 6 ? Array.from({ length: rng.int(3, 6) }, () => rng.int(1, 30)) : [] }),
  solve: basicSequenceAnswer,
  verify(p) {
    const terms: number[] = []
    let current = p.first, difference = p.step, position = 0
    for (let i = 0; i < p.count; i++) {
      if (p.level === 3 || p.level === 6) { terms.push(p.block[position]); position++; if (position === p.block.length) position = 0 }
      else { terms.push(current); if (p.level === 5) current *= p.ratio; else { current += difference; difference += p.curvature } }
    }
    return p.level === 6 ? terms.reduce((a, b) => a + b, 0) : terms[terms.length - 1]
  },
  render: (p, skin) => [
    ...paragraph(`${skin === 'number-board' ? 'A number board' : 'A stage record'} uses term numbers starting at 1. ${p.level === 3 || p.level === 6 ? `The block [${p.block.join(', ')}] repeats forever in that order, starting at term 1.` : p.level === 5 ? `The first term is ${p.first}. Every next term is ${p.ratio} times its predecessor.` : `The first term is ${p.first}. ${p.level === 4 ? `The difference from term 1 to term 2 is ${p.step}, and every subsequent difference increases by exactly ${p.curvature}.` : `Every next term adds exactly ${p.step}.`}`} These rules, rather than a guessed pattern from a short list, define every term.`),
    ...paragraph(p.level === 6 ? `What is the sum of terms 1 through ${p.count}, inclusive?` : `What is term ${p.count}?`),
  ],
  answer: () => ({ type: 'integer' }),
  misconceptions: [
    { id: 'one-extra-transition', value: p => basicSequenceAnswer({ ...p, count: p.count + 1 }), feedback: () => 'Term 1 already contains the initial value. Account for one fewer transition than the term number, and retain only the requested number of block entries.' },
    { id: 'confuse-term-and-sum-or-growth', value: p => p.level === 3 ? p.block.reduce((a, b) => a + b, 0) : p.level === 6 ? p.block[(p.count - 1) % p.block.length] : p.level === 5 ? p.first + (p.count - 1) * p.ratio : p.level === 4 ? p.first + (p.count - 1) * p.step : p.first * p.step * p.count, feedback: () => 'Distinguish one term from a total, a repeating block from a growing sequence, and increasing differences from a constant difference.' },
  ],
  steps: [
    numberStep(p => p.level === 3 || p.level === 6 ? 'How many entries are in one complete block?' : 'How many transitions lead from term 1 to the requested term?', p => p.level === 3 || p.level === 6 ? p.block.length : p.count - 1, () => 'Fix the indexing convention before calculating.'),
    numberStep(p => p.level === 3 || p.level === 6 ? 'How many complete blocks fit into the requested number of terms?' : 'What is term 2?', p => p.level === 3 || p.level === 6 ? Math.floor(p.count / p.block.length) : p.level === 5 ? p.first * p.ratio : p.first + p.step, () => 'Use complete blocks and a remainder, or apply just one transition from the first term.'),
    numberStep(() => 'What is the requested term or sum?', basicSequenceAnswer, p => `Apply the exact recurrence or block decomposition. Result: ${basicSequenceAnswer(p)}.`),
  ],
  solution: p => paragraph(p.level === 3 || p.level === 6 ? `The block length is ${p.block.length}. ${p.count} = ${Math.floor(p.count / p.block.length)} × ${p.block.length} + ${p.count % p.block.length}. ${p.level === 3 ? `The term occupies block position ${(p.count - 1) % p.block.length + 1}.` : `Use ${Math.floor(p.count / p.block.length)} complete block sums plus the first ${p.count % p.block.length} entries of the next block.`} Answer: ${basicSequenceAnswer(p)}.` : p.level === 5 ? `There are ${p.count - 1} multiplications, giving ${p.first} × ${p.ratio}^${p.count - 1} = ${basicSequenceAnswer(p)}.` : `For term n the accumulated differences give a_n = ${p.first} + (n−1)${p.step}${p.curvature ? ` + (n−1)(n−2)${p.curvature}/2` : ''}. Substitute n=${p.count} to get ${basicSequenceAnswer(p)}.`),
}

type Telescope = { level: number; initial: number; step: number; alternate: number; shift: number; start: number; count: number; lag: number }
function reciprocalDenominator(p: Telescope, index: number): number { return p.initial + (p.level === 3 ? Math.floor(index / 2) * (p.step + p.alternate) + index % 2 * p.step : index * p.step) }
function telescopeAnswer(p: Telescope): number {
  if (p.level === 3) return 1 / reciprocalDenominator(p, p.start) - 1 / reciprocalDenominator(p, p.start + p.count)
  let boundary = 0
  for (let j = 0; j < p.lag; j++) boundary += 1 / reciprocalDenominator(p, p.start + j) - 1 / reciprocalDenominator(p, p.start + p.count + j)
  let shifted = 0
  if (p.level === 2) for (let index = p.start; index < p.start + p.count; index++) shifted += p.shift / reciprocalDenominator(p, index)
  return boundary / (p.lag * p.step) + shifted
}
export const sequenceAdvanced: Template<Telescope> = {
  id: 'math.sequences.advanced.telescoping-recurrences', version: 1, track: 'math', concept: 'math.sequences', family: 'reciprocal-recurrence-telescoping', status: 'draft', review,
  levels: advancedLevels, skins: ['recurrence', 'rational-ledger'],
  sample: (rng, level) => ({ level, initial: rng.int(2, 120), step: rng.int(1, 100), alternate: level === 3 ? rng.int(1, 100) : 0, shift: level === 2 ? rng.int(1, 100) : 0, start: rng.int(0, 90), count: rng.int(10, 100), lag: level === 4 ? rng.int(2, 8) : 1 }),
  solve: telescopeAnswer,
  verify(p) {
    let current = p.shift + 1 / p.initial
    const terms = [current]
    for (let index = 0; index < p.start + p.count + p.lag; index++) {
      const delta = p.level === 3 && index % 2 ? p.alternate : p.step
      current = p.shift + (current - p.shift) / (1 + delta * (current - p.shift))
      terms.push(current)
    }
    let sum = 0
    for (let index = p.start; index < p.start + p.count; index++) sum += (terms[index] - p.shift) * (terms[index + p.lag] - (p.level === 2 ? 0 : p.shift)) * (p.level === 3 ? index % 2 ? p.alternate : p.step : 1)
    return sum
  },
  render: (p, skin) => [
    ...paragraph(`${skin === 'recurrence' ? 'A rational sequence' : 'A rational-valued ledger'} is defined for every integer n≥0. ${p.level === 2 ? `Put h=${p.shift}. Set a_0=h+1/${p.initial}, and a_(n+1)=h+(a_n−h)/(1+${p.step}(a_n−h)).` : `Set a_0=1/${p.initial}. ${p.level === 3 ? `Let d_n=${p.step} when n is even and d_n=${p.alternate} when n is odd. Define a_(n+1)=a_n/(1+d_n a_n).` : `Define a_(n+1)=a_n/(1+${p.step}a_n).`}`} All denominators are positive under these givens.`),
    ...paragraph(`Calculate the sum over k=${p.start},${p.start + 1},…,${p.start + p.count - 1} of ${p.level === 2 ? '(a_k−h)a_(k+1)' : p.level === 3 ? 'd_k a_k a_(k+1)' : `a_k a_(k+${p.lag})`}. A fraction is accepted; an accurate decimal is also accepted. Use a recurrence invariant and boundary cancellation rather than assuming the terms form an arithmetic sequence.`),
  ],
  answer: () => ({ type: 'number', tolerance: { abs: 0.0000000001 } }),
  misconceptions: [
    { id: 'omit-telescoping-scale', value: p => {
      if (p.level === 3) { let sum = 0; for (let k = p.start; k < p.start + p.count; k++) sum += 1 / (reciprocalDenominator(p, k) * reciprocalDenominator(p, k + 1)); return sum }
      let boundary = 0, harmonic = 0
      for (let j = 0; j < p.lag; j++) boundary += 1 / reciprocalDenominator(p, p.start + j) - 1 / reciprocalDenominator(p, p.start + p.count + j)
      if (p.level === 2) for (let k = p.start; k < p.start + p.count; k++) harmonic += p.shift / reciprocalDenominator(p, k)
      return boundary + harmonic
    }, feedback: () => 'A difference of reciprocal terms equals the product multiplied by the change in their denominators. Retain that factor, including the lag, when converting the boundary back to the product; do not discard the alternating weights in a weighted sum. A separate shifted harmonic term is unaffected by that boundary conversion.' },
    { id: 'include-one-extra-summand', value: p => telescopeAnswer({ ...p, count: p.count + 1 }), feedback: () => 'The inclusive endpoints specify exactly the stated number of summands. The final denominator comes from the endpoint after the final included transition.' },
  ],
  steps: [
    numberStep(() => 'What is the reciprocal denominator of the shifted term at the starting index?', p => reciprocalDenominator(p, p.start), () => 'Take reciprocals after removing any shift. Their increments are the stated d-values.'),
    numberStep(() => 'What is the reciprocal denominator at the starting index plus the number of summands?', p => reciprocalDenominator(p, p.start + p.count), () => 'Accumulate all increments, tracking parity when the increments alternate.'),
    numberStep(() => 'What is the requested telescoping sum?', telescopeAnswer, p => `Only the boundary terms remain, with the correct scaling. Result: ${show(telescopeAnswer(p))}.`),
  ],
  solution: p => paragraph(`Let u_n=a_n${p.shift ? '−h' : ''}. Then 1/u_(n+1)=1/u_n+d_n, so 1/u_n=${p.initial}${p.level === 3 ? `+floor(n/2)(${p.step}+${p.alternate})+(n mod 2)${p.step}` : `+n${p.step}`}. ${p.level === 3 ? 'The identity d_k u_k u_(k+1)=u_k−u_(k+1) cancels every interior term.' : p.lag === 1 ? `u_k u_(k+1)=(u_k−u_(k+1))/${p.step}; telescope from the stated first index to the last.` : `u_k u_(k+${p.lag})=(u_k−u_(k+${p.lag}))/(${p.lag}×${p.step}). After summing, the first ${p.lag} and last ${p.lag} boundary terms remain; overlap cancels automatically.`} ${p.level === 2 ? `The requested unshifted second factor adds h times the finite reciprocal sum Σ1/(${p.initial}+${p.step}k) over the stated k; retain it in addition to the telescoping boundary.` : ''} The resulting expression evaluates to approximately ${show(telescopeAnswer(p))}.`),
}

type BasicDivisor = { level: number; a: number; b: number; modulus: number; low: number; high: number }
function basicDivisorAnswer(p: BasicDivisor): number {
  if (p.level === 1) return p.a % p.modulus
  if (p.level === 2) return gcd(p.a, p.b)
  if (p.level === 3) return p.a * p.b / gcd(p.a, p.b)
  if (p.level === 4) return Math.floor(p.high / p.modulus) - Math.floor((p.low - 1) / p.modulus)
  if (p.level === 5) return p.a / gcd(p.a, p.b)
  return mod(inverse(p.a, p.modulus) * p.b, p.modulus)
}
export const divisorFoundation: Template<BasicDivisor> = {
  id: 'math.divisibility.foundation.remainders-and-factors', version: 1, track: 'math', concept: 'math.divisibility', family: 'division-factor-foundations', status: 'draft', review,
  levels: foundationLevels, skins: ['number-puzzle', 'packing-code'], dailyLevels: [6],
  sample(rng, level) { const modulus = rng.pick([5, 7, 11, 13, 17, 19, 23, 29]); const low = level === 4 ? rng.int(1, 100) : 0; return { level, a: level === 6 ? rng.int(1, modulus - 1) : level === 4 ? 0 : rng.int(10, 120), b: level === 6 ? rng.int(0, modulus - 1) : level === 1 || level === 4 ? 0 : rng.int(10, 120), modulus: level === 1 || level === 4 || level === 6 ? modulus : 1, low, high: level === 4 ? low + rng.int(20, 100) : 0 } },
  solve: basicDivisorAnswer,
  verify(p) {
    if (p.level === 1) { let remainder = p.a; while (remainder >= p.modulus) remainder -= p.modulus; return remainder }
    if (p.level === 2 || p.level === 5) { let largest = 1; for (let factor = 1; factor <= Math.min(p.a, p.b); factor++) if (p.a % factor === 0 && p.b % factor === 0) largest = factor; return p.level === 2 ? largest : p.a / largest }
    if (p.level === 3) { for (let multiple = p.a; multiple <= p.a * p.b; multiple += p.a) if (multiple % p.b === 0) return multiple }
    if (p.level === 4) { let count = 0; for (let n = p.low; n <= p.high; n++) if (n % p.modulus === 0) count++; return count }
    if (p.level === 6) for (let x = 0; x < p.modulus; x++) if ((p.a * x - p.b) % p.modulus === 0) return x
    throw new Error('Generated divisor exercise has no solution')
  },
  render: (p, skin) => paragraph(`${skin === 'number-puzzle' ? 'An integer puzzle asks:' : 'An exact packing-code calculation asks:'} ${p.level === 1 ? `What remainder is left when ${p.a} is divided by ${p.modulus}?` : p.level === 2 ? `What is the greatest positive integer dividing both ${p.a} and ${p.b}?` : p.level === 3 ? `What is the least positive common multiple of ${p.a} and ${p.b}?` : p.level === 4 ? `How many integers in the inclusive interval [${p.low},${p.high}] are divisible by ${p.modulus}?` : p.level === 5 ? `Reduce ${p.a}/${p.b} to lowest positive integer terms. What is its reduced numerator?` : `What is the unique integer x in [0,${p.modulus - 1}] satisfying ${p.a}x≡${p.b} (mod ${p.modulus})? The coefficient and modulus are coprime.`}`),
  answer: () => ({ type: 'integer' }),
  misconceptions: [
    { id: 'confuse-division-quotient-and-remainder', value: p => p.level === 1 ? Math.floor(p.a / p.modulus) : p.level === 4 ? Math.floor(p.high / p.modulus) : p.level === 6 ? p.b / p.a : p.a * p.b, feedback: () => 'A quotient counts complete groups; a remainder is what remains. Common factors, common multiples and modular inverses solve different constraints.' },
    { id: 'ignore-one-boundary-or-common-factor', value: p => p.level === 1 ? p.a : p.level === 2 ? 1 : p.level === 3 ? gcd(p.a, p.b) : p.level === 4 ? basicDivisorAnswer(p) - 1 : p.level === 5 ? p.a : basicDivisorAnswer(p) + p.modulus, feedback: () => 'Check both interval endpoints, cancel the full common factor, and report the representative in the required modular interval.' },
  ],
  steps: [
    numberStep(p => p.level === 4 ? 'What is the greatest multiple-index at or below the upper endpoint?' : p.level === 1 ? 'How many complete divisor groups fit into the dividend?' : p.level === 2 ? 'What is the remainder when the larger supplied integer is divided by the smaller?' : p.level === 6 ? 'What is the greatest common divisor of the coefficient and modulus?' : 'What is the greatest common divisor of the two integers?', p => p.level === 4 ? Math.floor(p.high / p.modulus) : p.level === 1 ? Math.floor(p.a / p.modulus) : p.level === 2 ? Math.max(p.a, p.b) % Math.min(p.a, p.b) : gcd(p.a, p.level === 6 ? p.modulus : p.b), () => 'Identify the division or common-factor structure before applying the final operation.'),
    numberStep(p => p.level === 4 ? 'How many positive multiples lie strictly below the lower endpoint?' : p.level === 6 ? 'What is the inverse of the coefficient modulo the modulus?' : p.level === 1 ? 'How much of the dividend is used by those complete divisor groups?' : p.level === 2 ? 'What is the GCD after completing Euclid’s algorithm?' : p.level === 3 ? 'What is the product of the two supplied integers?' : 'What is the reduced denominator after cancelling the full GCD?', p => p.level === 4 ? Math.floor((p.low - 1) / p.modulus) : p.level === 6 ? inverse(p.a, p.modulus) : p.level === 1 ? Math.floor(p.a / p.modulus) * p.modulus : p.level === 2 ? gcd(p.a, p.b) : p.level === 3 ? p.a * p.b : p.b / gcd(p.a, p.b), () => 'Use the next calculation in the appropriate algorithm: subtract complete groups, finish Euclid, divide the product by the GCD, or cancel both fraction terms.'),
    numberStep(() => 'What is the requested integer?', basicDivisorAnswer, p => `Apply the specified operation and required representative convention: ${basicDivisorAnswer(p)}.`),
  ],
  solution: p => paragraph(p.level === 1 ? `${p.a}=floor(${p.a}/${p.modulus})×${p.modulus}+r with 0≤r<${p.modulus}, giving r=${basicDivisorAnswer(p)}.` : p.level === 4 ? `Count multiples through ${p.high} and subtract those through ${p.low - 1}: floor(${p.high}/${p.modulus})−floor(${p.low - 1}/${p.modulus})=${basicDivisorAnswer(p)}.` : p.level === 6 ? `The inverse of ${p.a} modulo ${p.modulus} is ${inverse(p.a, p.modulus)}. Multiply both sides by it and reduce into [0,${p.modulus - 1}], giving ${basicDivisorAnswer(p)}.` : `GCD(${p.a},${p.b})=${gcd(p.a, p.b)}. ${p.level === 2 ? 'That is the largest shared divisor.' : p.level === 3 ? 'The LCM is the product divided by this GCD.' : 'Divide numerator and denominator by this full GCD.'} Answer: ${basicDivisorAnswer(p)}.`),
}

type AdvancedDivisor = { level: number; firstMod: number; secondMod: number; firstResidue: number; secondResidue: number; lower: number; upper: number; base: number; exponent: number; coefficient: number; prime: number; n: number; k: number; start: number; count: number; scale: number; offset: number }
function countClass(residue: number, period: number, lower: number, upper: number): number { return Math.max(0, Math.floor((upper - residue) / period) - Math.ceil((lower - residue) / period) + 1) }
function advancedDivisorAnswer(p: AdvancedDivisor): number {
  if (p.level === 2) { const modulus = p.firstMod * p.secondMod; return mod(powerMod(p.base, p.exponent, modulus) + p.coefficient * powerMod(p.base, p.exponent - 1, modulus), modulus) }
  if (p.level === 3) { let result = factorialValuation(p.n, p.prime) - factorialValuation(p.k, p.prime) - factorialValuation(p.n - p.k, p.prime); for (let j = p.start; j < p.start + p.count; j++) result += valuation(j * p.scale, p.prime); return result }
  const base = crt(p.firstResidue, p.firstMod, p.secondResidue, p.secondMod)
  if (!base) throw new Error('Generated CRT system must be compatible')
  if (p.level === 1) return base.residue + Math.ceil((p.lower - base.residue) / base.period) * base.period
  const atLeast = (power: number) => { const joined = crt(base.residue, base.period, mod(-p.offset, power), power); return joined ? countClass(joined.residue, joined.period, p.lower, p.upper) : 0 }
  return atLeast(p.prime ** p.exponent) - atLeast(p.prime ** (p.exponent + 1))
}
export const divisorAdvanced: Template<AdvancedDivisor> = {
  id: 'math.divisibility.advanced.congruence-and-valuation', version: 1, track: 'math', concept: 'math.divisibility', family: 'generalized-crt-prime-valuations', status: 'draft', review,
  levels: advancedLevels, skins: ['integer-challenge', 'residue-ledger'],
  sample(rng, level) {
    const prime = level >= 3 ? rng.pick([2, 3, 5, 7]) : 2, exponent = level === 2 ? rng.int(10, 500) : level === 4 ? rng.int(1, 2) : 1
    const offset = level === 4 ? rng.int(1, 30) : 0
    const witness = level === 4 ? prime ** exponent * rng.pick(Array.from({ length: 81 }, (_, i) => i + 20).filter(n => n % prime !== 0)) - offset : rng.int(1, 100000)
    const common = level === 1 ? rng.int(2, 50) : 1
    const cofactorChoices = [1, 2, 3, 4].filter(n => n % prime !== 0)
    const firstMod = level === 1 ? common * rng.pick([3, 5, 7, 11, 13]) : level === 2 ? rng.pick([3, 5, 7, 11, 13, 17, 19]) : level === 4 ? prime ** (exponent - 1) * rng.pick(cofactorChoices) : 1
    const secondMod = level === 1 ? common * rng.pick([2, 17, 19]) : level === 2 ? rng.pick([2, 23, 29, 31]) : level === 4 ? prime ** (exponent - 1) * rng.pick(cofactorChoices) : 1
    const lower = level === 4 ? witness - rng.int(0, Math.min(witness, 100)) : level === 1 ? rng.int(0, 10000) : 0
    const n = level === 3 ? rng.int(80, 500) : 0
    const valuationPeriod = level === 4 ? firstMod * secondMod / gcd(firstMod, secondMod) * prime : 1
    return { level, firstMod, secondMod, firstResidue: level === 1 || level === 4 ? mod(witness, firstMod) : 0, secondResidue: level === 1 || level === 4 ? mod(witness, secondMod) : 0, lower, upper: level === 4 ? witness + rng.int(1, 6) * valuationPeriod + rng.int(0, valuationPeriod - 1) : 0, base: level === 2 ? firstMod * rng.int(1, 60) : 0, exponent, coefficient: level === 2 ? rng.int(1, 100) : 0, prime, n, k: level === 3 ? rng.int(1, n - 1) : 0, start: level === 3 ? rng.int(2, 80) : 0, count: level === 3 ? rng.int(2, 30) : 0, scale: level === 3 ? rng.int(1, 50) : 1, offset }
  },
  solve: advancedDivisorAnswer,
  verify(p) {
    if (p.level === 1) { const limit = p.firstMod * p.secondMod / gcd(p.firstMod, p.secondMod); for (let x = p.lower; x <= p.lower + limit; x++) if (x % p.firstMod === p.firstResidue && x % p.secondMod === p.secondResidue) return x }
    if (p.level === 2) { const m = BigInt(p.firstMod * p.secondMod), b = BigInt(p.base); let previous = 1n; for (let i = 0; i < p.exponent - 1; i++) previous = previous * b % m; return Number((previous * b + BigInt(p.coefficient) * previous) % m) }
    if (p.level === 3) { let product = 1n; const k = Math.min(p.k, p.n - p.k); for (let j = 1; j <= k; j++) product = product * BigInt(p.n - k + j) / BigInt(j); for (let j = p.start; j < p.start + p.count; j++) product *= BigInt(j * p.scale); let result = 0; const prime = BigInt(p.prime); while (product % prime === 0n) { product /= prime; result++ } return result }
    if (p.level === 4) { let result = 0; for (let x = p.lower; x <= p.upper; x++) if (x % p.firstMod === p.firstResidue && x % p.secondMod === p.secondResidue && valuation(x + p.offset, p.prime) === p.exponent) result++; return result }
    throw new Error('No verified CRT solution')
  },
  render: (p, skin) => paragraph(`${skin === 'integer-challenge' ? 'An integer challenge' : 'A residue ledger'} uses exact integer arithmetic. ${p.level === 1 ? `Find the smallest integer x≥${p.lower} satisfying x≡${p.firstResidue} (mod ${p.firstMod}) and x≡${p.secondResidue} (mod ${p.secondMod}). The moduli need not be coprime; compatibility is guaranteed.` : p.level === 2 ? `Find the least nonnegative residue of ${p.base}^${p.exponent}+${p.coefficient}×${p.base}^${p.exponent - 1} modulo ${p.firstMod}×${p.secondMod}. The two displayed factors are distinct primes, but the base may not be coprime to their product.` : p.level === 3 ? `Let B=binomial(${p.n},${p.k})×the product of (${p.scale}j) for every integer j from ${p.start} through ${p.start + p.count - 1}. What is the largest nonnegative integer e for which ${p.prime}^e divides B?` : `How many integers x in [${p.lower},${p.upper}], including both endpoints, satisfy x≡${p.firstResidue} (mod ${p.firstMod}), x≡${p.secondResidue} (mod ${p.secondMod}), and v_${p.prime}(x+${p.offset})=${p.exponent}? Here v_p(z) is the exact exponent of prime p dividing positive integer z. At least one solution is guaranteed.`}`),
  answer: () => ({ type: 'integer' }),
  misconceptions: [
    { id: 'ignore-compatibility-or-prime-factors', value: p => p.level === 1 ? p.firstResidue + Math.ceil((p.lower - p.firstResidue) / p.firstMod) * p.firstMod : p.level === 2 ? mod(p.base * p.exponent + p.coefficient * p.base * (p.exponent - 1), p.firstMod * p.secondMod) : p.level === 3 ? factorialValuation(p.n, p.prime) : countClass(crt(p.firstResidue, p.firstMod, p.secondResidue, p.secondMod)!.residue, crt(p.firstResidue, p.firstMod, p.secondResidue, p.secondMod)!.period, p.lower, p.upper), feedback: () => 'Retain every congruence and every prime-power contribution. Modular exponentiation is not multiplication by the exponent, and binomial denominators remove factors.' },
    { id: 'wrong-period-or-count-gaps', value: p => {
      if (p.level === 1) { const residue = crt(p.firstResidue, p.firstMod, p.secondResidue, p.secondMod)!.residue; const period = p.firstMod * p.secondMod; return residue + Math.ceil((p.lower - residue) / period) * period }
      if (p.level === 2) return powerMod(p.base, p.exponent, p.firstMod * p.secondMod)
      if (p.level === 3) { let count = Math.floor(p.n / p.prime) - Math.floor(p.k / p.prime) - Math.floor((p.n - p.k) / p.prime); for (let j = p.start; j < p.start + p.count; j++) if (j * p.scale % p.prime === 0) count++; return count }
      return advancedDivisorAnswer(p) - 1
    }, feedback: () => 'Use the LCM rather than the product as the compatible progression period, retain both power terms, and count repeated prime factors rather than just factors containing the prime. Interval counting counts solution points rather than the gaps between consecutive solutions.' },
    { id: 'report-structural-parameter-as-answer', value: p => p.level === 1 ? p.firstMod * p.secondMod / gcd(p.firstMod, p.secondMod) : p.level === 2 ? p.firstMod * p.secondMod : p.level === 3 ? p.prime : p.prime ** p.exponent, feedback: () => 'The common period, modulus, prime or prime power is an intermediate constraint. The question asks for a particular progression value, residue, exponent or number of admissible integers.' },
  ],
  steps: [
    numberStep(p => p.level === 3 ? 'What exponent of the stated prime divides the factorial n!?' : p.level === 2 ? 'What is the base reduced modulo the first prime?' : 'What is the GCD of the two moduli?', p => p.level === 3 ? factorialValuation(p.n, p.prime) : p.level === 2 ? p.base % p.firstMod : gcd(p.firstMod, p.secondMod), () => 'Separate the prime-power or compatibility structure before combining it.'),
    numberStep(p => p.level === 3 ? 'What exponent of the prime divides the binomial coefficient alone?' : p.level === 2 ? 'What is the required power with exponent one smaller, modulo the full modulus?' : 'What is the period of the combined two-congruence progression?', p => p.level === 3 ? factorialValuation(p.n, p.prime) - factorialValuation(p.k, p.prime) - factorialValuation(p.n - p.k, p.prime) : p.level === 2 ? powerMod(p.base, p.exponent - 1, p.firstMod * p.secondMod) : p.firstMod * p.secondMod / gcd(p.firstMod, p.secondMod), () => 'Subtract denominator valuations, preserve noncoprimality, or use the LCM as the joint progression period.'),
    numberStep(() => 'What is the requested integer?', advancedDivisorAnswer, p => `Complete the specified CRT, modular power, valuation or exact-valuation count. Result: ${advancedDivisorAnswer(p)}.`),
  ],
  solution: p => paragraph(p.level === 1 ? `Compatibility requires the two residues to agree modulo gcd(${p.firstMod},${p.secondMod}). Solve the reduced linear congruence for the progression multiplier. The combined period is ${p.firstMod * p.secondMod / gcd(p.firstMod, p.secondMod)}. Move to the first progression value at or above ${p.lower}: ${advancedDivisorAnswer(p)}.` : p.level === 2 ? `Factor the expression as ${p.base}^${p.exponent - 1}(${p.base}+${p.coefficient}). Repeated squaring modulo ${p.firstMod * p.secondMod} is valid even when the base is not a unit; an unjustified Euler-exponent cancellation is not. The least nonnegative residue is ${advancedDivisorAnswer(p)}.` : p.level === 3 ? `Legendre's formula gives v_p(n!)=floor(n/p)+floor(n/p²)+… . Subtract the valuations of k! and (n−k)! to get ${factorialValuation(p.n, p.prime) - factorialValuation(p.k, p.prime) - factorialValuation(p.n - p.k, p.prime)} for the binomial coefficient. Add v_p(${p.scale}j) for every displayed j. Total valuation: ${advancedDivisorAnswer(p)}.` : `First combine the two residue conditions, preserving their GCD compatibility. Exact valuation ${p.exponent} means divisibility of x+${p.offset} by ${p.prime ** p.exponent} minus divisibility by ${p.prime ** (p.exponent + 1)}. Combine each extra condition with the progression by generalized CRT; incompatible intersections contribute zero. Count each resulting progression in the inclusive interval and subtract: ${advancedDivisorAnswer(p)}.`),
}

type BasicFunction = { level: number; a: number; b: number; c: number; d: number; x: number; cut: number; pole: number }
function basicFunctionAnswer(p: BasicFunction): number {
  if (p.level === 1) return p.a * p.x + p.b
  if (p.level === 2 || p.level === 4 || p.level === 6) return p.x
  if (p.level === 3) return p.c * (p.a * p.x + p.b) + p.d
  return p.x < p.cut ? p.a * p.x + p.b : p.c * p.x + p.d
}
function basicFunctionTarget(p: BasicFunction): number { return p.level === 2 ? p.a * p.x + p.b : p.level === 4 ? p.a * (p.c * p.x + p.d) + p.b : p.a + p.b / (p.x - p.pole) }
export const functionFoundation: Template<BasicFunction> = {
  id: 'math.functions.foundation.machines-and-inverses', version: 1, track: 'math', concept: 'math.functions', family: 'function-evaluation-inverse-foundations', status: 'draft', review,
  levels: foundationLevels, skins: ['symbol-machine', 'input-output'], dailyLevels: [6],
  sample(rng, level) { const pole = level === 6 ? rng.int(1, 15) : 0; return { level, a: rng.int(1, 10), b: rng.int(1, 20), c: level >= 3 && level <= 5 ? rng.int(1, 10) : 1, d: level >= 3 && level <= 5 ? rng.int(1, 20) : 0, x: level === 6 ? pole + rng.int(1, 20) : rng.int(1, 20), cut: level === 5 ? rng.int(2, 20) : 0, pole } },
  solve: basicFunctionAnswer,
  verify(p) {
    if (p.level === 2) return (basicFunctionTarget(p) - p.b) / p.a
    if (p.level === 4) return ((basicFunctionTarget(p) - p.b) / p.a - p.d) / p.c
    if (p.level === 6) return p.pole + p.b / (basicFunctionTarget(p) - p.a)
    let value = p.x
    if (p.level === 3) { value *= p.a; value += p.b; value *= p.c; value += p.d; return value }
    const slope = p.level === 5 && p.x >= p.cut ? p.c : p.a, intercept = p.level === 5 && p.x >= p.cut ? p.d : p.b
    for (let step = 0; step < slope - 1; step++) value += p.x
    return value + intercept
  },
  render: (p, skin) => paragraph(`${skin === 'symbol-machine' ? 'A symbolic machine' : 'An input-output rule'} is defined exactly. ${p.level === 6 ? `For every real x≠${p.pole}, f(x)=${p.a}+${p.b}/(x−${p.pole}). Find the unique x for which f(x)=${p.a * (p.x - p.pole) + p.b}/${p.x - p.pole}. The displayed fraction is exact.` : p.level === 5 ? `For all real x, f(x)=${p.a}x+${p.b} when x<${p.cut}, and f(x)=${p.c}x+${p.d} when x≥${p.cut}. Find f(${p.x}).` : `For all real x, f(x)=${p.a}x+${p.b}${p.level === 3 || p.level === 4 ? ` and g(x)=${p.c}x+${p.d}` : ''}. ${p.level === 1 ? `Find f(${p.x}).` : p.level === 2 ? `Find the input x for which f(x)=${basicFunctionTarget(p)}.` : p.level === 3 ? `Find g(f(${p.x})).` : `Find x for which f(g(x))=${basicFunctionTarget(p)}.`}`}`),
  answer: () => ({ type: 'number', tolerance: exact }),
  misconceptions: [
    { id: 'reverse-composition-or-inverse', value: p => p.level === 3 ? p.a * (p.c * p.x + p.d) + p.b : p.level === 2 || p.level === 4 || p.level === 6 ? basicFunctionTarget(p) : p.x, feedback: () => 'Composition applies the inner rule first. An inverse problem asks for an input, so undo the operations rather than reporting the given output.' },
    { id: 'omit-intercept-or-domain-branch', value: p => p.level === 1 ? p.a * p.x : p.level === 2 ? basicFunctionTarget(p) / p.a : p.level === 3 ? p.c * p.a * p.x : p.level === 4 ? basicFunctionTarget(p) / (p.a * p.c) : p.level === 5 ? (p.x < p.cut ? p.c * p.x + p.d : p.a * p.x + p.b) : p.b / (basicFunctionTarget(p) - p.a), feedback: () => 'Retain translations as well as slopes. In a piecewise rule, decide the branch at the original input; in a reciprocal rule, retain the pole shift.' },
  ],
  steps: [
    numberStep(p => p.level === 6 ? 'Which input is excluded from the reciprocal rule?' : p.level === 5 ? 'What is the slope of the branch applicable to the given input?' : 'What is the slope of f?', p => p.level === 6 ? p.pole : p.level === 5 && p.x >= p.cut ? p.c : p.a, () => 'Read the domain and select the applicable branch before using its coefficients.'),
    numberStep(p => p.level === 3 ? 'What is the inner value f(x) at the given input?' : p.level === 4 ? 'What value of g(x) is required by the stated output of f?' : p.level === 6 ? 'What is the given output minus the constant term?' : 'What is the additive constant in the applicable branch?', p => p.level === 3 ? p.a * p.x + p.b : p.level === 4 ? p.c * p.x + p.d : p.level === 6 ? p.b / (p.x - p.pole) : p.level === 5 && p.x >= p.cut ? p.d : p.b, () => 'Keep the inner/outer order and remove translations before dividing by a slope.'),
    numberStep(() => 'What is the requested input or output?', basicFunctionAnswer, p => `Substitution back into the stated rule confirms ${show(basicFunctionAnswer(p))}.`),
  ],
  solution: p => paragraph(p.level === 2 ? `Undo the addition and then division: x=(${basicFunctionTarget(p)}−${p.b})/${p.a}=${p.x}.` : p.level === 4 ? `Undo f, then g: g(x)=(${basicFunctionTarget(p)}−${p.b})/${p.a}; x=(g(x)−${p.d})/${p.c}=${p.x}.` : p.level === 6 ? `The target differs from ${p.a}, so the reciprocal can be inverted uniquely. x=${p.pole}+${p.b}/(target−${p.a})=${p.x}, which is not the excluded pole.` : p.level === 3 ? `Inner first: f(${p.x})=${p.a * p.x + p.b}; applying g gives ${basicFunctionAnswer(p)}.` : p.level === 5 ? `Since ${p.x}${p.x < p.cut ? '<' : '≥'}${p.cut}, use only that branch at the original input. The result is ${basicFunctionAnswer(p)}.` : `Multiply the input by ${p.a}, then add ${p.b}: ${basicFunctionAnswer(p)}.`),
}

type Identity = { level: number; a: number; b: number; first: number; second: number; weight: number; shift: number; point: number; image: number; secondImage: number; argument: number; otherArgument: number; iterations: number; otherIterations: number }
function identityAnswer(p: Identity): number {
  if (p.level === 1) return p.a * p.first ** 2 + p.b * p.first + p.weight * (p.a * p.second ** 2 + p.b * p.second)
  if (p.level === 2) return p.a * (p.first ** 2 + p.weight * p.second ** 2)
  if (p.level === 3) return p.iterations % 2 ? p.point + p.image - p.argument : p.argument
  const firstProduct = (p.point - p.shift) * (p.image - p.shift), secondProduct = (p.point - p.shift) * (p.secondImage - p.shift)
  return p.shift + (firstProduct / secondProduct) ** (p.iterations - p.otherIterations) * (p.argument - p.shift) + p.weight * (p.shift + secondProduct / (p.otherArgument - p.shift))
}
export const functionAdvanced: Template<Identity> = {
  id: 'math.functions.advanced.functional-identities', version: 1, track: 'math', concept: 'math.functions', family: 'integer-functional-equations-involutions', status: 'draft', review,
  levels: advancedLevels, skins: ['identity-challenge', 'function-investigation'],
  sample(rng, level) {
    const shift = level === 4 ? rng.int(-30, 60) : 0
    const point = level >= 3 ? shift + rng.int(1, 100) : 0
    const image = level === 3 ? point + rng.int(1, 100) : level === 4 ? shift + rng.int(1, 100) : 0
    return { level, a: level <= 2 ? rng.int(1, 100) : 0, b: level === 1 ? rng.int(1, 100) : 0, first: level <= 2 ? rng.int(2, 150) : 0, second: level <= 2 ? rng.int(2, 150) : 0, weight: level === 3 ? 0 : rng.int(1, 100), shift, point, image, secondImage: level === 4 ? shift + rng.pick(Array.from({ length: 2 * (image - shift) - Math.ceil((image - shift) / 2) + 1 }, (_, i) => Math.ceil((image - shift) / 2) + i).filter(n => n !== image - shift)) : 0, argument: level >= 3 ? shift + rng.int(1, 100) : 0, otherArgument: level === 4 ? shift + rng.int(1, 100) : 0, iterations: level === 4 ? rng.int(1, 6) : level === 3 ? rng.int(1, 3000) : 0, otherIterations: level === 4 ? rng.int(1, 6) : 0 }
  },
  solve: identityAnswer,
  verify(p) {
    if (p.level === 1) { const values = [0]; for (let n = 0; n < Math.max(p.first, p.second); n++) values.push(values[n] + p.a + p.b + 2 * p.a * n); return values[p.first] + p.weight * values[p.second] }
    if (p.level === 2) { const values = [0, p.a]; for (let n = 1; n < Math.max(p.first, p.second); n++) values.push(2 * values[n] + 2 * p.a - values[n - 1]); return values[p.first] + p.weight * values[p.second] }
    if (p.level === 3) { const intercept = p.point + p.image; let value = p.argument; for (let n = 0; n < p.iterations; n++) value = -value + intercept; return value }
    const firstProduct = (p.point - p.shift) * (p.image - p.shift), secondProduct = (p.point - p.shift) * (p.secondImage - p.shift)
    const f = (x: number) => p.shift + firstProduct / (x - p.shift), g = (x: number) => p.shift + secondProduct / (x - p.shift)
    let value = p.argument
    for (let n = 0; n < p.otherIterations; n++) value = g(f(value))
    for (let n = 0; n < p.iterations; n++) value = f(g(value))
    return value + p.weight * g(p.otherArgument)
  },
  render: (p, skin) => paragraph(`${skin === 'identity-challenge' ? 'A functional-identity challenge' : 'A function investigation'} gives the following exact assumptions. ${p.level === 1 ? `f:Z→R satisfies f(x+y)=f(x)+f(y)+${2 * p.a}xy for every pair of integers x,y, and f(1)=${p.a + p.b}. Find f(${p.first})+${p.weight}f(${p.second}).` : p.level === 2 ? `f:Z→R satisfies f(x+y)+f(x−y)=2f(x)+2f(y) for all integers x,y, and f(1)=${p.a}. Find f(${p.first})+${p.weight}f(${p.second}).` : p.level === 3 ? `f:R→R is affine: f(x)=ux+v for unknown real constants u,v. For every real x, f(f(x))=x. Also f(${p.point})=${p.image}, and these two numbers differ. Find f iterated ${p.iterations} times at input ${p.argument}.` : `For every real x≠${p.shift}, define f(x)=${p.shift}+A/(x−${p.shift}) and g(x)=${p.shift}+B/(x−${p.shift}), with unknown positive A,B. It is known that f(${p.point})=${p.image} and g(${p.point})=${p.secondImage}. Starting at ${p.argument}, apply g∘f exactly ${p.otherIterations} times, then apply f∘g exactly ${p.iterations} times. Find the resulting value plus ${p.weight}g(${p.otherArgument}). In f∘g, apply g first. Every stated input differs from ${p.shift}; both functions preserve R\\{${p.shift}} because A and B are nonzero. The two involutions need not commute.`} An exact fraction is accepted. All required integer evaluations or the stated affine/rational functions are uniquely determined by these assumptions; no unmentioned continuity assumption is used.`),
  answer: () => ({ type: 'number', tolerance: exact }),
  misconceptions: [
    { id: 'treat-functional-identity-as-linear-or-constant', value: p => p.level <= 2 ? p.level === 1 ? (p.a + p.b) * (p.first + p.weight * p.second) : p.a * (p.first + p.weight * p.second) : p.level === 3 ? p.image : p.argument + p.weight * p.otherArgument, feedback: () => 'A global identity constrains an entire function. Remove the quadratic defect or derive the composition before extending one known value to other arguments. Two different involutions do not generally cancel each other.' },
    { id: 'wrong-quadratic-index-or-composition-order', value: p => p.level <= 2 ? p.a * (p.first * (p.first - 1) + p.weight * p.second * (p.second - 1)) + (p.level === 1 ? p.b * (p.first + p.weight * p.second) : 0) : p.level === 3 ? p.iterations % 2 ? p.argument : p.point + p.image - p.argument : p.shift + ((p.secondImage - p.shift) / (p.image - p.shift)) ** (p.iterations - p.otherIterations) * (p.argument - p.shift) + p.weight * (p.shift + (p.point - p.shift) * (p.secondImage - p.shift) / (p.otherArgument - p.shift)), feedback: () => 'The forced quadratic is n², not n(n−1). Involutions require careful parity, and f∘g versus g∘f uses reciprocal scaling factors rather than interchangeable maps.' },
    { id: 'omit-weighted-term-or-use-wrong-final-map', value: p => p.level <= 2 ? p.a * p.first ** 2 + (p.level === 1 ? p.b * p.first : 0) : p.level === 3 ? p.argument : p.shift + ((p.image - p.shift) / (p.secondImage - p.shift)) ** (p.iterations - p.otherIterations) * (p.argument - p.shift) + p.weight * (p.shift + (p.point - p.shift) * (p.image - p.shift) / (p.otherArgument - p.shift)), feedback: () => 'Retain the second requested term with its weight and named function. Substituting f for the final g changes the reciprocal coefficient even after the earlier compositions were simplified correctly.' },
  ],
  steps: [
    numberStep(p => p.level <= 2 ? 'What is f(0), forced by the identity?' : p.level === 3 ? 'What is the affine reflection intercept forced by the known non-fixed value?' : 'What is A, recovered from the first stated point-image pair?', p => p.level <= 2 ? 0 : p.level === 3 ? p.point + p.image : (p.point - p.shift) * (p.image - p.shift), () => 'Substitute zero into the identity, compare coefficients of the involution, or isolate the reciprocal coefficient from its known evaluation.'),
    numberStep(p => p.level <= 2 ? 'What is f(2), forced by the identity?' : p.level === 3 ? 'What is the remainder when the iteration count is divided by 2?' : 'What is the scaling factor A/B of f∘g about the shared shift?', p => p.level === 1 ? 4 * p.a + 2 * p.b : p.level === 2 ? 4 * p.a : p.level === 3 ? p.iterations % 2 : (p.image - p.shift) / (p.secondImage - p.shift), () => 'An integer functional recurrence fixes subsequent values. For shifted reciprocal maps, direct substitution shows that their mixed composition is a scaling about the shared shift.'),
    numberStep(() => 'What is the exact requested combined value?', identityAnswer, p => `Use the derived identity and each iteration parity: ${show(identityAnswer(p))}.`),
  ],
  solution: p => paragraph(p.level === 1 ? `Putting x=y=0 gives f(0)=0. Define g(n)=f(n)−${p.a}n². Its defect cancels, so g(m+n)=g(m)+g(n) on the integers and g(1)=${p.b}. Integer additivity forces g(n)=${p.b}n. Thus f(n)=${p.a}n²+${p.b}n, yielding ${identityAnswer(p)}. The integer domain makes pathological additive real functions irrelevant.` : p.level === 2 ? `Zero substitution gives f(0)=0. With y=1, f(n+1)=2f(n)+2f(1)−f(n−1). Starting from 0 and ${p.a}, induction gives f(n)=${p.a}n² for every integer n. The requested value is ${identityAnswer(p)}.` : p.level === 3 ? `Comparing coefficients in f(f(x))=x gives u²=1 and v(u+1)=0. The identity case u=1,v=0 would fix ${p.point}, contradicting its distinct image. Therefore u=−1 and v=${p.point + p.image}. Two applications cancel, so apply the reflection only for an odd iteration count. Answer: ${identityAnswer(p)}.` : `The point-image pairs give A=(${p.point}−${p.shift})(${p.image}−${p.shift}) and B=(${p.point}−${p.shift})(${p.secondImage}−${p.shift}). Each map is an involution, but f(g(x))=h+(A/B)(x−h), whereas g(f(x))=h+(B/A)(x−h). The prescribed mixed compositions therefore multiply the initial deviation by (A/B)^(${p.iterations}−${p.otherIterations}). Add ${p.weight}g(${p.otherArgument}) using B, not A. Both maps and their compositions stay in the punctured domain. Result: ${show(identityAnswer(p))}.`),
}

type Claims = { order: number[]; asserted: boolean[] }
function claimSample(rng: Rng): Claims { return { order: shuffle([0, 1, 2, 3, 4, 5], rng), asserted: Array.from({ length: 6 }, () => Boolean(rng.int(0, 1))) } }
function claimOptions(p: Claims, labels: [string, string][]): Option[] { return p.order.map((claim, i) => ({ id: `claim-${i + 1}`, label: labels[claim][p.asserted[claim] ? 0 : 1] })) }
function claimAnswer(p: Claims, truths: boolean[]): string[] { return p.order.flatMap((claim, i) => p.asserted[claim] === truths[claim] ? [`claim-${i + 1}`] : []) }

type Recurrence = Claims & { level: number; first: number; second: number; step: number; coefficient: number; modulus: number }
function sixCycle(first: number, second: number): number[] { return [first, second, second - first, -first, -second, first - second] }
function orbit(p: Recurrence): { values: number[]; entry: number } {
  const values: number[] = []; let value = p.first
  while (!values.includes(value)) { values.push(value); value = mod(p.coefficient * value + p.step, p.modulus) }
  return { values, entry: values.indexOf(value) }
}
function recurrenceTruths(p: Recurrence): boolean[] {
  if (p.level === 1) return [p.step > 0, p.step <= 0, p.first % 2 === 0 && p.step % 2 === 0, p.first % gcd(p.step, p.modulus) === 0, p.step === 0, p.step !== 0]
  if (p.level === 2) return [true, true, p.first % 2 === 0 && p.second % 2 === 0, sixCycle(p.first, p.second).includes(0), p.first === 0 && p.second === 0, p.first === 0 && p.second === 0]
  const o = orbit(p)
  return [true, o.entry === 0, gcd(p.coefficient, p.modulus) === 1, o.values.includes(0), mod(p.coefficient * p.first + p.step, p.modulus) === p.first, o.values.length - o.entry === p.modulus]
}
function recurrenceLabels(p: Recurrence): [string, string][] {
  if (p.level === 1) return [
    ['The sequence is strictly increasing.', 'The sequence is not strictly increasing.'],
    ['The sequence is bounded above.', 'The sequence is unbounded above.'],
    ['Every term is even.', 'At least one term is odd.'],
    [`At least one term is divisible by ${p.modulus}.`, `No term is divisible by ${p.modulus}.`],
    ['The update rule has an integer fixed point.', 'The update rule has no integer fixed point.'],
    [`The first ${p.modulus} terms are all distinct.`, `Some of the first ${p.modulus} terms are equal.`],
  ]
  if (p.level === 2) return [
    ['A period of the sequence divides 6.', 'No period of the sequence divides 6.'],
    ['The sequence is bounded above.', 'The sequence is unbounded above.'],
    ['Every term is even.', 'At least one term is odd.'],
    ['The sequence contains a zero.', 'The sequence never contains zero.'],
    ['The sequence is an arithmetic progression.', 'The sequence is not an arithmetic progression.'],
    ['Every term is nonnegative.', 'At least one term is negative.'],
  ]
  return [
    ['The sequence is eventually periodic.', 'The sequence is not eventually periodic.'],
    ['The initial residue occurs again at a positive index.', 'The initial residue never occurs again.'],
    ['The update map is one-to-one on all residue classes.', 'Two different residue classes have the same updated residue.'],
    ['The sequence visits residue zero.', 'The sequence never visits residue zero.'],
    ['The initial residue is a fixed point.', 'The initial residue is not a fixed point.'],
    [`The eventual period is exactly ${p.modulus}.`, `The eventual period differs from ${p.modulus}.`],
  ]
}
export const recurrenceAudit: Template<Recurrence> = {
  id: 'math.sequences.variety.recurrence-audit', version: 1, track: 'math', concept: 'math.sequences', family: 'recurrence-invariant-claim-audit', status: 'draft', review,
  levels: varietyLevels, skins: ['sequence-lab', 'state-machine'], dailyLevels: [2],
  sample(rng, level) { const modulus = rng.int(5, 31); return { ...claimSample(rng), level, first: level === 3 ? rng.int(0, modulus - 1) : rng.int(-20, 30), second: level === 2 ? rng.int(-20, 30) : 0, step: level === 3 ? rng.int(0, modulus - 1) : level === 1 ? rng.int(-5, 5) : 0, coefficient: level === 3 ? rng.int(0, modulus - 1) : 1, modulus } },
  solve: p => claimAnswer(p, recurrenceTruths(p)),
  verify(p) {
    let truths: boolean[]
    if (p.level === 1) { const values = Array.from({ length: p.modulus + 1 }, (_, n) => p.first + n * p.step); truths = [values[1] > values[0], values[1] <= values[0], values.slice(0, 2).every(n => n % 2 === 0), values.slice(0, p.modulus).some(n => n % p.modulus === 0), values[1] === values[0], new Set(values.slice(0, p.modulus)).size === p.modulus] }
    else if (p.level === 2) { const values = [p.first, p.second]; for (let i = 2; i < 14; i++) values.push(values[i - 1] - values[i - 2]); const repeats = values[6] === values[0] && values[7] === values[1]; truths = [repeats, repeats, values.slice(0, 6).every(n => n % 2 === 0), values.slice(0, 6).includes(0), values.slice(2, 8).every((n, i) => n - values[i + 1] === values[1] - values[0]), values.slice(0, 6).every(n => n >= 0)] }
    else { const values = [p.first]; for (let i = 0; i < 3 * p.modulus; i++) values.push(mod(p.coefficient * values[i] + p.step, p.modulus)); const tail = values.slice(2 * p.modulus); let period = 1; while (period <= p.modulus && !tail.slice(period).every((n, i) => n === tail[i])) period++; truths = [period <= p.modulus, values.slice(1).includes(p.first), new Set(Array.from({ length: p.modulus }, (_, x) => mod(p.coefficient * x + p.step, p.modulus))).size === p.modulus, values.includes(0), values[1] === values[0], period === p.modulus] }
    return claimAnswer(p, truths)
  },
  render: (p, skin) => paragraph(`${skin === 'sequence-lab' ? 'A sequence laboratory' : 'An exact state machine'} defines an infinite sequence starting at index 0. ${p.level === 1 ? `a_0=${p.first} and a_(n+1)=a_n+(${p.step}) for every n≥0. Also consider divisibility by ${p.modulus}.` : p.level === 2 ? `a_0=${p.first}, a_1=${p.second}, and a_(n+2)=a_(n+1)−a_n for every n≥0.` : `a_0=${p.first} and a_(n+1) is the least nonnegative residue of ${p.coefficient}a_n+${p.step} modulo ${p.modulus}. The update map acts on every residue in [0,${p.modulus - 1}].`} Select every true claim. A fixed point is unchanged by one update; an eventual period starts after any finite nonrepeating prefix. Claims concern the full defined sequence, not a guessed continuation.`),
  answer: p => ({ type: 'multi', options: claimOptions(p, recurrenceLabels(p)) }),
  misconceptions: [
    { id: 'select-disproved-instead-of-proved', value: p => claimAnswer(p, recurrenceTruths(p).map(v => !v)), feedback: () => 'The task asks for true claims. Use a recurrence invariant or a full finite-state orbit before asserting a property of the entire infinite sequence.' },
    { id: 'finite-sample-implies-all-properties', value: p => p.order.map((_, i) => `claim-${i + 1}`), feedback: () => 'A few observed terms cannot justify every claim. Periodicity, monotonicity and injectivity are different properties with different conditions.' },
  ],
  steps: [
    numberStep(() => 'What is the initial term?', p => p.first, () => 'Index 0 is the given initial state.'),
    numberStep(() => 'What is the term at index 1?', p => p.level === 1 ? p.first + p.step : p.level === 2 ? p.second : mod(p.coefficient * p.first + p.step, p.modulus), () => 'Apply exactly the stated update and its residue convention.'),
    numberStep(() => 'How many of the six claims are true?', p => claimAnswer(p, recurrenceTruths(p)).length, p => `The selected set is ${claimAnswer(p, recurrenceTruths(p)).join(', ') || 'empty'}.`),
  ],
  solution: p => [
    ...paragraph(p.level === 1 ? `The explicit form is a_n=${p.first}+n(${p.step}). Its slope settles monotonicity and boundedness. Parity is fixed only if both the first term and increment are even. A term divisible by ${p.modulus} exists exactly when gcd(${p.step},${p.modulus}) divides ${p.first}.` : p.level === 2 ? `Expanding gives [${sixCycle(p.first, p.second).join(', ')}], then the initial pair repeats. This proves a period dividing six and reduces every global claim to the six-value cycle. A periodic arithmetic progression must be constant; this recurrence permits that only when both starting values are zero.` : `Follow the finite-state orbit until its first repeated state. The visited states are [${orbit(p).values.join(', ')}], and the cycle begins at position ${orbit(p).entry}. The update is a permutation of all residues exactly when gcd(${p.coefficient},${p.modulus})=1; that is stronger than one particular orbit cycling.`),
    { t: 'list', items: claimOptions(p, recurrenceLabels(p)).map(option => `${option.id}: ${option.label} ${claimAnswer(p, recurrenceTruths(p)).includes(option.id) ? 'True' : 'False'}.`) },
  ],
}

type TermOrder = { level: number; first: number; second: number; shift: number; indices: number[]; order: number[] }
function termValues(p: TermOrder): number[] { const cycle = sixCycle(p.first - p.shift, p.second - p.shift).map(value => value + p.shift); return p.indices.map(index => p.level === 3 ? cycle[index % 6] + cycle[(index + 1) % 6] : cycle[index % 6]) }
function termOrderAnswer(p: TermOrder): string[] { const values = termValues(p); return p.order.map((index, slot) => ({ id: `entry-${slot + 1}`, value: values[index] })).sort((a, b) => a.value - b.value).map(item => item.id) }
export const termOrder: Template<TermOrder> = {
  id: 'math.sequences.variety.term-order', version: 1, track: 'math', concept: 'math.sequences', family: 'periodic-recurrence-term-ranking', status: 'draft', review,
  levels: varietyLevels, skins: ['term-cards', 'ledger-entries'], dailyLevels: [2],
  sample(rng, level) {
    for (let attempt = 0; attempt < 12; attempt++) { const shift = level === 3 ? rng.int(1, 40) : 0; const p = { level, first: shift + rng.int(-40, 40), second: shift + rng.int(-40, 40), shift, indices: Array.from({ length: 6 }, (_, i) => i + (level >= 2 ? 6 * rng.int(1, 30) : 0)), order: shuffle([0, 1, 2, 3, 4, 5], rng) }; if (new Set(termValues(p)).size === 6) return p }
    return { level, first: 3, second: 8, shift: 0, indices: [0, 1, 2, 3, 4, 5], order: shuffle([0, 1, 2, 3, 4, 5], rng) }
  },
  solve: termOrderAnswer,
  verify(p) { const terms = [p.first, p.second]; for (let i = 2; i <= Math.max(...p.indices) + 1; i++) terms.push(terms[i - 1] - terms[i - 2] + p.shift); return p.order.map((index, slot) => ({ id: `entry-${slot + 1}`, value: terms[p.indices[index]] + (p.level === 3 ? terms[p.indices[index] + 1] : 0) })).sort((a, b) => a.value - b.value).map(item => item.id) },
  render: (p, skin) => [
    ...paragraph(`Order six ${skin === 'term-cards' ? 'term cards' : 'sequence-ledger entries'} from smallest value to largest. The recurrence is a_0=${p.first}, a_1=${p.second}, a_(n+2)=a_(n+1)−a_n${p.shift ? `+${p.shift}` : ''}, for every n≥0. ${p.level === 1 ? `For reference, the first six terms are [${sixCycle(p.first, p.second).join(', ')}].` : 'The recurrence defines all requested terms even when their indices are large.'} The six requested values are distinct; there are no ties.`),
    ...paragraph(p.level === 3 ? 'Each entry is the sum of two consecutive terms. Translate the recurrence about its fixed value before using periodicity.' : 'Each entry is one term. Repeating indices are interpreted modulo a proved period, not by sorting the indices numerically.'),
  ],
  answer: p => ({ type: 'sequence', items: p.order.map((index, i) => ({ id: `entry-${i + 1}`, label: p.level === 3 ? `a_${p.indices[index]} + a_${p.indices[index] + 1}` : `a_${p.indices[index]}` })) }),
  misconceptions: [
    { id: 'sort-indices-instead-of-values', value: p => p.order.map((index, i) => ({ id: `entry-${i + 1}`, index: p.indices[index] })).sort((a, b) => a.index - b.index).map(item => item.id), feedback: () => 'A periodic recurrence is not monotone. Compute each value or its position in the cycle before ordering the cards.' },
    { id: 'reverse-signed-order', value: p => [...termOrderAnswer(p)].reverse(), feedback: () => 'The requested order is smallest to largest, including negative values. Reversing the objective gives the opposite ranking.' },
  ],
  steps: [
    numberStep(() => 'What is a_2?', p => p.second - p.first + p.shift, () => 'Apply the recurrence to the two starting values.'),
    numberStep(() => 'What is a_3?', p => -p.first + 2 * p.shift, () => 'Apply the recurrence again; after translation the six-step cycle becomes visible.'),
    numberStep(() => 'What is the smallest of the six requested values?', p => Math.min(...termValues(p)), p => `The ascending entry order is ${termOrderAnswer(p).join(' → ')}.`),
  ],
  solution: p => [
    ...paragraph(`Set u_n=a_n−${p.shift}. Then u_(n+2)=u_(n+1)−u_n, whose six-term cycle repeats exactly. Reduce each index modulo six${p.level === 3 ? ' and add the two adjacent cycle values before ranking' : ''}.`),
    { t: 'table', head: ['Entry', 'Value'], rows: p.order.map((index, i) => [`entry-${i + 1}`, String(termValues(p)[index])]) },
    ...paragraph(`Ascending order: ${termOrderAnswer(p).join(' → ')}.`),
  ],
}

type Residues = Claims & { level: number; a: number; b: number; modulus: number; exponent: number; probe: number }
function phi(m: number): number { let result = m, remaining = m; for (let prime = 2; prime * prime <= remaining; prime++) if (remaining % prime === 0) { result -= result / prime; while (remaining % prime === 0) remaining /= prime } if (remaining > 1) result -= result / remaining; return result }
function residueTruths(p: Residues): boolean[] {
  const g = gcd(p.a, p.modulus)
  if (p.level === 1) return [(p.a + p.b) % p.modulus === 0, p.a * p.b % p.modulus === 0, g === 1, g === 1, mod(p.a - p.b, p.modulus) === 0, mod(p.a * p.a - p.b * p.b, p.modulus) === 0]
  if (p.level === 2) { const solvable = p.b % g === 0, probe = mod(p.a * p.probe - p.b, p.modulus) === 0; return [solvable, solvable && g === 1, probe, g === 1, solvable && probe, solvable] }
  const residue = powerMod(p.a, p.exponent, p.modulus), totient = phi(p.modulus)
  return [powerMod(p.a, totient, p.modulus) === 1, g === 1, residue === powerMod(p.a, p.exponent + totient, p.modulus), residue === 0, gcd(residue, p.modulus) === 1, true]
}
function residueLabels(p: Residues): [string, string][] {
  if (p.level === 1) return [
    [`${p.modulus} divides a+b.`, `${p.modulus} does not divide a+b.`], [`${p.modulus} divides ab.`, `${p.modulus} does not divide ab.`],
    ['a and the modulus are coprime.', 'a and the modulus share a factor greater than 1.'], ['a has a multiplicative inverse modulo the modulus.', 'a has no multiplicative inverse modulo the modulus.'],
    ['a and b have equal residues.', 'a and b have different residues.'], ['a² and b² have equal residues.', 'a² and b² have different residues.'],
  ]
  if (p.level === 2) return [
    ['The congruence has an integer solution.', 'The congruence has no integer solution.'], ['There is exactly one solution in the least-residue interval.', 'There is not exactly one solution in the least-residue interval.'],
    [`x=${p.probe} is a solution.`, `x=${p.probe} is not a solution.`], ['The coefficient has a multiplicative inverse modulo the given modulus.', 'The coefficient has no multiplicative inverse modulo the given modulus.'],
    [`The complete solution set is x≡${p.probe} (mod ${p.modulus / gcd(p.a, p.modulus)}).`, `That proposed single residue class is not the complete solution set.`],
    [`Exactly ${gcd(p.a, p.modulus)} residues in [0,${p.modulus - 1}] solve the congruence.`, `The number of solving residues differs from ${gcd(p.a, p.modulus)}.`],
  ]
  return [
    [`a^${phi(p.modulus)}≡1 modulo the modulus.`, `a^${phi(p.modulus)} is not congruent to 1 modulo the modulus.`],
    ['The coprimality hypothesis needed for Euler’s exponent theorem holds.', 'The coprimality hypothesis needed for Euler’s exponent theorem fails.'],
    [`a^${p.exponent} and a^${p.exponent + phi(p.modulus)} have equal residues.`, `Those two powers have different residues.`],
    [`a^${p.exponent} is divisible by the modulus.`, `a^${p.exponent} is not divisible by the modulus.`],
    [`a^${p.exponent} has a multiplicative inverse modulo the modulus.`, `a^${p.exponent} has no multiplicative inverse modulo the modulus.`],
    ['Reducing the base modulo the modulus preserves every positive power’s residue.', 'Reducing the base can change a positive power’s residue.'],
  ]
}
export const residueAudit: Template<Residues> = {
  id: 'math.divisibility.variety.residue-claim-audit', version: 1, track: 'math', concept: 'math.divisibility', family: 'residue-implication-audit', status: 'draft', review,
  levels: varietyLevels, skins: ['residue-cards', 'integer-claims'], dailyLevels: [2],
  sample: (rng, level) => ({ ...claimSample(rng), level, a: rng.int(1, 60), b: level < 3 ? rng.int(0, 60) : 0, modulus: level === 3 ? rng.pick([8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25, 27, 28, 30]) : rng.int(3, 30), exponent: level === 3 ? rng.int(2, 20) : 1, probe: level === 2 ? rng.int(0, 30) : 0 }),
  solve: p => claimAnswer(p, residueTruths(p)),
  verify(p) {
    let truths: boolean[]
    const residues = Array.from({ length: p.modulus }, (_, x) => x), units = residues.filter(x => residues.some(y => x * y % p.modulus === 1))
    if (p.level === 1) truths = [mod(p.a + p.b, p.modulus) === 0, mod(p.a * p.b, p.modulus) === 0, units.includes(p.a % p.modulus), units.includes(p.a % p.modulus), p.a % p.modulus === p.b % p.modulus, p.a ** 2 % p.modulus === p.b ** 2 % p.modulus]
    else if (p.level === 2) { const solutions = residues.filter(x => mod(p.a * x - p.b, p.modulus) === 0), period = p.modulus / gcd(p.a, p.modulus); truths = [solutions.length > 0, solutions.length === 1, solutions.includes(p.probe % p.modulus), units.includes(p.a % p.modulus), solutions.length > 0 && residues.every(x => solutions.includes(x) === (mod(x - p.probe, period) === 0)), solutions.length === gcd(p.a, p.modulus)] }
    else { const base = BigInt(p.a), modulus = BigInt(p.modulus), power = Number(base ** BigInt(p.exponent) % modulus), totient = units.length; truths = [base ** BigInt(totient) % modulus === 1n, units.includes(p.a % p.modulus), base ** BigInt(p.exponent + totient) % modulus === BigInt(power), power === 0, units.includes(power), BigInt(p.a % p.modulus) ** BigInt(p.exponent) % modulus === BigInt(power)] }
    return claimAnswer(p, truths)
  },
  render: (p, skin) => paragraph(`${skin === 'residue-cards' ? 'Six residue cards' : 'Six integer claims'} concern exact modular arithmetic. ${p.level === 1 ? `Let a=${p.a}, b=${p.b}, and modulus m=${p.modulus}.` : p.level === 2 ? `Consider ${p.a}x≡${p.b} (mod ${p.modulus}), with least-residue interval [0,${p.modulus - 1}]. One proposed representative is x=${p.probe}.` : `Let a=${p.a} and modulus m=${p.modulus}; consider exponent ${p.exponent}. Euler's totient φ(m) counts residues coprime to m and equals ${phi(p.modulus)} here.`} Select every true claim. A numerical power equality may hold without satisfying the hypothesis of a theorem that would normally imply it.`),
  answer: p => ({ type: 'multi', options: claimOptions(p, residueLabels(p)) }),
  misconceptions: [
    { id: 'select-false-claims', value: p => claimAnswer(p, residueTruths(p).map(v => !v)), feedback: () => 'Check the direction of the claim and its hypotheses. The task asks which statements are true, not which tempting deductions fail.' },
    { id: 'cancel-every-nonzero-coefficient', value: p => p.order.map((_, i) => `claim-${i + 1}`), feedback: () => 'A nonzero integer need not be invertible modulo a composite modulus. Solvability, unique solvability and Euler reduction require their own coprimality conditions.' },
  ],
  steps: [
    numberStep(() => 'What is gcd(a,m)?', p => gcd(p.a, p.modulus), () => 'This GCD decides whether a is a unit and governs linear-congruence solvability.'),
    numberStep(p => p.level === 3 ? 'What is the power’s least nonnegative residue?' : 'What is the least nonnegative residue of a?', p => p.level === 3 ? powerMod(p.a, p.exponent, p.modulus) : p.a % p.modulus, () => 'Work in the required residue interval and do not assume inverses exist.'),
    numberStep(() => 'How many claims are true?', p => claimAnswer(p, residueTruths(p)).length, p => `The selected set is ${claimAnswer(p, residueTruths(p)).join(', ') || 'empty'}.`),
  ],
  solution: p => [
    ...paragraph(`gcd(a,m)=${gcd(p.a, p.modulus)}. ${p.level === 1 ? 'Reduce each expression separately; equal squares need not imply equal original residues.' : p.level === 2 ? 'A linear congruence has solutions exactly when this GCD divides the right side. When solvable, it has that many least residues, forming one class modulo m/GCD.' : `φ(m)=${phi(p.modulus)} and a^${p.exponent} mod m=${powerMod(p.a, p.exponent, p.modulus)}. Euler's theorem requires a to be a unit; a coincidental equality of later powers does not prove that hypothesis.`}`),
    { t: 'list', items: claimOptions(p, residueLabels(p)).map(option => `${option.id}: ${option.label} ${claimAnswer(p, residueTruths(p)).includes(option.id) ? 'True' : 'False'}.`) },
  ],
}

type Strategy = { level: number; factor: number; coefficient: number; rhs: number; modulus: number; auxiliary: number; auxiliaryResidue: number; proposalCoefficients: number[]; order: number[] }
type Congruence = { a: number; b: number; m: number }
function strategies(p: Strategy): Congruence[] {
  const root = mod(inverse(p.coefficient, p.modulus) * p.rhs, p.modulus), originalModulus = p.factor * p.modulus
  const originalRoot = mod(inverse(p.coefficient, originalModulus) * p.rhs, originalModulus)
  // Three proposals use each period; independent unit coefficients prevent a modal-coordinate cue.
  const roots = [root, mod(-root, p.modulus), p.rhs, originalRoot, mod(-originalRoot, originalModulus), p.rhs]
  return roots.map((residue, i) => { const m = i < 3 ? p.modulus : originalModulus, a = p.proposalCoefficients[i]; return { a, b: mod(a * residue, m), m } })
}
function normalize(c: Congruence): { residue: number; period: number } | null { const g = gcd(c.a, c.m); if (c.b % g) return null; const period = c.m / g; return { residue: period === 1 ? 0 : mod(inverse(c.a / g, period) * c.b / g, period), period } }
function strategyAnswer(p: Strategy): string {
  let target = normalize({ a: p.factor * p.coefficient, b: p.factor * p.rhs, m: p.factor * p.modulus })!
  if (p.level === 3) target = crt(target.residue, target.period, p.auxiliaryResidue, p.auxiliary)!
  const matching = p.order.filter(index => { let candidate = normalize(strategies(p)[index]); if (candidate && p.level === 3) candidate = crt(candidate.residue, candidate.period, p.auxiliaryResidue, p.auxiliary); return candidate?.residue === target.residue && candidate.period === target.period })
  if (matching.length !== 1) throw new Error('Exactly one equivalent-congruence proposal is required')
  return `proposal-${p.order.indexOf(matching[0]) + 1}`
}
export const modularStrategy: Template<Strategy> = {
  id: 'math.divisibility.variety.modular-strategy', version: 1, track: 'math', concept: 'math.divisibility', family: 'equivalent-congruence-transformation', status: 'draft', review,
  levels: varietyLevels, skins: ['proof-review', 'congruence-machine'], dailyLevels: [2],
  sample(rng, level) {
    const modulus = rng.pick([7, 11, 13, 17, 19]), factor = rng.int(2, modulus - 1)
    const coefficient = rng.pick(Array.from({ length: modulus - 3 }, (_, i) => i + 2).filter(a => gcd(a, factor) === 1))
    const units = Array.from({ length: factor * modulus - 1 }, (_, i) => i + 1).filter(a => gcd(a, factor * modulus) === 1)
    return { level, modulus, factor, coefficient, rhs: rng.int(1, modulus - 1), auxiliary: level === 3 ? 23 : 1, auxiliaryResidue: level === 3 ? rng.int(0, 22) : 0, proposalCoefficients: [rng.int(1, modulus - 1), rng.int(1, modulus - 1), rng.int(1, modulus - 1), coefficient, rng.pick(units), rng.pick(units)], order: shuffle([0, 1, 2, 3, 4, 5], rng) }
  },
  solve: strategyAnswer,
  verify(p) {
    const candidates = strategies(p), targetModulus = p.factor * p.modulus
    const matching = p.order.filter(index => {
      const candidate = candidates[index], period = targetModulus * candidate.m / gcd(targetModulus, candidate.m) * p.auxiliary
      for (let x = 0; x < period; x++) {
        const auxiliary = p.level < 3 || x % p.auxiliary === p.auxiliaryResidue
        if ((mod(p.factor * p.coefficient * x - p.factor * p.rhs, targetModulus) === 0 && auxiliary) !== (mod(candidate.a * x - candidate.b, candidate.m) === 0 && auxiliary)) return false
      }
      return true
    })
    if (matching.length !== 1) throw new Error('Brute-force equivalence audit is ambiguous')
    return `proposal-${p.order.indexOf(matching[0]) + 1}`
  },
  render: (p, skin) => paragraph(`${skin === 'proof-review' ? 'Review six proposed proof transformations' : 'Review six congruence-machine replacements'}. The original condition on integer x is ${p.factor * p.coefficient}x≡${p.factor * p.rhs} (mod ${p.factor * p.modulus})${p.level === 3 ? ` together with x≡${p.auxiliaryResidue} (mod ${p.auxiliary})` : ''}. ${p.level === 2 ? 'Each proposal describes a complete residue class, not just one valid representative.' : 'Each proposal replaces the first congruence.'} ${p.level === 3 ? 'Every proposal retains the displayed second congruence unchanged.' : ''} Which proposal has exactly the same set of integer solutions as the original? A stricter condition that retains only some original solutions is not equivalent.`),
  answer: p => ({ type: 'choice', options: p.order.map((index, i) => { const c = strategies(p)[index]; return { id: `proposal-${i + 1}`, label: `${c.a === 1 ? 'x' : `${c.a}x`}≡${c.b} (mod ${c.m})${p.level === 3 ? `, and x≡${p.auxiliaryResidue} (mod ${p.auxiliary})` : ''}` } }) }),
  misconceptions: [
    { id: 'divide-sides-without-reducing-modulus', value: p => `proposal-${p.order.indexOf(3) + 1}`, feedback: () => 'Dividing both sides of a congruence by a common factor also changes its modulus. Keeping the old modulus discards valid solutions, even if one proposed residue still works.' },
    { id: 'reverse-residue-sign', value: p => `proposal-${p.order.indexOf(1) + 1}`, feedback: () => 'A transformed coefficient changes the displayed right side, but the whole residue class must stay the same. Negating the solving residue describes a different class here.' },
  ],
  steps: [
    numberStep(() => 'What is the greatest common divisor of the original coefficient and original modulus?', p => p.factor, () => 'The reduced coefficient is coprime to the prime reduced modulus, so the full common factor is the displayed scaling factor.'),
    numberStep(() => 'What is the reduced modulus after cancelling that common factor?', p => p.modulus, () => 'Cancel the same common factor in coefficient, right side and modulus.'),
    numberStep(() => 'How many residues in the original least-residue interval solve the first congruence?', p => p.factor, p => `The equivalent first condition is one residue class modulo ${p.modulus}; the full proposal to select is ${strategyAnswer(p)}.`),
  ],
  solution: p => paragraph(`The original equation says ${p.factor * p.modulus} divides ${p.factor}(${p.coefficient}x−${p.rhs}), which is equivalent to ${p.modulus} dividing ${p.coefficient}x−${p.rhs}. The reduced coefficient is a unit. Thus the complete class is x≡${mod(inverse(p.coefficient, p.modulus) * p.rhs, p.modulus)} (mod ${p.modulus})${p.level === 3 ? ', intersected with the unchanged second class' : ''}. Only ${strategyAnswer(p)} retains exactly this set; changing a modulus can narrow or broaden it even if one displayed solution still works.`),
}

type Domains = Claims & { level: number; hole: number; shift: number; reciprocal: number; cutoff: number; probe: number }
function domainTruths(p: Domains): boolean[] {
  if (p.level === 1) return [false, true, false, true, false, true]
  if (p.level === 2) return [false, false, p.probe !== p.hole && p.probe !== p.shift + p.reciprocal, true, false, true]
  const boundary = p.shift + p.cutoff
  return [false, p.hole < boundary, boundary !== p.hole, boundary !== p.hole, true, p.probe >= boundary && p.probe !== p.hole]
}
function domainLabels(p: Domains): [string, string][] {
  const boundary = p.shift + p.cutoff
  if (p.level === 1) return [
    [`f(${p.hole}) is defined.`, `f(${p.hole}) is undefined.`], [`For every allowed input, f(x)=x−${p.shift}.`, `The simplified formula fails for some allowed input.`],
    ['The range of f is all real numbers.', 'The range of f omits one real value.'], ['f is one-to-one on its stated domain.', 'Two allowed inputs have the same f-value.'],
    [`f is continuous at input ${p.hole}.`, `f is not continuous at input ${p.hole} because that input is outside its domain.`], [`The inverse has domain R\\{${p.hole - p.shift}}.`, `The inverse is defined at every real input.`],
  ]
  if (p.level === 2) return [
    [`g(f(${p.hole})) is defined.`, `The original hole makes g(f(${p.hole})) undefined.`], [`g(f(${p.shift + p.reciprocal})) is defined.`, `g(f(${p.shift + p.reciprocal})) is undefined.`],
    [`g(f(${p.probe})) is defined.`, `g(f(${p.probe})) is undefined.`], [`On its domain, g(f(x))=1/(x−${p.shift + p.reciprocal}).`, `That simplified reciprocal formula disagrees on some allowed input.`],
    [`The composition domain excludes only ${p.shift + p.reciprocal}.`, 'The composition also retains the original cancelled hole.'], ['The composition is one-to-one on its stated domain.', 'The composition is not one-to-one.'],
  ]
  return [
    [`h(f(${p.hole})) is defined.`, `h(f(${p.hole})) is undefined.`], [`The composition domain is exactly [${boundary},∞).`, `The original excluded input ${p.hole} lies in the nominal square-root domain and must still be excluded.`],
    [`The boundary input ${boundary} is allowed.`, `The boundary input ${boundary} is excluded.`], ['The composition attains output zero.', 'The composition cannot attain zero.'],
    ['The composition is one-to-one on its domain.', 'The composition has two different allowed inputs with the same output.'], [`h(f(${p.probe})) is defined.`, `h(f(${p.probe})) is undefined.`],
  ]
}
export const domainAudit: Template<Domains> = {
  id: 'math.functions.variety.domain-audit', version: 1, track: 'math', concept: 'math.functions', family: 'cancellation-composition-domain-audit', status: 'draft', review,
  levels: varietyLevels, skins: ['formula-review', 'domain-notebook'], dailyLevels: [2],
  sample(rng, level) { const hole = rng.int(-30, 30), shift = rng.int(-20, 20); let reciprocal = rng.int(-20, 20); if (shift + reciprocal === hole) reciprocal++; return { ...claimSample(rng), level, hole, shift, reciprocal: level === 2 ? reciprocal : 0, cutoff: level === 3 ? rng.int(-20, 20) : 0, probe: level >= 2 ? rng.pick(Array.from({ length: 81 }, (_, i) => i - 30).filter(x => x !== hole && (level !== 2 || x !== shift + reciprocal))) : 0 } },
  solve: p => claimAnswer(p, domainTruths(p)),
  verify(p) {
    const fDefined = (x: number) => x !== p.hole
    const simplified = (x: number) => x - p.shift
    let truths: boolean[]
    if (p.level === 1) truths = [fDefined(p.hole), [p.hole - 1, p.hole + 1].every(x => simplified(x) === x - p.shift), fDefined(p.hole), true, fDefined(p.hole), !fDefined((p.hole - p.shift) + p.shift)]
    else if (p.level === 2) { const defined = (x: number) => fDefined(x) && simplified(x) !== p.reciprocal; truths = [defined(p.hole), defined(p.shift + p.reciprocal), defined(p.probe), [p.hole - 2, p.hole + 2].filter(defined).every(x => 1 / (simplified(x) - p.reciprocal) === 1 / (x - p.shift - p.reciprocal)), defined(p.hole), true] }
    else { const defined = (x: number) => fDefined(x) && simplified(x) >= p.cutoff; const boundary = p.shift + p.cutoff; truths = [defined(p.hole), !((p.hole >= boundary) && !defined(p.hole)), defined(boundary), defined(boundary), true, defined(p.probe)] }
    return claimAnswer(p, truths)
  },
  render: (p, skin) => paragraph(`${skin === 'formula-review' ? 'Review six formula claims' : 'Review six entries in a domain notebook'}. The original function is f(x)=((x−(${p.hole}))(x−(${p.shift})))/(x−(${p.hole})), defined for real x≠${p.hole}; its domain is part of the definition and must be retained after cancellation. ${p.level === 2 ? `Let g(y)=1/(y−(${p.reciprocal})), defined for real y≠${p.reciprocal}, and examine g∘f.` : p.level === 3 ? `Let h(y)=sqrt(y−(${p.cutoff})), the nonnegative square root defined exactly for real y≥${p.cutoff}, and examine h∘f.` : 'The inverse is considered only as a map from the range of f back to its original domain.'} Select every true statement. Continuity at an input requires the function to be defined there.`),
  answer: p => ({ type: 'multi', options: claimOptions(p, domainLabels(p)) }),
  misconceptions: [
    { id: 'erase-original-hole-after-cancelling', value: p => { const truths = domainTruths(p); truths[0] = true; if (p.level === 1) { truths[2] = true; truths[4] = true; truths[5] = false } else if (p.level === 2) truths[4] = true; else { truths[1] = true; if (p.hole === p.shift + p.cutoff) { truths[2] = true; truths[3] = true } } return claimAnswer(p, truths) }, feedback: () => 'Cancellation simplifies values only where the original expression was defined. The cancelled denominator still excludes its zero, including inside any later composition.' },
    { id: 'select-false-domain-statements', value: p => claimAnswer(p, domainTruths(p).map(v => !v)), feedback: () => 'Check the direction of each statement. Composition requires an allowed inner input and an inner output belonging to the outer function’s domain.' },
  ],
  steps: [
    numberStep(() => 'What input is excluded by the original denominator?', p => p.hole, () => 'A factor that is cancelled algebraically still creates a hole in the defined function.'),
    numberStep(p => p.level === 1 ? 'Which output value is missing from the simplified line because of that hole?' : p.level === 2 ? 'Which new input makes the outer reciprocal denominator zero?' : 'What is the nominal lower input boundary from the square-root condition?', p => p.level === 1 ? p.hole - p.shift : p.level === 2 ? p.shift + p.reciprocal : p.shift + p.cutoff, () => 'Translate the outer domain condition back through f(x)=x−shift while retaining the original hole.'),
    numberStep(() => 'How many claims are true?', p => claimAnswer(p, domainTruths(p)).length, p => `Select ${claimAnswer(p, domainTruths(p)).join(', ') || 'no claims'}.`),
  ],
  solution: p => [
    ...paragraph(`For x≠${p.hole}, cancellation gives f(x)=x−(${p.shift}). ${p.level === 1 ? `It is an injective line with input ${p.hole} removed and output ${p.hole - p.shift} missing. Its inverse is defined exactly on that punctured range.` : p.level === 2 ? `The composition requires both x≠${p.hole} and x≠${p.shift + p.reciprocal}; it equals 1/(x−(${p.shift + p.reciprocal})) only on that domain.` : `The square root requires x≥${p.shift + p.cutoff}, together with x≠${p.hole}. A hole below the boundary adds no new exclusion; a hole at the boundary removes the zero output, while a hole above it removes one positive output. The square root remains injective on this restricted domain.`}`),
    { t: 'list', items: claimOptions(p, domainLabels(p)).map(option => `${option.id}: ${option.label} ${claimAnswer(p, domainTruths(p)).includes(option.id) ? 'True' : 'False'}.`) },
  ],
}

type Affine = { a: number; b: number }
type Composition = { level: number; maps: Affine[]; input: number; order: number[] }
const tripleOrders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]
const pairOrders = [[0, 1], [1, 0], [0, 2], [2, 0], [1, 2], [2, 1]]
function compositionValues(p: Composition): number[] {
  return (p.level === 3 ? tripleOrders : pairOrders).map(indices => {
    let coefficient = 1, intercept = 0
    for (let position = indices.length - 1; position >= 0; position--) { const map = p.maps[indices[position]]; if (p.level === 2 && position === 1) { coefficient /= map.a; intercept = (intercept - map.b) / map.a } else { coefficient *= map.a; intercept = map.a * intercept + map.b } }
    return coefficient * p.input + intercept
  })
}
function compositionLabel(p: Composition, index: number): string { const labels = ['f', 'g', 'h']; const indices = (p.level === 3 ? tripleOrders : pairOrders)[index]; return p.level === 2 ? `${labels[indices[0]]}(${labels[indices[1]]}^(-1)(${p.input}))` : `${indices.map(i => `${labels[i]}(`).join('')}${p.input}${')'.repeat(indices.length)}` }
function compositionAnswer(p: Composition): string[] { const values = compositionValues(p); return p.order.map((index, slot) => ({ id: `expression-${slot + 1}`, value: values[index] })).sort((a, b) => a.value - b.value).map(item => item.id) }
export const compositionOrder: Template<Composition> = {
  id: 'math.functions.variety.composition-order', version: 1, track: 'math', concept: 'math.functions', family: 'noncommuting-function-composition-ranking', status: 'draft', review,
  levels: varietyLevels, skins: ['composition-cards', 'function-pipeline'], dailyLevels: [2],
  sample(rng, level) {
    for (let attempt = 0; attempt < 12; attempt++) { const p = { level, maps: Array.from({ length: 3 }, () => ({ a: rng.int(2, 6), b: rng.int(-20, 30) })), input: rng.int(-10, 20), order: shuffle([0, 1, 2, 3, 4, 5], rng) }; const values = compositionValues(p); if (values.every((value, i) => values.slice(i + 1).every(other => Math.abs(value - other) > 0.000001))) return p }
    return { level, maps: [{ a: 2, b: 1 }, { a: 3, b: 4 }, { a: 5, b: 20 }], input: 1, order: shuffle([0, 1, 2, 3, 4, 5], rng) }
  },
  solve: compositionAnswer,
  verify(p) {
    const values = (p.level === 3 ? tripleOrders : pairOrders).map(indices => { let value = p.input; for (let position = indices.length - 1; position >= 0; position--) { const map = p.maps[indices[position]]; value = p.level === 2 && position === 1 ? (value - map.b) / map.a : map.a * value + map.b } return value })
    if (!values.every((value, i) => values.slice(i + 1).every(other => Math.abs(value - other) > 0.000001))) throw new Error('Composition ranking requires distinct values')
    return p.order.map((index, slot) => ({ id: `expression-${slot + 1}`, value: values[index] })).sort((a, b) => a.value - b.value).map(item => item.id)
  },
  render: (p, skin) => [
    ...paragraph(`Order six ${skin === 'composition-cards' ? 'composition cards' : 'function-pipeline expressions'} by their numerical values, smallest first. All three functions map R bijectively to R: ${p.maps.map((map, i) => `${'fgh'[i]}(x)=${map.a}x+(${map.b})`).join('; ')}. ${p.level === 2 ? 'An exponent (−1) on a function denotes its inverse function, not the reciprocal of its value.' : 'Composition applies the innermost function first; functions need not commute.'} There are no ties among the six expressions.`),
  ],
  answer: p => ({ type: 'sequence', items: p.order.map((index, slot) => ({ id: `expression-${slot + 1}`, label: compositionLabel(p, index) })) }),
  misconceptions: [
    { id: 'apply-outer-function-first', value: p => { const values = (p.level === 3 ? tripleOrders : pairOrders).map(indices => { let value = p.input; indices.forEach((index, position) => { const map = p.maps[index]; value = p.level === 2 && position === 1 ? (value - map.b) / map.a : map.a * value + map.b }); return value }); return p.order.map((index, i) => ({ id: `expression-${i + 1}`, value: values[index] })).sort((a, b) => a.value - b.value).map(item => item.id) }, feedback: () => 'An expression f(g(x)) applies g first. Reversing the evaluation order changes the translations even when products of slopes agree.' },
    { id: 'rank-largest-first', value: p => [...compositionAnswer(p)].reverse(), feedback: () => 'The requested direction is smallest first. Preserve the sign of each computed value and do not reverse the ranking objective.' },
  ],
  steps: [
    numberStep(() => 'What is f evaluated at the displayed common input?', p => p.maps[0].a * p.input + p.maps[0].b, () => 'Apply the slope and then the signed translation.'),
    numberStep(() => 'What is g evaluated at the displayed common input?', p => p.maps[1].a * p.input + p.maps[1].b, () => 'Keep the three maps distinct; their compositions generally do not commute.'),
    numberStep(() => 'What is the smallest value among the six expressions?', p => Math.min(...compositionValues(p)), p => `The ascending expression order is ${compositionAnswer(p).join(' → ')}.`),
  ],
  solution: p => [
    ...paragraph(`For affine maps, compose coefficients as (a,b)∘(c,d)=(ac,ad+b). An inverse affine map has coefficients (1/a,−b/a). Evaluate from the innermost map outward. ${p.level === 3 ? 'Although all six triple compositions have the same slope product, their translated constants depend on order.' : ''}`),
    { t: 'table', head: ['Expression', 'Value'], rows: p.order.map((index, slot) => [`expression-${slot + 1}: ${compositionLabel(p, index)}`, show(compositionValues(p)[index])]) },
    ...paragraph(`Ascending order: ${compositionAnswer(p).join(' → ')}.`),
  ],
}

export const MATH_DISCRETE = [sequenceFoundation, sequenceAdvanced, recurrenceAudit, termOrder, divisorFoundation, divisorAdvanced, residueAudit, modularStrategy, functionFoundation, functionAdvanced, domainAudit, compositionOrder] as const
