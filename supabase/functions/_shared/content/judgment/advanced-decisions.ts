import type { Template } from '../types.ts'
import { advancedLevels, advancedReview, precise, paragraph, display, numberStep } from './advanced-support.ts'

type Information = { level: number; prior: number; payoffs: number[][]; sensitivity: number; specificity: number; fee: number; secondFee: number }
function bestAction(p: Information, q: number): number {
  return Math.max(...p.payoffs.map(([high, low]) => q * high + (1 - q) * low))
}
function reportValue(p: Information, q: number, remaining: number): number {
  let value = 0
  for (const positive of [true, false]) {
    const high = (positive ? p.sensitivity : 100 - p.sensitivity) / 100
    const low = (positive ? 100 - p.specificity : p.specificity) / 100
    const probability = q * high + (1 - q) * low
    const posterior = q * high / probability
    let continuation = bestAction(p, posterior)
    if (remaining > 1) continuation = Math.max(continuation, reportValue(p, posterior, remaining - 1) - p.secondFee)
    value += probability * continuation
  }
  return value
}
function informationAnswer(p: Information): number {
  const q = p.prior / 100, before = bestAction(p, q)
  if (p.level === 1) return q * Math.max(...p.payoffs.map(x => x[0])) + (1 - q) * Math.max(...p.payoffs.map(x => x[1])) - before
  return Math.max(0, reportValue(p, q, p.level === 4 ? 2 : 1) - p.fee - before)
}

export const informationTemplate: Template<Information> = {
  id: 'judgment.expected-value.information-policy', version: 1, track: 'judgment', concept: 'judgment.expected-value', family: 'information-policy',
  status: 'draft', review: advancedReview, levels: advancedLevels, skins: ['production', 'dispatch'],
  sample(rng, level) {
    const safe = rng.int(5, 80)
    return { level, prior: rng.int(15, 85), payoffs: [[rng.int(100, 450), -rng.int(80, 350)], [safe, safe], ...(level >= 3 ? [[rng.int(50, 220), rng.int(-50, 50)]] : [])], sensitivity: rng.int(60, 95), specificity: rng.int(60, 95), fee: level >= 3 ? rng.int(2, 35) : 0, secondFee: rng.int(2, 40) }
  },
  solve: informationAnswer,
  verify(p) {
    const high = p.prior / 100, low = 1 - high
    const before = Math.max(...p.payoffs.map(pay => high * pay[0] + low * pay[1]))
    if (p.level === 1) {
      let best = -Infinity
      for (const highAction of p.payoffs) for (const lowAction of p.payoffs) best = Math.max(best, high * highAction[0] + low * lowAction[1])
      return best - before
    }
    const bestBranch = (highMass: number, lowMass: number): number => {
      let best = Math.max(...p.payoffs.map(pay => highMass * pay[0] + lowMass * pay[1]))
      if (p.level === 4) for (const positiveAction of p.payoffs) for (const negativeAction of p.payoffs) {
        const policy = highMass * (p.sensitivity / 100 * positiveAction[0] + (1 - p.sensitivity / 100) * negativeAction[0])
          + lowMass * ((1 - p.specificity / 100) * positiveAction[1] + p.specificity / 100 * negativeAction[1])
          - (highMass + lowMass) * p.secondFee
        best = Math.max(best, policy)
      }
      return best
    }
    let informed = 0
    for (const positive of [true, false]) informed += bestBranch(high * (positive ? p.sensitivity : 100 - p.sensitivity) / 100, low * (positive ? 100 - p.specificity : p.specificity) / 100)
    return Math.max(0, informed - p.fee - before)
  },
  render(p, skin) {
    const blocks = paragraph(`A ${skin === 'production' ? 'production manager' : 'dispatch coordinator'} must choose exactly one action for one job. The hidden demand state is High with probability ${p.prior}% and Low otherwise. Payoffs below are final net credits before any report fees; negative values are losses. Maximize expected credits, with no separate risk preference.`)
    blocks.push({ t: 'table', head: ['Action', 'Payoff if High', 'Payoff if Low'], rows: p.payoffs.map((pay, i) => ['ABC'[i], String(pay[0]), String(pay[1])]) })
    blocks.push({ t: 'p', text: p.level === 1 ? 'A perfect report would reveal the state before the action. What is the maximum fee worth paying for that report, in expected credits?'
      : `A binary report is positive with probability ${p.sensitivity}% if High and ${100 - p.specificity}% if Low. ${p.level === 2 ? 'The report is free.' : `The first report costs ${p.fee} credits.`} ${p.level === 4 ? `After its result, you may either act immediately or buy one second report for ${p.secondFee} credits and then act. Given the fixed true state, the two reports are independent and have identical accuracy. You can decide whether to buy the second report separately after a positive or negative first result.` : 'Choose an action after seeing the report.'} You may also skip all reports and act now. Relative to the best action without reports, what is the maximum improvement in expected net credits after all report fees?` })
    return blocks
  },
  answer: () => ({ type: 'number', unit: 'credits', tolerance: precise }),
  misconceptions: [
    { id: 'ignore-contingent-actions', value: () => 0, feedback: () => 'A report can change which action is chosen. Evaluate the best action separately after each possible report, then average those branch values.' },
    { id: 'best-payoff-is-expected-value', value: p => Math.max(...p.payoffs.flat()), feedback: () => 'The largest possible payoff is not an expected improvement. Weight all states and subtract the best available decision without information and any report fees.' },
  ],
  steps: [
    numberStep(() => 'What is the best expected payoff when acting now without a report?', p => bestAction(p, p.prior / 100), p => `Compare each action’s prior-weighted payoff; the maximum is ${display(bestAction(p, p.prior / 100))} credits.`),
    numberStep(p => p.level === 1 ? 'What is the expected payoff when the state is perfectly known before acting, before any fee?' : 'What is the expected payoff of the best report-contingent policy before the first-report fee?', p => p.level === 1 ? p.prior / 100 * Math.max(...p.payoffs.map(x => x[0])) + (1 - p.prior / 100) * Math.max(...p.payoffs.map(x => x[1])) : reportValue(p, p.prior / 100, p.level === 4 ? 2 : 1), () => 'Optimize within each information branch. A second report is useful only when its conditional expected gain exceeds its fee.'),
    numberStep(() => 'What is the maximum requested information value or net improvement?', informationAnswer, p => `Subtract the no-report benchmark and applicable fees, preserving the option to skip a report: ${display(informationAnswer(p))} credits.`),
  ],
  solution(p) { return paragraph(`Without information, choose the action with greatest prior expected payoff: ${display(bestAction(p, p.prior / 100))} credits. ${p.level === 1 ? 'With perfect information, choose the highest payoff separately in each state and average using the state probabilities.' : 'For each possible report, update the state probability with Bayes’ rule and choose the action with greatest conditional expected payoff. Weight these best branch values by the report probabilities.'} ${p.level === 4 ? 'Work backwards: in each first-report branch, compare acting immediately against buying a second report, paying its fee and then using its result optimally. The second fee is incurred only on branches that buy it.' : ''} Subtract the appropriate report fee and the no-information benchmark; a report can be declined. The requested value is ${display(informationAnswer(p))} credits.`) },
}

