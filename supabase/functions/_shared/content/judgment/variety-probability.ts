import type { Block, Option, Rng, Template } from '../types.ts'

const review = { author: 'GPT-6', reviewer: null, reviewedAt: null }
const exact = { abs: 0.000001 }
const levels = [1, 2, 3, 4].map(level => ({ level, initialRating: 500 + 400 * level }))
const paragraph = (text: string): Block[] => [{ t: 'p', text }]
const display = (value: number): string => String(Number(value.toFixed(6)))
function shuffled(rng: Rng): number[] {
  const order = [0, 1, 2, 3, 4, 5]
  for (let i = 5; i > 0; i--) { const j = rng.int(0, i); [order[i], order[j]] = [order[j], order[i]] }
  return order
}

type Host = { level: number; weights: number[]; open: number; chooseB: number; informed: number; offerSelected: number; offerOther: number }
function hostWeights(p: Host): [number, number] {
  const openChance = (p.open === 1 ? p.chooseB : 100 - p.chooseB) / 100
  const knows = p.informed / 100
  const selected = p.weights[0] * openChance * p.offerSelected / 100
  const switched = p.weights[3 - p.open] * (knows + (1 - knows) * openChance) * p.offerOther / 100
  return [selected, switched]
}
function hostAnswer(p: Host): number { const [a, b] = hostWeights(p); return 100 * b / (a + b) }
export const hostProtocolTemplate: Template<Host> = {
  id: 'judgment.conditional.variety.host-protocol', version: 1, track: 'judgment', concept: 'judgment.conditional', family: 'host-observation-protocol',
  status: 'draft', review, levels, skins: ['doors', 'lockers'], dailyLevels: [2, 3],
  sample: (rng, level) => ({ level, weights: level === 1 ? [1, 1, 1] : [rng.int(1, 30), rng.int(1, 30), rng.int(1, 30)], open: rng.int(1, 2), chooseB: rng.int(1, 99), informed: level >= 3 ? rng.int(0, 100) : 100, offerSelected: level === 4 ? rng.int(10, 90) : 100, offerOther: level === 4 ? rng.int(10, 90) : 100 }),
  solve: hostAnswer,
  verify(p) {
    let evidence = 0, win = 0
    for (let prize = 0; prize < 3; prize++) for (const knows of [false, true]) for (const opened of [1, 2]) {
      const mode = knows ? p.informed / 100 : 1 - p.informed / 100
      let opening = (opened === 1 ? p.chooseB : 100 - p.chooseB) / 100
      if (knows && prize !== 0) opening = opened === prize ? 0 : 1
      if (opened !== p.open || opened === prize) continue
      const mass = p.weights[prize] * mode * opening * (prize === 0 ? p.offerSelected : p.offerOther) / 100
      evidence += mass
      if (prize === 3 - p.open) win += mass
    }
    return 100 * win / evidence
  },
  render: (p, skin) => [
    ...paragraph(`One prize is hidden in ${skin === 'doors' ? 'door' : 'locker'} A, B or C. Their prior probability weights are ${p.weights.join(':')}; divide each weight by their sum for its probability. You initially select A.`),
    ...paragraph(`The host is informed about the prize location with probability ${p.informed}%, independently of its location. An informed host always opens an empty unselected ${skin === 'doors' ? 'door' : 'locker'}. If both B and C are empty, the host chooses B with probability ${p.chooseB}% and C otherwise. An uninformed host chooses B with probability ${p.chooseB}% and C otherwise, regardless of the prize; revealing a prize ends that game without a switching offer.`),
    ...(p.level === 4 ? paragraph(`After an empty opening, a separate offer coin is tossed: a switching offer is made with probability ${p.offerSelected}% if A holds the prize, and ${p.offerOther}% otherwise. Conditional on the prize location, the offer coin is independent of the host's information and opening choices.`) : paragraph('After any empty opening, a switching offer is always made.')),
    ...paragraph(`You observe ${p.open === 1 ? 'B' : 'C'} opened and empty, and receive a switching offer. What is the probability of winning by switching to ${p.open === 1 ? 'C' : 'B'}, as a percentage? Condition on this exact opening and the offer, not just on there being two closed choices.`),
  ],
  answer: () => ({ type: 'number', unit: '%', tolerance: exact }),
  misconceptions: [
    { id: 'ignore-how-opening-was-selected', value: p => 100 * p.weights[3 - p.open] / (p.weights[0] + p.weights[3 - p.open]), feedback: () => 'An empty opening can be more likely under one prize location than another. Weight each surviving prize location by the probability of the exact opening and offer under that location.' },
    { id: 'apply-classic-two-thirds-unconditionally', value: () => 200 / 3, feedback: () => 'The familiar two-thirds result assumes a particular prior and informed-host protocol. Recompute the observation likelihood when host knowledge, opening bias or offers change.' },
  ],
  steps: [
    { prompt: () => paragraph('What is the prior probability that A contains the prize, as a decimal?'), answer: p => p.weights[0] / p.weights.reduce((a, b) => a + b, 0), tolerance: exact, explain: () => paragraph('Normalise the prior weights before observing the host.') },
    { prompt: () => paragraph('What is the probability of the exact observed empty opening and offer, as a decimal?'), answer: p => hostWeights(p).reduce((a, b) => a + b, 0) / p.weights.reduce((a, b) => a + b, 0), tolerance: exact, explain: () => paragraph('Sum the prior-weighted likelihoods over A and the unopened alternative. The opened location cannot contain the prize under this observation.') },
    { prompt: () => paragraph('What is the conditional switching-win probability as a percentage?'), answer: hostAnswer, tolerance: exact, explain: p => paragraph(`Normalise the unopened alternative's evidence weight: ${display(hostAnswer(p))}%.`) },
  ],
  solution: p => { const [selected, switched] = hostWeights(p); return paragraph(`Only A and ${p.open === 1 ? 'C' : 'B'} survive the empty opening. Their prior-weighted observation-and-offer likelihoods are ${display(selected)} and ${display(switched)}. An informed host is forced to open the other empty location when your initial selection is wrong; an uninformed host is not. Conditional switching probability = 100 × ${display(switched)}/(${display(selected)} + ${display(switched)}) = ${display(hostAnswer(p))}%.`) },
}

