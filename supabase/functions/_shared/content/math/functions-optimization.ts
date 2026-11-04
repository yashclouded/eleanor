import type { Template } from '../types.ts'
import { exact, levels } from './common.ts'

type Growth = { startA: number; step: number; startB: number; ratio: number; time: number; fee: number; mode: number }
function linear(p: Growth, n: number): number { return p.startA + p.step * n }
function exponential(p: Growth, n: number): number { return p.startB * p.ratio ** n - p.fee }
function growthAnswer(p: Growth): number {
  if (p.mode === 1) return linear(p, p.time)
  if (p.mode === 2) return exponential(p, p.time)
  if (p.mode === 3) return exponential(p, p.time) - linear(p, p.time)
  let lo = 0, hi = 1
  while (exponential(p, hi) <= linear(p, hi)) hi *= 2
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (exponential(p, mid) > linear(p, mid)) hi = mid; else lo = mid
  }
  return hi
}
export const linearExponentialTemplate: Template<Growth> = {
  id: 'math.functions.linear-vs-exponential', version: 1, track: 'math', concept: 'math.functions', family: 'linear-exponential-growth',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['savings', 'production'], dailyLevels: [4, 5],
  sample: (rng, level) => ({ startA: rng.int(20, 60), step: rng.int(2, 12), startB: rng.int(1, 8), ratio: rng.int(2, 3), time: rng.int(2, 6), fee: level === 5 ? rng.int(10, 60) : 0, mode: level }),
  solve: growthAnswer,
  verify(p) {
    let a = p.startA, b = p.startB
    for (let n = 0; n <= 100; n++) {
      if (p.mode >= 4 && b - p.fee > a) return n
      if (p.mode < 4 && n === p.time) return p.mode === 1 ? a : p.mode === 2 ? b - p.fee : b - p.fee - a
      a += p.step
      b *= p.ratio
    }
    throw new Error('Growth curves did not cross within the generated bounds')
  },
  render: (p, skin) => [
    { t: 'p', text: `Two hypothetical ${skin === 'savings' ? 'savings plans record balances in credits' : 'production plans record output units'}. At stage 0, plan A records ${p.startA} and adds ${p.step} each stage. Plan B starts with ${p.startB} and multiplies its quantity by ${p.ratio} each stage${p.fee ? `; subtract a fixed setup cost of ${p.fee} from its recorded value at every comparison (do not subtract it before multiplying)` : ''}. Stages are whole numbers, and values are at that stage rather than sums across stages. These rules are exact assumptions, not forecasts.` },
    { t: 'p', text: p.mode === 1 ? `What is A’s recorded value at stage ${p.time}?` : p.mode === 2 ? `What is B’s recorded value at stage ${p.time}?` : p.mode === 3 ? `What is B minus A at stage ${p.time}? A negative answer is allowed.` : 'What is the first whole-number stage at which B’s recorded value is strictly greater than A’s?' },
  ],
  answer: () => ({ type: 'integer' }),
  misconceptions: [
    { id: 'treat-multiplication-as-addition', value: (p) => p.mode >= 4 ? Math.ceil((p.startA + p.fee - p.startB) / p.ratio) : p.mode === 1 ? p.startA * p.step ** p.time : p.mode === 2 ? p.startB + p.ratio * p.time : p.startB + p.ratio * p.time - linear(p, p.time), feedback: () => 'A grows by a fixed addition; B grows by repeated multiplication. Use a power for B, and check both curves at the same stage.' },
    { id: 'count-one-extra-transition', value: (p) => p.mode === 1 ? linear(p, p.time + 1) : p.mode === 2 ? exponential(p, p.time + 1) : p.mode === 3 ? exponential(p, p.time + 1) - linear(p, p.time + 1) : growthAnswer(p) - 1, feedback: () => 'Stage 0 already has the starting quantity. Stage n has n transitions; a strict crossing must also fail at the preceding stage.' },
  ],
  steps: [
    { prompt: (p) => [{ t: 'p', text: `What does plan A record at stage ${p.time}?` }], answer: (p) => linear(p, p.time), tolerance: exact, explain: (p) => [{ t: 'p', text: `${p.startA} + ${p.step} × ${p.time} = ${linear(p, p.time)}.` }] },
    { prompt: (p) => [{ t: 'p', text: `What does plan B record at stage ${p.time}, including any setup-cost adjustment?` }], answer: (p) => exponential(p, p.time), tolerance: exact, explain: (p) => [{ t: 'p', text: `${p.startB} × ${p.ratio}^${p.time} − ${p.fee} = ${exponential(p, p.time)}.` }] },
    { prompt: () => [{ t: 'p', text: 'What is the requested value, difference, or first strict crossing stage?' }], answer: growthAnswer, tolerance: exact, explain: (p) => [{ t: 'p', text: `The requested result is ${growthAnswer(p)}.${p.mode >= 4 ? ` At that stage B = ${exponential(p, growthAnswer(p))} and A = ${linear(p, growthAnswer(p))}; one stage earlier B has not exceeded A.` : ''}` }] },
  ],
  solution: (p) => [{ t: 'p', text: `Represent the plans by A(n) = ${p.startA} + ${p.step}n and B(n) = ${p.startB} × ${p.ratio}^n − ${p.fee}. ${p.mode >= 4 ? `Compare integer stages: the first strict crossing is n = ${growthAnswer(p)}, where B = ${exponential(p, growthAnswer(p))} > A = ${linear(p, growthAnswer(p))}. At n = ${growthAnswer(p) - 1}, B = ${exponential(p, growthAnswer(p) - 1)} ≤ A = ${linear(p, growthAnswer(p) - 1)}. Because A starts above B and B’s successive gains increase, there is no earlier crossing.` : `Substitute n = ${p.time}, giving A = ${linear(p, p.time)} and B = ${exponential(p, p.time)}. The requested result is ${growthAnswer(p)}.`}` }],
}

