import type { Template } from '../types.ts'
import { advancedLevels, advancedReview, precise, paragraph, display, numberStep } from './advanced-support.ts'

type Mixture = { level: number; a: number[]; b: number[]; nA: number[]; nB: number[]; weight: number }
function pooled(rates: number[], counts: number[]): number {
  return rates.reduce((sum, rate, i) => sum + rate * counts[i], 0) / counts.reduce((a, b) => a + b, 0)
}
function mixtureAnswer(p: Mixture): number {
  if (p.level === 1) return pooled(p.a, p.nA)
  if (p.level === 2) return pooled(p.a, p.nA) - pooled(p.b, p.nB)
  if (p.level === 3) return (p.weight * (p.a[0] - p.b[0]) + (100 - p.weight) * (p.a[1] - p.b[1])) / 100
  return 100 * (p.b[1] - p.a[1]) / (p.a[0] - p.b[0] - p.a[1] + p.b[1])
}

export const mixtureTemplate: Template<Mixture> = {
  id: 'judgment.frequencies.standardized-mixtures', version: 1, track: 'judgment', concept: 'judgment.frequencies', family: 'standardized-mixtures',
  status: 'draft', review: advancedReview, levels: advancedLevels, skins: ['packing', 'routing'],
  sample(rng, level) {
    const a = level === 4 ? [rng.int(61, 95), rng.int(5, 30)] : [rng.int(55, 95), rng.int(5, 45)]
    const b = level === 4 ? [rng.int(35, 60), rng.int(31, 54)] : [rng.int(50, 90), rng.int(5, 45)]
    return { level, a, b, nA: [rng.int(1, 80) * 100, rng.int(1, 80) * 100], nB: [rng.int(1, 80) * 100, rng.int(1, 80) * 100], weight: rng.int(10, 90) }
  },
  solve: mixtureAnswer,
  verify(p) {
    if (p.level <= 2) {
      const successes = (rates: number[], counts: number[]) => rates.reduce((n, rate, i) => n + Math.round(rate * counts[i] / 100), 0)
      const a = 100 * successes(p.a, p.nA) / (p.nA[0] + p.nA[1])
      return p.level === 1 ? a : a - 100 * successes(p.b, p.nB) / (p.nB[0] + p.nB[1])
    }
    if (p.level === 3) {
      const a = p.a[1] + p.weight / 100 * (p.a[0] - p.a[1])
      const b = p.b[1] + p.weight / 100 * (p.b[0] - p.b[1])
      return a - b
    }
    let lo = 0, hi = 1
    for (let i = 0; i < 50; i++) {
      const w = (lo + hi) / 2
      if (w * p.a[0] + (1 - w) * p.a[1] < w * p.b[0] + (1 - w) * p.b[1]) lo = w
      else hi = w
    }
    return 50 * (lo + hi)
  },
  render(p, skin) {
    const blocks = paragraph(`Two ${skin === 'packing' ? 'packing methods' : 'routing methods'} are used on easy and difficult jobs. Every rate below is an exact success percentage, not a sample estimate. Method selection is observational; these data alone do not establish a causal effect.`)
    blocks.push({ t: 'table', head: ['Stratum', 'A success %', ...(p.level >= 2 ? ['B success %'] : []), ...(p.level <= 2 ? ['A jobs', ...(p.level === 2 ? ['B jobs'] : [])] : [])], rows: p.a.map((r, i) => [i ? 'Difficult' : 'Easy', String(r), ...(p.level >= 2 ? [String(p.b[i])] : []), ...(p.level <= 2 ? [String(p.nA[i]), ...(p.level === 2 ? [String(p.nB[i])] : [])] : [])]) })
    blocks.push({ t: 'p', text: p.level === 1 ? 'What percentage of all method A jobs succeeded?'
      : p.level === 2 ? 'What is the pooled success rate of A minus that of B, in percentage points? Keep the groups’ actual job counts.'
      : p.level === 3 ? `A target workload has ${p.weight}% easy jobs and ${100 - p.weight}% difficult jobs. Standardize both methods to that same workload. What is A’s success rate minus B’s, in percentage points?`
      : 'Both methods will receive the same future mix. What percentage of easy jobs makes their expected success rates exactly equal?' })
    return blocks
  },
  answer: () => ({ type: 'number', tolerance: precise }),
  misconceptions: [
    { id: 'unweighted-stratum-average', value: p => p.level === 4 ? 50 : (p.a[0] + p.a[1] - (p.level === 1 ? 0 : p.b[0] + p.b[1])) / 2, feedback: () => 'A stratum contributes according to its share of the relevant population. Equal averaging is justified only for equal shares.' },
    { id: 'ignore-difficult-stratum', value: p => p.level === 1 ? p.a[0] : p.a[0] - p.b[0], feedback: () => 'The difficult stratum also contributes. Combine both strata using the actual or specified common weights.' },
    { id: 'omit-weight-normalization', value: p => p.level === 4 ? 100 * (p.b[1] - p.a[1]) / (p.a[0] - p.b[0]) : p.level === 3 ? p.weight * (p.a[0] - p.b[0]) + (100 - p.weight) * (p.a[1] - p.b[1]) : p.a[0] + p.a[1], feedback: () => 'Percentage weights must sum to one after conversion to fractions. In a crossover equation, both stratum differences contribute to the slope.' },
  ],
  steps: [
    numberStep(p => p.level <= 2 ? 'How many successful easy jobs does A have?' : 'What is A minus B in the easy stratum, in percentage points?', p => p.level <= 2 ? p.a[0] * p.nA[0] / 100 : p.a[0] - p.b[0], p => `Use the easy-stratum data: ${p.level <= 2 ? `${p.a[0]}% × ${p.nA[0]}` : `${p.a[0]} − ${p.b[0]}`}.`),
    numberStep(p => p.level <= 2 ? 'What is the pooled success percentage for A?' : 'What is A minus B in the difficult stratum, in percentage points?', p => p.level <= 2 ? pooled(p.a, p.nA) : p.a[1] - p.b[1], () => 'Keep the two strata separate until the correct weights have been identified.'),
    numberStep(() => 'What is the final requested percentage or percentage-point difference?', mixtureAnswer, p => `Apply the relevant weights and solve the stated comparison: ${display(mixtureAnswer(p))}.`),
  ],
  solution(p) {
    return paragraph(p.level <= 2 ? `Convert each percentage into successful jobs, sum successes, then divide by that method’s total jobs. ${p.level === 2 ? 'Subtract the two pooled rates. ' : ''}The result is ${display(mixtureAnswer(p))}${p.level === 1 ? '%' : ' percentage points'}.`
      : p.level === 3 ? `The common-weight difference is (${p.weight}/100)×(${p.a[0]}−${p.b[0]}) + (${100 - p.weight}/100)×(${p.a[1]}−${p.b[1]}) = ${display(mixtureAnswer(p))} percentage points. Standardization prevents differing job mixes from driving this comparison.`
      : `Let w be the easy-job fraction. Equate w×${p.a[0]}+(1−w)×${p.a[1]} and w×${p.b[0]}+(1−w)×${p.b[1]}. Solving gives w=${display(mixtureAnswer(p) / 100)}, so the requested easy-job share is ${display(mixtureAnswer(p))}%.`)
  },
}