type Reporting = { level: number; first: number; second: number; chooseFirst: number; archiveFirst: number; archiveOther: number; target: number; order: number[] }
const protocolNames = [
  'Inspect a fixed pair and retain it exactly when at least one trial succeeds.',
  'Inspect a fixed pair and retain it exactly when the first trial succeeds.',
  'Inspect a fixed pair and retain it exactly when the second trial succeeds.',
  'Before inspecting a pair, pick one trial with the stated selection bias; retain the pair exactly when that chosen trial succeeds.',
  'Inspect a fixed pair and retain it exactly when both trials succeed.',
  'Inspect a fixed pair and retain it exactly when exactly one trial succeeds.',
]
function reportMasses(p: Reporting, protocol: number): number[] {
  const weights = [(100 - p.first) * (100 - p.second), (100 - p.first) * p.second, p.first * (100 - p.second), p.first * p.second]
  return weights.map((weight, state) => {
    const first = state >= 2, second = state % 2 === 1
    const retention = [Number(first || second) * 100, Number(first) * 100, Number(second) * 100, (first ? p.chooseFirst : 0) + (second ? 100 - p.chooseFirst : 0), Number(first && second) * 100, Number(first !== second) * 100][protocol]
    return weight * retention * (first ? p.archiveFirst : p.archiveOther)
  })
}
function reportOptions(p: Reporting): Option[] { return p.order.map((protocol, i) => ({ id: `option-${i + 1}`, label: protocolNames[protocol] })) }
function reportStatistics(p: Reporting, protocol: number): number[] {
  const mass = reportMasses(p, protocol), total = mass.reduce((a, b) => a + b, 0)
  if (p.level === 2) return [(mass[2] + mass[3]) / total, (mass[1] + mass[3]) / total]
  if (p.level === 4) return [mass[3] / total, 100000000 / total, (mass[2] + mass[3]) / total]
  return [mass[3] / total, p.level >= 3 ? 100000000 / total : 0]
}
function reportAnswer(p: Reporting): string {
  const observed = reportStatistics(p, p.target)
  const match = p.order.filter(protocol => reportStatistics(p, protocol).every((value, i) => Math.abs(value - observed[i]) < 1e-10))
  if (match.length !== 1) throw new Error('Report statistics must identify exactly one protocol')
  return `option-${p.order.indexOf(match[0]) + 1}`
}
export const reportProtocolTemplate: Template<Reporting> = {
  id: 'judgment.conditional.variety.report-protocol', version: 1, track: 'judgment', concept: 'judgment.conditional', family: 'conditional-report-identification',
  status: 'draft', review, levels, skins: ['experiments', 'inspections'], dailyLevels: [2, 3],
  sample: (rng, level) => ({ level, first: rng.int(10, 35), second: rng.int(60, 90), chooseFirst: rng.int(20, 80), archiveFirst: level === 4 ? rng.int(60, 95) : 100, archiveOther: level === 4 ? rng.int(5, 40) : 100, target: rng.int(0, 5), order: shuffled(rng) }),
  solve: reportAnswer,
  verify(p) {
    const observed = reportStatistics(p, p.target)
    const candidates: number[] = []
    for (let protocol = 0; protocol < 6; protocol++) {
      let total = 0, both = 0, firstMass = 0, secondMass = 0
      for (let firstDraw = 0; firstDraw < 100; firstDraw++) for (let secondDraw = 0; secondDraw < 100; secondDraw++) {
        const first = firstDraw < p.first, second = secondDraw < p.second
        let retain = 0
        if (protocol === 0 && (first || second)) retain = 1
        if (protocol === 1 && first) retain = 1
        if (protocol === 2 && second) retain = 1
        if (protocol === 3) retain = Number(first) * p.chooseFirst / 100 + Number(second) * (1 - p.chooseFirst / 100)
        if (protocol === 4 && first && second) retain = 1
        if (protocol === 5 && first !== second) retain = 1
        const mass = retain * (first ? p.archiveFirst : p.archiveOther)
        total += mass
        if (first) firstMass += mass
        if (second) secondMass += mass
        if (first && second) both += mass
      }
      const predicted = p.level === 2 ? [firstMass / total, secondMass / total] : p.level === 4 ? [both / total, 1000000 / total, firstMass / total] : [both / total, p.level >= 3 ? 1000000 / total : 0]
      if (predicted.every((value, i) => Math.abs(value - observed[i]) < 1e-8)) candidates.push(protocol)
    }
    if (candidates.length !== 1) throw new Error('Enumerated report protocol is ambiguous')
    return `option-${p.order.indexOf(candidates[0]) + 1}`
  },
  render(p, skin) {
    const mass = reportMasses(p, p.target), total = mass.reduce((a, b) => a + b, 0)
    return [
      ...paragraph(`Each raw ${skin === 'experiments' ? 'experiment' : 'inspection'} contains two independent Bernoulli trials: the first succeeds with probability ${p.first}%, the second with probability ${p.second}%. Raw pairs are independent of each other. One of the six candidate protocols determines which pairs are retained. In the candidate that selects one trial, it selects the first with probability ${p.chooseFirst}% and the second otherwise, independently of outcomes.`),
      ...(p.level >= 3 ? paragraph('Apply the same candidate protocol to successive independent raw pairs until one is retained. Repeat from a fresh raw pair to obtain each new report.') : paragraph('The analyst inspects the distribution among retained pairs from repeated fixed-size pairs.')),
      ...(p.level === 4 ? paragraph(`After retention, a separate archive coin keeps the pair with probability ${p.archiveFirst}% if its first trial succeeded, and ${p.archiveOther}% if it failed. Conditional on the pair's trial outcomes this coin is independent of all earlier random choices. Continue from a fresh pair until an archived report is obtained; archive rejection discards the entire pair.`) : []),
      ...paragraph(p.level === 2 ? `The exact report probabilities are P(first succeeds | report) = ${mass[2] + mass[3]}/${total} and P(second succeeds | report) = ${mass[1] + mass[3]}/${total}.` : `The exact report probability P(both succeed | report) is ${mass[3]}/${total}.${p.level >= 3 ? ` The long-run mean number of raw pairs consumed per ${p.level === 4 ? 'archived ' : ''}report is ${100000000}/${total}.` : ''}`),
      ...(p.level === 4 ? paragraph(`The exact archived-report probability P(first succeeds | report) is ${mass[2] + mass[3]}/${total}.`) : []),
      ...paragraph('These are exact model probabilities and expectations, not noisy estimates from a finite log. Which candidate protocol is compatible with all these observations? The archive rule, when present, is applied after the candidate rule.'),
    ]
  },
  answer: p => ({ type: 'choice', options: reportOptions(p) }),
  misconceptions: [
    { id: 'any-success-equals-first-success', value: p => `option-${p.order.indexOf(p.target === 0 ? 1 : 0) + 1}`, feedback: () => 'Selecting pairs with at least one success differs from selecting pairs whose first trial succeeds. The inclusion probability of each ordered outcome must follow the exact reporting rule.' },
    { id: 'chosen-success-equals-both-success', value: p => `option-${p.order.indexOf(p.target === 4 ? 3 : 4) + 1}`, feedback: () => 'A report that a randomly chosen trial succeeded does not certify that both trials succeeded. Include both the random selection and every later archive rule in the outcome weights.' },
  ],
  steps: [
    { prompt: () => paragraph('What is the unconditional probability of two successes, as a decimal?'), answer: p => p.first * p.second / 10000, tolerance: exact, explain: () => paragraph('The raw trials are independent, so their success probabilities multiply before selection.') },
    { prompt: () => paragraph('Under the at-least-one candidate, before archiving, what fraction of raw pairs is retained?'), answer: p => 1 - (1 - p.first / 100) * (1 - p.second / 100), tolerance: exact, explain: () => paragraph('At least one success is the complement of two failures. Other candidates use different retention events.') },
    { prompt: () => paragraph('How many candidate reporting protocols must be compared?'), answer: () => 6, tolerance: exact, explain: p => paragraph(`Compare all six four-outcome tables with the exact observations. The matching rule is ${reportAnswer(p)}: ${protocolNames[p.target]}`) },
  ],
  solution: p => paragraph(`List raw outcomes FF, FS, SF and SS with probabilities (1 − p)(1 − q), (1 − p)q, p(1 − q) and pq. For each candidate multiply every outcome by its retention probability${p.level === 4 ? ' and then its archive probability' : ''}, then normalise. ${p.level >= 3 ? 'The inverse of total acceptance probability is the mean raw-pair waiting time; stopping after acceptance preserves the accepted-pair distribution.' : ''} Exactly one candidate matches: ${reportAnswer(p)}, “${protocolNames[p.target]}”${p.level === 4 ? ', followed by the stated archive rule' : ''}.`),
}