type Allocation = { level: number; risks: number[]; reduction: number[]; costs: number[]; limits: number[]; budget: number; harm: number[]; loss: number; target: number }
function benefits(p: Allocation): number[] { return p.risks.map((risk, i) => risk * p.reduction[i] / 1000 - (p.level === 3 ? p.harm[i] / 10 : 0)) }
function allocationAnswer(p: Allocation): number {
  const b = benefits(p)
  if (p.level === 1) return b[0] * p.limits[0] + b[1] * p.limits[1]
  if (p.level === 4) {
    let minimum = Infinity
    for (let x = 0; x <= p.limits[0]; x++) {
      const y = Math.max(0, Math.ceil((p.target - x * b[0] - 1e-10) / b[1]))
      if (y <= p.limits[1]) minimum = Math.min(minimum, x * p.costs[0] + y * p.costs[1])
    }
    return minimum
  }
  const coefficients = p.level === 3 ? b.map((value, i) => value * p.loss - p.costs[i]) : b
  let best = 0
  for (let x = 0; x <= p.limits[0] && x * p.costs[0] <= p.budget; x++) {
    const y = coefficients[1] > 0 ? Math.min(p.limits[1], Math.floor((p.budget - x * p.costs[0]) / p.costs[1])) : 0
    best = Math.max(best, x * coefficients[0] + y * coefficients[1])
  }
  return best
}

