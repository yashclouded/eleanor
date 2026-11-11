import type { Option, Rng, Template } from '../types.ts'
import { advancedReview, paragraph, display, numberStep } from './advanced-support.ts'

const ids = 'abcdef'.split('')
function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
const names = (order: string[], noun: string): Option[] => order.map(id => ({ id, label: `${noun} ${id.toUpperCase()}` }))
const indexOf = (id: string): number => ids.indexOf(id)

type Regret = { level: number; values: number[][]; fees: number[]; budget: number; order: string[] }
const feasible = (p: Regret): number[] => ids.map((_, i) => i).filter(i => p.level < 3 || p.fees[i] <= p.budget)
function worstRegrets(p: Regret): number[] {
  if (p.level === 1) return p.values.map(row => Math.max(...row))
  const allowed = feasible(p), net = p.values.map((row, i) => row.map(value => value - p.fees[i]))
  const best = net[0].map((_, state) => Math.max(...allowed.map(i => net[i][state])))
  return net.map((row, i) => allowed.includes(i) ? Math.max(...row.map((value, state) => best[state] - value)) : Infinity)
}
function regretWinner(p: Regret): string {
  const worst = worstRegrets(p)
  return ids[worst.indexOf(Math.min(...worst))]
}

export const minimaxRegretTemplate: Template<Regret> = {
  id: 'judgment.expected-value.variety.minimax-regret', version: 1, track: 'judgment', concept: 'judgment.expected-value', family: 'minimax-regret-decisions',
  status: 'draft', review: advancedReview, levels: [1, 2, 3].map(level => ({ level, initialRating: 300 + 600 * level })), skins: ['workshop', 'dispatch'], dailyLevels: [2],
  sample(rng, level) {
    for (let attempt = 0; attempt < 1000; attempt++) {
      const p: Regret = { level, values: Array.from({ length: 6 }, () => Array.from({ length: level + 1 }, () => rng.int(0, 100))), fees: ids.map(() => level === 3 ? rng.int(10, 35) : 0), budget: 25, order: shuffled(rng, ids) }
      if (level === 1) {
        const minima = p.values[0].map((_, state) => Math.min(...p.values.map(row => row[state])))
        p.values = p.values.map(row => row.map((value, state) => value - minima[state]))
      }
      const allowed = feasible(p), worst = worstRegrets(p), minimum = Math.min(...worst)
      if (allowed.length >= 2 && (level < 3 || allowed.length < 6) && worst.filter(value => value === minimum).length === 1) return p
    }
    throw new Error('Could not sample a unique minimax-regret decision')
  },
  solve: regretWinner,
  verify(p) {
    const allowed = feasible(p)
    let winner = '', smallest = Infinity
    for (const candidate of allowed) {
      let worst = -Infinity
      for (let state = 0; state < p.values[0].length; state++) {
        if (p.level === 1) worst = Math.max(worst, p.values[candidate][state])
        else for (const competitor of allowed) worst = Math.max(worst, p.values[competitor][state] - p.fees[competitor] - p.values[candidate][state] + p.fees[candidate])
      }
      if (worst < smallest) { smallest = worst; winner = ids[candidate] }
    }
    return winner
  },
  render(p, skin) {
    const blocks = paragraph(`A ${skin === 'workshop' ? 'workshop planner' : 'dispatch planner'} must choose one of six plans before the scenario is known. Scenario probabilities are unavailable; equal likelihood is not assumed. Use the specified minimax-regret rule: choose the feasible plan whose largest scenario regret is smallest. There is one unique winner.`)
    if (p.level === 1) blocks.push({ t: 'p', text: 'The table already gives regret in credits: the shortfall from the best achievable payoff in each scenario. Smaller regret is better.' })
    else blocks.push({ t: 'p', text: `The table gives gross payoff in credits. Regret in a scenario equals the best feasible net payoff in that scenario minus the chosen plan’s net payoff. ${p.level === 3 ? `A plan’s setup fee is deducted once from every payoff, and the fee must fit the ${p.budget}-credit setup budget. An unaffordable plan is neither selectable nor a regret benchmark.` : 'There are no setup costs or feasibility restrictions.'}` })
    blocks.push({ t: 'table', head: ['Plan', ...p.values[0].map((_, i) => `Scenario ${i + 1}`), ...(p.level === 3 ? ['Setup fee'] : [])], rows: p.order.map(id => [id.toUpperCase(), ...p.values[indexOf(id)].map(String), ...(p.level === 3 ? [String(p.fees[indexOf(id)])] : [])]) })
    blocks.push({ t: 'p', text: 'Which plan follows this rule?' })
    return blocks
  },
  answer: p => ({ type: 'choice', options: names(p.order, 'Plan') }),
  misconceptions: [
    { id: 'invent-uniform-scenario-probabilities', value: p => { const allowed = feasible(p); const averages = allowed.map(i => p.values[i].reduce((a, b) => a + b, 0) / p.values[i].length - p.fees[i]); const best = p.level === 1 ? Math.min(...averages) : Math.max(...averages); return ids[allowed[averages.indexOf(best)]] }, feedback: () => 'Averaging scenarios assumes probabilities that were not supplied. The stated criterion compares each plan’s largest regret.' },
    { id: 'optimize-best-case-only', value: p => { const allowed = feasible(p); const best = allowed.map(i => p.level === 1 ? Math.min(...p.values[i]) : Math.max(...p.values[i]) - p.fees[i]); const target = p.level === 1 ? Math.min(...best) : Math.max(...best); return ids[allowed[best.indexOf(target)]] }, feedback: () => 'The best possible outcome does not control worst-case regret. Inspect all scenarios and compare the largest shortfall for each feasible plan.' },
    { id: 'maximize-instead-of-minimize-regret', value: p => { const allowed = feasible(p), values = worstRegrets(p), maximum = Math.max(...allowed.map(i => values[i])); return ids[allowed.find(i => values[i] === maximum)!] }, feedback: () => 'Regret is a shortfall, so the minimax rule minimizes its worst value. A larger worst shortfall is worse.' },
  ],
  steps: [
    numberStep(() => 'How many plans are feasible under the stated constraints?', p => feasible(p).length, () => 'Determine feasibility before selecting either a plan or the statewise comparison benchmarks.'),
    numberStep(p => `What is the largest regret for feasible Plan ${ids[feasible(p)[0]].toUpperCase()}?`, p => worstRegrets(p)[feasible(p)[0]], () => 'Find that plan’s regret in every scenario, then take the largest.'),
    numberStep(() => 'What is the smallest achievable worst-case regret, in credits?', p => Math.min(...worstRegrets(p)), p => `The minimum largest shortfall is ${display(Math.min(...worstRegrets(p)))} credits.`),
  ],
  solution(p) { const worst = worstRegrets(p); return paragraph(`Compare statewise shortfalls, using feasible net payoffs when raw payoffs are supplied. The feasible plans’ largest regrets are ${feasible(p).map(i => `${ids[i].toUpperCase()}: ${display(worst[i])}`).join('; ')} credits. Plan ${regretWinner(p).toUpperCase()} uniquely minimizes this maximum. This is the requested decision rule, not a claim that minimax regret is universally preferable to other criteria.`) },
}