type Fence = { length: number; crossFences: number; wall: boolean; gate: number; mode: number }
function widthCoefficient(p: Fence): number { return 2 + p.crossFences }
function lengthCoefficient(p: Fence): number { return p.wall ? 1 : 2 }
function fenceArea(p: Fence): number { return (p.length + p.gate) ** 2 / (4 * widthCoefficient(p) * lengthCoefficient(p)) }
export const fenceAreaTemplate: Template<Fence> = {
  id: 'math.optimization.fence-area', version: 1, track: 'math', concept: 'math.optimization', family: 'rectangle-fixed-fence',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['garden', 'exercise-yard'], dailyLevels: [4, 5],
  sample(rng, level) {
    const wall = level >= 2
    const crossFences = level >= 3 ? level === 3 ? 1 : rng.int(2, 4) : 0
    const gate = level === 5 ? rng.int(1, 8) * 2 : 0
    const widthWeight = 2 + crossFences, lengthWeight = wall ? 1 : 2
    const length = 4 * widthWeight * lengthWeight * rng.int(3, 100) - gate
    return { length, wall, crossFences, gate, mode: level }
  },
  solve: fenceArea,
  verify(p) {
    const available = p.length + p.gate
    let best = 0
    // shortcut: generated optima lie on the half-metre grid; refine verification if sampling permits other optima.
    for (let doubledWidth = 1; doubledWidth * widthCoefficient(p) < available * 2; doubledWidth++) {
      const width = doubledWidth / 2
      const length = (available - widthCoefficient(p) * width) / lengthCoefficient(p)
      best = Math.max(best, width * length)
    }
    return best
  },
  render: (p, skin) => [
    { t: 'p', text: `A rectangular ${skin === 'garden' ? 'garden' : 'exercise yard'} has ${p.length} metres of fencing available. ${p.wall ? 'One full long side lies against a straight wall and needs no fence.' : 'All four outer sides need fencing.'} ${p.crossFences ? `There are ${p.crossFences} internal straight dividing fences, each spanning the width and parallel to the two short outer sides.` : 'There are no internal dividing fences.'} ${p.gate ? `A gate replaces exactly ${p.gate} metres of fence on the outer side opposite the wall; the gate uses no fencing and must fit that side.` : 'There are no gates.'} Use all the fencing. Dimensions may be any positive real lengths.` },
    { t: 'p', text: 'What is the maximum TOTAL enclosed area in square metres, including all internal sections? No calculus is needed.' },
  ],
  answer: () => ({ type: 'number', unit: 'm²', tolerance: exact }),
  misconceptions: [
    { id: 'assume-four-sided-square', value: (p) => p.length ** 2 / 16, feedback: () => 'A square is optimal for four equally fenced sides. A wall or internal dividers changes how much fencing each dimension consumes.' },
    { id: 'allocate-all-to-one-dimension', value: (p) => (p.length + p.gate) ** 2 / (widthCoefficient(p) * lengthCoefficient(p)), feedback: () => 'Each dimension consumes part of the same fencing budget. Giving each the whole budget double-counts available fencing.' },
    { id: 'forget-area-is-product', value: (p) => (p.length + p.gate) / 2, feedback: () => 'Half the effective fencing budget is a weighted length, not an area. Recover both dimensions and multiply them.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'After adding back any gate opening, what effective boundary budget appears in the fencing equation?' }], answer: (p) => p.length + p.gate, tolerance: exact, explain: (p) => [{ t: 'p', text: `The constraint is ${widthCoefficient(p)}w + ${lengthCoefficient(p)}l = ${p.length + p.gate}.` }] },
    { prompt: () => [{ t: 'p', text: 'At the maximum, what is the width in metres?' }], answer: (p) => (p.length + p.gate) / (2 * widthCoefficient(p)), tolerance: exact, explain: () => [{ t: 'p', text: 'For a fixed sum, two weighted dimensions have the largest product when they each consume half the budget.' }] },
    { prompt: () => [{ t: 'p', text: 'What is the maximum total area?' }], answer: fenceArea, tolerance: exact, explain: (p) => [{ t: 'p', text: `The other dimension is ${(p.length + p.gate) / (2 * lengthCoefficient(p))} metres. Multiplying gives ${fenceArea(p)} m².` }] },
  ],
  solution: (p) => [{ t: 'p', text: `Let w span the short sides and l run along the long sides. The fencing equation is ${widthCoefficient(p)}w + ${lengthCoefficient(p)}l − ${p.gate} = ${p.length}. Put u = ${widthCoefficient(p)}w and v = ${lengthCoefficient(p)}l. Then u + v = ${p.length + p.gate} and area = uv / ${widthCoefficient(p) * lengthCoefficient(p)}. Since (u − v)² ≥ 0, uv ≤ (u + v)² / 4, attained at u = v. Thus w = ${(p.length + p.gate) / (2 * widthCoefficient(p))}, l = ${(p.length + p.gate) / (2 * lengthCoefficient(p))}, and area = ${fenceArea(p)} m².${p.gate ? ` The ${p.gate}-metre gate fits the ${((p.length + p.gate) / (2 * lengthCoefficient(p)))}-metre side.` : ''}` }],
}