type Prevalence = { level: number; cases: number; noncases: number; sensitivity: number; falsePositive: number; enrichment: number }
function observedFlag(p: Prevalence): number { return (p.cases * p.enrichment * p.sensitivity + p.noncases * p.falsePositive) / (100 * (p.cases * p.enrichment + p.noncases)) }
function prevalenceAnswer(p: Prevalence): number {
  const selected = (observedFlag(p) - p.falsePositive / 100) / ((p.sensitivity - p.falsePositive) / 100)
  return 100 * selected / (p.enrichment + (1 - p.enrichment) * selected)
}
export const inversePrevalenceTemplate: Template<Prevalence> = {
  id: 'judgment.base-rates.variety.inverse-prevalence', version: 1, track: 'judgment', concept: 'judgment.base-rates', family: 'aggregate-prevalence-inversion',
  status: 'draft', review, levels, skins: ['inspection', 'filtering'], dailyLevels: [2, 3],
  sample: (rng, level) => ({ level, cases: rng.int(1, 80), noncases: rng.int(40, 200), sensitivity: level === 1 ? 100 : rng.int(60, 99), falsePositive: level < 3 ? 0 : rng.int(1, 30), enrichment: level === 4 ? rng.int(2, 8) : 1 }),
  solve: prevalenceAnswer,
  verify: p => 100 * p.cases / (p.cases + p.noncases),
  render: (p, skin) => [
    ...paragraph(`A ${skin === 'inspection' ? 'quality scanner' : 'message filter'} flags objects that may have property H. H and not-H are the only true statuses. Its sensitivity is ${p.sensitivity}% and its false-positive rate is ${p.falsePositive}%. These rates apply to the target population${p.level === 4 ? ' and remain unchanged within each status group after selection' : ''}.`),
    ...(p.level === 4 ? paragraph(`For the screened sample, an H object is ${p.enrichment} times as likely to be selected as a not-H object. Selection is otherwise random within each status group. The absolute sampling fraction is not needed; the given relative selection weight is exact.`) : paragraph('Screened objects form an unbiased sample of the target population.')),
    ...paragraph(`Among screened objects the exact flagged fraction is ${p.cases * p.enrichment * p.sensitivity + p.noncases * p.falsePositive}/${100 * (p.cases * p.enrichment + p.noncases)}. This is a stipulated model proportion, not an observed finite-sample estimate. What percentage of the original target population has property H?`),
  ],
  answer: () => ({ type: 'number', unit: '%', tolerance: exact }),
  misconceptions: [
    { id: 'forget-percentage-conversion', value: observedFlag, feedback: () => 'The flagged fraction is a decimal probability, whereas the question requests a percentage. First infer target prevalence, then multiply the target decimal probability by 100.' },
    { id: 'all-flags-are-cases', value: p => observedFlag(p) * 100, feedback: () => 'Flags mix detected cases with false positives, and imperfect sensitivity can miss cases. Undo the mixture before interpreting prevalence.' },
    { id: 'correct-only-for-sensitivity', value: p => observedFlag(p) * 10000 / p.sensitivity, feedback: () => 'Dividing only by sensitivity ignores the noncase contribution. With enriched sampling, the selected prevalence must also be converted back to the target population.' },
  ],
  steps: [
    { prompt: () => paragraph('What is the flagged fraction as a decimal?'), answer: observedFlag, tolerance: exact, explain: () => paragraph('Evaluate the exact fraction provided in the question without intermediate rounding.') },
    { prompt: () => paragraph('What is the H proportion in the screened sample, as a decimal?'), answer: p => (observedFlag(p) - p.falsePositive / 100) / ((p.sensitivity - p.falsePositive) / 100), tolerance: exact, explain: () => paragraph('If r is screened prevalence, flag fraction f = sensitivity × r + false-positive rate × (1 − r). Solve this linear equation for r.') },
    { prompt: () => paragraph('What is the original target prevalence, as a percentage?'), answer: prevalenceAnswer, tolerance: exact, explain: p => paragraph(`Undo any enrichment in odds, then convert back to probability. Target prevalence = ${display(prevalenceAnswer(p))}%.`) },
  ],
  solution: p => paragraph(`Write s = ${p.sensitivity}/100, u = ${p.falsePositive}/100 and f = ${display(observedFlag(p))}. The screened prevalence r satisfies f = sr + u(1 − r), so r = (f − u)/(s − u). Here s > u, making the inversion unique. ${p.level === 4 ? `Screened H:not-H odds are ${p.enrichment} times target odds. Divide r/(1 − r) by ${p.enrichment}, giving target probability r/[${p.enrichment} + (1 − ${p.enrichment})r].` : 'The sample is unbiased, so screened prevalence equals target prevalence.'} Result: ${display(prevalenceAnswer(p))}%. There is no sampling or calibration uncertainty in this stipulated model.`),
}

