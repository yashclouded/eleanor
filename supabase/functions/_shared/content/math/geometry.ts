import type { Template } from '../types.ts'
import { display, exact, levels } from './common.ts'

type Similar = { base: number; height: number; largeBase: number; mode: number }
function similarAnswer(p: Similar): number {
  const scale = p.largeBase / p.base
  if (p.mode === 2) return p.base
  if (p.mode === 3) return p.base * p.height / 2 * scale * scale
  if (p.mode === 4) return p.height * Math.sqrt((p.largeBase * p.largeBase * p.height / (2 * p.base)) / (p.base * p.height / 2))
  return p.mode === 5 ? p.height * (scale - 1) : p.height * scale
}
export const similarTrianglesTemplate: Template<Similar> = {
  id: 'math.geometry.similar-triangles', version: 1, track: 'math', concept: 'math.geometry', family: 'similarity-scale',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['panels', 'maps'], dailyLevels: [4, 5],
  sample(rng, level) {
    const base = rng.int(4, 30), height = rng.int(3, 30)
    return { base, height, largeBase: base * rng.int(2, 6), mode: level }
  },
  solve: similarAnswer,
  verify(p) {
    if (p.mode === 2) return (p.largeBase * p.height) / (p.height * p.largeBase / p.base)
    const bigHeight = p.height * p.largeBase / p.base
    if (p.mode === 3) return p.largeBase * bigHeight / 2
    // Solve the proportion by bisection rather than using a scale-factor formula.
    const smallArea = p.base * p.height / 2
    const bigArea = p.largeBase * bigHeight / 2
    let lo = 0, hi = 10000
    for (let i = 0; i < 70; i++) {
      const mid = (lo + hi) / 2
      const candidateHeight = p.mode === 5 ? mid + p.height : mid
      const below = p.mode === 4 ? candidateHeight ** 2 * smallArea < p.height ** 2 * bigArea : candidateHeight * p.base < p.height * p.largeBase
      if (below) lo = mid; else hi = mid
    }
    return (lo + hi) / 2
  },
  render: (p, skin) => [
    { t: 'p', text: `Two ${skin === 'panels' ? 'triangular panels' : 'triangular regions on scale maps'} are similar right triangles. Their bases correspond, their perpendicular heights correspond, and all lengths use centimetres.` },
    { t: 'p', text: p.mode === 2
      ? `The small height is ${p.height}; the large height is ${p.height * p.largeBase / p.base}; the large base is ${p.largeBase}. What is the small base?`
      : p.mode === 4
        ? `The small base is ${p.base} and its height is ${p.height}. The large triangle’s area is ${display(p.largeBase ** 2 * p.height / (2 * p.base))} cm². What is the large height?`
        : `The small base is ${p.base} and its height is ${p.height}. The large base is ${p.largeBase}. ${p.mode === 3 ? 'What is the large triangle’s area in cm²?' : p.mode === 5 ? 'By how many centimetres does the large height exceed the small height?' : 'What is the large height?'} Lateral orientation does not change the corresponding sides.` },
  ],
  answer: (p) => ({ type: 'number', unit: p.mode === 3 ? 'cm²' : 'cm', tolerance: exact }),
  misconceptions: [
    { id: 'add-base-difference-to-height', value: (p) => p.mode === 2 ? p.largeBase - (p.height * p.largeBase / p.base - p.height) : p.height + p.largeBase - p.base, feedback: () => 'Similarity preserves ratios, not equal differences in lengths. Find the ratio of corresponding sides before scaling.' },
    { id: 'use-length-factor-for-area', value: (p) => p.mode === 3 ? p.base * p.height / 2 * (p.largeBase / p.base) : p.mode === 2 ? p.largeBase * (p.largeBase / p.base) : p.height * (p.largeBase / p.base) ** 2, feedback: () => 'Lengths scale by the side ratio, while areas scale by its square. Match the exponent to the quantity being asked for.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'What is the large-to-small length scale factor?' }], answer: (p) => p.largeBase / p.base, tolerance: exact, explain: () => [{ t: 'p', text: 'Divide corresponding known lengths. If only areas are given, take the square root of their ratio.' }] },
    { prompt: () => [{ t: 'p', text: 'What is the large-to-small area scale factor?' }], answer: (p) => (p.largeBase / p.base) ** 2, tolerance: exact, explain: () => [{ t: 'p', text: 'Both base and height scale, so the area factor is the square of the length factor.' }] },
    { prompt: () => [{ t: 'p', text: 'What is the requested length or area?' }], answer: similarAnswer, tolerance: exact, explain: (p) => [{ t: 'p', text: `Use the corresponding length ratio or its squared area ratio. The requested result is ${display(similarAnswer(p))}.` }] },
  ],
  solution: (p) => [{ t: 'p', text: `The length scale is ${p.largeBase / p.base}; the area scale is ${(p.largeBase / p.base) ** 2}. ${p.mode === 2 ? `Divide the large base ${p.largeBase} by the length scale.` : p.mode === 3 ? `Multiply the small area ${p.base * p.height / 2} by the area scale.` : p.mode === 4 ? 'Recover the length scale as the square root of large area / small area, then multiply the small height.' : p.mode === 5 ? `Scale the small height ${p.height}, then subtract the original height.` : `Multiply the small height ${p.height} by the length scale.`} The result is ${display(similarAnswer(p))}.` }],
}

type Pythagoras = { a: number; b: number; diagonal: number; mode: number; extension: number }
function pythagorasAnswer(p: Pythagoras): number {
  const distance = p.mode === 2 || p.mode === 4 ? Math.sqrt(p.diagonal ** 2 - p.a ** 2) : Math.sqrt(p.a ** 2 + p.b ** 2)
  return p.mode === 3 ? p.a + p.b - distance : p.mode === 4 ? distance - p.extension : p.mode === 5 ? distance * 2 : distance
}
export const pythagorasTemplate: Template<Pythagoras> = {
  id: 'math.geometry.pythagoras-applied', version: 1, track: 'math', concept: 'math.geometry', family: 'right-triangle-distance',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['cables', 'paths'], dailyLevels: [4, 5],
  sample(rng, level) {
    const [a, b, diagonal] = rng.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]])
    const scale = rng.int(1, 30)
    return { a: a * scale, b: b * scale, diagonal: diagonal * scale, mode: level, extension: rng.int(1, b * scale - 1) }
  },
  solve: pythagorasAnswer,
  verify(p) {
    let length = 0
    const targetSquare = p.mode === 2 || p.mode === 4 ? p.diagonal ** 2 - p.a ** 2 : p.a ** 2 + p.b ** 2
    while (length * length < targetSquare) length++
    if (length * length !== targetSquare) throw new Error('Expected an integer right-triangle length')
    if (p.mode === 3) return p.a + p.b - length
    if (p.mode === 4) return length - p.extension
    return p.mode === 5 ? length + length : length
  },
  render: (p, skin) => [
    { t: 'p', text: `${skin === 'cables' ? 'A cable layout' : 'A walking route'} forms a right triangle. All distances are in metres and the two legs meet at exactly 90 degrees.` },
    { t: 'p', text: p.mode === 2 || p.mode === 4
      ? `The diagonal measures ${p.diagonal} and the horizontal leg measures ${p.a}. ${p.mode === 4 ? `The vertical leg includes a lower section of ${p.extension} metres. How long is the remaining upper section?` : 'How long is the vertical leg?'}`
      : `The legs measure ${p.a} and ${p.b}. ${p.mode === 3 ? 'How much shorter is the diagonal than travelling along both legs?' : p.mode === 5 ? 'What is the total distance for travelling the diagonal and returning along the same diagonal?' : 'How long is the diagonal?'}` },
  ],
  answer: () => ({ type: 'integer', unit: 'metres' }),
  misconceptions: [
    { id: 'add-lengths-not-squares', value: (p) => p.mode === 2 || p.mode === 4 ? p.diagonal - p.a : p.a + p.b, feedback: () => 'The Pythagorean relation adds or subtracts squared lengths. Adding or subtracting the raw lengths does not give the missing side.' },
    { id: 'omit-square-root', value: (p) => p.mode === 2 || p.mode === 4 ? p.diagonal ** 2 - p.a ** 2 : p.a ** 2 + p.b ** 2, feedback: () => 'The equation produces a squared length. Take its square root, then apply the final distance comparison or extra segment in the question.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'What squared length must be square-rooted for the missing side?' }], answer: (p) => p.mode === 2 || p.mode === 4 ? p.diagonal ** 2 - p.a ** 2 : p.a ** 2 + p.b ** 2, tolerance: exact, explain: () => [{ t: 'p', text: 'For a diagonal, add the squared legs. For a leg, subtract the other squared leg from the squared diagonal.' }] },
    { prompt: () => [{ t: 'p', text: 'What is the missing side length?' }], answer: (p) => p.mode === 2 || p.mode === 4 ? p.b : p.diagonal, tolerance: exact, explain: () => [{ t: 'p', text: 'Take the nonnegative square root because a distance cannot be negative.' }] },
    { prompt: () => [{ t: 'p', text: 'What distance does the question request?' }], answer: pythagorasAnswer, tolerance: exact, explain: (p) => [{ t: 'p', text: `Apply any final subtraction or return journey. The answer is ${pythagorasAnswer(p)} metres.` }] },
  ],
  solution: (p) => [{ t: 'p', text: `The right triangle obeys ${p.a}² + ${p.b}² = ${p.diagonal}². ${p.mode === 2 || p.mode === 4 ? `The missing leg is sqrt(${p.diagonal}² − ${p.a}²) = ${p.b}.` : `The diagonal is sqrt(${p.a}² + ${p.b}²) = ${p.diagonal}.`} ${p.mode === 3 ? `The saving is ${p.a} + ${p.b} − ${p.diagonal}.` : p.mode === 4 ? `Subtract the known lower section ${p.extension} from the full vertical leg.` : p.mode === 5 ? 'A return journey doubles the diagonal distance.' : ''} The requested distance is ${pythagorasAnswer(p)} metres.` }],
}