type Stopping = { level: number; current: number; offers: number[][]; chance: number[]; fees: number[] }
function stoppingValue(p: Stopping, stage: number, current: number): number {
  if (stage === p.offers.length) return current
  let continuation = -p.fees[stage]
  for (let outcome = 0; outcome < 2; outcome++) {
    const probability = (outcome ? p.chance[stage] : 100 - p.chance[stage]) / 100
    const next = p.level === 3 ? Math.max(current, p.offers[stage][outcome]) : p.offers[stage][outcome]
    continuation += probability * stoppingValue(p, stage + 1, next)
  }
  return Math.max(current, continuation)
}
function stopNow(p: Stopping): number { return stoppingValue(p, 0, p.current) }
function alwaysContinue(p: Stopping): number {
  if (p.level < 3) { const last = p.offers.length - 1; return (p.offers[last][0] * (100 - p.chance[last]) + p.offers[last][1] * p.chance[last]) / 100 - p.fees.reduce((a, b) => a + b, 0) }
  let total = 0
  for (let mask = 0; mask < 2 ** p.offers.length; mask++) {
    let probability = 1, maximum = p.current
    for (let stage = 0; stage < p.offers.length; stage++) { const outcome = (mask >> stage) & 1; probability *= (outcome ? p.chance[stage] : 100 - p.chance[stage]) / 100; maximum = Math.max(maximum, p.offers[stage][outcome]) }
    total += probability * maximum
  }
  return total - p.fees.reduce((a, b) => a + b, 0)
}