type Bounded = { level: number; sites: number; low: number; high: number; uses: number; litres: number; reuse: number; supply: number; total: number; otherUses: number; reserve: number }
function grossDemand(p: Bounded): number {
  if (p.level <= 2) return p.sites * p.high * p.uses * p.litres
  const x = p.uses > p.otherUses ? Math.min(p.high, p.total - p.low) : Math.max(p.low, p.total - p.high)
  return p.sites * (x * p.uses + (p.total - x) * p.otherUses) * p.litres
}
function worstDemand(p: Bounded): number { return grossDemand(p) * (100 - p.reuse) / 100 }
function boundedAnswer(p: Bounded): number {
  const demand = worstDemand(p)
  if (p.level === 1) return demand
  if (p.level === 2 || p.level === 3) return Math.max(0, demand - p.supply)
  // Keep integer percentage numerators exact before rounding indivisible tanks.
  return Math.ceil(Math.max(0, grossDemand(p) * (100 - p.reuse) * (100 + p.reserve) - p.supply * 10000) / 10000000)
}

export const boundedEstimateTemplate: Template<Bounded> = {
  id: 'judgment.estimation.joint-bounds', version: 1, track: 'judgment', concept: 'judgment.estimation', family: 'joint-estimation-bounds',
  status: 'draft', review: advancedReview, levels: advancedLevels, skins: ['water', 'coolant'],
  sample(rng, level) {
    const low = rng.int(10, 35), high = low + rng.int(10, 45)
    const uses = rng.int(2, 25), otherUses = (uses + rng.int(1, 23) - 2) % 24 + 2
    return { level, sites: rng.int(5, 90), low, high, uses, litres: rng.int(2, 25), reuse: level === 1 ? 0 : rng.int(5, 65), supply: level === 1 ? 0 : rng.int(1, 120) * 100, total: low + high, otherUses, reserve: rng.int(5, 35) }
  },
  solve: boundedAnswer,
  verify(p) {
    let maximum = 0
    for (let x = p.low; x <= p.high; x++) {
      if (p.level <= 2) maximum = Math.max(maximum, p.sites * x * p.uses * p.litres * (100 - p.reuse) / 100)
      else {
        const y = p.total - x
        if (y >= p.low && y <= p.high) maximum = Math.max(maximum, p.sites * (x * p.uses + y * p.otherUses) * p.litres * (100 - p.reuse) / 100)
      }
    }
    if (p.level === 1) return maximum
    if (p.level < 4) return Math.max(0, maximum - p.supply)
    const required = maximum * (100 + p.reserve) / 100
    let tanks = 0
    while (p.supply + tanks * 1000 + 1e-8 < required) tanks++
    return tanks
  },
  render(p, skin) {
    return paragraph(`${p.sites} identical sites consume ${skin === 'water' ? 'water' : 'coolant'}. ${p.level <= 2 ? `Each site has an integer number of active units between ${p.low} and ${p.high}, inclusive. Each active unit makes ${p.uses} cycles per day.` : `Each site has two lines. Their integer active-unit counts x and y each lie between ${p.low} and ${p.high}, inclusive, and x+y=${p.total}. Line X makes ${p.uses} cycles per active unit per day; line Y makes ${p.otherUses}.`} Every cycle consumes ${p.litres} litres. ${p.level === 1 ? 'There is no reuse. What is the largest possible total daily demand, in litres?' : `${p.reuse}% of consumed liquid is fully recovered and substitutes for fresh supply, without losses or delays. Existing fresh supply is ${p.supply} litres per day. ${p.level < 4 ? 'What maximum daily shortfall must additional fresh supply cover, in litres? Answer zero if existing supply always suffices.' : `The design must cover worst-case fresh demand plus a ${p.reserve}% reserve on that demand. Extra tanks each supply 1000 litres per day and cannot be fractional. What is the minimum number of extra tanks required?`}`}`)
  },
  answer: () => ({ type: 'number', tolerance: precise }),
  misconceptions: [
    { id: 'independent-incompatible-maxima', value: p => p.level <= 2 ? p.sites * ((p.low + p.high) / 2) * p.uses * p.litres : p.sites * p.high * (p.uses + p.otherUses) * p.litres * (1 - p.reuse / 100), feedback: () => 'A worst-case bound must satisfy every given constraint. Midpoints do not give an upper bound, and two maxima may be incompatible with a fixed total.' },
    { id: 'ignore-reuse-or-rounding', value: p => p.level === 1 ? p.sites * p.high * p.uses : p.level === 4 ? Math.max(0, worstDemand(p) * (1 + p.reserve / 100) - p.supply) / 1000 : worstDemand(p), feedback: () => 'Track litres, recovered supply and existing capacity separately. An indivisible extra tank requires rounding up after the shortfall is calculated.' },
  ],
  steps: [
    numberStep(() => 'What is the worst-case gross daily demand before reuse, in litres?', grossDemand, () => 'For a fixed total, allocate as many active units as permitted to the higher-use line.'),
    numberStep(() => 'What is the worst-case fresh daily demand after reuse, in litres?', worstDemand, p => `Multiply gross demand by ${100 - p.reuse}% to obtain ${display(worstDemand(p))} litres.`),
    numberStep(() => 'What is the requested bound, shortfall, or whole-tank count?', boundedAnswer, p => `Apply existing supply, any reserve, and whole-tank rounding only at the last stage: ${display(boundedAnswer(p))}.`),
  ],
  solution(p) { return paragraph(`Keep the units attached: sites × active units/site × cycles/(unit·day) × litres/cycle. ${p.level >= 3 ? 'Since the two line counts have a fixed sum, the largest demand occurs at a feasible endpoint, with the higher-use line as full as allowed. ' : ''}The worst-case fresh demand is ${display(worstDemand(p))} litres/day. ${p.level === 1 ? '' : `Subtract ${p.supply} litres/day of existing supply. `}${p.level === 4 ? `First add ${p.reserve}% reserve to demand, then round a positive shortfall up in 1000-litre tanks. ` : ''}The requested result is ${display(boundedAnswer(p))}.`) },
}