export const allocationTemplate: Template<Allocation> = {
  id: 'judgment.risk-framing.heterogeneous-allocation', version: 1, track: 'judgment', concept: 'judgment.risk-framing', family: 'heterogeneous-risk-allocation',
  status: 'draft', review: advancedReview, levels: advancedLevels, skins: ['equipment', 'deliveries'],
  sample(rng, level) {
    const risks = [rng.int(20, 300), rng.int(20, 300)], reduction = [rng.int(10, 80), rng.int(10, 80)], limits = [rng.int(4, 20), rng.int(4, 20)]
    const target = Math.round((risks[0] * reduction[0] * limits[0] + risks[1] * reduction[1] * limits[1]) / 1000 * rng.int(20, 70)) / 100
    return { level, risks, reduction, limits, costs: [rng.int(10, 90), rng.int(10, 90)], budget: rng.int(5, 25) * 20, harm: [rng.int(1, 40), rng.int(1, 40)], loss: rng.int(5, 50) * 20, target }
  },
  solve: allocationAnswer,
  verify(p) {
    const avoided = p.risks.map((risk, i) => 100 * (risk / 1000 - risk / 1000 * (1 - p.reduction[i] / 100)))
    if (p.level === 1) return p.limits.reduce((sum, n, i) => sum + n * avoided[i], 0)
    let best = p.level === 4 ? Infinity : 0
    for (let x = 0; x <= p.limits[0]; x++) for (let y = 0; y <= p.limits[1]; y++) {
      const cost = x * p.costs[0] + y * p.costs[1]
      const gross = x * avoided[0] + y * avoided[1]
      if (p.level === 4) {
        if (gross + 1e-9 >= p.target) best = Math.min(best, cost)
      } else if (cost <= p.budget) {
        const score = p.level === 3 ? (gross - (x * p.harm[0] + y * p.harm[1]) / 10) * p.loss - cost : gross
        best = Math.max(best, score)
      }
    }
    return best
  },
  render(p, skin) {
    const blocks = paragraph(`Two groups of ${skin === 'equipment' ? 'equipment units' : 'deliveries'} face failures over one fixed year. One protection crew covers exactly 100 previously unprotected units in one group for the whole year. Different crews cover disjoint units. Relative reductions multiply baseline failure risk; they are not percentage-point reductions. Expected failure counts add across units.`)
    blocks.push({ t: 'chart', kind: 'bar', title: 'Baseline failures before protection', xLabel: 'Group', yLabel: 'Failures per 1000 units per year', points: p.risks.map((value, i) => ({ label: 'AB'[i], value })) })
    blocks.push({ t: 'table', head: ['Group', 'Relative reduction %', 'Maximum crews', ...(p.level >= 2 ? ['Cost per crew, credits'] : []), ...(p.level === 3 ? ['Extra failures caused per 1000 protected units'] : [])], rows: p.risks.map((_, i) => ['AB'[i], String(p.reduction[i]), String(p.limits[i]), ...(p.level >= 2 ? [String(p.costs[i])] : []), ...(p.level === 3 ? [String(p.harm[i])] : [])]) })
    blocks.push({ t: 'p', text: p.level === 1 ? 'If every available crew is used, how many failures are expected to be avoided over the year?'
      : p.level === 2 ? `The budget is ${p.budget} credits. Crews are indivisible, and spending less than the budget is allowed. What is the maximum expected number of failures avoided?`
      : p.level === 3 ? `The budget is ${p.budget} credits. A failure costs ${p.loss} credits. Protection also causes the additional failures shown, which are separate from the baseline-risk reduction. What is the maximum expected net saving: avoided failure costs minus extra failure costs and crew spending? You may use no crews.`
      : `For robust planning, each shown baseline risk is a lower bound; the actual value can be up to 40 failures per 1000 higher. Effects and costs are fixed. What minimum total crew spending guarantees at least ${p.target} expected failures avoided even at the least favorable risks? There is no separate budget limit in this question.` })
    return blocks
  },
  answer: () => ({ type: 'number', tolerance: precise }),
  misconceptions: [
    { id: 'relative-reduction-as-absolute', value: p => p.limits.reduce((sum, n, i) => sum + n * p.reduction[i], 0), feedback: () => 'A relative reduction applies to the baseline risk, not to every protected unit. Convert the risk per 1000 into the expected count per 100 units before allocating crews.' },
    { id: 'fractional-or-unvalued-protection', value: p => p.level === 4 ? p.target / benefits(p)[0] * p.costs[0] : p.level === 3 ? p.limits.reduce((sum, n, i) => sum + n * benefits(p)[i], 0) : p.risks.reduce((sum, risk, i) => sum + risk * p.limits[i] / 10, 0), feedback: () => 'Keep units consistent and respect indivisible crews and group capacities. Net savings also require valuing each avoided failure and subtracting protection costs.' },
  ],
  steps: [
    numberStep(() => 'How many baseline failures does one crew in group A prevent, before any protection-caused failures?', p => p.risks[0] * p.reduction[0] / 1000, () => 'Multiply 100 protected units by baseline risk per unit and the relative reduction.'),
    numberStep(() => 'How many baseline failures does one crew in group B prevent, before any protection-caused failures?', p => p.risks[1] * p.reduction[1] / 1000, () => 'The same relative percentage can yield different absolute benefit at a different baseline risk.'),
    numberStep(() => 'What is the final requested optimal count, net saving, or minimum spending?', allocationAnswer, p => `Compare feasible whole-crew allocations using the stated objective. The optimum value is ${display(allocationAnswer(p))}.`),
  ],
  solution(p) { return paragraph(`One crew prevents ${display(p.risks[0] * p.reduction[0] / 1000)} expected failures in A and ${display(p.risks[1] * p.reduction[1] / 1000)} in B. ${p.level === 1 ? 'Multiply those values by the available crew counts and add.' : p.level === 4 ? `The least favorable risk is each group’s lower bound. Choose whole counts x≤${p.limits[0]}, y≤${p.limits[1]} whose combined guaranteed benefit reaches ${p.target}, minimizing ${p.costs[0]}x+${p.costs[1]}y. A fractional crew cannot meet a guarantee.` : `Choose whole counts within group capacities and ${p.costs[0]}x+${p.costs[1]}y≤${p.budget}. ${p.level === 3 ? `Value the reduction minus additional failures at ${p.loss} credits per failure, then subtract crew costs.` : 'Maximize their combined absolute benefit; baseline risk alone is not benefit per credit.'}`} The requested optimum is ${display(allocationAnswer(p))}.`) },
}