export const stoppingTemplate: Template<Stopping> = {
  id: 'judgment.expected-value.variety.finite-stopping', version: 1, track: 'judgment', concept: 'judgment.expected-value', family: 'finite-horizon-stopping',
  status: 'draft', review: advancedReview, levels: [1, 2, 3].map(level => ({ level, initialRating: 500 + 600 * level })), skins: ['salvage', 'exchange'], dailyLevels: [2],
  sample: (rng, level) => ({ level, current: rng.int(10, 90), offers: Array.from({ length: level }, () => [rng.int(0, 30), rng.int(40, 120)]), chance: Array.from({ length: level }, () => rng.int(15, 85)), fees: Array.from({ length: level }, () => rng.int(1, 12)) }),
  solve: stopNow,
  verify(p) {
    const decisionNodes = 2 ** p.offers.length - 1
    let best = -Infinity
    for (let policy = 0; policy < 2 ** decisionNodes; policy++) {
      const evaluate = (stage: number, current: number, node: number): number => {
        if (stage === p.offers.length || policy & (1 << node)) return current
        let value = -p.fees[stage]
        for (let outcome = 0; outcome < 2; outcome++) {
          const next = p.level === 3 ? Math.max(current, p.offers[stage][outcome]) : p.offers[stage][outcome]
          value += (outcome ? p.chance[stage] : 100 - p.chance[stage]) / 100 * evaluate(stage + 1, next, node * 2 + 1 + outcome)
        }
        return value
      }
      best = Math.max(best, evaluate(0, p.current, 0))
    }
    return best
  },
  render(p, skin) {
    const blocks = paragraph(`An invented ${skin === 'salvage' ? 'salvage exchange' : 'token exchange'} currently offers ${p.current} credits. Accepting ends the process. You may instead pay the next round’s fee to see a new offer. Future draws are independent, with the exact round-specific distributions below. You may decide whether to continue after seeing each offer; maximize expected final credits minus fees actually paid.`)
    blocks.push({ t: 'table', head: ['Next round', 'Low offer', 'High offer', 'High probability %', 'Fee to draw'], rows: p.offers.map((offers, i) => [String(i + 1), ...offers.map(String), String(p.chance[i]), String(p.fees[i])]) })
    blocks.push({ t: 'p', text: `${p.level === 3 ? 'Offers have recall: at every round you may accept the largest offer seen so far, including today’s offer.' : 'There is no recall: paying to continue permanently forfeits the current offer, even if the new offer is worse.'} After the last listed round, you must accept the available offer and cannot pay for another draw. Fees already paid are not charged again. What is the maximum expected net value of an optimal policy now, in credits?` })
    return blocks
  },
  answer: () => ({ type: 'number', unit: 'credits', tolerance: { abs: 0.001 } }),
  misconceptions: [
    { id: 'accept-current-without-valuing-options', value: p => p.current, feedback: () => 'Continuing can be valuable because later decisions adapt to observed offers. Compare accepting now with the optimized expected continuation value.' },
    { id: 'commit-to-all-future-draws', value: alwaysContinue, feedback: () => 'An optimal stopping policy can stop early on favorable branches. Do not charge every future fee or force every draw regardless of observed offers.' },
    { id: 'replace-expectation-by-best-possible-offer', value: p => Math.max(p.current, ...p.offers.flat()), feedback: () => 'The best possible offer is not guaranteed. Weight continuation branches by their probabilities and deduct a fee only when its draw is purchased.' },
  ],
  steps: [
    numberStep(() => 'What net value is guaranteed by accepting immediately?', p => p.current, () => 'No future draw is bought, so no listed fee is paid.'),
    numberStep(() => 'What is the expected raw offer in the last round, before its fee or any recall option?', p => { const last = p.offers.length - 1; return (p.offers[last][0] * (100 - p.chance[last]) + p.offers[last][1] * p.chance[last]) / 100 }, () => 'This is only a terminal building block. Earlier stages must preserve the ability to stop.'),
    numberStep(() => 'What is the optimized expected net value now?', stopNow, p => `Work backwards, comparing acceptance against paid continuation at every information state: ${display(stopNow(p))} credits.`),
  ],
  solution: p => paragraph(`At the last decision, compare the available offer with the next draw’s probability-weighted value minus its fee. Work backwards and make this comparison separately after each possible observed history. ${p.level === 3 ? 'The state includes the best offer retained so far; a worse new draw does not destroy it.' : 'Continuing replaces the current offer, so an earlier offer cannot be recovered.'} Each future fee is paid only on branches that continue. The optimal expected net value from today is ${display(stopNow(p))} credits.`),
}

type Dominance = { level: number; cost: number[]; risk: number[]; upper: number[]; time: number[]; order: string[] }
function dominates(p: Dominance, a: number, b: number): boolean {
  const aRisk = p.level === 3 ? p.upper[a] : p.risk[a]
  const noWorse = p.cost[a] <= p.cost[b] && aRisk <= p.risk[b] && (p.level === 1 || p.time[a] <= p.time[b])
  return noWorse && (p.cost[a] < p.cost[b] || aRisk < p.risk[b] || p.level > 1 && p.time[a] < p.time[b])
}
function frontier(p: Dominance): string[] {
  let survivors: number[] = []
  for (let candidate = 0; candidate < 6; candidate++) {
    if (survivors.some(i => dominates(p, i, candidate))) continue
    survivors = survivors.filter(i => !dominates(p, candidate, i))
    survivors.push(candidate)
  }
  return survivors.map(i => ids[i]).sort()
}