type Selection = { level: number; a: number; b: number; selected: number[]; sensitivity: number; fpr: number }
function selectedCells(p: Selection): number[] {
  const a = p.a / 100, b = p.b / 100
  return [(1 - a) * (1 - b), a * (1 - b), (1 - a) * b, a * b].map((mass, i) => mass * p.selected[i] / 100)
}
function selectionAnswer(p: Selection): number {
  const cells = selectedCells(p)
  if (p.level === 2) return 100 * cells[3] / (cells[1] + cells[2] + cells[3])
  if (p.level === 3) {
    const total = cells.reduce((a, b) => a + b, 0)
    return 100 * (cells[3] / total - (cells[1] + cells[3]) * (cells[2] + cells[3]) / total ** 2)
  }
  if (p.level === 4) {
    const weighted = cells.map((mass, i) => mass * (i >= 2 ? p.sensitivity : p.fpr) / 100)
    return 100 * (weighted[1] + weighted[3]) / weighted.reduce((a, b) => a + b, 0)
  }
  return 100 * (cells[1] + cells[3]) / cells.reduce((a, b) => a + b, 0)
}

export const selectionTemplate: Template<Selection> = {
  id: 'judgment.conditional.selection-filter', version: 1, track: 'judgment', concept: 'judgment.conditional', family: 'selection-filter',
  status: 'draft', review: advancedReview, levels: advancedLevels, skins: ['inspection', 'routing'],
  sample: (rng, level) => ({ level, a: rng.int(10, 90), b: rng.int(10, 90), selected: Array.from({ length: 4 }, () => rng.int(5, 95)), sensitivity: rng.int(60, 95), fpr: rng.int(5, 35) }),
  solve: selectionAnswer,
  verify(p) {
    let denominator = 0, numerator = 0, aMass = 0, bMass = 0
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      let mass = (a ? p.a : 100 - p.a) * (b ? p.b : 100 - p.b) * p.selected[a + 2 * b]
      if (p.level === 2 && !a && !b) continue
      if (p.level === 4) mass *= b ? p.sensitivity : p.fpr
      denominator += mass
      if (p.level === 2 ? a && b : a) numerator += mass
      if (a) aMass += mass
      if (b) bMass += mass
    }
    if (p.level === 3) {
      const both = p.a * p.b * p.selected[3]
      return 100 * (both * denominator - aMass * bMass) / denominator ** 2
    }
    return 100 * numerator / denominator
  },
  render(p, skin) {
    const blocks = paragraph(`Before ${skin === 'inspection' ? 'inspection selection' : 'routing selection'}, properties A and B occur independently: P(A)=${p.a}% and P(B)=${p.b}%. A selection filter acts according to the exact table below. Selection rates are conditional on both properties; do not assume A and B remain independent after selection.`)
    blocks.push({ t: 'table', head: ['A present?', 'B present?', 'Selected %'], rows: p.selected.map((s, i) => [i % 2 ? 'Yes' : 'No', i >= 2 ? 'Yes' : 'No', String(s)]) })
    if (p.level === 4) blocks.push({ t: 'p', text: `Among selected items, a separate noisy B indicator is positive for ${p.sensitivity}% of items with B and ${p.fpr}% of items without B. Conditional on true B, its result is independent of A and the earlier selection event.` })
    blocks.push({ t: 'p', text: p.level === 1 ? 'Among selected items, what percentage have A?'
      : p.level === 2 ? 'An item is selected and has at least one of A or B. What is the probability, as a percentage, that it has both?'
      : p.level === 3 ? 'Within selected items, calculate 100 × [P(A and B) − P(A)P(B)]. This signed percentage-point gap measures the dependence induced by selection.'
      : 'An item is selected and its noisy B indicator is positive. What percentage probability should be assigned to A?' })
    return blocks
  },
  answer: () => ({ type: 'number', tolerance: precise }),
  misconceptions: [
    { id: 'ignore-selection', value: p => p.level === 2 ? p.a * p.b / (p.a + p.b - p.a * p.b / 100) : p.level === 3 ? 0 : p.a, feedback: () => 'The observed sample is filtered. Weight every source cell by its own chance of entering the observed sample before renormalizing.' },
    { id: 'unweighted-selection-cells', value: p => {
      const s = p.selected.map((mass, i) => mass * (p.level === 4 ? (i >= 2 ? p.sensitivity : p.fpr) / 100 : 1))
      const total = s.reduce((a, b) => a + b, 0)
      if (p.level === 2) return 100 * s[3] / (s[1] + s[2] + s[3])
      if (p.level === 3) return 100 * (s[3] / total - (s[1] + s[3]) * (s[2] + s[3]) / total ** 2)
      return 100 * (s[1] + s[3]) / total
    }, feedback: () => 'Selection percentages are not population counts. First account for how common each A/B combination is in the source population, then apply any later indicator and calculate the requested statistic.' },
  ],
  steps: [
    numberStep(() => 'What is the source-population probability that both A and B occur, as a percentage?', p => p.a * p.b / 100, () => 'Independence is given for the source population, so multiply its two marginal probabilities.'),
    numberStep(() => 'What percentage of the source population enters the selection filter’s output?', p => 100 * selectedCells(p).reduce((a, b) => a + b, 0), () => 'Multiply each of the four source cell masses by its own selection rate and sum.'),
    numberStep(() => 'What is the final requested conditional probability or signed dependence gap?', selectionAnswer, p => `Apply the final observation restriction and renormalize the relevant masses. The requested result is ${display(selectionAnswer(p))}.`),
  ],
  solution(p) { return paragraph(`Use four cells ordered (not A,not B), (A,not B), (not A,B), (A,B). Multiply each source probability by its selection rate. Their selected masses are ${selectedCells(p).map(display).join(', ')}. ${p.level === 2 ? 'Exclude the neither-property cell from the denominator, because at least one property is known.' : p.level === 3 ? 'Normalize all cells; subtract the product of selected marginals from the selected joint probability.' : p.level === 4 ? 'Multiply B cells by the indicator sensitivity and non-B cells by its false-positive rate, then normalize again.' : 'Divide the selected A mass by total selected mass.'} The requested result is ${display(selectionAnswer(p))}.`) },
}