type Rate = { sensitivity: number; falsePositive: number }
type Operating = { level: number; prior: number; missCost: number; falseCost: number; capacity: number; rates: Rate[]; order: number[] }
function operatingLoss(p: Operating, rate: Rate): number { return p.prior * (100 - rate.sensitivity) * p.missCost + (100 - p.prior) * rate.falsePositive * p.falseCost }
function operatingLoad(p: Operating, rate: Rate): number { return (p.prior * rate.sensitivity + (100 - p.prior) * rate.falsePositive) / 100 }
function operatingAnswer(p: Operating): string {
  const feasible = p.order.filter(index => operatingLoad(p, p.rates[index]) <= p.capacity)
  feasible.sort((a, b) => operatingLoss(p, p.rates[a]) - operatingLoss(p, p.rates[b]) || operatingLoad(p, p.rates[a]) - operatingLoad(p, p.rates[b]) || a - b)
  return `setting-${p.order.indexOf(feasible[0]) + 1}`
}
function operatingOptions(p: Operating): Option[] { return p.order.map((index, slot) => ({ id: `setting-${slot + 1}`, label: `Use setting ${String.fromCharCode(65 + index)} for every object.` })) }
export const operatingPointTemplate: Template<Operating> = {
  id: 'judgment.base-rates.variety.operating-point', version: 1, track: 'judgment', concept: 'judgment.base-rates', family: 'classifier-policy-choice',
  status: 'draft', review, levels, skins: ['quality', 'security'], dailyLevels: [2, 3],
  sample: (rng, level) => ({ level, prior: level === 1 ? 50 : rng.int(2, 40), missCost: level >= 3 ? rng.int(5, 50) : 1, falseCost: level >= 3 ? rng.int(1, 10) : 1, capacity: level === 4 ? rng.int(10, 60) : 100, rates: [{ sensitivity: 0, falsePositive: 0 }, { sensitivity: rng.int(20, 40), falsePositive: rng.int(1, 5) }, { sensitivity: rng.int(45, 65), falsePositive: rng.int(6, 12) }, { sensitivity: rng.int(70, 85), falsePositive: rng.int(13, 25) }, { sensitivity: rng.int(86, 99), falsePositive: rng.int(26, 50) }, { sensitivity: 100, falsePositive: 100 }], order: shuffled(rng) }),
  solve: operatingAnswer,
  verify(p) {
    const totals = p.rates.map(rate => {
      let loss = 0, flags = 0
      for (let result = 0; result < 100; result++) {
        if (result < rate.sensitivity) flags += p.prior
        else loss += p.prior * p.missCost
        if (result < rate.falsePositive) { flags += 100 - p.prior; loss += (100 - p.prior) * p.falseCost }
      }
      return { loss, flags }
    })
    let best = 0
    for (let index = 1; index < 6; index++) if (totals[index].flags <= p.capacity * 100 && (totals[index].loss < totals[best].loss || (totals[index].loss === totals[best].loss && totals[index].flags < totals[best].flags))) best = index
    return `setting-${p.order.indexOf(best) + 1}`
  },
  render: (p, skin) => [
    ...paragraph(`Choose one operating setting for a ${skin === 'quality' ? 'defect scanner' : 'security alert system'}. Exactly ${p.prior}% of target objects have property H. A missed H object costs ${p.missCost} credits; a falsely flagged not-H object costs ${p.falseCost} credits. Correct decisions have zero loss; there are no other costs. Sensitivity and false-positive rates are conditional on actual status, not on being flagged.`),
    { t: 'table', caption: 'Six available settings', head: ['Setting', 'Sensitivity', 'False-positive rate'], rows: p.rates.map((rate, i) => [String.fromCharCode(65 + i), `${rate.sensitivity}%`, `${rate.falsePositive}%`]) },
    ...(p.level === 4 ? paragraph(`At most ${p.capacity}% of all objects can be flagged for review in expectation. Any setting exceeding this expected load is unavailable; there is no later random rationing.`) : []),
    ...paragraph('Choose the available setting with minimum expected loss per object. If expected losses tie, choose the lower expected flag rate; if both tie, choose the alphabetically earlier setting. Use one setting consistently, without randomising between settings.'),
  ],
  answer: p => ({ type: 'choice', options: operatingOptions(p) }),
  misconceptions: [
    { id: 'maximize-sensitivity-alone', value: p => `setting-${p.order.indexOf(5) + 1}`, feedback: () => 'Catching every case can also flag every noncase. Weight both error types by prevalence and loss, and respect the capacity constraint.' },
    { id: 'minimize-false-positives-alone', value: p => `setting-${p.order.indexOf(0) + 1}`, feedback: () => 'Never flagging avoids false positives but misses every case. The decision criterion is total expected loss, rather than one error rate alone.' },
  ],
  steps: [
    { prompt: () => paragraph('What is the target H prevalence as a decimal?'), answer: p => p.prior / 100, tolerance: exact, explain: () => paragraph('Use the population prevalence to weight the actual-H and actual-not-H groups.') },
    { prompt: () => paragraph('Under setting B, what is the expected loss per object in credits?'), answer: p => operatingLoss(p, p.rates[1]) / 10000, tolerance: exact, explain: () => paragraph('Expected loss = P(H) × false-negative rate × missed-case cost + P(not-H) × false-positive rate × false-alarm cost.') },
    { prompt: () => paragraph('Under setting B, what percentage of all objects is expected to be flagged?'), answer: p => operatingLoad(p, p.rates[1]), tolerance: exact, explain: p => paragraph(`Expected flags include both true and false flags. Compare all feasible losses; the selected policy is ${operatingAnswer(p)}.`) },
  ],
  solution: p => paragraph(`For each setting, compute loss = (${p.prior}/100)(1 − sensitivity) × ${p.missCost} + (1 − ${p.prior}/100)(false-positive rate) × ${p.falseCost}, with rates expressed as decimals. ${p.level === 4 ? `Exclude any setting whose true-plus-false flag rate exceeds ${p.capacity}%.` : ''} Losses for A–F are ${p.rates.map(rate => display(operatingLoss(p, rate) / 10000)).join(', ')} credits per object. Apply the stated tie rules if needed. Choose ${operatingAnswer(p)}: ${operatingOptions(p).find(option => option.id === operatingAnswer(p))?.label}`),
}