export const dominanceTemplate: Template<Dominance> = {
  id: 'judgment.risk-framing.variety.pareto-screen', version: 1, track: 'judgment', concept: 'judgment.risk-framing', family: 'pareto-risk-screen',
  status: 'draft', review: advancedReview, levels: [1, 2, 3].map(level => ({ level, initialRating: 200 + 600 * level })), skins: ['storage', 'delivery'], dailyLevels: [2],
  sample(rng, level) {
    const risk = ids.map(() => rng.int(5, 60))
    return { level, cost: ids.map(() => rng.int(10, 90)), risk, upper: risk.map(value => level === 3 ? value + rng.int(2, 20) : value), time: ids.map(() => rng.int(1, 24)), order: shuffled(rng, ids) }
  },
  solve: frontier,
  verify(p) {
    const retained: string[] = []
    for (let candidate = 0; candidate < 6; candidate++) {
      let beaten = false
      for (let challenger = 0; challenger < 6; challenger++) {
        if (candidate === challenger) continue
        let winsEveryCase = true
        for (const aRisk of p.level === 3 ? [p.risk[challenger], p.upper[challenger]] : [p.risk[challenger]]) for (const bRisk of p.level === 3 ? [p.risk[candidate], p.upper[candidate]] : [p.risk[candidate]]) {
          const comparisons = [p.cost[challenger] - p.cost[candidate], aRisk - bRisk, ...(p.level >= 2 ? [p.time[challenger] - p.time[candidate]] : [])]
          if (comparisons.some(value => value > 0) || !comparisons.some(value => value < 0)) winsEveryCase = false
        }
        if (winsEveryCase) beaten = true
      }
      if (!beaten) retained.push(ids[candidate])
    }
    return retained
  },
  render(p, skin) {
    const blocks = paragraph(`Six ${skin === 'storage' ? 'storage designs' : 'delivery plans'} are compared on the same workload and one-year horizon. Lower cost and lower failure risk are better${p.level > 1 ? ', and shorter recovery time is also better' : ''}. No exchange rate or utility weights between objectives have been supplied. A plan dominates another only when it is no worse on every listed objective and strictly better on at least one.`)
    if (p.level === 3) blocks.push({ t: 'p', text: 'Risks are intervals, not probability distributions. Use guaranteed dominance: the proposed replacement must dominate the other plan for every pair of actual risk values within their stated intervals. Overlapping intervals do not establish an ordering by themselves.' })
    blocks.push({ t: 'table', head: ['Plan', 'Annual cost, credits', p.level === 3 ? 'Failures per 1000, possible range' : 'Failures per 1000', ...(p.level > 1 ? ['Recovery hours'] : [])], rows: p.order.map(id => { const i = indexOf(id); return [id.toUpperCase(), String(p.cost[i]), p.level === 3 ? `${p.risk[i]}–${p.upper[i]}` : String(p.risk[i]), ...(p.level > 1 ? [String(p.time[i])] : [])] }) })
    blocks.push({ t: 'p', text: 'Select every plan that is not dominated under this rule. Retaining a plan does not mean it is best for every preference.' })
    return blocks
  },
  answer: p => ({ type: 'multi', options: names(p.order, 'Plan') }),
  misconceptions: [
    { id: 'cost-alone-determines-best', value: p => [ids[p.cost.indexOf(Math.min(...p.cost))]], feedback: () => 'Cheaper plans can trade away reliability or recovery time. Dominance requires a comparison on every stated objective.' },
    { id: 'risk-alone-determines-best', value: p => [ids[p.risk.indexOf(Math.min(...p.risk))]], feedback: () => 'The lowest risk does not automatically dominate cheaper or faster plans. With intervals, even the risk comparison must be guaranteed across endpoints.' },
    { id: 'all-tradeoffs-are-incomparable', value: () => [...ids], feedback: () => 'Some plans are worse on every objective. Remove those dominated plans while retaining genuine tradeoffs.' },
  ],
  steps: [
    numberStep(() => 'What is the lowest listed annual cost?', p => Math.min(...p.cost), () => 'Cost is one objective; it is not by itself a complete preference rule.'),
    numberStep(() => 'How many other plans does Plan A dominate under the stated rule?', p => ids.filter((_, i) => i !== 0 && dominates(p, 0, i)).length, () => 'Check every objective and require at least one strict improvement. For guaranteed comparisons, compare the replacement’s worst risk to the other plan’s best risk.'),
    numberStep(() => 'How many undominated plans remain?', p => frontier(p).length, p => `${frontier(p).length} plans remain after all valid dominance comparisons.`),
  ],
  solution(p) { const retained = frontier(p); const removed = ids.filter(id => !retained.includes(id)); return paragraph(`Retain Plans ${retained.map(id => id.toUpperCase()).join(', ')}. ${removed.length ? `Remove ${removed.map(id => `${id.toUpperCase()} (dominated by ${ids.filter((_, i) => dominates(p, i, indexOf(id))).map(winner => winner.toUpperCase()).join(' or ')})`).join('; ')}.` : 'No plan is dominated.'} ${p.level === 3 ? 'Guaranteed dominance compares upper risk of a replacement against lower risk of the alternative; an attractive midpoint is insufficient.' : 'A surviving plan can still be more expensive or riskier on one objective because no competitor improves all objectives at once.'} Without preference weights, the rule identifies a frontier rather than one universal winner.`) },
}

type ReportClaim = { id: string; absolute: number; relative: number; years: number; guaranteed: boolean; acknowledgesNull: boolean }
type RiskReport = { level: number; nControl: number; nProtected: number; casesControl: number; casesProtected: number; years: number; low: number; high: number; claims: ReportClaim[] }
const absoluteReduction = (p: RiskReport): number => 100 * (p.casesControl / p.nControl - p.casesProtected / p.nProtected)
const relativeReduction = (p: RiskReport): number => 100 * (1 - p.casesProtected * p.nControl / (p.casesControl * p.nProtected))
function justifiedClaim(p: RiskReport, c: ReportClaim): boolean {
  return Math.abs(c.absolute - absoluteReduction(p)) < 1e-8 && Math.abs(c.relative - relativeReduction(p)) < 1e-8 && c.years === p.years && !c.guaranteed && (p.level < 3 || c.acknowledgesNull === (p.low <= 0 && p.high >= 0))
}
function reportWinner(p: RiskReport): string { return p.claims.find(c => justifiedClaim(p, c))!.id }
function reportText(p: RiskReport, c: ReportClaim): string {
  return `Observed absolute reduction ${display(c.absolute)} percentage points; observed relative reduction ${display(c.relative)}%; horizon ${c.years} years. ${c.guaranteed ? 'This guarantees the protection works for every individual unit.' : 'These are estimates from group outcomes, not guaranteed individual benefits.'}${p.level === 3 ? ` The reported 95% interval ${c.acknowledgesNull ? 'includes' : 'excludes'} no difference.` : ''}`
}

