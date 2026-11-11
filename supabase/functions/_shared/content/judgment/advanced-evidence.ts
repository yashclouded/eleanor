import type { Template } from '../types.ts'
import { advancedLevels, advancedReview, precise, paragraph, display, numberStep } from './advanced-support.ts'

type Tests = { level: number; prior: number; positive: number[][]; third: number[][]; threshold: number }
function likelihood(p: Tests, h: number): number {
  const [a, b, c] = p.positive[h].map(x => x / 100)
  const [d, e] = p.third[h].map(x => x / 100)
  if (p.level === 1) return a * b
  if (p.level === 2) return a + (1 - a) * c
  if (p.level === 3) return a * (b + (1 - b) * e) + (1 - a) * c * d
  return a * (1 - b) * (1 - e) + (1 - a) * c * (1 - d) + (1 - a) * (1 - c) * e
}
function testsAnswer(p: Tests): number {
  const d = likelihood(p, 0), n = likelihood(p, 1)
  if (p.level === 4) return 100 * p.threshold * n / ((100 - p.threshold) * d + p.threshold * n)
  return 100 * p.prior * d / (p.prior * d + (100 - p.prior) * n)
}

export const dependentTestsTemplate: Template<Tests> = {
  id: 'judgment.base-rate.dependent-evidence', version: 1, track: 'judgment', concept: 'judgment.base-rates', family: 'dependent-evidence',
  status: 'draft', review: advancedReview, levels: advancedLevels, skins: ['components', 'messages'],
  sample: (rng, level) => ({ level, prior: rng.int(2, 40), positive: [[rng.int(55, 95), rng.int(55, 95), rng.int(20, 60)], [rng.int(5, 40), rng.int(15, 60), rng.int(5, 35)]], third: [[rng.int(60, 95), rng.int(25, 70)], [rng.int(10, 50), rng.int(5, 35)]], threshold: rng.int(60, 95) }),
  solve: testsAnswer,
  verify(p) {
    const pathMass = [0, 0]
    for (let h = 0; h < 2; h++) for (let mask = 0; mask < (p.level <= 2 ? 4 : 8); mask++) {
      const first = mask & 1, second = (mask >> 1) & 1, third = (mask >> 2) & 1
      const count = Number(!!first) + Number(!!second) + Number(!!third)
      if (p.level === 1 && count !== 2 || p.level === 2 && count === 0 || p.level === 3 && count < 2 || p.level === 4 && count !== 1) continue
      let mass = (first ? p.positive[h][0] : 100 - p.positive[h][0]) / 100
      const chanceSecond = p.positive[h][first ? 1 : 2]
      mass *= (second ? chanceSecond : 100 - chanceSecond) / 100
      if (p.level >= 3) {
        const chanceThird = p.third[h][second ? 0 : 1]
        mass *= (third ? chanceThird : 100 - chanceThird) / 100
      }
      pathMass[h] += mass
    }
    if (p.level === 4) {
      let lo = 0, hi = 1
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2
        if (100 * mid * pathMass[0] / (mid * pathMass[0] + (1 - mid) * pathMass[1]) < p.threshold) lo = mid
        else hi = mid
      }
      return 50 * (lo + hi)
    }
    const prior = p.prior / 100
    return 100 * pathMass[0] * prior / (pathMass[0] * prior + pathMass[1] * (1 - prior))
  },
  render(p, skin) {
    const blocks = paragraph(`An invented screening system flags ${skin === 'components' ? 'faulty components' : 'unwanted messages'}. Let D mean the item truly belongs to the flagged category. ${p.level === 4 ? 'Its initial prevalence is unknown.' : `Before testing, P(D)=${p.prior}%.`} Test results are dependent. The following are exact conditional positive-result percentages, separately for D and not D.`)
    blocks.push({ t: 'table', head: ['Condition', 'If D: positive %', 'If not D: positive %'], rows: [
      ['Test 1', String(p.positive[0][0]), String(p.positive[1][0])],
      ['Test 2, given Test 1 positive', String(p.positive[0][1]), String(p.positive[1][1])],
      ...(p.level >= 2 ? [['Test 2, given Test 1 negative', String(p.positive[0][2]), String(p.positive[1][2])]] : []),
      ...(p.level >= 3 ? [['Test 3, given Test 2 positive', String(p.third[0][0]), String(p.third[1][0])], ['Test 3, given Test 2 negative', String(p.third[0][1]), String(p.third[1][1])]] : []),
    ] })
    if (p.level >= 3) blocks.push({ t: 'p', text: 'Given the true D status and Test 2’s result, Test 3 is independent of Test 1. Thus the table fully specifies each result path.' })
    blocks.push({ t: 'p', text: p.level === 1 ? 'Both tests are positive. What is P(D) after those results, as a percentage?'
      : p.level === 2 ? 'At least one of the two tests is positive. What is P(D) given only that event, as a percentage?'
      : p.level === 3 ? 'At least two of the three tests are positive; their order is not reported. What is P(D), as a percentage?'
      : `Exactly one of the three tests is positive; its identity is not reported. What is the minimum initial prevalence percentage for the posterior probability of D to be at least ${p.threshold}%?` })
    return blocks
  },
  answer: () => ({ type: 'number', unit: '%', tolerance: precise }),
  misconceptions: [
    { id: 'ignore-evidence-or-threshold', value: p => p.level === 4 ? p.threshold : p.prior, feedback: () => 'The observed result event changes the relative mass of D and not D. Compute that event’s likelihood in both populations before updating or solving for the prior.' },
    { id: 'likelihood-ratio-as-posterior', value: p => p.level === 4 ? p.threshold * likelihood(p, 1) / likelihood(p, 0) : 100 * likelihood(p, 0) / (likelihood(p, 0) + likelihood(p, 1)), feedback: () => 'Likelihoods are not posterior probabilities. Include the two prior weights and normalize, or convert the posterior target to odds before solving for the required prior.' },
  ],
  steps: [
    numberStep(() => 'What is the probability of the reported result event given D, as a decimal?', p => likelihood(p, 0), p => `Sum the qualifying D paths to obtain ${display(likelihood(p, 0))}.`),
    numberStep(() => 'What is the probability of the same reported result event given not D, as a decimal?', p => likelihood(p, 1), p => `Use the not-D conditional rates; the likelihood is ${display(likelihood(p, 1))}.`),
    numberStep(() => 'What is the requested posterior percentage or minimum prior percentage?', testsAnswer, p => `Use Bayes’ rule with both event likelihoods: ${display(testsAnswer(p))}%.`),
  ],
  solution(p) { return paragraph(`First enumerate only the paths consistent with the reported event; each next-test probability is conditioned on the previous result and true D status. The event likelihood is ${display(likelihood(p, 0))} for D and ${display(likelihood(p, 1))} for not D. ${p.level === 4 ? `Writing the desired posterior as t=${p.threshold / 100}, solve pL_D/[pL_D+(1−p)L_notD]≥t for p. The minimum prevalence is ${display(testsAnswer(p))}%.` : `Weight the likelihoods by prior probabilities ${p.prior}% and ${100 - p.prior}%, then divide D’s weighted mass by their sum. The posterior is ${display(testsAnswer(p))}%.`} Squaring a marginal positive rate would wrongly impose independence.`) },
}