type JointLaw = { level: number; weights: number[]; claimOrder: number[] }
const claimLabels = ['A and B are independent.', 'A and C are independent.', 'B and C are independent.', 'A, B and C are mutually independent.', 'A and B are independent conditional on C occurring.', 'A and B are independent conditional on C not occurring.']
function jointSum(weights: number[], mask: number, value: number): number { return weights.reduce((sum, weight, state) => sum + ((state & mask) === value ? weight : 0), 0) }
function jointTruth(p: JointLaw): boolean[] {
  const sum = (mask: number, value = mask) => BigInt(jointSum(p.weights, mask, value))
  const n = sum(0, 0), a = sum(4), b = sum(2), c = sum(1), ab = sum(6), ac = sum(5), bc = sum(3), abc = sum(7)
  const pairs = [ab * n === a * b, ac * n === a * c, bc * n === b * c]
  return [...pairs, pairs.every(Boolean) && abc * n * n === a * b * c, abc * c === ac * bc, sum(7, 6) * sum(1, 0) === sum(5, 4) * sum(3, 2)]
}
function jointOptions(p: JointLaw): Option[] { return p.claimOrder.map((claim, i) => ({ id: `claim-${i + 1}`, label: claimLabels[claim] })) }
function jointAnswer(p: JointLaw): string[] { const truths = jointTruth(p); return p.claimOrder.flatMap((claim, i) => truths[claim] ? [`claim-${i + 1}`] : []) }
export const jointLawTemplate: Template<JointLaw> = {
  id: 'judgment.independence.variety.joint-law-audit', version: 1, track: 'judgment', concept: 'judgment.independence', family: 'joint-law-independence-audit',
  status: 'draft', review, levels: [{ level: 1, initialRating: 1200 }, { level: 2, initialRating: 1600 }, { level: 3, initialRating: 2000 }], skins: ['signals', 'shipments'], dailyLevels: [2],
  sample(rng, level) {
    const kind = rng.int(0, 3), chance = rng.int(10, 90), perturbation = rng.int(1, 24)
    const probabilities = [rng.int(10, 90), rng.int(10, 90), rng.int(10, 90)]
    const weights = Array.from({ length: 8 }, (_, state) => {
      const bits = [Boolean(state & 4), Boolean(state & 2), Boolean(state & 1)]
      if (kind === 0) return bits.reduce((product, bit, i) => product * (bit ? probabilities[i] : 100 - probabilities[i]), 1)
      if (kind === 1) return bits.filter(Boolean).length % 2 === 0 ? 25 + perturbation : 25 - perturbation
      if (kind === 2) return (bits[0] === bits[1] ? 25 + perturbation : 25 - perturbation) * (bits[2] ? chance : 100 - chance)
      const lowA = probabilities[0] / 2, highA = 50 + probabilities[0] / 2
      const lowB = probabilities[1] / 2, highB = 50 + probabilities[1] / 2
      const a = bits[2] ? highA : lowA, b = bits[2] ? highB : lowB
      return 4 * (bits[2] ? chance : 100 - chance) * (bits[0] ? a : 100 - a) * (bits[1] ? b : 100 - b)
    })
    const permutation = shuffled(rng).filter(i => i < 3)
    const flip = rng.int(0, 7)
    const transformed = Array.from({ length: 8 }, (_, state) => {
      let original = 0
      for (let bit = 0; bit < 3; bit++) if ((state ^ flip) & (1 << (2 - bit))) original |= 1 << (2 - permutation[bit])
      return weights[original]
    })
    return { level, weights: transformed, claimOrder: shuffled(rng) }
  },
  solve: jointAnswer,
  verify(p) {
    const n = p.weights.reduce((a, b) => a + b, 0)
    const probability = (event: (state: number) => boolean) => p.weights.reduce((sum, weight, state) => sum + (event(state) ? weight / n : 0), 0)
    const a = (state: number) => Boolean(state & 4), b = (state: number) => Boolean(state & 2), c = (state: number) => Boolean(state & 1)
    const independent = (first: (state: number) => boolean, second: (state: number) => boolean, condition: (state: number) => boolean = () => true) => {
      const pc = probability(condition)
      return Math.abs(probability(s => first(s) && second(s) && condition(s)) / pc - probability(s => first(s) && condition(s)) / pc * probability(s => second(s) && condition(s)) / pc) < 1e-12
    }
    const pairs = [independent(a, b), independent(a, c), independent(b, c)]
    const mutual = pairs.every(Boolean) && Math.abs(probability(s => a(s) && b(s) && c(s)) - probability(a) * probability(b) * probability(c)) < 1e-12
    const truths = [...pairs, mutual, independent(a, b, c), independent(a, b, s => !c(s))]
    return p.claimOrder.flatMap((claim, i) => truths[claim] ? [`claim-${i + 1}`] : [])
  },
  render(p, skin) {
    const total = p.weights.reduce((a, b) => a + b, 0)
    const rows = p.weights.map((weight, state) => [state & 4 ? 'yes' : 'no', state & 2 ? 'yes' : 'no', state & 1 ? 'yes' : 'no', String(weight)])
    return [
      ...paragraph(`Three events A, B and C describe ${skin === 'signals' ? 'signal activations' : 'shipment attributes'}. They may overlap. The following fully specified joint law is exact. Every listed row is a mutually exclusive elementary outcome, and weights are proportional to probabilities. Both C and not-C have positive probability. Do not assume independence from the labels.`),
      ...(p.level === 3 ? [
        ...paragraph(`P(C) = ${jointSum(p.weights, 1, 1)}/${total}. Within C and within not-C, the following weights specify conditional laws; normalise each stratum separately.`),
        { t: 'table' as const, caption: 'Within C', head: ['A', 'B', 'Conditional weight'], rows: rows.filter(row => row[2] === 'yes').map(row => [row[0], row[1], row[3]]) },
        { t: 'table' as const, caption: 'Within not-C', head: ['A', 'B', 'Conditional weight'], rows: rows.filter(row => row[2] === 'no').map(row => [row[0], row[1], row[3]]) },
      ] : [{ t: 'table' as const, caption: 'Full joint law', head: ['A', 'B', 'C', 'Weight'], rows: p.level === 2 ? rows.map((row, i) => i === 7 ? [...row.slice(0, 3), '?'] : row) : rows }, ...(p.level === 2 ? paragraph(`All eight row weights sum to ${total}; infer the one missing weight before assessing the claims.`) : [])]),
      ...paragraph('Select every true claim. Pairwise independence checks each pair; mutual independence additionally requires the joint three-event product rule. Conditional claims refer to their named stratum.'),
    ]
  },
  answer: p => ({ type: 'multi', options: jointOptions(p) }),
  misconceptions: [
    { id: 'check-only-pairwise-claims', value: p => { const truths = jointTruth(p); return p.claimOrder.flatMap((claim, i) => claim < 3 && truths[claim] ? [`claim-${i + 1}`] : []) }, feedback: () => 'Pairwise tests do not settle mutual or conditional independence. Evaluate the three-event product and each stated conditional distribution separately.' },
    { id: 'different-labels-imply-independence', value: p => p.claimOrder.map((_, i) => `claim-${i + 1}`), feedback: () => 'Distinct event names do not imply independence. Compare each joint probability with the corresponding product using the supplied law.' },
  ],
  steps: [
    { prompt: () => paragraph('What is P(A), as a decimal?'), answer: p => jointSum(p.weights, 4, 4) / jointSum(p.weights, 0, 0), tolerance: exact, explain: () => paragraph('Sum all rows where A occurs and divide by total joint weight.') },
    { prompt: () => paragraph('What is P(A and B), as a decimal?'), answer: p => jointSum(p.weights, 6, 6) / jointSum(p.weights, 0, 0), tolerance: exact, explain: () => paragraph('Sum both C strata for the A-and-B intersection before comparing with P(A)P(B).') },
    { prompt: () => paragraph('What is P(A and B | C), as a decimal?'), answer: p => jointSum(p.weights, 7, 7) / jointSum(p.weights, 1, 1), tolerance: exact, explain: p => paragraph(`Restrict to C before normalising and compare with P(A|C)P(B|C). Select ${jointAnswer(p).join(', ') || 'no claims'}.`) },
  ],
  solution: p => [
    ...paragraph('Evaluate P(AB)=P(A)P(B), P(AC)=P(A)P(C), and P(BC)=P(B)P(C). Mutual independence requires all three plus P(ABC)=P(A)P(B)P(C). Conditional independence uses the same pairwise equation after restricting and renormalising to C or not-C. A pairwise-only parity law is a counterexample to inferring the triple equation from the three pair equations.'),
    { t: 'list', items: jointOptions(p).map(option => `${option.id}: ${option.label} ${jointAnswer(p).includes(option.id) ? 'True' : 'False'}.`) },
    ...paragraph(`The selected set is ${jointAnswer(p).join(', ') || 'empty'}.`),
  ],
}