export const riskReportTemplate: Template<RiskReport> = {
  id: 'judgment.risk-framing.variety.report-repair', version: 1, track: 'judgment', concept: 'judgment.risk-framing', family: 'risk-report-repair',
  status: 'draft', review: advancedReview, levels: [1, 2, 3].map(level => ({ level, initialRating: 200 + 600 * level })), skins: ['equipment', 'parcels'], dailyLevels: [2],
  sample(rng, level) {
    const controlRate = rng.int(8, 35), protectedRate = rng.int(1, controlRate - 2)
    const nControl = level === 1 ? 1000 : rng.int(8, 40) * 100
    let nProtected = level === 1 ? nControl : rng.int(8, 40) * 100
    if (level > 1 && nProtected === nControl) nProtected += 100
    const p: RiskReport = { level, nControl, nProtected, casesControl: controlRate * nControl / 100, casesProtected: protectedRate * nProtected / 100, years: rng.int(2, 8), low: rng.int(0, 1) ? -rng.int(1, 5) : Math.max(1, controlRate - protectedRate - rng.int(1, 5)), high: controlRate - protectedRate + rng.int(1, 5), claims: [] }
    const correct = { absolute: absoluteReduction(p), relative: relativeReduction(p), years: p.years, guaranteed: false, acknowledgesNull: level === 3 && p.low <= 0 && p.high >= 0 }
    const misread = { ...p, casesProtected: p.casesProtected + p.nProtected / 100 * rng.pick([-1, 1]) }
    const mistaken = { ...correct, absolute: absoluteReduction(misread), relative: relativeReduction(misread) }
    // Balance repeated figures and cautions so option consensus does not reveal the answer.
    const claims = [correct,
      { ...correct, guaranteed: true },
      mistaken,
      { ...mistaken, years: 1, guaranteed: true, acknowledgesNull: !correct.acknowledgesNull },
      { ...correct, absolute: correct.relative, relative: correct.absolute, years: 1 },
      { ...correct, absolute: correct.relative, relative: correct.absolute, years: 1, guaranteed: true, acknowledgesNull: !correct.acknowledgesNull },
    ]
    const labels = shuffled(rng, ids)
    p.claims = shuffled(rng, claims.map((c, i) => ({ ...c, id: labels[i] })))
    return p
  },
  solve: reportWinner,
  verify(p) {
    const controlPer100 = p.casesControl * 100 / p.nControl
    const protectedPer100 = p.casesProtected * 100 / p.nProtected
    const drop = controlPer100 - protectedPer100
    for (const claim of p.claims) {
      const impliedProtected = controlPer100 * (100 - claim.relative) / 100
      const intervalMatches = p.level < 3 || (claim.acknowledgesNull ? p.low <= 0 && p.high >= 0 : p.low > 0 || p.high < 0)
      if (Math.abs(claim.absolute - drop) < 1e-8 && Math.abs(impliedProtected - protectedPer100) < 1e-8 && claim.years === p.years && !claim.guaranteed && intervalMatches) return claim.id
    }
    throw new Error('No justified risk report')
  },
  render(p, skin) {
    const blocks = paragraph(`An invented randomized comparison followed ${skin === 'equipment' ? 'equipment units' : 'parcel shipments'} for ${p.years} years. All assigned units were followed for that same duration; each unit contributes at most one failure. The groups and event counts below are complete.`)
    blocks.push({ t: 'table', head: ['Group', 'Assigned and followed', 'Failures during follow-up'], rows: [['Control', String(p.nControl), String(p.casesControl)], ['Protected', String(p.nProtected), String(p.casesProtected)]] })
    if (p.level === 3) blocks.push({ t: 'p', text: `The analysis reports a 95% confidence interval for the absolute reduction of ${p.low} to ${p.high} percentage points. Negative reduction means harm and zero means no difference. Use that reported interval; you are not being asked to recompute it.` })
    blocks.push({ t: 'p', text: 'Which report correctly states both kinds of reduction, keeps the specified time horizon, and stays within what the data support?' })
    return blocks
  },
  answer: p => ({ type: 'choice', options: p.claims.map(c => ({ id: c.id, label: `Report ${c.id.toUpperCase()}: ${reportText(p, c)}` })) }),
  misconceptions: [
    { id: 'one-point-protected-risk-error', value: p => p.claims.find(c => Math.abs(c.absolute - absoluteReduction(p)) > 1e-8 && c.years === p.years && !c.guaranteed)!.id, feedback: () => 'Use the protected group’s stated event count and its own group size. Shifting that rate by one percentage point changes both the absolute and relative reductions; recompute both from the records.' },
    { id: 'group-estimate-as-individual-guarantee', value: p => p.claims.find(c => c.guaranteed)!.id, feedback: () => 'Group comparisons estimate average risks. They do not guarantee the outcome for each individual unit, and uncertainty must remain visible.' },
  ],
  steps: [
    numberStep(() => 'What percentage of control units failed?', p => 100 * p.casesControl / p.nControl, () => 'Use the control group’s own denominator, even if the groups have different sizes.'),
    numberStep(() => 'What is the observed absolute reduction, in percentage points?', absoluteReduction, p => `Subtract protected risk from control risk: ${display(absoluteReduction(p))} percentage points.`),
    numberStep(() => 'What is the observed relative reduction, as a percentage?', relativeReduction, p => `Divide the absolute reduction by control risk before multiplying by 100: ${display(relativeReduction(p))}%.`),
  ],
  solution(p) { const id = reportWinner(p); return paragraph(`Choose Report ${id.toUpperCase()}. Control risk is ${display(100 * p.casesControl / p.nControl)}% and protected risk is ${display(100 * p.casesProtected / p.nProtected)}%. Their difference is ${display(absoluteReduction(p))} percentage points; relative to the control risk that is ${display(relativeReduction(p))}%. The horizon remains ${p.years} years. ${p.level === 3 ? `The supplied interval [${p.low}, ${p.high}] ${p.low <= 0 && p.high >= 0 ? 'includes zero, so no difference remains compatible with the reported analysis' : 'excludes zero on the positive side under the reported analysis'}.` : ''} The report describes group estimates without promising an individual outcome.`) },
}