type Hypotheses = { level: number; weights: number[]; first: number[]; second: number[]; third: number[]; target: number }
function evidenceWeights(p: Hypotheses): number[] {
  return p.first.map((first, i) => first / 100 * (p.level >= 2 ? p.second[i] / 100 : 1) * (p.level >= 3 ? (100 - p.third[i]) / 100 : 1))
}
function hypothesisAnswer(p: Hypotheses): number {
  const l = evidenceWeights(p)
  if (p.level === 4) {
    const alternative = (p.weights[1] * l[1] + p.weights[2] * l[2]) / (p.weights[1] + p.weights[2])
    return p.target / (100 - p.target) * alternative / l[0]
  }
  const w = l.map((value, i) => value * p.weights[i])
  if (p.level === 2) return w[0] / (w[1] + w[2])
  return 100 * w[0] / w.reduce((a, b) => a + b, 0)
}

export const competingHypothesesTemplate: Template<Hypotheses> = {
  id: 'judgment.odds.competing-hypotheses', version: 1, track: 'judgment', concept: 'judgment.odds', family: 'competing-hypotheses',
  status: 'draft', review: advancedReview, levels: advancedLevels, skins: ['sensors', 'sorting'],
  sample: (rng, level) => ({ level, weights: Array.from({ length: 3 }, () => rng.int(1, 30)), first: [rng.int(45, 95), rng.int(10, 70), rng.int(5, 60)], second: Array.from({ length: 3 }, () => rng.int(10, 90)), third: Array.from({ length: 3 }, () => rng.int(10, 90)), target: rng.int(60, 95) }),
  solve: hypothesisAnswer,
  verify(p) {
    const priorTotal = p.weights.reduce((a, b) => a + b, 0)
    let posterior = p.weights.map(w => w / priorTotal)
    for (const rates of [p.first, ...(p.level >= 2 ? [p.second] : []), ...(p.level >= 3 ? [p.third.map(x => 100 - x)] : [])]) {
      posterior = posterior.map((weight, i) => weight * rates[i] / 100)
      const total = posterior.reduce((a, b) => a + b, 0)
      posterior = posterior.map(value => value / total)
    }
    if (p.level === 2) return posterior[0] / (posterior[1] + posterior[2])
    if (p.level < 4) return 100 * posterior[0]
    const before = p.weights[0] / (p.weights[1] + p.weights[2])
    const observed = posterior[0] / (1 - posterior[0])
    const factor = observed / before
    return p.target / (100 - p.target) / factor
  },
  render(p, skin) {
    const blocks = paragraph(`${skin === 'sensors' ? 'An instrument can be in modes A, B or C' : 'An item can come from lines A, B or C'}. These are mutually exclusive and exhaustive hypotheses. ${p.level === 4 ? `Conditional on not A, the prior odds B:C are ${p.weights[1]}:${p.weights[2]}; the prior odds A:not A are unknown.` : `Prior odds A:B:C are ${p.weights.join(':')}.`} All percentages in the table are conditional probabilities of a positive report, not posterior probabilities.`)
    blocks.push({ t: 'table', head: ['Hypothesis', 'Report 1 positive %', ...(p.level >= 2 ? ['Report 2 positive given Report 1 positive %'] : []), ...(p.level >= 3 ? ['Report 3 positive given first two positive %'] : [])], rows: p.weights.map((_, i) => ['ABC'[i], String(p.first[i]), ...(p.level >= 2 ? [String(p.second[i])] : []), ...(p.level >= 3 ? [String(p.third[i])] : [])]) })
    blocks.push({ t: 'p', text: p.level === 1 ? 'Report 1 is positive. What is the posterior probability of A, as a percentage?'
      : p.level === 2 ? 'Reports 1 and 2 are positive. What are the posterior odds A:(B or C), expressed as a single ratio P(A)/[P(B)+P(C)]?'
      : p.level === 3 ? 'Reports 1 and 2 are positive, then Report 3 is negative. What is the posterior probability of A, as a percentage? The conditional rates already account for dependence between reports.'
      : `Reports 1 and 2 are positive, then Report 3 is negative. What minimum prior odds ratio A/(B or C) is required for the posterior probability of A to reach ${p.target}%? Keep the given B:C mix fixed.` })
    return blocks
  },
  answer: () => ({ type: 'number', tolerance: precise }),
  misconceptions: [
    { id: 'equal-hypothesis-priors', value: p => { const l = evidenceWeights(p); return p.level === 2 ? l[0] / (l[1] + l[2]) : p.level === 4 ? p.target / (100 - p.target) : 100 * l[0] / l.reduce((a, b) => a + b, 0) }, feedback: () => 'Different prior hypothesis weights must be carried through the evidence update. For a composite alternative, preserve its specified internal mixture.' },
    { id: 'discard-third-hypothesis', value: p => { const l = evidenceWeights(p); return p.level === 4 ? p.target / (100 - p.target) * l[1] / l[0] : p.level === 2 ? p.weights[0] * l[0] / (p.weights[1] * l[1]) : 100 * p.weights[0] * l[0] / (p.weights[0] * l[0] + p.weights[1] * l[1]) }, feedback: () => 'The requested comparison includes both remaining alternatives. Keep C’s weighted likelihood in the composite not-A alternative.' },
  ],
  steps: [
    numberStep(() => 'What is the likelihood of the full observed report sequence under A, as a decimal?', p => evidenceWeights(p)[0], p => `Multiply the stated conditional rates along the actual sequence: ${display(evidenceWeights(p)[0])}.`),
    numberStep(p => p.level === 4 ? 'What is the likelihood of the report sequence under not A, using the specified B:C mix?' : 'What is the combined unnormalized weight of all hypotheses after the reports?', p => { const l = evidenceWeights(p); return p.level === 4 ? (p.weights[1] * l[1] + p.weights[2] * l[2]) / (p.weights[1] + p.weights[2]) : l.reduce((sum, value, i) => sum + value * p.weights[i], 0) }, () => 'A composite alternative is a weighted mixture, not whichever single alternative is easiest to calculate.'),
    numberStep(() => 'What is the final requested posterior percentage or odds ratio?', hypothesisAnswer, p => `Normalize for a probability, take a ratio for odds, or invert the Bayes factor for a prior threshold: ${display(hypothesisAnswer(p))}.`),
  ],
  solution(p) { const l = evidenceWeights(p); return paragraph(`The observed-sequence likelihoods under A, B and C are ${l.map(display).join(', ')}. ${p.level === 4 ? `The composite not-A likelihood is [${p.weights[1]}×${display(l[1])}+${p.weights[2]}×${display(l[2])}]/${p.weights[1] + p.weights[2]}. Divide the target posterior odds ${p.target}/(${100 - p.target}) by A’s likelihood ratio against that mixture.` : `Multiply each likelihood by its own prior weight. ${p.level === 2 ? 'Posterior A:(B or C) odds are A’s weight divided by the sum of B’s and C’s weights.' : 'Divide A’s weight by the sum of all three weights, then multiply by 100.'}`} The result is ${display(hypothesisAnswer(p))}.`) },
}