type Reliability = { level: number; storm: number; normal: number[]; severe: number[]; sensitivity: number; fpr: number }
function failureEvent(rates: number[], level: number): number {
  if (level === 1) return rates[0] * rates[1]
  if (level === 2) return rates[0] * (1 - (1 - rates[1]) * (1 - rates[2]))
  if (level === 4) return (1 - rates.slice(0, 3).reduce((p, r) => p * (1 - r), 1)) * (1 - rates.slice(3).reduce((p, r) => p * (1 - r), 1))
  let distribution = [1]
  for (const rate of rates) {
    const next = Array.from({ length: distribution.length + 1 }, () => 0)
    for (let k = 0; k < distribution.length; k++) {
      next[k] += distribution[k] * (1 - rate)
      next[k + 1] += distribution[k] * rate
    }
    distribution = next
  }
  return distribution.slice(3).reduce((a, b) => a + b, 0)
}
function reliabilityAnswer(p: Reliability): number {
  let stormWeight = p.storm / 100, normalWeight = 1 - stormWeight
  if (p.level === 4) { stormWeight *= p.sensitivity / 100; normalWeight *= p.fpr / 100 }
  const normal = p.normal.map(r => r / 100), severe = p.severe.map(r => r / 100)
  const numerator = normalWeight * failureEvent(normal, p.level) + stormWeight * failureEvent(severe, p.level)
  const denominator = p.level === 2 ? normalWeight * normal[0] + stormWeight * severe[0] : normalWeight + stormWeight
  return 100 * numerator / denominator
}