type Signal = { factor: number[]; copies: number; parent: number | null }
type Packet = { id: string; signals: Signal[] }
type Provenance = { level: number; priorA: number; priorB: number; packets: Packet[] }
function packetFactor(packet: Packet, countCopies = false): number[] {
  return packet.signals.reduce((product, signal) => [product[0] * signal.factor[0] ** (countCopies ? 1 + signal.copies : 1), product[1] * signal.factor[1] ** (countCopies ? 1 + signal.copies : 1)], [1, 1])
}
function packetOrder(p: Provenance, countCopies = false): string[] {
  return [...p.packets].sort((a, b) => { const x = packetFactor(a, countCopies), y = packetFactor(b, countCopies); return y[0] * x[1] - x[0] * y[1] }).map(packet => packet.id)
}

export const provenanceTemplate: Template<Provenance> = {
  id: 'judgment.odds.variety.evidence-provenance', version: 1, track: 'judgment', concept: 'judgment.odds', family: 'evidence-provenance-ranking',
  status: 'draft', review: advancedReview, levels: [1, 2, 3].map(level => ({ level, initialRating: 700 + 600 * level })), skins: ['instrument', 'inspection'], dailyLevels: [1],
  sample(rng, level) {
    const labels = shuffled(rng, ids), factors = [[2, 1], [3, 1], [5, 1], [1, 2], [1, 3], [1, 5]]
    const packets: Packet[] = []
    const sharedFactor = rng.int(2, 5)
    for (let i = 0; i < 6; i++) {
      for (let attempt = 0; attempt < 1000; attempt++) {
        const count = level === 1 ? i + 1 : rng.int(2, level === 3 ? 5 : 4)
        const candidate: Packet = { id: labels[i], signals: Array.from({ length: count }, (_, j) => ({ factor: level === 1 ? [sharedFactor, 1] : [...rng.pick(factors)], copies: rng.int(0, 3), parent: level === 3 && j > 0 && rng.int(0, 1) ? j - 1 : null })) }
        const factor = packetFactor(candidate)
        if (packets.every(existing => { const other = packetFactor(existing); return factor[0] * other[1] !== factor[1] * other[0] })) { packets.push(candidate); break }
        if (attempt === 999) throw new Error('Could not sample distinct evidence strengths')
      }
    }
    return { level, priorA: rng.int(1, 9), priorB: rng.int(10, 50), packets: shuffled(rng, packets) }
  },
  solve: p => packetOrder(p),
  verify(p) {
    const posteriors = p.packets.map(packet => {
      let probability = p.priorA / (p.priorA + p.priorB)
      for (const signal of packet.signals) {
        const ratio = signal.factor[0] / signal.factor[1]
        probability = probability * ratio / (probability * ratio + 1 - probability)
      }
      return { id: packet.id, probability }
    })
    const result: string[] = []
    while (posteriors.length) { let best = 0; for (let i = 1; i < posteriors.length; i++) if (posteriors[i].probability > posteriors[best].probability) best = i; result.push(posteriors.splice(best, 1)[0].id) }
    return result
  },
  render(p, skin) {
    const blocks = paragraph(`Six evidence packets concern the same hypothesis H about an invented ${skin === 'instrument' ? 'instrument mode' : 'inspection fault'}. Each packet is evaluated separately from the same prior odds H:not-H=${p.priorA}:${p.priorB}. A likelihood ratio (LR) above one favors H; below one favors not-H. Packets are alternatives, not evidence to combine with one another.`)
    blocks.push({ t: 'p', text: p.level < 3 ? 'Within a packet, distinct source findings are independent conditional on H and also conditional on not-H. Copies are exact deterministic reproductions of their named source, so once that source is known, a copy adds no evidence.' : 'A finding with no parent is independent of the other such findings conditional on either hypothesis. A finding with a named parent has the stated conditional LR after that parent’s reported result; given its parent and the hypothesis, it is independent of all earlier non-parent findings. Every listed finding’s reported result is observed. Copies are deterministic reproductions and add no evidence once their source is known.' })
    blocks.push({ t: 'table', head: ['Packet', 'Source findings and provenance'], rows: p.packets.map(packet => [packet.id.toUpperCase(), packet.signals.map((s, i) => `S${i + 1}: ${s.parent === null ? 'new source, LR' : `analysis conditional on S${s.parent + 1}, conditional LR`} ${s.factor[0]}/${s.factor[1]}; ${s.copies} exact ${s.copies === 1 ? 'copy' : 'copies'} of S${i + 1}`).join('; ')]) })
    blocks.push({ t: 'p', text: 'Order all six packets from highest to lowest posterior probability of H. Their true evidence strengths are distinct; count independent or conditional source information, not document volume.' })
    return blocks
  },
  answer: p => ({ type: 'sequence', items: names(p.packets.map(packet => packet.id), 'Packet') }),
  misconceptions: [
    { id: 'copied-reports-as-independent-evidence', value: p => packetOrder(p, true), feedback: () => 'A deterministic copy has conditional likelihood ratio one once its source is known. Multiply each genuinely new source or conditional analysis once, regardless of how many documents repeat it.' },
    { id: 'reverse-likelihood-ratio-direction', value: p => packetOrder(p).reverse(), feedback: () => 'These likelihood ratios compare H with not-H in that order. Larger combined ratios imply larger posterior H probability when the prior is shared.' },
  ],
  steps: [
    numberStep(() => 'What are the shared prior decimal odds H:not-H?', p => p.priorA / p.priorB, () => 'Every packet begins from the same prior, so its common value cannot change their relative ranking.'),
    numberStep(p => `What is the combined likelihood ratio of Packet ${p.packets[0].id.toUpperCase()}, counting new information once?`, p => { const factor = packetFactor(p.packets[0]); return factor[0] / factor[1] }, () => 'Multiply new-source and correctly conditioned analysis factors. A copy contributes a factor of one.'),
    numberStep(p => `What is the posterior H probability for Packet ${p.packets[0].id.toUpperCase()}, as a percentage?`, p => { const factor = packetFactor(p.packets[0]); const odds = p.priorA * factor[0] / (p.priorB * factor[1]); return 100 * odds / (1 + odds) }, () => 'Posterior odds equal prior odds times the combined factor. Convert odds to probability only after that update.'),
  ],
  solution(p) { const order = packetOrder(p); return paragraph(`The order is ${order.map(id => `Packet ${id.toUpperCase()}`).join(' → ')}. Combined likelihood ratios, counting each source finding or conditional analysis once, are ${order.map(id => { const factor = packetFactor(p.packets.find(packet => packet.id === id)!); return `${id.toUpperCase()}: ${factor[0]}/${factor[1]}` }).join('; ')}. Exact copies add no information. Because the prior odds are identical, this combined-LR ordering is exactly the posterior H ordering, including factors that favor not-H.`) },
}