type Reliability = { level: number; good: number[]; bad: number[]; goodPercent: number; order: number[] }
function architectureProbabilities(rates: number[], level: number): number[] {
  const [a, b, c, d] = rates.map(rate => rate / 100)
  return [a * (level >= 2 ? d : 1), a * b, a + b - a * b, (a * b + c - a * b * c) * (level >= 2 ? d : 1), a * (b + c - b * c), a * b + a * c + b * c - 2 * a * b * c]
}
function reliabilityValues(p: Reliability): number[] {
  const good = architectureProbabilities(p.good, p.level), bad = architectureProbabilities(p.bad, p.level)
  return good.map((value, i) => p.goodPercent / 100 * value + (1 - p.goodPercent / 100) * bad[i])
}
function architectureNames(p: Reliability): string[] { return [p.level >= 2 ? 'A AND D' : 'A alone', 'A AND B', 'A OR B', p.level >= 2 ? '((A AND B) OR C) AND D' : '(A AND B) OR C', 'A AND (B OR C)', 'At least two of A, B and C'] }
function reliabilityAnswer(p: Reliability): string[] { const values = reliabilityValues(p); return p.order.map((architecture, slot) => ({ id: `network-${slot + 1}`, value: values[architecture] })).sort((a, b) => b.value - a.value).map(value => value.id) }
export const reliabilityOrderTemplate: Template<Reliability> = {
  id: 'judgment.independence.variety.reliability-order', version: 1, track: 'judgment', concept: 'judgment.independence', family: 'architecture-reliability-ranking',
  status: 'draft', review, levels: [{ level: 1, initialRating: 1200 }, { level: 2, initialRating: 1600 }, { level: 3, initialRating: 2000 }], skins: ['networks', 'pumps'], dailyLevels: [2],
  sample(rng, level) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const good = Array.from({ length: 4 }, () => rng.int(15, 95))
      const p = { level, good, bad: level === 3 ? Array.from({ length: 4 }, () => rng.int(5, 80)) : good, goodPercent: level === 3 ? rng.int(10, 90) : 100, order: shuffled(rng) }
      const values = reliabilityValues(p)
      if (values.every((value, i) => values.slice(i + 1).every(other => Math.abs(value - other) > 0.000001))) return p
    }
    // Avoid ambiguous rankings even if a bounded sequence of sampled rates produces ties.
    return { level, good: [20, 60, 90, 50], bad: [20, 60, 90, 50], goodPercent: 100, order: shuffled(rng) }
  },
  solve: reliabilityAnswer,
  verify(p) {
    const values = Array(6).fill(0) as number[]
    for (const [rates, environment] of [[p.good, p.goodPercent / 100], [p.bad, 1 - p.goodPercent / 100]] as const) {
      for (let state = 0; state < 16; state++) {
        const bits = rates.map((_, i) => Boolean(state & (1 << i)))
        const probability = rates.reduce((mass, rate, i) => mass * (bits[i] ? rate / 100 : 1 - rate / 100), environment)
        const [a, b, c, d] = bits
        const works = [a && (p.level < 2 || d), a && b, a || b, ((a && b) || c) && (p.level < 2 || d), a && (b || c), Number(a) + Number(b) + Number(c) >= 2]
        works.forEach((working, i) => { if (working) values[i] += probability })
      }
    }
    if (!values.every((value, i) => values.slice(i + 1).every(other => Math.abs(value - other) > 0.000001))) throw new Error('Reliability ranking contains a tie')
    return p.order.map((architecture, slot) => ({ id: `network-${slot + 1}`, value: values[architecture] })).sort((a, b) => b.value - a.value).map(value => value.id)
  },
  render: (p, skin) => [
    ...paragraph(`Rank six ${skin === 'networks' ? 'service networks' : 'pump systems'} by their probability of working on one demand. A component letter always refers to the same physical component within an architecture, even when it appears in multiple paths. AND requires both arguments to work; OR requires at least one. Architectures are alternatives; no independence assumption between alternatives is needed.`),
    ...(p.level === 3 ? paragraph(`A common environment is good with probability ${p.goodPercent}% and bad otherwise. Conditional on that environment, the four component working events are mutually independent. They need not be independent after the environment is averaged out.`) : paragraph('All component working events are mutually independent.')),
    { t: 'table', caption: 'Component working probabilities', head: p.level === 3 ? ['Component', 'Good environment', 'Bad environment'] : ['Component', 'Working probability'], rows: p.good.slice(0, p.level === 1 ? 3 : 4).map((value, i) => p.level === 3 ? [String.fromCharCode(65 + i), `${value}%`, `${p.bad[i]}%`] : [String.fromCharCode(65 + i), `${value}%`]) },
    ...paragraph('Order the six labelled alternatives from most reliable to least reliable. Their exact model probabilities are distinct, so there are no ties. A shared component cannot be counted as an independent copy of itself.'),
  ],
  answer: p => ({ type: 'sequence', items: p.order.map((architecture, i) => ({ id: `network-${i + 1}`, label: architectureNames(p)[architecture] })) }),
  misconceptions: [
    { id: 'rank-failure-instead-of-working', value: p => [...reliabilityAnswer(p)].reverse(), feedback: () => 'The requested order is greatest working probability first. Ranking failure probabilities in the same direction reverses that objective.' },
    { id: 'sort-by-number-of-component-letters', value: p => p.order.map((architecture, i) => ({ id: `network-${i + 1}`, size: architecture === 0 ? (p.level >= 2 ? 2 : 1) : architecture <= 2 ? 2 : architecture === 3 && p.level >= 2 ? 4 : 3 })).sort((a, b) => b.size - a.size).map(value => value.id), feedback: () => 'More components can mean redundancy or extra required failure points. Evaluate the AND/OR structure and shared components rather than counting letters.' },
  ],
  steps: [
    { prompt: () => paragraph('What is the marginal working probability of A, as a decimal?'), answer: p => p.goodPercent / 100 * p.good[0] / 100 + (1 - p.goodPercent / 100) * p.bad[0] / 100, tolerance: exact, explain: () => paragraph('If an environment is present, average A’s conditional working probability over environments.') },
    { prompt: () => paragraph('What is the working probability of the A AND B alternative, as a decimal?'), answer: p => reliabilityValues(p)[1], tolerance: exact, explain: () => paragraph('Multiply independent component probabilities within each environment, then average. Do not multiply unconditional marginals in the common-environment model.') },
    { prompt: () => paragraph('What is the working probability of A AND (B OR C), as a decimal?'), answer: p => reliabilityValues(p)[4], tolerance: exact, explain: p => paragraph(`Compute A × [B + C − BC] within each independent regime. Comparing all six gives ${reliabilityAnswer(p).join(' → ')}.`) },
  ],
  solution: p => [
    ...paragraph('For independent component probabilities a, b and c, A AND B works with probability ab; A OR B has probability a+b−ab; (A AND B) OR C has probability ab+c−abc; A AND (B OR C) has probability a(b+c−bc); at least two has probability ab+ac+bc−2abc. A required independent gate D multiplies the relevant probability by d. A repeated component letter is the same event.'),
    ...(p.level === 3 ? paragraph('Apply each formula separately in each environment and average using the environment probabilities. This accounts for unconditional dependence induced by the shared environment.') : []),
    { t: 'table', caption: 'Computed working probabilities', head: ['Alternative', 'Working probability'], rows: p.order.map((architecture, i) => [`network-${i + 1}: ${architectureNames(p)[architecture]}`, display(reliabilityValues(p)[architecture])]) },
    ...paragraph(`Most to least reliable: ${reliabilityAnswer(p).join(' → ')}.`),
  ],
}

export const VARIETY_PROBABILITY = [hostProtocolTemplate, reportProtocolTemplate, inversePrevalenceTemplate, operatingPointTemplate, jointLawTemplate, reliabilityOrderTemplate] as const
