import type { Option, Rng, Template } from '../types.ts'
import { advancedReview, display, numberStep, paragraph, precise } from './advanced-support.ts'

const levels = [1, 2, 3, 4].map(level => ({ level, initialRating: 600 + 400 * level }))
function shuffled<T>(values: T[], rng: Rng): T[] {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

type Weighted = { level: number; yes: number[]; no: number[]; inclusion: number[]; response: number[] }
function weightedCounts(p: Weighted, invert = false): [number, number] {
  let marked = 0, total = 0
  for (let i = 0; i < p.yes.length; i++) {
    const probability = p.inclusion[i] / 100 * p.response[i] / 100
    const weight = invert ? probability : 1 / probability
    marked += p.yes[i] * weight
    total += (p.yes[i] + p.no[i]) * weight
  }
  return [marked, total]
}
function weightedAnswer(p: Weighted): number {
  const [marked, total] = weightedCounts(p)
  if (p.level === 1) return marked
  const percentage = 100 * marked / total
  return p.level === 4 ? percentage - 100 * p.yes.reduce((a, b) => a + b, 0) / p.yes.concat(p.no).reduce((a, b) => a + b, 0) : percentage
}
export const inverseInclusionTemplate: Template<Weighted> = {
  id: 'judgment.frequencies.variety.inverse-inclusion', version: 1, track: 'judgment', concept: 'judgment.frequencies', family: 'inverse-inclusion-survey',
  status: 'draft', review: advancedReview, levels, skins: ['workshops', 'libraries'], dailyLevels: [2],
  sample: (rng, level) => ({ level, yes: [rng.int(2, 15), rng.int(16, 30)], no: [rng.int(16, 30), rng.int(2, 15)], inclusion: [rng.pick([20, 25]), rng.pick([50, 100])], response: [level >= 3 ? rng.pick([50, 100]) : 100, 100] }),
  solve: weightedAnswer,
  verify(p) {
    let marked = 0, other = 0
    for (let group = 0; group < p.yes.length; group++) {
      const copies = 10000 / (p.inclusion[group] * p.response[group])
      for (let i = 0; i < p.yes[group]; i++) marked += copies
      for (let i = 0; i < p.no[group]; i++) other += copies
    }
    if (p.level === 1) return marked
    const proportion = 1 - other / (marked + other)
    if (p.level < 4) return proportion * 100
    const observedOther = p.no.reduce((a, b) => a + b, 0)
    return 100 * (proportion - (1 - observedOther / p.yes.concat(p.no).reduce((a, b) => a + b, 0)))
  },
  render(p, skin) {
    return [
      ...paragraph(`A probability survey of ${skin === 'workshops' ? 'workshops' : 'libraries'} records whether each respondent uses a shared service. The frame contains two disjoint strata. Within each stratum the inclusion probability is the same for users and nonusers. ${p.level >= 3 ? 'Response probabilities are known and response is independent of service use conditional on stratum.' : 'Every sampled unit responds.'} Each respondent represents the reciprocal of its probability of being both sampled and observed. This is a survey estimator, not a claim that the realized sample reveals the true population total exactly.`),
      { t: 'table', caption: 'Observed respondents and known sampling design', head: ['Stratum', 'Service users', 'Nonusers', 'Inclusion %', ...(p.level >= 3 ? ['Response given inclusion %'] : [])], rows: p.yes.map((yes, i) => ['AB'[i], String(yes), String(p.no[i]), String(p.inclusion[i]), ...(p.level >= 3 ? [String(p.response[i])] : [])]) },
      ...paragraph(p.level === 1 ? 'What is the inverse-inclusion estimate of the total number of service users in the frame?'
        : p.level === 4 ? 'What is the weighted estimated user percentage minus the unweighted respondent user percentage, in percentage points? A negative result is allowed.'
        : `What is the ${p.level === 3 ? 'inclusion-and-response-adjusted' : 'inverse-inclusion-weighted'} ratio estimate of the percentage of units in the frame that use the service?`),
    ]
  },
  answer: p => ({ type: 'number', unit: p.level === 1 ? 'estimated service users' : p.level === 4 ? 'percentage points' : '%', tolerance: precise }),
  misconceptions: [
    { id: 'ignore-unequal-observation-probabilities', value: p => p.level === 1 ? p.yes.reduce((a, b) => a + b, 0) : p.level === 4 ? 0 : 100 * p.yes.reduce((a, b) => a + b, 0) / p.yes.concat(p.no).reduce((a, b) => a + b, 0), feedback: () => 'Raw respondent counts give too much weight to strata that are easier to observe. Weight each respondent by the reciprocal of its full observation probability.' },
    { id: 'weight-by-probability-instead-of-reciprocal', value: p => { const [marked, total] = weightedCounts(p, true); return p.level === 1 ? marked : 100 * marked / total - (p.level === 4 ? 100 * p.yes.reduce((a, b) => a + b, 0) / p.yes.concat(p.no).reduce((a, b) => a + b, 0) : 0) }, feedback: () => 'Multiplying by observation probability discounts hard-to-observe units again. The correction divides by that probability; a ratio estimate then normalizes weighted users by all weighted units.' },
  ],
  steps: [
    numberStep(() => 'What is the weight represented by one observed stratum-A unit?', p => 10000 / (p.inclusion[0] * p.response[0]), p => `The joint observation probability is (${p.inclusion[0]}/100)×(${p.response[0]}/100); take its reciprocal.`),
    numberStep(() => 'What is the estimated total number of service users after weighting both strata?', p => weightedCounts(p)[0], p => `Sum users divided by their joint observation probabilities: ${display(weightedCounts(p)[0])}.`),
    numberStep(() => 'What is the requested total, percentage estimate, or difference in percentage points?', weightedAnswer, p => `Use the weighted total or normalize it by the weighted frame-size estimate, then make the stated comparison: ${display(weightedAnswer(p))}.`),
  ],
  solution(p) { const [marked, total] = weightedCounts(p); return paragraph(`The observation weights are ${p.inclusion.map((probability, i) => display(10000 / (probability * p.response[i]))).join(' and ')}. Weight users and nonusers separately. Estimated service users = ${display(marked)}; estimated frame size = ${display(total)}. ${p.level > 1 ? `The ratio estimate is 100×${display(marked)}/${display(total)} = ${display(100 * marked / total)}%. ` : ''}${p.level === 4 ? 'Subtract the percentage computed from unweighted respondents. ' : ''}Requested result: ${display(weightedAnswer(p))}. Inverse-probability totals are design-based estimates; ratio estimates and response adjustment add their stated assumptions, and are not guarantees about this particular population.`) },
}

type Claims = { order: number[]; asserted: boolean[] }
function claimOptions(p: Claims, statements: [string, string][]): Option[] {
  return p.order.map((kind, index) => ({ id: `c${index + 1}`, label: statements[kind][p.asserted[kind] ? 0 : 1] }))
}
function claimAnswer(p: Claims, truths: boolean[]): string[] { return p.order.flatMap((kind, i) => p.asserted[kind] === truths[kind] ? [`c${i + 1}`] : []) }
function claimSample(rng: Rng): Claims { return { order: shuffled([0, 1, 2, 3, 4, 5], rng), asserted: Array.from({ length: 6 }, () => rng.int(0, 1) === 1) } }

type Survey = Claims & { level: number; invited: number; responded: number; yes: number; coverage: 'complete' | 'partial'; design: 'probability' | 'voluntary'; groups: { yes: number; no: number; pi: number }[]; threshold: number }
function surveyWeightedCounts(p: Survey): [number, number] {
  return [p.groups.reduce((n, g) => n + g.yes * (100 / g.pi), 0), p.groups.reduce((n, g) => n + (g.yes + g.no) * (100 / g.pi), 0)]
}
function surveyWeighted(p: Survey): number {
  const [users, total] = surveyWeightedCounts(p)
  return users / total
}
function surveyTruths(p: Survey): boolean[] {
  if (p.level === 3) {
    const rawUsers = p.groups.reduce((n, g) => n + g.yes, 0), rawTotal = p.groups.reduce((n, g) => n + g.yes + g.no, 0)
    const [users, total] = surveyWeightedCounts(p)
    return [rawUsers * total > users * rawTotal, 100 * users >= p.threshold * total, p.coverage === 'complete', p.design === 'probability', p.groups[0].pi === p.groups[1].pi, false]
  }
  return [2 * p.yes > p.responded, 2 * p.yes > p.invited, 2 * (p.yes + p.invited - p.responded) > p.invited, p.coverage === 'complete', p.design === 'probability', false]
}
function surveyStatements(p: Survey): [string, string][] {
  return [
    p.level === 3 ? ['The raw respondent user percentage exceeds the weighted ratio estimate.', 'The raw respondent user percentage does not exceed the weighted ratio estimate.'] : ['More than half of the respondents favour the proposal.', 'At most half of the respondents favour the proposal.'],
    p.level === 3 ? [`The weighted ratio estimate of users is at least ${p.threshold}%.`, `The weighted ratio estimate of users is below ${p.threshold}%.`] : ['Even if every nonrespondent opposes the proposal, a strict majority of invitees favour it.', 'The responses do not establish a strict majority of invitees if every nonrespondent opposes the proposal.'],
    p.level === 3 ? ['Every type of target unit has a positive chance of appearing in the frame.', 'Some target units have zero chance of appearing in the frame.'] : ['A strict majority of invitees could favour the proposal if all nonrespondents favour it.', 'A strict majority of invitees is impossible even if all nonrespondents favour it.'],
    p.level === 3 ? ['Selection within the stated frame uses a known probability design.', 'Selection within the stated frame is by an open voluntary invitation.'] : ['The frame covers every type of target unit.', 'The frame excludes at least one type of target unit.'],
    p.level === 3 ? ['The two strata have equal design weights per sampled unit.', 'The two strata have unequal design weights per sampled unit.'] : ['The invitation mechanism is a probability sample within the frame.', 'The invitation mechanism is a voluntary response mechanism.'],
    ['The reported percentage is guaranteed to equal the true target-population percentage exactly.', 'These data do not guarantee exact equality between the reported and target-population percentages.'],
  ]
}
export const samplingAuditTemplate: Template<Survey> = {
  id: 'judgment.frequencies.variety.sampling-audit', version: 1, track: 'judgment', concept: 'judgment.frequencies', family: 'survey-claim-audit',
  status: 'draft', review: advancedReview, levels: levels.slice(0, 3), skins: ['repairs', 'transport'], dailyLevels: [2],
  sample(rng, level) {
    const invited = rng.int(6, 20) * 10, responded = invited - rng.int(1, Math.min(45, invited - 2))
    return { ...claimSample(rng), level, invited, responded, yes: rng.int(1, responded - 1), coverage: level === 1 || rng.int(0, 1) ? 'complete' : 'partial', design: level === 1 || level === 3 || rng.int(0, 1) ? 'probability' : 'voluntary', groups: Array.from({ length: 2 }, () => ({ yes: rng.int(2, 30), no: rng.int(2, 30), pi: rng.pick([20, 25, 50]) })), threshold: rng.int(25, 75) }
  },
  solve: p => claimAnswer(p, surveyTruths(p)),
  verify(p) {
    const statuses = Array.from({ length: p.invited }, (_, i) => i < p.yes ? 'yes' : i < p.responded ? 'no' : 'missing')
    const yes = statuses.filter(s => s === 'yes').length, no = statuses.filter(s => s === 'no').length, missing = statuses.filter(s => s === 'missing').length
    let truths: boolean[]
    if (p.level === 3) {
      const represented: boolean[] = []
      p.groups.forEach(g => { for (let i = 0; i < g.yes + g.no; i++) for (let copy = 0; copy < 100 / g.pi; copy++) represented.push(i < g.yes) })
      const weightedUsers = represented.filter(Boolean).length
      const rawUsers = p.groups[0].yes + p.groups[1].yes, rawTotal = rawUsers + p.groups[0].no + p.groups[1].no
      truths = [rawUsers * represented.length > weightedUsers * rawTotal, 100 * weightedUsers >= p.threshold * represented.length, p.coverage !== 'partial', p.design !== 'voluntary', 100 / p.groups[0].pi === 100 / p.groups[1].pi, false]
    } else truths = [yes > no, yes > no + missing, yes + missing > no, p.coverage !== 'partial', p.design !== 'voluntary', false]
    return p.order.reduce<string[]>((ids, kind, index) => { if (truths[kind] ? p.asserted[kind] : !p.asserted[kind]) ids.push(`c${index + 1}`); return ids }, [])
  },
  render(p, skin) {
    const blocks = paragraph(`A survey concerns ${skin === 'repairs' ? 'a shared repair service' : 'a shared transport service'}. The target population contains more units than were contacted. The frame ${p.coverage === 'complete' ? 'covers every target type' : 'excludes one entire target district'}. ${p.design === 'probability' ? 'Invitations are selected by a known probability design within the frame.' : 'An open link invites units in the frame to volunteer; individual participation probabilities are unknown.'} Select every statement warranted by the records and design. “Could” concerns logical compatibility; a sample result is not a certainty about the population.`)
    if (p.level === 3) blocks.push({ t: 'table', caption: 'Two sampled strata; every sampled unit responds', head: ['Stratum', 'Users', 'Nonusers', 'Known inclusion %'], rows: p.groups.map((g, i) => ['AB'[i], String(g.yes), String(g.no), String(g.pi)]) }, ...paragraph('The stated weighted ratio estimate uses reciprocal inclusion probabilities on both users and total units, within the frame.'))
    else blocks.push(...paragraph(`Of ${p.invited} invitees, ${p.responded} responded and ${p.yes} favour the proposal. The preferences of nonrespondents are unknown. No assumption that response is independent of preference is supplied.`))
    return blocks
  },
  answer: p => ({ type: 'multi', options: claimOptions(p, surveyStatements(p)) }),
  misconceptions: [
    { id: 'select-unsupported-instead-of-supported', value: p => p.order.flatMap((kind, i) => p.asserted[kind] !== surveyTruths(p)[kind] ? [`c${i + 1}`] : []), feedback: () => 'The task asks for warranted statements. Separate observed respondent facts, possible nonresponse outcomes and what the sampling design actually permits.' },
    { id: 'assume-respondents-are-the-population', value: p => {
      const t = surveyTruths(p)
      if (p.level === 3) {
        const users = p.groups.reduce((n, g) => n + g.yes, 0), total = p.groups.reduce((n, g) => n + g.yes + g.no, 0)
        t[0] = false
        t[1] = 100 * users >= p.threshold * total
      } else { t[1] = t[0]; t[2] = t[0] }
      t[5] = true
      return claimAnswer(p, t)
    }, feedback: () => 'Observed respondent proportions need not equal invitee or population proportions. Ignoring weights equates the weighted and raw rates; unknown nonresponses and uncovered units cannot be silently assigned the observed preference rate.' },
  ],
  steps: [
    numberStep(p => p.level === 3 ? 'What is the raw user percentage among the two sampled strata?' : 'What percentage of respondents favour the proposal?', p => p.level === 3 ? 100 * p.groups.reduce((n, g) => n + g.yes, 0) / p.groups.reduce((n, g) => n + g.yes + g.no, 0) : 100 * p.yes / p.responded, () => 'Use respondents as the denominator for an observed respondent percentage.'),
    numberStep(p => p.level === 3 ? 'What is the weighted user percentage within the frame?' : 'What is the largest possible favourable percentage among invitees?', p => p.level === 3 ? 100 * surveyWeighted(p) : 100 * (p.yes + p.invited - p.responded) / p.invited, () => 'Use inverse design weights for the ratio estimate, or assign every unknown invitee to favourable when taking an upper logical bound.'),
    numberStep(() => 'How many of the six claims are warranted?', p => claimAnswer(p, surveyTruths(p)).length, () => 'Evaluate the numerical statements and the design statements separately; certainty about the entire population requires more than a sample.'),
  ],
  solution(p) { const ids = claimAnswer(p, surveyTruths(p)); return [...paragraph(p.level === 3 ? `The inverse-inclusion ratio estimate is ${display(100 * surveyWeighted(p))}%. Coverage and the selection mechanism are separate questions: probability sampling within an incomplete frame does not cover excluded units.` : `The respondent proportion is ${p.yes}/${p.responded}. Among invitees the favourable count can range from ${p.yes} to ${p.yes + p.invited - p.responded}; use ${p.invited} as its denominator. A probability invitation design does not establish ignorable nonresponse.`), ...paragraph(`Select ${ids.length ? ids.join(', ') : 'no claims'}.`), { t: 'list', items: claimOptions(p, surveyStatements(p)).map(o => `${o.id}: ${o.label} — ${ids.includes(o.id) ? 'warranted' : 'not warranted'}.`) }] },
}

type Capture = { level: number; first: number[]; second: number[]; overlap: number[]; ambiguous: number[] }
function captureAnswer(p: Capture): number {
  const estimate = (i: number, overlap: number) => p.level === 2 || p.level === 4 ? (p.first[i] + 1) * (p.second[i] + 1) / (overlap + 1) - 1 : p.first[i] * p.second[i] / overlap
  return p.first.reduce((sum, _, i) => sum + estimate(i, p.overlap[i]) - (p.level === 4 ? estimate(i, p.overlap[i] + p.ambiguous[i]) : 0), 0)
}
export const captureRecaptureTemplate: Template<Capture> = {
  id: 'judgment.estimation.variety.capture-recapture', version: 1, track: 'judgment', concept: 'judgment.estimation', family: 'capture-recapture-model',
  status: 'draft', review: advancedReview, levels, skins: ['devices', 'seedlings'], dailyLevels: [2],
  sample(rng, level) {
    const overlap = Array.from({ length: level >= 3 ? 2 : 1 }, () => rng.int(4, 20))
    return { level, overlap, first: overlap.map(r => r + rng.int(10, 45)), second: overlap.map(r => r + rng.int(10, 45)), ambiguous: overlap.map(() => level === 4 ? rng.int(1, 5) : 0) }
  },
  solve: captureAnswer,
  verify(p) {
    let sum = 0
    for (let i = 0; i < p.first.length; i++) {
      const union = (r: number) => p.first[i] + p.second[i] - r
      if (p.level === 2) sum += union(p.overlap[i]) + (p.first[i] - p.overlap[i]) * (p.second[i] - p.overlap[i]) / (p.overlap[i] + 1)
      else if (p.level === 4) {
        const candidates = Array.from({ length: p.ambiguous[i] + 1 }, (_, offset) => { const r = p.overlap[i] + offset; return union(r) + (p.first[i] - r) * (p.second[i] - r) / (r + 1) })
        sum += Math.max(...candidates) - Math.min(...candidates)
      } else {
        let lo = Math.max(p.first[i], p.second[i]), hi = p.first[i] * p.second[i]
        for (let step = 0; step < 60; step++) { const mid = (lo + hi) / 2; if (p.first[i] / mid * p.second[i] > p.overlap[i]) lo = mid; else hi = mid }
        sum += (lo + hi) / 2
      }
    }
    return sum
  },
  render(p, skin) {
    return [
      ...paragraph(`Two surveys identify ${skin === 'devices' ? 'devices in a fixed storage pool' : 'seedlings in a fenced study plot'}. The population is closed: no additions, removals or movement between strata. Identification marks persist, and marking does not change capture. Within each stratum every unit has equal capture probability on each occasion, and occasions are independent. ${p.level >= 3 ? 'Catchability may differ across strata, so estimate each stratum separately and add.' : ''} The counts are distinct units, not repeat detections within an occasion. This model produces an abundance estimator, not certain knowledge of the true total.`),
      { t: 'table', head: ['Stratum', 'First survey marked M', 'Second survey n', 'Confirmed overlap r', ...(p.level === 4 ? ['Additional ambiguous matches u'] : [])], rows: p.first.map((m, i) => [String(i + 1), String(m), String(p.second[i]), String(p.overlap[i]), ...(p.level === 4 ? [String(p.ambiguous[i])] : [])]) },
      ...paragraph(p.level === 2 ? 'Use the Chapman bias-corrected estimator (M+1)(n+1)/(r+1)−1. What is the population estimate? Give the unrounded estimator.'
        : p.level === 4 ? 'Ambiguous records may or may not match marked units, independently across strata; true overlap in a stratum is an integer from r through r+u. Use the Chapman estimator (M+1)(n+1)/(overlap+1)−1 in each stratum. What is the largest possible combined estimator minus the smallest possible combined estimator? This is a range of estimates, not a bound on true abundance.'
        : 'Use the Lincoln–Petersen estimator: equate the marked fraction M/N with the observed recapture fraction r/n. What is the combined population estimate? Give the unrounded estimator.'),
    ]
  },
  answer: () => ({ type: 'number', unit: 'estimated units', tolerance: precise }),
  misconceptions: [
    { id: 'count-only-observed-union', value: p => p.first.reduce((n, m, i) => n + m + p.second[i] - p.overlap[i], 0), feedback: () => 'The observed union excludes units missed on both occasions. Capture-recapture uses the overlap rate to estimate those unseen units; an interval of estimators is not the observed union either.' },
    { id: 'ignore-model-adjustment-or-strata', value: p => p.level === 2 ? p.first[0] * p.second[0] / p.overlap[0] : p.level === 4 ? 0 : p.first.reduce((a, b) => a + b, 0) * p.second.reduce((a, b) => a + b, 0) / p.overlap.reduce((a, b) => a + b, 0) / (p.level === 1 ? 100 : 1), feedback: () => 'Apply the named estimator and preserve strata with different catchability. A corrected estimator differs from the raw ratio, and ambiguous overlaps must be varied over their allowed range.' },
  ],
  steps: [
    numberStep(() => 'What is the confirmed recapture fraction in the second survey of stratum 1, as a decimal?', p => p.overlap[0] / p.second[0], () => 'The denominator is the entire second-survey sample, including unmarked units.'),
    numberStep(() => 'How many distinct units were definitely seen across the two surveys in stratum 1?', p => p.first[0] + p.second[0] - p.overlap[0] - p.ambiguous[0], () => 'Add the two sample sizes and subtract the largest compatible overlap to count units that must be distinct.'),
    numberStep(() => 'What is the requested model-based estimator or range of estimates?', captureAnswer, p => `Apply the stated capture model within each stratum. Requested value: ${display(captureAnswer(p))}.`),
  ],
  solution(p) { return paragraph(`${p.level === 2 || p.level === 4 ? 'Chapman can also be written as observed union plus estimated unseen units: M+n−r + (M−r)(n−r)/(r+1).' : 'The marked fraction r/n estimates M/N, giving N̂=M×n/r.'} ${p.level >= 3 ? 'Do not pool recapture fractions across strata with different capture rates. ' : ''}${p.level === 4 ? 'Each stratum’s estimator decreases as overlap grows. Its maximum uses r; its minimum uses r+u. Add maxima and minima separately and subtract. ' : ''}The requested result is ${display(captureAnswer(p))} estimated units. Closure, stable identification and within-stratum equal catchability are assumptions, not consequences of these counts.`) },
}

type Plan = { id: string; name: string; rates: number[]; workers: number[]; input: number; yield: number; setup: number }
type Throughput = { level: number; plans: Plan[] }
function planOutput(p: Throughput, plan: Plan): number {
  const rate = Math.min(...plan.rates.map((value, i) => value * plan.workers[i]), ...(p.level >= 3 ? [plan.input] : []))
  return rate * plan.yield / 100 * (p.level === 4 ? 8 - plan.setup : 1)
}
function planOrder(p: Throughput): string[] { return [...p.plans].sort((a, b) => planOutput(p, b) - planOutput(p, a)).map(plan => plan.id) }
export const throughputRankingTemplate: Template<Throughput> = {
  id: 'judgment.estimation.variety.bottleneck-ranking', version: 1, track: 'judgment', concept: 'judgment.estimation', family: 'bottleneck-plan-ranking',
  status: 'draft', review: advancedReview, levels, skins: ['packing', 'testing'], dailyLevels: [2],
  sample(rng, level) {
    const ranks = shuffled([0, 1, 2, 3, 4, 5], rng), base = rng.int(2, 8), step = rng.int(1, 3)
    const plans = ranks.map((rank, i) => {
      const target = 12 * (base + rank * step), hours = level === 4 ? rng.pick([2, 3, 4, 6]) : 1, yieldPercent = level >= 3 ? rng.pick([25, 50, 100]) : 100
      const bottleneck = target * 100 / (hours * yieldPercent), limiting = rng.int(0, level >= 3 ? 3 : 2)
      const capacities = Array.from({ length: 4 }, (_, stage) => bottleneck + (stage === limiting ? 0 : 6 * rng.int(1, 8)))
      const workers = capacities.slice(0, 3).map(cap => level === 1 ? 1 : rng.pick([1, 2, 3].filter(n => cap % n === 0)))
      return { id: `plan-${i + 1}`, name: ['Alder', 'Birch', 'Cedar', 'Dune', 'Elm', 'Fir'][i], rates: capacities.slice(0, 3).map((cap, stage) => cap / workers[stage]), workers, input: capacities[3], yield: yieldPercent, setup: 8 - hours }
    })
    return { level, plans }
  },
  solve: planOrder,
  verify(p) {
    const bounds = p.plans.map(plan => {
      const hours = p.level === 4 ? 8 - plan.setup : 1
      let output = Infinity
      for (let stage = 0; stage < plan.rates.length; stage++) output = Math.min(output, hours * plan.yield / (100 * (1 / (plan.rates[stage] * plan.workers[stage]))))
      if (p.level >= 3) output = Math.min(output, hours * plan.input * plan.yield / 100)
      return output
    })
    const result = Array<string>(p.plans.length)
    bounds.forEach((bound, i) => { result[bounds.filter(other => other > bound).length] = p.plans[i].id })
    return result
  },
  render(p, skin) {
    return [
      ...paragraph(`Compare six ${skin === 'packing' ? 'packing' : 'quality-testing'} plans. Every item passes through stages 1, 2 and 3 in order. Workers within one stage operate in parallel; stages use separate workers. Buffers, materials and downstream demand are unlimited except for a stated input cap. Compare ideal sustained output after the pipeline is filled; ignore variability and transit delays. ${p.level >= 3 ? 'The final yield is the fraction of processed items counted as good output; rejected items do not return to a stage.' : ''} ${p.level === 4 ? 'Each plan has an eight-hour shift; its one-time setup occurs before any output. The pipeline is already filled when setup ends.' : ''}`),
      { t: 'table', head: ['Plan', 'Stage 1 workers × units/h each', 'Stage 2 workers × units/h each', 'Stage 3 workers × units/h each', ...(p.level >= 3 ? ['Input units/h cap', 'Final good yield %'] : []), ...(p.level === 4 ? ['Setup hours'] : [])], rows: p.plans.map(plan => [plan.name, ...plan.rates.map((rate, i) => `${plan.workers[i]} × ${rate}`), ...(p.level >= 3 ? [String(plan.input), String(plan.yield)] : []), ...(p.level === 4 ? [String(plan.setup)] : [])]) },
      ...paragraph(`Order all six plans from largest to smallest ${p.level === 4 ? 'expected good output over the shift' : 'sustained good output per hour'}. There are no ties. Rank whole processes, not individual workers.`),
    ]
  },
  answer: p => ({ type: 'sequence', items: p.plans.map(plan => ({ id: plan.id, label: plan.name })) }),
  misconceptions: [
    { id: 'rank-smallest-output-first', value: p => planOrder(p).reverse(), feedback: () => 'The question asks for largest output first. Order complete-process outputs from greatest to least, after accounting for every stated bottleneck and adjustment.' },
    { id: 'add-serial-stage-capacities', value: p => [...p.plans].sort((a, b) => b.rates.reduce((n, rate, i) => n + rate * b.workers[i], 0) - a.rates.reduce((n, rate, i) => n + rate * a.workers[i], 0)).map(plan => plan.id), feedback: () => 'Adding serial-stage capacities counts the same flow repeatedly. Whole-process output is constrained by the tightest stage or input cap, before yield and available time.' },
    { id: 'rank-by-fastest-individual-worker', value: p => [...p.plans].sort((a, b) => Math.max(...b.rates) - Math.max(...a.rates)).map(plan => plan.id), feedback: () => 'The fastest worker cannot overcome a bottleneck elsewhere. Include parallel workers, every serial stage, input availability, final yield and the stated operating time.' },
  ],
  steps: [
    numberStep(() => 'What is the total stage-1 processing capacity of plan Alder, in units per hour?', p => p.plans[0].rates[0] * p.plans[0].workers[0], () => 'Parallel workers add capacity within a stage; multiply their count by the per-worker rate.'),
    numberStep(() => 'What is the requested good output of plan Alder before comparing plans?', p => planOutput(p, p.plans[0]), () => 'Take the smallest relevant flow capacity, multiply by final yield, and apply the available shift time if requested.'),
    numberStep(() => 'What is the difference between the best and worst plan outputs in the requested units?', p => Math.max(...p.plans.map(plan => planOutput(p, plan))) - Math.min(...p.plans.map(plan => planOutput(p, plan))), () => 'Calculate all six complete-plan outputs before constructing the descending order.'),
  ],
  solution(p) { const order = planOrder(p); return [...paragraph(`Each stage’s capacity is workers × per-worker rate. Serial stages constrain the same flow, so use the minimum capacity${p.level >= 3 ? ', including the input cap, then multiply by final yield' : ''}${p.level === 4 ? ' and by eight minus setup hours' : ''}.`), { t: 'list', items: p.plans.map(plan => `${plan.name}: ${display(planOutput(p, plan))} ${p.level === 4 ? 'good units per shift' : 'good units per hour'}.`) }, ...paragraph(`Correct descending order: ${order.map(id => p.plans.find(plan => plan.id === id)!.name).join(' → ')}.`)] },
}

type ContrastGroup = { beforeT: number; afterT: number; beforeC: number; afterC: number }
type Contrast = { level: number; groups: ContrastGroup[]; weight: number }
function did(g: ContrastGroup): number { return g.afterT - g.beforeT - (g.afterC - g.beforeC) }
function contrastAnswer(p: Contrast): number {
  if (p.level === 1) return did(p.groups[0])
  if (p.level === 2) return p.groups[0].beforeT + p.groups[0].afterC - p.groups[0].beforeC
  if (p.level === 3) return (p.weight * did(p.groups[0]) + (100 - p.weight) * did(p.groups[1])) / 100
  return did(p.groups[0]) - did(p.groups[1])
}
export const controlContrastTemplate: Template<Contrast> = {
  id: 'judgment.regression.variety.control-contrasts', version: 1, track: 'judgment', concept: 'judgment.regression', family: 'control-before-after-contrasts',
  status: 'draft', review: advancedReview, levels, skins: ['machines', 'routes'], dailyLevels: [2],
  sample(rng, level) {
    const groups = Array.from({ length: level >= 3 ? 2 : 1 }, (_, i) => { const beforeC = rng.int(40, 100), beforeT = beforeC + rng.int(i ? 21 : 5, i ? 35 : 20), trend = rng.int(-12, 12); return { beforeC, beforeT, afterC: beforeC + trend, afterT: beforeT + trend + rng.int(-15, 20) } })
    return { level, groups, weight: rng.int(10, 90) }
  },
  solve: contrastAnswer,
  verify(p) {
    const gapChange = p.groups.map(g => (g.afterT - g.afterC) - (g.beforeT - g.beforeC))
    if (p.level === 1) return gapChange[0]
    if (p.level === 2) return p.groups[0].afterT - gapChange[0]
    if (p.level === 3) {
      const weights = [p.weight / 100, 1 - p.weight / 100]
      const t = p.groups.reduce((n, g, i) => n + weights[i] * (g.afterT - g.beforeT), 0)
      const c = p.groups.reduce((n, g, i) => n + weights[i] * (g.afterC - g.beforeC), 0)
      return t - c
    }
    return (p.groups[0].afterT - p.groups[1].afterT) - (p.groups[0].beforeT - p.groups[1].beforeT) - ((p.groups[0].afterC - p.groups[1].afterC) - (p.groups[0].beforeC - p.groups[1].beforeC))
  },
  render(p, skin) {
    return [
      ...paragraph(`An observational study compares mean output of ${skin === 'machines' ? 'machines with a maintenance change' : 'routes with a dispatch change'} (T) with a comparison group (C), before and after the change. The numbers are reported sample means, in output units. The arithmetic contrasts below are estimates; they do not alone establish a causal effect. A causal interpretation would require parallel counterfactual trends, no anticipation, no interference and no differential concurrent shock or composition change. Those assumptions are imposed only for the stated counterfactual model, not proved by this table.`),
      { t: 'table', head: ['Category', 'T before', 'T after', 'C before', 'C after'], rows: p.groups.map((g, i) => [i ? 'Reference' : 'Eligible', String(g.beforeT), String(g.afterT), String(g.beforeC), String(g.afterC)]) },
      ...paragraph(p.level === 1 ? 'What is the treated before-after change minus the comparison before-after change, in output units?'
        : p.level === 2 ? 'For a planning model, assume the untreated change in T would equal the observed change in C. What is the estimated counterfactual after-mean of T without the change?'
        : p.level === 3 ? `A fixed target population has ${p.weight}% Eligible and ${100 - p.weight}% Reference units. What is the target-weighted average of the two within-category treated-minus-comparison changes? Use these common category weights, not the sample group sizes.`
        : 'What is the Eligible category’s difference-in-differences contrast minus the Reference category’s difference-in-differences contrast? This triple difference is a descriptive contrast unless its additional counterfactual assumptions are justified.'),
    ]
  },
  answer: () => ({ type: 'number', unit: 'output units', tolerance: precise }),
  misconceptions: [
    { id: 'ignore-comparison-trend', value: p => p.level === 2 ? p.groups[0].beforeT : p.level === 4 ? (p.groups[0].afterT - p.groups[0].beforeT) - (p.groups[1].afterT - p.groups[1].beforeT) : p.groups.reduce((n, g, i) => n + (p.level === 3 ? (i ? 100 - p.weight : p.weight) / 100 : 1) * (g.afterT - g.beforeT), 0), feedback: () => 'A before-after change mixes the intervention contrast with time trends and regression effects. Use the comparison change in each category before interpreting or combining changes.' },
    { id: 'use-after-only-comparison', value: p => p.level === 2 ? p.groups[0].afterC : p.level === 4 ? (p.groups[0].afterT - p.groups[0].afterC) - (p.groups[1].afterT - p.groups[1].afterC) : p.groups.reduce((n, g, i) => n + (p.level === 3 ? (i ? 100 - p.weight : p.weight) / 100 : 1) * (g.afterT - g.afterC), 0), feedback: () => 'After-only differences retain baseline differences between groups. A counterfactual trajectory starts from T’s own baseline; a difference-in-differences contrast removes the initial T–C gap.' },
  ],
  steps: [
    numberStep(() => 'What is the before-after change of T in the Eligible category?', p => p.groups[0].afterT - p.groups[0].beforeT, () => 'Subtract the before mean from the after mean within the same group.'),
    numberStep(() => 'What is the before-after change of C in the Eligible category?', p => p.groups[0].afterC - p.groups[0].beforeC, () => 'The comparison change supplies a model of common time movement, not the treated group’s baseline level.'),
    numberStep(() => 'What is the requested contrast or model-based counterfactual?', contrastAnswer, p => `Use within-category changes, then apply the requested target weights or third difference: ${display(contrastAnswer(p))}.`),
  ],
  solution(p) { return paragraph(`The within-category contrasts are ${p.groups.map(g => `(${g.afterT}−${g.beforeT})−(${g.afterC}−${g.beforeC})=${did(g)}`).join('; ')}. ${p.level === 2 ? `The counterfactual after mean is T before plus C’s observed change: ${p.groups[0].beforeT}+(${p.groups[0].afterC}−${p.groups[0].beforeC}).` : p.level === 3 ? `Weight the category contrasts by ${p.weight}/100 and ${100 - p.weight}/100.` : p.level === 4 ? 'Subtract the Reference contrast from the Eligible contrast; this adds a third differencing dimension.' : 'The common comparison change is removed from the treated change.'} Requested estimate: ${display(contrastAnswer(p))} output units. Sampling uncertainty and the identifying assumptions remain; the contrast is not a guarantee of an intervention effect.`) },
}

type Forecast = Claims & { level: number; mean: number; first: number; retention: number; spread: number; followup: number; group: ContrastGroup; assignment: 'random' | 'self-selected'; followupComplete: boolean }
function forecastCenter(p: Forecast): number { return p.mean + p.retention / 100 * (p.first - p.mean) }
function forecastTruths(p: Forecast): boolean[] {
  if (p.level === 3) return [did(p.group) > 0, p.assignment === 'random' && p.followupComplete, false, false, p.followupComplete, p.group.afterT > p.group.afterC]
  const center = forecastCenter(p)
  return [center > p.first, Math.max(Math.abs(center - p.spread - p.mean), Math.abs(center + p.spread - p.mean)) < Math.abs(p.first - p.mean), p.followup > center, false, false, Math.abs(center - p.mean) < Math.abs(p.first - p.mean)]
}
function forecastStatements(p: Forecast): [string, string][] {
  if (p.level === 3) return [
    ['The observed treated-minus-comparison before-after contrast is positive.', 'The observed treated-minus-comparison before-after contrast is zero or negative.'],
    ['The stated assignment and follow-up design justify an unbiased comparison of the two assigned groups’ mean outcomes, under the supplied no-interference model.', 'The stated assignment or missing follow-up prevents that design-based justification for the raw observed mean comparison.'],
    ['Random assignment guarantees exactly equal observed baseline means in these finite groups.', 'Random assignment does not guarantee exactly equal observed baseline means in finite groups.'],
    ['The treated group’s before-after gain alone establishes the intervention’s entire causal effect.', 'The treated group’s gain alone does not establish the intervention’s entire causal effect.'],
    ['Every assigned unit has its outcome recorded.', 'Some assigned units have unobserved outcomes.'],
    ['The observed treated mean after the change exceeds the comparison mean after the change.', 'The observed treated mean after the change does not exceed the comparison mean after the change.'],
  ]
  return [
    ['The model’s expected next output is greater than the first output.', 'The model’s expected next output is not greater than the first output.'],
    ['Every possible next output in this model is closer to the population mean than the first output.', 'At least one possible next output is not closer to the population mean than the first output.'],
    ['The recorded follow-up is above the model’s expected next output.', 'The recorded follow-up is at or below the model’s expected next output.'],
    ['The next output must equal the model’s expected value.', 'The model permits individual outputs different from its expected value.'],
    ['The observed change by itself proves that a coaching intervention caused it.', 'The observed change by itself does not prove a coaching effect.'],
    ['The model’s expected output is closer to the population mean than the first output.', 'The model’s expected output is at least as far from the population mean as the first output.'],
  ]
}
export const forecastAuditTemplate: Template<Forecast> = {
  id: 'judgment.regression.variety.forecast-claim-audit', version: 1, track: 'judgment', concept: 'judgment.regression', family: 'forecast-causal-claim-audit',
  status: 'draft', review: advancedReview, levels: [1, 2, 3].map(level => ({ level, initialRating: 400 + 600 * level })), skins: ['practice', 'machines'], dailyLevels: [2],
  sample(rng, level) {
    const mean = rng.int(50, 100), first = mean + rng.int(8, 32) * rng.pick([-1, 1]), beforeC = rng.int(40, 80), beforeT = beforeC + rng.int(-10, 10)
    const p = { ...claimSample(rng), level, mean, first, retention: rng.pick([25, 50, 75]), spread: rng.int(5, 30), followup: rng.int(30, 150), group: { beforeC, beforeT, afterC: beforeC + rng.int(-10, 20), afterT: beforeT + rng.int(-10, 25) }, assignment: rng.pick(['random', 'self-selected'] as const), followupComplete: rng.int(0, 1) === 1 }
    p.spread = Math.min(p.spread, Math.floor(forecastCenter(p)))
    return p
  },
  solve: p => claimAnswer(p, forecastTruths(p)),
  verify(p) {
    let truths: boolean[]
    if (p.level === 3) truths = [(p.group.afterT - p.group.afterC) > (p.group.beforeT - p.group.beforeC), p.followupComplete && p.assignment !== 'self-selected', false, false, p.followupComplete, p.group.afterT - p.group.afterC > 0]
    else {
      const expectation = (p.retention * p.first + (100 - p.retention) * p.mean) / 100
      const outcomes = [expectation - p.spread, expectation + p.spread]
      const average = outcomes.reduce((sum, value) => sum + value, 0) / 2
      truths = [average - p.first > 0, outcomes.every(value => Math.abs(value - p.mean) < Math.abs(p.first - p.mean)), p.followup - average > 0, outcomes.every(value => value === average), false, Math.abs(average - p.mean) < Math.abs(p.first - p.mean)]
    }
    return p.order.flatMap((kind, index) => Number(truths[kind]) === Number(p.asserted[kind]) ? [`c${index + 1}`] : [])
  },
  render(p, skin) {
    if (p.level === 3) return [
      ...paragraph(`A study of ${skin === 'practice' ? 'practice groups' : 'machine operators'} compares an assigned intervention group T and comparison group C. Assignment is ${p.assignment === 'random' ? 'random within the study sample' : 'self-selected by participants'}. ${p.followupComplete ? 'Every assigned unit has a recorded follow-up.' : 'Some assigned units have missing follow-up; no assumption about why they are missing is provided.'} The table contains observed sample means, not known population expectations. There is no interference, treatment status follows assignment, and outcomes are measured consistently; there is no claim that baseline means are forced to balance. Select every warranted statement. An unbiased estimator does not guarantee that one finite-sample estimate equals the true effect.`),
      { t: 'table', head: ['Group', 'Before mean', 'After mean'], rows: [['T', String(p.group.beforeT), String(p.group.afterT)], ['C', String(p.group.beforeC), String(p.group.afterC)]] },
    ]
    const center = forecastCenter(p)
    return paragraph(`A model concerns ${skin === 'practice' ? 'practice scores' : 'machine output'}, in output units. The population mean is ${p.mean}; the first observed output is ${p.first}. ${p.level === 1 ? `The model’s expected next output is ${display(center)}.` : `The model’s conditional expected next output is the population mean plus ${p.retention}/100 of the first output’s deviation from that mean.`} Under the model the next output has exactly two equally likely possibilities: ${display(center - p.spread)} and ${display(center + p.spread)}. A follow-up of ${p.followup} was recorded in a separate observational study with no assigned comparison group. The two-point model is a stated prediction model, not an established explanation of that study. Select every warranted claim about the model or the observational record.`)
  },
  answer: p => ({ type: 'multi', options: claimOptions(p, forecastStatements(p)) }),
  misconceptions: [
    { id: 'select-unsupported-claims', value: p => p.order.flatMap((kind, i) => p.asserted[kind] !== forecastTruths(p)[kind] ? [`c${i + 1}`] : []), feedback: () => 'A conditional expectation is not an individual guarantee. Choose claims supported by the prediction model or study design, rather than claims merely consistent with an observed improvement.' },
    { id: 'turn-prediction-or-improvement-into-proof', value: p => { const truths = forecastTruths(p); truths[3] = true; truths[p.level === 3 ? 1 : 4] = true; return claimAnswer(p, truths) }, feedback: () => 'Regression can occur without an intervention effect, and observed group means retain sampling uncertainty. Random assignment and complete follow-up support an average-effect estimator under assumptions; they do not prove every observed change is causal.' },
  ],
  steps: [
    numberStep(p => p.level === 3 ? 'What is the observed before-after change in T?' : 'What is the model’s expected next output?', p => p.level === 3 ? p.group.afterT - p.group.beforeT : forecastCenter(p), () => 'Compute the requested descriptive change or model expectation before interpreting it.'),
    numberStep(p => p.level === 3 ? 'What is the observed before-after change in C?' : 'What is recorded follow-up minus the model expectation?', p => p.level === 3 ? p.group.afterC - p.group.beforeC : p.followup - forecastCenter(p), () => 'A residual or a single-group change is not by itself a causal effect.'),
    numberStep(() => 'How many of the six claims are warranted?', p => claimAnswer(p, forecastTruths(p)).length, () => 'Separate model means, possible individual outcomes, descriptive sample statistics and what the study design can justify.'),
  ],
  solution(p) { const ids = claimAnswer(p, forecastTruths(p)); return [...paragraph(p.level === 3 ? `The observed difference-in-differences is ${did(p.group)}. Random assignment controls baseline confounding in expectation, while unexplained missing outcomes can invalidate an observed-outcome comparison. Neither randomization nor a positive sample contrast guarantees exact balance, an exact effect estimate, or a causal interpretation of one group’s gain alone.` : `The expected output is ${display(forecastCenter(p))}; possible individual outputs are ${display(forecastCenter(p) - p.spread)} and ${display(forecastCenter(p) + p.spread)}. Check both outcomes before claiming inevitable regression toward the mean. The recorded residual is ${display(p.followup - forecastCenter(p))}, which does not identify a coaching effect.`), ...paragraph(`Select ${ids.length ? ids.join(', ') : 'no claims'}.`), { t: 'list', items: claimOptions(p, forecastStatements(p)).map(o => `${o.id}: ${o.label} — ${ids.includes(o.id) ? 'warranted' : 'not warranted'}.`) }] },
}

export const VARIETY_DATA = [inverseInclusionTemplate, samplingAuditTemplate, captureRecaptureTemplate, throughputRankingTemplate, controlContrastTemplate, forecastAuditTemplate] as const