type Book = { id: string; quotes: number[] }
type Coherence = { level: number; books: Book[] }
function coherent(p: Coherence, book: Book): boolean {
  const q = book.quotes
  if (p.level === 1) return q.every(x => x >= 0 && x <= 100) && q[0] + q[1] + q[2] === 100
  if (p.level === 2) return q.every(x => x >= 0 && x <= 100) && q[2] <= Math.min(q[0], q[1]) && q[2] >= Math.max(0, q[0] + q[1] - 100) && q[3] === q[0] + q[1] - q[2]
  const b = q[0] * q[1] + (100 - q[0]) * q[2]
  return q.slice(0, 3).every(x => x > 0 && x < 100) && q[3] > 0 && q[4] > 0 && q[5] === q[0] * q[1] && b * q[4] === (10000 - b) * q[3]
}
function coherentBook(p: Coherence): string { return p.books.find(book => coherent(p, book))!.id }

export const coherenceTemplate: Template<Coherence> = {
  id: 'judgment.odds.variety.coherent-price-book', version: 1, track: 'judgment', concept: 'judgment.odds', family: 'probability-price-coherence',
  status: 'draft', review: advancedReview, levels: [1, 2, 3].map(level => ({ level, initialRating: 300 + 700 * level })), skins: ['tokens', 'tickets'], dailyLevels: [2],
  sample(rng, level) {
    const labels = shuffled(rng, ids)
    const books: Book[] = labels.map((id, index) => {
      let quotes: number[]
      if (level === 1) { const a = rng.int(10, 40), b = rng.int(10, 40); quotes = [a, b, 100 - a - b] }
      else if (level === 2) { const both = rng.int(10, 25), aOnly = rng.int(10, 25), bOnly = rng.int(10, 25); quotes = [both + aOnly, both + bOnly, both, both + aOnly + bOnly] }
      else { const a = rng.int(10, 80), givenA = rng.int(10, 90), givenNotA = rng.int(10, 90), b = a * givenA + (100 - a) * givenNotA; quotes = [a, givenA, givenNotA, b, 10000 - b, a * givenA] }
      if (index > 0) quotes[(index - 1) % quotes.length] += (rng.int(0, 1) ? 1 : -1) * (1 + Math.floor((index - 1) / quotes.length))
      return { id, quotes }
    })
    return { level, books: shuffled(rng, books) }
  },
  solve: coherentBook,
  verify(p) {
    for (const book of p.books) {
      const q = book.quotes
      if (p.level === 1) {
        const remaining = 100 - q[0] - q[1]
        if (q[0] >= 0 && q[1] >= 0 && remaining >= 0 && remaining === q[2]) return book.id
      } else if (p.level === 2) {
        const atoms = [q[2], q[0] - q[2], q[1] - q[2], 100 - q[3]]
        if (atoms.every(x => x >= 0) && atoms.reduce((a, b) => a + b, 0) === 100) return book.id
      } else {
        const both = q[5], aOnly = q[0] * 100 - both, bOnly = (100 - q[0]) * q[2], neither = (100 - q[0]) * (100 - q[2])
        if ([both, aOnly, bOnly, neither].some(x => x < 0) || q[0] <= 0 || q[0] >= 100 || q[4] <= 0) continue
        const conditionMatches = both * 100 === (both + aOnly) * q[1]
        const oddsMatch = (both + bOnly) * q[4] === (aOnly + neither) * q[3]
        if (conditionMatches && oddsMatch && both + aOnly + bOnly + neither === 10000) return book.id
      }
    }
    throw new Error('No coherent book')
  },
  render(p, skin) {
    const blocks = paragraph(`A classroom ${skin === 'tokens' ? 'token exchange' : 'ticket exercise'} publishes six proposed probability books. Treat every quoted probability as exact. Choose the only book consistent with one nonnegative probability distribution over the stated events. This checks internal coherence, not whether the quoted beliefs match a real population.`)
    if (p.level === 1) blocks.push({ t: 'p', text: 'Exactly one of events A, B or C occurs: they are mutually exclusive and exhaustive. Each table entry is its probability as a percentage.' })
    else if (p.level === 2) blocks.push({ t: 'p', text: 'Events A and B may overlap. The four quotes are P(A), P(B), P(A and B), and P(A or B), all as percentages. No independence assumption is supplied.' })
    else blocks.push({ t: 'p', text: 'Events A and B may overlap. The book quotes P(A), P(B given A), and P(B given not A) as percentages; odds B:not B as an exact weight ratio; and P(A and B) as an exact fraction with denominator 10000. Neither independence nor mutual exclusivity is assumed.' })
    blocks.push({ t: 'table', head: ['Book', ...(p.level === 1 ? ['P(A) %', 'P(B) %', 'P(C) %'] : p.level === 2 ? ['P(A) %', 'P(B) %', 'P(A and B) %', 'P(A or B) %'] : ['P(A) %', 'P(B given A) %', 'P(B given not A) %', 'Odds B:not B', 'P(A and B)'])], rows: p.books.map(book => [book.id.toUpperCase(), ...(p.level < 3 ? book.quotes.map(String) : [...book.quotes.slice(0, 3).map(String), `${book.quotes[3]}:${book.quotes[4]}`, `${book.quotes[5]}/10000`])]) })
    blocks.push({ t: 'p', text: 'Which book’s quotes can all be true at once?' })
    return blocks
  },
  answer: p => ({ type: 'choice', options: names(p.books.map(book => book.id), 'Book') }),
  misconceptions: [
    { id: 'individual-bounds-imply-coherence', value: p => p.books.find(book => book.quotes.slice(0, p.level === 3 ? 3 : undefined).every(q => q >= 0 && q <= 100))!.id, feedback: () => 'Each quote can lie between zero and one while the collection is inconsistent. Joint, union, conditional and odds quotes must describe the same probability distribution.' },
    { id: 'smallest-quotes-must-be-consistent', value: p => [...p.books].sort((a, b) => a.quotes.reduce((x, y) => x + y, 0) - b.quotes.reduce((x, y) => x + y, 0))[0].id, feedback: () => 'Smaller numbers do not establish coherence. Reconstruct the probabilities of disjoint outcomes and check that they are nonnegative, sum to one, and reproduce every quote.' },
    { id: 'largest-quotes-must-be-consistent', value: p => [...p.books].sort((a, b) => b.quotes.reduce((x, y) => x + y, 0) - a.quotes.reduce((x, y) => x + y, 0))[0].id, feedback: () => 'A confidence book is not validated by larger totals. Check the logical relations among events rather than maximizing quoted values.' },
  ],
  steps: [
    numberStep(() => 'What total probability must all mutually exclusive, exhaustive elementary outcomes have?', () => 1, () => 'Their probabilities must sum to one, with none negative.'),
    numberStep(p => p.level === 1 ? `For Book ${p.books[0].id.toUpperCase()}, what percentage remains for C after A and B?` : p.level === 2 ? `For Book ${p.books[0].id.toUpperCase()}, what union percentage is implied by its A, B and joint quotes?` : `For Book ${p.books[0].id.toUpperCase()}, what percentage for B is implied by its two conditional quotes?`, p => { const q = p.books[0].quotes; return p.level === 1 ? 100 - q[0] - q[1] : p.level === 2 ? q[0] + q[1] - q[2] : (q[0] * q[1] + (100 - q[0]) * q[2]) / 100 }, () => 'Use event logic to derive a missing marginal or union before checking the stated quote.'),
    numberStep(() => 'How many books satisfy every required probability relation?', p => p.books.filter(book => coherent(p, book)).length, () => 'Exactly one book passes all relations; satisfying one equation is not enough.'),
  ],
  solution(p) { const winner = p.books.find(book => coherent(p, book))!; const q = winner.quotes; return paragraph(`Choose Book ${winner.id.toUpperCase()}. ${p.level === 1 ? `Its mutually exclusive and exhaustive probabilities sum to ${q[0]}+${q[1]}+${q[2]}=100%, and none is negative.` : p.level === 2 ? `Its four elementary percentages are both=${q[2]}, A only=${q[0] - q[2]}, B only=${q[1] - q[2]}, neither=${100 - q[3]}. They are nonnegative and sum to 100%, reproducing the joint and union quotes.` : `Its joint A-and-B probability is ${q[0]}%×${q[1]}%=${q[5]}/10000. Total probability gives P(B)=[${q[0]}×${q[1]}+${100 - q[0]}×${q[2]}]/10000, whose odds are exactly ${q[3]}:${q[4]}. The resulting elementary outcomes are nonnegative and reproduce all quotes.`} Every other book fails at least one of these simultaneous relations. Coherence concerns consistency, not proof of empirical accuracy.`) },
}

export const VARIETY_DECISIONS = [minimaxRegretTemplate, stoppingTemplate, dominanceTemplate, riskReportTemplate, provenanceTemplate, coherenceTemplate] as const