type Precision = { level: number; mean: number; variance: number; scores: number[]; errors: number[]; biases: number[]; futureBias: number; futureScale: number; target: number }
function posteriorMean(p: Precision): number {
  const totalPrecision = 1 / p.variance + p.errors.reduce((sum, variance) => sum + 1 / variance, 0)
  return (p.mean / p.variance + p.scores.reduce((sum, score, i) => sum + (score - p.biases[i]) / p.errors[i], 0)) / totalPrecision
}
function precisionAnswer(p: Precision): number {
  const mean = posteriorMean(p)
  if (p.level === 4) {
    const precision = 1 / p.variance + p.errors.reduce((sum, v) => sum + 1 / v, 0)
    return p.biases[0] + p.errors[0] * (p.target * precision - p.mean / p.variance - p.scores.slice(1).reduce((sum, score, i) => sum + (score - p.biases[i + 1]) / p.errors[i + 1], 0))
  }
  return p.level === 3 ? p.futureScale * mean + p.futureBias : mean
}

export const precisionTemplate: Template<Precision> = {
  id: 'judgment.regression.precision-updates', version: 1, track: 'judgment', concept: 'judgment.regression', family: 'precision-updates',
  status: 'draft', review: advancedReview, levels: advancedLevels, skins: ['machines', 'batches'],
  sample(rng, level) {
    const mean = rng.int(30, 100)
    const count = level === 1 ? 2 : 3
    return { level, mean, variance: rng.int(2, 25) * 10, scores: Array.from({ length: count }, () => mean + rng.int(-20, 60)), errors: Array.from({ length: count }, () => rng.int(2, 40) * 10), biases: Array.from({ length: count }, () => level === 1 ? 0 : rng.int(-10, 15)), futureBias: rng.int(5, 35), futureScale: rng.int(11, 20) / 10, target: mean + rng.int(5, 35) }
  },
  solve: precisionAnswer,
  verify(p) {
    let mean = p.mean, variance = p.variance
    const observations = p.scores.slice()
    if (p.level === 4) {
      // Solve the linear derivative of the combined Gaussian log density at the desired mean.
      let derivative = (p.target - p.mean) / p.variance
      for (let i = 1; i < observations.length; i++) derivative += (p.target - observations[i] + p.biases[i]) / p.errors[i]
      return p.target + p.biases[0] + p.errors[0] * derivative
    }
    for (let i = 0; i < observations.length; i++) {
      const weight = variance / (variance + p.errors[i])
      mean += weight * (observations[i] - p.biases[i] - mean)
      variance *= 1 - weight
    }
    return p.level === 3 ? p.futureScale * mean + p.futureBias : mean
  },
  render(p, skin) {
    const blocks = paragraph(`The stable true quality θ of ${skin === 'machines' ? 'a machine' : 'a batch'} follows a Normal population model with mean ${p.mean} and variance ${p.variance} points². Each measurement equals θ plus its stated bias plus independent Normal error with mean zero and stated variance. Errors are independent of θ and of one another. All model parameters are known; selection on an observed score does not make it the true quality.`)
    blocks.push({ t: 'table', head: ['Measurement', 'Observed score', 'Known bias', 'Error variance'], rows: p.scores.map((score, i) => [String(i + 1), p.level === 4 && i === 0 ? 'Unknown' : String(score), String(p.biases[i]), String(p.errors[i])]) })
    if (p.level === 3) blocks.push({ t: 'p', text: `A new calibrated instrument reports ${p.futureScale}×θ + ${p.futureBias} plus fresh zero-mean noise.` })
    blocks.push({ t: 'p', text: p.level === 3 ? 'What is the expected score on the new instrument, given all measurements?'
      : p.level === 4 ? `What value must Measurement 1 have for the posterior mean of θ, given all measurements, to equal ${p.target}?`
      : 'What is the expected stable true quality θ given all measurements? Use measurement variances, not standard deviations, to determine precision.' })
    return blocks
  },
  answer: () => ({ type: 'number', unit: 'points', tolerance: precise }),
  misconceptions: [
    { id: 'ignore-measurement-precision-or-prior', value: p => p.level === 4 ? p.biases[0] + p.errors[0] * (p.target * p.errors.reduce((sum, v) => sum + 1 / v, 0) - p.scores.slice(1).reduce((sum, score, i) => sum + (score - p.biases[i + 1]) / p.errors[i + 1], 0)) : p.scores.reduce((a, b) => a + b, 0) / p.scores.length, feedback: () => 'Noisy scores do not have equal precision, and the population distribution also supplies information. Correct biases before combining inverse-variance weights.' },
    { id: 'complete-population-reversion', value: p => p.level === 3 ? p.futureScale * p.mean + p.futureBias : p.mean, feedback: () => 'Regression toward the population mean is partial. Finite-precision measurements still change the expected true quality.' },
  ],
  steps: [
    numberStep(() => 'What is the prior precision, the reciprocal of the true-quality variance?', p => 1 / p.variance, () => 'Precision is one divided by variance. Standard deviation is not the denominator.'),
    numberStep(() => 'What is the combined precision after all measurements?', p => 1 / p.variance + p.errors.reduce((sum, variance) => sum + 1 / variance, 0), () => 'Independent measurements add their precisions to the prior precision.'),
    numberStep(() => 'What is the requested expected score or missing measurement?', precisionAnswer, p => `Weight each bias-corrected score by precision and use the requested transformation or inverse equation: ${display(precisionAnswer(p))}.`),
  ],
  solution(p) { return paragraph(`The posterior precision is T=1/${p.variance}+${p.errors.map(v => `1/${v}`).join('+')}. The posterior mean is [${p.mean}/${p.variance}+Σ(observation−bias)/error variance]/T. ${p.level === 4 ? `Set this mean to ${p.target} and isolate the unknown first observation; it is ${display(precisionAnswer(p))}.` : `The posterior mean is ${display(posteriorMean(p))}. ${p.level === 3 ? `Apply the new instrument’s scale and intercept to that expectation: ${p.futureScale}×${display(posteriorMean(p))}+${p.futureBias}=${display(precisionAnswer(p))}.` : 'This is a model-based conditional expectation, not a guarantee for the next measurement.'}`}`) },
}