export const commonCauseTemplate: Template<Reliability> = {
  id: 'judgment.independence.common-cause-networks', version: 1, track: 'judgment', concept: 'judgment.independence', family: 'common-cause-networks',
  status: 'draft', review: advancedReview, levels: advancedLevels, skins: ['communications', 'pumping'],
  sample(rng, level) {
    const count = [2, 3, 5, 6][level - 1]
    return { level, storm: rng.int(5, 60), normal: Array.from({ length: count }, () => rng.int(2, 35)), severe: Array.from({ length: count }, () => rng.int(40, 85)), sensitivity: rng.int(60, 95), fpr: rng.int(5, 35) }
  },
  solve: reliabilityAnswer,
  verify(p) {
    let selected = 0, failed = 0
    for (let state = 0; state < 2; state++) {
      const rates = state ? p.severe : p.normal
      let environment = (state ? p.storm : 100 - p.storm) / 100
      if (p.level === 4) environment *= (state ? p.sensitivity : p.fpr) / 100
      for (let mask = 0; mask < 2 ** rates.length; mask++) {
        const bits = rates.map((_, i) => !!(mask & (1 << i)))
        if (p.level === 2 && !bits[0]) continue
        let mass = environment
        for (let i = 0; i < rates.length; i++) mass *= (bits[i] ? rates[i] : 100 - rates[i]) / 100
        selected += mass
        const event = p.level === 1 ? bits.every(Boolean) : p.level === 2 ? bits.filter(Boolean).length >= 2 : p.level === 3 ? bits.filter(Boolean).length >= 3 : bits.slice(0, 3).some(Boolean) && bits.slice(3).some(Boolean)
        if (event) failed += mass
      }
    }
    return 100 * failed / selected
  },
  render(p, skin) {
    const blocks = paragraph(`A ${skin === 'communications' ? 'communications network' : 'pumping network'} operates for one specified day. A single shared environment is Severe with probability ${p.storm}% and Normal otherwise. Given the environment, all component failures are independent. Without conditioning on the environment, independence is not assumed. The chart gives exact component failure percentages for that day.`)
    blocks.push({ t: 'chart', kind: 'bar', title: 'Component failure risk by shared environment', xLabel: 'Component and environment', yLabel: 'Failure probability', unit: '%', points: p.normal.flatMap((value, i) => [{ label: `${'ABCDEF'[i]} Normal`, value }, { label: `${'ABCDEF'[i]} Severe`, value: p.severe[i] }]) })
    blocks.push({ t: 'p', text: p.level === 1 ? 'What is the probability that both components fail, as a percentage?'
      : p.level === 2 ? 'Component A is known to have failed. What is the conditional probability that at least two of the three components failed, as a percentage?'
      : p.level === 3 ? 'The network fails if at least three of its five components fail. What is the probability of network failure, as a percentage?'
      : `There are two parallel paths: A–B–C and D–E–F. A path works only if all three of its components work; the network works if either path works. A separate environment alarm is positive with probability ${p.sensitivity}% in Severe conditions and ${p.fpr}% in Normal conditions. Given the environment, the alarm is independent of component failures. The alarm is positive. What is the conditional probability that the network fails, as a percentage?` })
    return blocks
  },
  answer: () => ({ type: 'number', unit: '%', tolerance: precise }),
  misconceptions: [
    { id: 'independence-after-mixing', value: p => { const marginal = p.normal.map((r, i) => ((100 - p.storm) * r + p.storm * p.severe[i]) / 10000); return 100 * failureEvent(marginal, p.level) / (p.level === 2 ? marginal[0] : 1) }, feedback: () => 'The shared environment induces dependence. Compute a whole network or observation event within each environment, then mix those event probabilities.' },
    { id: 'ignore-severe-environment', value: p => 100 * failureEvent(p.normal.map(r => r / 100), p.level) / (p.level === 2 ? p.normal[0] / 100 : 1), feedback: () => 'Normal conditions are only one branch. Severe conditions can carry disproportionate probability after a failure or positive alarm is observed.' },
  ],
  steps: [
    numberStep(p => p.level === 2 ? 'What is the joint probability of A failing and at least two components failing, given Normal conditions?' : 'What is the requested network-failure event probability given Normal conditions, as a decimal?', p => failureEvent(p.normal.map(r => r / 100), p.level), () => 'Use the stated network structure and independence only inside this fixed environment.'),
    numberStep(p => p.level === 2 ? 'What is the same joint event probability given Severe conditions?' : 'What is the requested network-failure event probability given Severe conditions, as a decimal?', p => failureEvent(p.severe.map(r => r / 100), p.level), () => 'Repeat the event calculation with the Severe component risks.'),
    numberStep(() => 'What is the final requested unconditional or conditional failure percentage?', reliabilityAnswer, p => `Mix the two environment branches, including the observed failure or alarm in both numerator and denominator: ${display(reliabilityAnswer(p))}%.`),
  ],
  solution(p) { return paragraph(`Within each shared environment, compute the entire failure event before mixing. ${p.level === 1 ? 'For two components, multiply their conditional failure probabilities.' : p.level === 2 ? 'Given A fails, a second failure means B or C fails. Compute the joint event A and (B or C), then divide the mixed joint mass by the mixed probability of A failing.' : p.level === 3 ? 'Build the conditional distribution of the failure count by multiplying the component success/failure polynomials, and sum counts three through five.' : 'Each series path fails if any of its three components fails; the parallel network fails if both paths fail. The positive alarm updates the two environment weights before normalization.'} The final result is ${display(reliabilityAnswer(p))}%. Multiplying unconditional component risks would incorrectly discard the common cause.`) },
}
