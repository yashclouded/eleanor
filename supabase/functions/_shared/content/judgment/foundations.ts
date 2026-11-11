import type { Block, Template } from '../types.ts'

const levels = [1, 2, 3, 4, 5, 6].map(level => ({ level, initialRating: 200 + 200 * level }))
const review = { author: 'GPT-6', reviewer: null, reviewedAt: null }
const exact = { abs: 0.000001 }
const percent = { abs: 0.01 }
const text = (value: string): Block[] => [{ t: 'p', text: value }]
const display = (value: number): string => String(Number(value.toFixed(6)))

type Counts = { level: number; a: number; b: number; c: number; d: number }
function frequencyAnswer(p: Counts): number {
  switch (p.level) {
    case 1: return p.a
    case 2: return p.a + p.b
    case 3: return p.a + p.b + p.c
    case 4: return p.b + p.c
    case 5: return 100 * p.a / (p.a + p.b)
    default: return 100 * (p.a / (p.a + p.b) - p.c / (p.c + p.d))
  }
}
export const frequenciesFoundation: Template<Counts> = {
  id: 'judgment.frequencies.foundations', version: 1, track: 'judgment', concept: 'judgment.frequencies', family: 'frequency-classification',
  status: 'draft', review, levels, skins: ['workshop', 'library'], dailyLevels: [6],
  sample: (rng, level) => ({ level, a: rng.int(1, level < 3 ? 20 : 150), b: rng.int(1, level < 3 ? 20 : 150), c: rng.int(1, level < 3 ? 20 : 150), d: rng.int(1, level < 3 ? 20 : 150) }),
  solve: frequencyAnswer,
  verify(p) {
    const cells = [{ blue: true, marked: true, count: p.a }, { blue: true, marked: false, count: p.b }, { blue: false, marked: true, count: p.c }, { blue: false, marked: false, count: p.d }]
    const count = (blue: boolean | null, marked: boolean | null) => cells.filter(c => (blue === null || c.blue === blue) && (marked === null || c.marked === marked)).reduce((n, c) => n + c.count, 0)
    if (p.level === 1) return count(true, true)
    if (p.level === 2) return count(true, null)
    if (p.level === 3) return count(null, null) - count(false, false)
    if (p.level === 4) return count(null, null) - count(true, true) - count(false, false)
    if (p.level === 5) return 100 - 100 * count(true, false) / count(true, null)
    return 100 * (count(false, false) / count(false, null) - count(true, false) / count(true, null))
  },
  render: (p, skin) => [
    ...text(`${skin === 'workshop' ? 'A workshop classifies parts' : 'A library classifies storage boxes'} by colour (blue or other) and by whether they carry a mark. Each object belongs to exactly one of the four categories shown.`),
    { t: 'chart', kind: 'bar', title: 'Object counts by category', xLabel: 'Category', yLabel: 'Objects', points: [{ label: 'Blue, marked', value: p.a }, { label: 'Blue, unmarked', value: p.b }, { label: 'Other, marked', value: p.c }, { label: 'Other, unmarked', value: p.d }] },
    ...text(['', 'How many objects are both blue and marked?', 'How many objects are blue, whether marked or not?', 'How many objects are blue or marked (or both)?', 'How many objects have exactly one of the properties blue and marked?', 'Among blue objects, what percentage are marked?', 'What is the marked percentage among blue objects minus the marked percentage among other objects, in percentage points? A negative answer is allowed.'][p.level]),
  ],
  answer: p => ({ type: 'number', unit: p.level === 5 ? '%' : p.level === 6 ? 'percentage points' : 'objects', tolerance: exact }),
  misconceptions: [
    { id: 'use-entire-population', value: p => p.level >= 5 ? 100 * p.a / (p.a + p.b + p.c + p.d) : p.a + p.b + p.c + p.d, feedback: () => 'Count only the categories requested. For a percentage within a group, use that group as the denominator.' },
    { id: 'include-overlap-twice', value: p => p.level >= 5 ? 100 * (p.a + p.b) / (p.a + p.b + p.c + p.d) : 2 * p.a + p.b + p.c, feedback: () => 'The four categories are disjoint. An object that is both blue and marked still counts only once in a union.' },
  ],
  steps: [
    { prompt: () => text('How many objects are there altogether?'), answer: p => p.a + p.b + p.c + p.d, tolerance: exact, explain: () => text('Add the four mutually exclusive categories once each.') },
    { prompt: () => text('How many blue objects are there?'), answer: p => p.a + p.b, tolerance: exact, explain: p => text(`Blue objects = ${p.a} + ${p.b} = ${p.a + p.b}.`) },
    { prompt: () => text('What is the requested count, percentage or difference in percentage points?'), answer: frequencyAnswer, tolerance: exact, explain: p => text(`Select the requested cells and, when needed, divide by the appropriate group total. The result is ${display(frequencyAnswer(p))}.`) },
  ],
  solution: p => text(`The cells are blue-and-marked ${p.a}, blue-only ${p.b}, marked-only ${p.c}, and neither ${p.d}. ${p.level <= 4 ? ['','Read the blue-and-marked cell.', `Blue = ${p.a} + ${p.b}.`, `Blue or marked = ${p.a} + ${p.b} + ${p.c}; exclude only neither.`, `Exactly one = ${p.b} + ${p.c}; exclude both and neither.`][p.level] : p.level === 5 ? `Among blue objects the denominator is ${p.a + p.b}, so calculate 100 × ${p.a}/${p.a + p.b}.` : `Compare 100 × ${p.a}/${p.a + p.b} with 100 × ${p.c}/${p.c + p.d}, using a separate denominator for each colour group.`} Result: ${display(frequencyAnswer(p))}${p.level === 5 ? '%' : p.level === 6 ? ' percentage points' : ' objects'}.`),
}

type Estimate = { level: number; people: number; percent: number; trips: number; units: number; days: number; capacity: number; utilization: number }
function estimatedDemand(p: Estimate): number { return p.people * p.percent / 100 * p.trips * p.units * p.days }
function estimationAnswer(p: Estimate): number { return estimatedDemand(p) / (p.capacity * p.utilization / 100) }
export const estimationFoundation: Template<Estimate> = {
  id: 'judgment.estimation.foundations', version: 1, track: 'judgment', concept: 'judgment.estimation', family: 'estimation-demand-chain',
  status: 'draft', review, levels, skins: ['water', 'charging'], dailyLevels: [6],
  sample: (rng, level) => ({ level, people: level === 1 ? rng.int(2, 20) : 100 * rng.int(10, 150), percent: level >= 2 ? rng.int(5, 95) : 100, trips: level >= 3 ? rng.int(1, 12) : 1, units: rng.int(2, 20), days: level >= 4 ? rng.int(2, 30) : 1, capacity: level >= 5 ? rng.int(20, 200) : 1, utilization: level >= 6 ? rng.int(20, 95) : 100 }),
  solve: estimationAnswer,
  verify(p) {
    let total = 0
    for (let day = 0; day < p.days; day++) for (let trip = 0; trip < p.trips; trip++) total += (p.people / 100 * p.percent) * p.units
    return total / (p.capacity * p.utilization / 100)
  },
  render: (p, skin) => [
    ...text(`A ${skin === 'water' ? 'refill station measures water in litres' : 'charging station measures energy in kWh'}. Use the stated planning assumptions; no local knowledge is needed. There are ${p.people} people. ${p.level >= 2 ? `Each day, ${p.percent}% of them use the station.` : 'Every person uses the station once.'} ${p.level >= 3 ? `Each user makes ${p.trips} visits per day.` : ''} Each visit uses ${p.units} ${skin === 'water' ? 'litres' : 'kWh'}. ${p.level >= 4 ? `Plan for ${p.days} days with the same average demand every day.` : ''}`),
    ...(p.level >= 5 ? text(`One supply unit provides ${p.capacity} ${skin === 'water' ? 'litres' : 'kWh'} over this entire planning period${p.level === 6 ? ` before allowing for usable output of only ${p.utilization}% of that amount` : ''}. Units can be treated as divisible for this estimate.`) : []),
    ...text(p.level >= 5 ? 'Estimate how many supply units cover the total demand. Do not round up to a whole unit.' : `Estimate the total demand over ${p.days === 1 ? 'one day' : 'the planning period'}, in ${skin === 'water' ? 'litres' : 'kWh'}.`),
  ],
  answer: p => ({ type: 'number', unit: p.level >= 5 ? 'supply units' : 'consumption units', tolerance: { abs: 0.1 } }),
  misconceptions: [
    { id: 'ignore-use-rate-or-capacity', value: p => p.level === 1 ? p.people + p.units : p.level < 5 ? p.people * p.trips * p.units * p.days : estimatedDemand(p), feedback: () => 'Track the units through the chain: people × user fraction × visits × consumption × days. Divide by usable supply per unit when supply units are requested.' },
    { id: 'drop-consumption-factor', value: p => p.people * p.percent / 100 * p.trips * p.days / (p.capacity * p.utilization / 100), feedback: () => 'A visit is not a unit of consumption. Multiply the number of visits by consumption per visit before sizing the supply.' },
  ],
  steps: [
    { prompt: () => text('How many people use the station per day under the assumptions?'), answer: p => p.people * p.percent / 100, tolerance: exact, explain: p => text(`${p.people} × ${p.percent}/100 = ${p.people * p.percent / 100} daily users.`) },
    { prompt: () => text('What is the total consumption over the stated planning period?'), answer: estimatedDemand, tolerance: exact, explain: p => text(`Daily users × ${p.trips} visits × ${p.units} per visit × ${p.days} days = ${estimatedDemand(p)}.`) },
    { prompt: () => text('What is the requested demand estimate or supply-unit estimate?'), answer: estimationAnswer, tolerance: exact, explain: p => text(`Use demand directly unless supply units are requested; then divide by ${display(p.capacity * p.utilization / 100)} usable consumption units per supply unit. Result: ${display(estimationAnswer(p))}.`) },
  ],
  solution: p => text(`Decompose demand rather than guessing a single total: ${p.people} people × ${p.percent}/100 users per person × ${p.trips} visits per user per day × ${p.units} consumption units per visit × ${p.days} days = ${estimatedDemand(p)} consumption units. ${p.level >= 5 ? `Each supply unit contributes ${p.capacity} × ${p.utilization}/100 = ${display(p.capacity * p.utilization / 100)} usable consumption units. Dividing gives ${display(estimationAnswer(p))} supply units.` : `The requested total is ${estimatedDemand(p)} consumption units.`} This is a model-based planning estimate, not a measured demand forecast.`),
}

function conditionalAnswer(p: Counts): number {
  const n = p.a + p.b + p.c + p.d
  switch (p.level) {
    case 1: return 100 * (p.a + p.b) / n
    case 2: return 100 * p.a / n
    case 3: return 100 * p.a / (p.a + p.c)
    case 4: return 100 * p.d / (p.c + p.d)
    case 5: return 100 * (p.a + p.b + p.c) / n
    default: return 100 * ((p.a + p.c) * (p.a + p.b) - p.a) / (n * (n - 1))
  }
}
export const conditionalFoundation: Template<Counts> = {
  id: 'judgment.conditional.foundations', version: 1, track: 'judgment', concept: 'judgment.conditional', family: 'conditional-finite-population',
  status: 'draft', review, levels, skins: ['parcels', 'tokens'], dailyLevels: [6],
  sample: (rng, level) => ({ level, a: rng.int(1, level < 3 ? 20 : 120), b: rng.int(1, level < 3 ? 20 : 120), c: rng.int(1, level < 3 ? 20 : 120), d: rng.int(1, level < 3 ? 20 : 120) }),
  solve: conditionalAnswer,
  verify(p) {
    const n = p.a + p.b + p.c + p.d
    if (p.level === 1) return 100 - 100 * (p.c + p.d) / n
    if (p.level === 2) return 100 * ((p.a + p.b) / n) * (p.a / (p.a + p.b))
    if (p.level === 3) return 100 - 100 * p.c / (p.a + p.c)
    if (p.level === 4) return 100 - 100 * p.c / (p.c + p.d)
    if (p.level === 5) return 100 - 100 * p.d / n
    // Split the first marked draw into A and B; only an A draw reduces the second A count.
    return 100 * (p.a / n * (p.a + p.b - 1) / (n - 1) + p.c / n * (p.a + p.b) / (n - 1))
  },
  render: (p, skin) => [
    ...text(`A box contains ${skin === 'parcels' ? 'parcels' : 'tokens'} labelled A or B. Each is also either marked or unmarked. Every draw is uniform over the objects currently in the box.`),
    { t: 'table', caption: 'Counts of objects', head: ['Label', 'Marked', 'Unmarked'], rows: [['A', String(p.a), String(p.b)], ['B', String(p.c), String(p.d)]] },
    ...text(['', 'For one draw from the full box, what is the probability of label A, as a percentage?', 'For one draw from the full box, what is the probability of an object that is both A and marked, as a percentage?', 'Given that a drawn object is marked, what is the probability that it has label A, as a percentage?', 'Given that a drawn object has label B, what is the probability that it is unmarked, as a percentage?', 'For one draw, what is the probability that the object has label A or is marked (or both), as a percentage?', 'Draw two distinct objects in order without replacement. What is the probability that the first is marked and the second has label A, as a percentage?'][p.level]),
  ],
  answer: () => ({ type: 'number', unit: '%', tolerance: percent }),
  misconceptions: [
    { id: 'wrong-reference-group', value: p => 100 * p.a / (p.level === 2 ? p.a + p.b : p.a + p.b + p.c + p.d), feedback: () => 'The denominator must match the reference group in the question. For two draws without replacement, the second denominator and sometimes its numerator change.' },
    { id: 'reverse-target-event', value: p => 100 - conditionalAnswer(p), feedback: () => 'This is the complement of the requested event. Identify which outcome is being asked for before subtracting from 100%.' },
  ],
  steps: [
    { prompt: () => text('How many objects are in the full box?'), answer: p => p.a + p.b + p.c + p.d, tolerance: exact, explain: () => text('Add all four cells; the rows and columns classify the same objects.') },
    { prompt: () => text('How many objects are marked?'), answer: p => p.a + p.c, tolerance: exact, explain: p => text(`Marked objects = ${p.a} + ${p.c} = ${p.a + p.c}.`) },
    { prompt: () => text('What is the requested probability as a percentage?'), answer: conditionalAnswer, tolerance: percent, explain: p => text(`Use the specified reference group and account for removal if there are two draws. Result: ${display(conditionalAnswer(p))}%.`) },
  ],
  solution: p => text(p.level === 6 ? `There are ${p.a + p.b + p.c + p.d} objects. If the first marked object is A, the remaining A count falls by one; if it is B, it does not. Sum the disjoint paths: [${p.a}/${p.a + p.b + p.c + p.d} × ${p.a + p.b - 1}/${p.a + p.b + p.c + p.d - 1} + ${p.c}/${p.a + p.b + p.c + p.d} × ${p.a + p.b}/${p.a + p.b + p.c + p.d - 1}] × 100 = ${display(conditionalAnswer(p))}%.` : `Use the table to select the event and its reference group. ${['', `A includes ${p.a} + ${p.b} objects out of all ${p.a + p.b + p.c + p.d}.`, `A and marked is the single cell ${p.a}, out of all ${p.a + p.b + p.c + p.d}.`, `Restrict to the ${p.a + p.c} marked objects; ${p.a} have label A.`, `Restrict to the ${p.c + p.d} B objects; ${p.d} are unmarked.`, `Exclude only B-and-unmarked, so the favourable count is ${p.a + p.b + p.c}.`][p.level]} Divide the favourable count by that reference total and multiply by 100: ${display(conditionalAnswer(p))}%.`),
}

type Screening = Counts & { multiplier: number; sensitivity: number; falsePositive: number }
function screeningAnswer(p: Screening): number {
  switch (p.level) {
    case 1: return p.a
    case 2: return 100 * p.a / (p.a + p.c)
    case 3: return 100 * p.d / (p.b + p.d)
    case 4: return 100 * p.b / (p.a + p.b)
    case 5: return 100 * p.multiplier * p.a / (p.multiplier * p.a + p.c)
    default: return 100 * p.a * p.sensitivity / (p.a * p.sensitivity + p.c * p.falsePositive)
  }
}
export const baseRatesFoundation: Template<Screening> = {
  id: 'judgment.base-rates.foundations', version: 1, track: 'judgment', concept: 'judgment.base-rates', family: 'screening-natural-counts',
  status: 'draft', review, levels, skins: ['inspection', 'sorting'], dailyLevels: [6],
  sample: (rng, level) => ({ level, a: rng.int(1, level === 1 ? 15 : 120), b: rng.int(1, level === 1 ? 15 : 120), c: rng.int(1, level === 1 ? 15 : 120), d: rng.int(1, level === 1 ? 15 : 120), multiplier: level === 5 ? rng.int(2, 12) : 1, sensitivity: level === 6 ? rng.int(60, 99) : 100, falsePositive: level === 6 ? rng.int(1, 30) : 100 }),
  solve: screeningAnswer,
  verify(p) {
    const cases = p.a + p.b, noncases = p.c + p.d
    const detection = p.a / cases, falseAlarm = p.c / noncases
    if (p.level === 1) return cases - p.b
    if (p.level === 2) return 100 / (1 + noncases * falseAlarm / (cases * detection))
    if (p.level === 3) return 100 / (1 + cases * (1 - detection) / (noncases * (1 - falseAlarm)))
    if (p.level === 4) return 100 * (1 - detection)
    if (p.level === 5) return 100 / (1 + noncases * falseAlarm / (p.multiplier * cases * detection))
    const trueFlagged = cases * detection * p.sensitivity / 100
    const falseFlagged = noncases * falseAlarm * p.falsePositive / 100
    return 100 / (1 + falseFlagged / trueFlagged)
  },
  render: (p, skin) => [
    ...text(`An audit of ${skin === 'inspection' ? 'a defect scanner' : 'a sorting sensor'} records actual status and the sensor's first decision. “Case” means an object with the target property. The sensor is allowed to make both kinds of error.`),
    { t: 'table', caption: 'Audited first-stage decisions', head: ['Actual status', 'Flagged', 'Not flagged'], rows: [['Case', String(p.a), String(p.b)], ['Not a case', String(p.c), String(p.d)]] },
    ...(p.level === 5 ? text(`A new population contains ${p.multiplier} times as many cases and the same number of noncases. Within each actual-status group the sensor's flag rate is unchanged.`) : []),
    ...(p.level === 6 ? text(`Only first-stage flags receive a second sensor check. Conditional on actual status, its decision is independent of the first sensor: it flags ${p.sensitivity}% of cases and ${p.falsePositive}% of noncases.`) : []),
    ...text(['', 'How many objects are both actual cases and flagged?', 'Among the flagged objects, what percentage are actual cases?', 'Among the objects not flagged, what percentage are not cases?', 'Among all actual cases, what percentage were not flagged?', 'In the new population, what percentage of first-stage flags are actual cases?', 'Among objects flagged by both sensors, what percentage are actual cases?'][p.level]),
  ],
  answer: p => ({ type: 'number', unit: p.level === 1 ? 'objects' : '%', tolerance: percent }),
  misconceptions: [
    { id: 'reverse-screening-conditional', value: p => 100 * p.a / (p.a + p.b), feedback: () => 'A sensor’s flag rate among cases and the case rate among flags have different denominators. Restrict the table to the group named in the question.' },
    { id: 'discard-error-group', value: p => p.level === 1 ? p.a + p.c : 100, feedback: () => 'A flag does not guarantee a case, and no flag does not guarantee a noncase. Include the relevant error cell when forming the reference group.' },
  ],
  steps: [
    { prompt: () => text('How many first-stage flags were recorded in the original audit?'), answer: p => p.a + p.c, tolerance: exact, explain: p => text(`True flags ${p.a} plus false flags ${p.c} = ${p.a + p.c}.`) },
    { prompt: () => text('How many actual cases were in the original audit?'), answer: p => p.a + p.b, tolerance: exact, explain: p => text(`Detected cases ${p.a} plus missed cases ${p.b} = ${p.a + p.b}.`) },
    { prompt: () => text('What is the requested count or percentage for the stated reference group?'), answer: screeningAnswer, tolerance: percent, explain: p => text(`Use only the requested reference group and apply any new population weights or second-stage rates before normalising. Result: ${display(screeningAnswer(p))}${p.level === 1 ? ' objects' : '%'}.`) },
  ],
  solution: p => text(`Keep actual status separate from the sensor decision. ${p.level === 1 ? `The case-and-flagged cell is ${p.a}.` : p.level === 2 ? `Among ${p.a + p.c} flags, ${p.a} are true cases; 100 × ${p.a}/${p.a + p.c}.` : p.level === 3 ? `Among ${p.b + p.d} nonflags, ${p.d} are noncases; 100 × ${p.d}/${p.b + p.d}.` : p.level === 4 ? `Among ${p.a + p.b} cases, ${p.b} are missed; 100 × ${p.b}/${p.a + p.b}.` : p.level === 5 ? `Reweight the case rows by ${p.multiplier}, leaving noncases fixed. True flags become ${p.multiplier * p.a}; false flags remain ${p.c}.` : `Both-stage true flags are proportional to ${p.a} × ${p.sensitivity}/100, while false flags are proportional to ${p.c} × ${p.falsePositive}/100. Conditional independence allows these within-status multiplications.`} ${p.level >= 5 ? 'Divide the true flags by true plus false flags and multiply by 100. ' : ''}Answer: ${display(screeningAnswer(p))}${p.level === 1 ? ' objects' : '%'}.`),
}

type Payoffs = { level: number; percent: number; secondPercent: number; high: number; low: number; third: number; fee: number; sure: number }
function singlePayoff(p: Payoffs): number { return (p.percent * p.high + p.secondPercent * p.third + (100 - p.percent - p.secondPercent) * p.low) / 100 - p.fee }
function expectedValueAnswer(p: Payoffs): number {
  if (p.level < 5) return singlePayoff(p)
  const chance = p.percent / 100
  const net = chance * (2 - chance) * p.high - p.fee * (2 - chance)
  return p.level === 6 ? Math.max(net, p.sure) : net
}
export const expectedValueFoundation: Template<Payoffs> = {
  id: 'judgment.expected-value.foundations', version: 1, track: 'judgment', concept: 'judgment.expected-value', family: 'decision-payoff-basics',
  status: 'draft', review, levels, skins: ['production', 'delivery'], dailyLevels: [6],
  sample(rng, level) {
    const chance = level === 1 ? 50 : rng.int(5, 90)
    const high = rng.int(level === 1 ? 2 : 40, level === 1 ? 20 : 400)
    const low = level >= 5 ? 0 : rng.int(0, Math.min(150, high - (level >= 3 ? 2 : 1)))
    return { level, percent: chance, secondPercent: level === 3 || level === 4 ? rng.int(1, 99 - chance) : 0, high, low, third: level === 3 || level === 4 ? rng.int(low + 1, high - 1) : 0, fee: level >= 4 ? rng.int(1, 30) : 0, sure: level === 6 ? rng.int(1, 200) : 0 }
  },
  solve: expectedValueAnswer,
  verify(p) {
    if (p.level < 5) {
      let total = 0
      for (let outcome = 0; outcome < 100; outcome++) total += (outcome < p.percent ? p.high : outcome < p.percent + p.secondPercent ? p.third : p.low) - p.fee
      return total / 100
    }
    let total = 0
    for (let first = 0; first < 100; first++) for (let second = 0; second < 100; second++) {
      total -= p.fee
      if (first < p.percent) total += p.high
      else { total -= p.fee; if (second < p.percent) total += p.high }
    }
    return p.level === 6 ? Math.max(total / 10000, p.sure) : total / 10000
  },
  render: (p, skin) => [
    ...text(`A ${skin === 'production' ? 'production run' : 'delivery route'} has uncertain gross output valued in credits. Use expected credits as the decision criterion; there are no other costs or preferences.`),
    ...(p.level < 5 ? [{ t: 'table' as const, caption: 'Mutually exclusive outcomes of one run', head: ['Outcome', 'Probability', 'Gross credits'], rows: [['High', `${p.percent}%`, String(p.high)], ...(p.secondPercent ? [['Middle', `${p.secondPercent}%`, String(p.third)]] : []), ['Other', `${100 - p.percent - p.secondPercent}%`, String(p.low)]] }, ...text(p.fee ? `Starting the run costs ${p.fee} credits regardless of outcome. What are the expected net credits for one run?` : 'What are the expected gross credits for one run?')] : text(`Each attempt independently succeeds with probability ${p.percent}%, earns ${p.high} gross credits on success and zero otherwise, and costs ${p.fee} credits to start. Stop after the first success; if the first attempt fails, make one final attempt and then stop. ${p.level === 6 ? `Alternatively, skip the attempts and receive ${p.sure} credits for certain. Before seeing any outcome, what is the maximum expected net value of these two options?` : 'What is the expected net value of this two-attempt policy?'}`)),
  ],
  answer: () => ({ type: 'number', unit: 'credits', tolerance: exact }),
  misconceptions: [
    { id: 'unweighted-outcomes', value: p => p.level < 5 ? (p.high + p.low + (p.secondPercent ? p.third : 0)) / (p.secondPercent ? 3 : 2) - p.fee : p.high - 2 * p.fee, feedback: () => 'Outcomes must be weighted by their probabilities. A second attempt occurs only after a first failure, and a successful payoff is received at most once.' },
    { id: 'ignore-cost-or-failure', value: p => p.level < 4 ? p.high : p.level === 4 ? singlePayoff(p) + p.fee : p.percent / 100 * (2 - p.percent / 100) * p.high, feedback: () => 'Gross success credits are not expected net credits. Include failure outcomes and all costs that are incurred under the stated policy.' },
  ],
  steps: [
    { prompt: () => text('What is the success probability as a decimal?'), answer: p => p.percent / 100, tolerance: exact, explain: p => text(`${p.percent}% = ${p.percent / 100}.`) },
    { prompt: p => text(p.level < 5 ? 'What is the contribution of the high outcome to expected gross credits?' : 'What is the probability of at least one success within the two attempts?'), answer: p => p.level < 5 ? p.percent / 100 * p.high : p.percent / 100 * (2 - p.percent / 100), tolerance: exact, explain: p => text(p.level < 5 ? 'Multiply the high outcome by its probability, then include the other outcomes separately.' : `At least one success = 1 − (${1 - p.percent / 100})².`) },
    { prompt: () => text('What is the requested expected value, after costs and any choice?'), answer: expectedValueAnswer, tolerance: exact, explain: p => text(`Weight each possible terminal outcome, subtract the costs paid on that path, and choose before observing outcomes if required. Result: ${display(expectedValueAnswer(p))} credits.`) },
  ],
  solution: p => text(p.level < 5 ? `Expected net credits = ${p.percent}/100 × ${p.high}${p.secondPercent ? ` + ${p.secondPercent}/100 × ${p.third}` : ''} + ${100 - p.percent - p.secondPercent}/100 × ${p.low} − ${p.fee} = ${display(expectedValueAnswer(p))}. This is a long-run average, not a guaranteed payoff on one run.` : `Let p = ${p.percent}/100. Success occurs with probability p + (1 − p)p = p(2 − p). The first cost is certain and the second is paid with probability 1 − p, so expected total cost is ${p.fee}(2 − p). The policy value is p(2 − p) × ${p.high} − ${p.fee}(2 − p). ${p.level === 6 ? `Compare it with the sure ${p.sure} credits before choosing.` : ''} Requested value: ${display(expectedValueAnswer(p))} credits.`),
}

type Risk = { level: number; before: number; after: number; population: number; cost: number }
function riskAnswer(p: Risk): number {
  const difference = p.before - p.after
  switch (p.level) {
    case 1: return difference
    case 2: return difference / 10
    case 3: return 100 * difference / p.before
    case 4: return p.population * difference / 1000
    case 5: return 1000 / difference
    default: return p.cost * 1000 / difference
  }
}
export const riskFoundation: Template<Risk> = {
  id: 'judgment.risk-framing.foundations', version: 1, track: 'judgment', concept: 'judgment.risk-framing', family: 'risk-denominator-basics',
  status: 'draft', review, levels, skins: ['packaging', 'maintenance'], dailyLevels: [6],
  sample(rng, level) { const before = rng.int(level === 1 ? 3 : 20, level === 1 ? 30 : 300); return { level, before, after: rng.int(1, before - 1), population: level === 4 ? rng.int(10, 500) * 10 : 1000, cost: level === 6 ? rng.int(5, 80) : 1 } },
  solve: riskAnswer,
  verify(p) {
    const rr = p.after / p.before
    const preventedPerThousand = p.before * (1 - rr)
    if (p.level === 1) return preventedPerThousand
    if (p.level === 2) return (p.before / 1000 - p.after / 1000) * 100
    if (p.level === 3) return 100 * (1 - rr)
    if (p.level === 4) return p.population * p.before / 1000 - p.population * p.after / 1000
    const perEvent = 1 / (p.before / 1000 - p.after / 1000)
    return p.level === 5 ? perEvent : p.cost * perEvent
  },
  render: (p, skin) => [
    ...text(`A ${skin === 'packaging' ? 'packaging change' : 'maintenance change'} is evaluated for failures over one year. Treat the displayed rates as exact for this exercise. The compared groups have the same relevant characteristics; the stated rates apply to every object in the target population.`),
    { t: 'chart', kind: 'bar', title: 'One-year failure rates', xLabel: 'Policy', yLabel: 'Expected failures per 1000 objects', points: [{ label: 'Original', value: p.before }, { label: 'Changed', value: p.after }] },
    ...(p.level === 4 ? text(`The target population is ${p.population} objects.`) : []),
    ...(p.level === 6 ? text(`Applying the change costs ${p.cost} credits per object. Ignore every other cost or benefit.`) : []),
    ...text(['', 'How many fewer failures are expected per 1000 objects over one year?', 'What is the absolute reduction in failure risk, in percentage points?', 'What is the relative reduction in failure risk, as a percentage of the original risk?', 'How many failures are expected to be avoided in the target population over one year?', 'How many objects must receive the change per one expected failure avoided over one year? Give the reciprocal risk difference without rounding up.', 'What is the expected implementation cost per failure avoided over one year?'][p.level]),
  ],
  answer: p => ({ type: 'number', unit: ['', 'fewer failures per 1000', 'percentage points', '%', 'avoided failures', 'objects per avoided failure', 'credits per avoided failure'][p.level], tolerance: exact }),
  misconceptions: [
    { id: 'confuse-relative-and-absolute-risk', value: p => p.level === 3 ? (p.before - p.after) / 10 : 100 * (p.before - p.after) / p.before, feedback: () => 'Absolute reduction subtracts risks on a common scale. Relative reduction divides that difference by the original risk. State which denominator the requested quantity uses.' },
    { id: 'use-final-risk-instead-of-reduction', value: p => p.level >= 5 ? p.cost * 1000 / p.after : p.after, feedback: () => 'The benefit is the difference between the two rates, not the remaining risk after the change. Use the risk reduction when calculating avoided failures or cost per avoided failure.' },
  ],
  steps: [
    { prompt: () => text('What is the original one-year failure probability as a decimal?'), answer: p => p.before / 1000, tolerance: exact, explain: p => text(`${p.before} per 1000 = ${p.before / 1000}.`) },
    { prompt: () => text('What is the absolute one-year failure-probability reduction as a decimal?'), answer: p => (p.before - p.after) / 1000, tolerance: exact, explain: p => text(`Subtract on a common denominator: (${p.before} − ${p.after})/1000 = ${(p.before - p.after) / 1000}.`) },
    { prompt: () => text('What is the final quantity in the units requested?'), answer: riskAnswer, tolerance: exact, explain: p => text(`Use the absolute reduction for counts and reciprocal-benefit calculations, and divide by baseline only for a relative reduction. Result: ${display(riskAnswer(p))}.`) },
  ],
  solution: p => text(`Original risk = ${p.before}/1000, changed risk = ${p.after}/1000, and the one-year absolute reduction is ${p.before - p.after}/1000. ${p.level === 1 ? `This is ${p.before - p.after} fewer failures per 1000.` : p.level === 2 ? `Multiply the decimal reduction by 100 to get ${display(riskAnswer(p))} percentage points.` : p.level === 3 ? `Divide the reduction by the original ${p.before}/1000 and multiply by 100: ${display(riskAnswer(p))}%.` : p.level === 4 ? `Multiply the probability reduction by ${p.population} objects: ${display(riskAnswer(p))} expected avoided failures.` : p.level === 5 ? `Take its reciprocal: 1000/${p.before - p.after} = ${display(riskAnswer(p))} objects per expected failure avoided.` : `Cost per expected failure avoided = ${p.cost} / ((${p.before} − ${p.after})/1000) = ${display(riskAnswer(p))} credits.`} These quantities refer to the specified one-year horizon and baseline population.`),
}

type Independent = { level: number; probabilities: number[]; k: number }
function countProbability(probabilities: number[], k: number): number {
  const distribution = Array(probabilities.length + 1).fill(0) as number[]
  distribution[0] = 1
  for (const value of probabilities) {
    const chance = value / 100
    for (let successes = probabilities.length; successes >= 0; successes--) distribution[successes] = distribution[successes] * (1 - chance) + (successes ? distribution[successes - 1] * chance : 0)
  }
  return distribution[k]
}
function independenceAnswer(p: Independent): number {
  const [a, b] = p.probabilities.map(value => value / 100)
  if (p.level === 1) return 100 * a * b
  if (p.level === 2) return 100 * (a + b - a * b)
  if (p.level === 3) return 100 * (a * (1 - b) + (1 - a) * b)
  const none = p.probabilities.reduce((product, value) => product * (1 - value / 100), 1)
  if (p.level === 4) return 100 * (1 - none)
  const exactly = countProbability(p.probabilities, p.k)
  return p.level === 5 ? 100 * exactly : 100 * exactly / (1 - none)
}
export const independenceFoundation: Template<Independent> = {
  id: 'judgment.independence.foundations', version: 1, track: 'judgment', concept: 'judgment.independence', family: 'independent-event-patterns',
  status: 'draft', review, levels, skins: ['sensors', 'suppliers'], dailyLevels: [6],
  sample: (rng, level) => ({ level, probabilities: Array.from({ length: level < 4 ? 2 : level - 1 }, () => level === 1 ? rng.int(1, 9) * 10 : rng.int(5, 95)), k: level === 5 ? 2 : 1 }),
  solve: independenceAnswer,
  verify(p) {
    let event = 0, conditioning = 0
    for (let mask = 0; mask < 2 ** p.probabilities.length; mask++) {
      let probability = 1, successes = 0
      p.probabilities.forEach((value, index) => { const success = Boolean(mask & (1 << index)); successes += Number(success); probability *= success ? value / 100 : 1 - value / 100 })
      if (successes >= 1) conditioning += probability
      if ((p.level === 1 && successes === 2) || (p.level === 2 && successes >= 1) || (p.level === 3 && successes === 1) || (p.level === 4 && successes >= 1) || (p.level >= 5 && successes === p.k)) event += probability
    }
    return p.level === 6 ? 100 * event / conditioning : 100 * event
  },
  render: (p, skin) => [
    ...text(`Each ${skin === 'sensors' ? 'sensor detects a test signal' : 'supplier delivers a test order'} with the probability shown. Successes are mutually independent across all ${skin === 'sensors' ? 'sensors' : 'suppliers'}; this is an explicit assumption of the exercise.`),
    { t: 'table', caption: 'Success probabilities', head: ['Source', 'Success probability'], rows: p.probabilities.map((value, i) => [String.fromCharCode(65 + i), `${value}%`]) },
    ...text(['', 'What is the probability that both sources succeed, as a percentage?', 'What is the probability that at least one source succeeds, as a percentage?', 'What is the probability that exactly one of the two sources succeeds, as a percentage?', 'What is the probability that at least one of all listed sources succeeds, as a percentage?', 'What is the probability that exactly two of all listed sources succeed, as a percentage?', 'Given that at least one listed source succeeds, what is the probability that exactly one succeeds, as a percentage?'][p.level]),
  ],
  answer: () => ({ type: 'number', unit: '%', tolerance: percent }),
  misconceptions: [
    { id: 'add-overlapping-probabilities', value: p => p.probabilities.reduce((a, b) => a + b, 0), feedback: () => 'Adding marginal success probabilities counts outcomes with multiple successes more than once. Work with disjoint success patterns or use a complement.' },
    { id: 'multiply-successes-for-every-event', value: p => p.level === 1 ? 100 * (1 - p.probabilities[0] / 100) * (1 - p.probabilities[1] / 100) : p.probabilities.reduce((a, b) => a * b / 100, 100), feedback: () => 'A product of success probabilities describes all sources succeeding. It does not describe at least one, exactly one, or a probability conditional on an observed success.' },
  ],
  steps: [
    { prompt: () => text('What is the probability that the first listed source fails, as a decimal?'), answer: p => 1 - p.probabilities[0] / 100, tolerance: exact, explain: p => text(`Failure probability = 1 − ${p.probabilities[0]}/100.`) },
    { prompt: () => text('What is the probability that all listed sources fail, as a decimal?'), answer: p => p.probabilities.reduce((product, value) => product * (1 - value / 100), 1), tolerance: exact, explain: () => text('Under the explicit independence assumption, multiply the failure probabilities.') },
    { prompt: () => text('What is the probability of the exact requested event, as a percentage?'), answer: independenceAnswer, tolerance: percent, explain: p => text(`Sum the probabilities of disjoint success patterns. If the question says “given”, divide by the probability of that condition. Result: ${display(independenceAnswer(p))}%.`) },
  ],
  solution: p => text(`${p.level === 1 ? 'Both succeed: multiply the two success probabilities.' : p.level === 2 || p.level === 4 ? `At least one succeeds = 1 − P(all fail) = 1 − ${p.probabilities.map(value => `(1 − ${value}/100)`).join(' × ')}.` : p.level === 3 ? 'Exactly one succeeds has two disjoint possibilities: A succeeds and B fails, or A fails and B succeeds. Multiply within each pattern and add the patterns.' : `For exactly ${p.k} successes, enumerate subsets of ${p.k} successful sources. In each subset multiply their success probabilities and all other failure probabilities, then add over the disjoint subsets.`} ${p.level === 6 ? 'Conditioning on at least one success removes the all-failure outcome, so divide the exactly-one probability by 1 − P(all fail).' : ''} The requested probability is ${display(independenceAnswer(p))}%. Independence is given here; it must not be assumed just because the sources have different labels.`),
}

type Regression = { level: number; mean: number; signal: number; noise: number; retention: number; sdX: number; sdY: number; meanY: number; followup: number }
function predicted(p: Regression): number { return p.level < 5 ? p.mean + p.retention / 100 * p.signal : p.meanY + p.retention / 100 * p.signal / p.sdX * p.sdY }
function regressionAnswer(p: Regression): number { return p.level <= 3 ? p.mean + p.signal : p.level === 6 ? p.followup - predicted(p) : predicted(p) }
export const regressionFoundation: Template<Regression> = {
  id: 'judgment.regression.foundations', version: 1, track: 'judgment', concept: 'judgment.regression', family: 'regression-noise-basics',
  status: 'draft', review, levels, skins: ['machines', 'batteries'], dailyLevels: [6],
  sample: (rng, level) => ({ level, mean: rng.int(20, 100), signal: rng.int(1, 40), noise: level <= 3 ? rng.int(1, 15) * (level === 2 ? -1 : 1) : 0, retention: level >= 4 ? rng.int(10, 90) : 100, sdX: level >= 5 ? rng.int(5, 25) : 1, sdY: level >= 5 ? rng.int(5, 25) : 1, meanY: level >= 5 ? rng.int(40, 150) : 0, followup: level === 6 ? rng.int(80, 200) : 0 }),
  solve: regressionAnswer,
  verify(p) {
    const observed = p.mean + p.signal + p.noise
    if (p.level <= 2) return observed - p.noise
    if (p.level === 3) return (observed + p.mean + p.signal - p.noise) / 2
    if (p.level === 4) return p.retention / 100 * (p.mean + p.signal) + (1 - p.retention / 100) * p.mean
    const standardised = (p.mean + p.signal - p.mean) / p.sdX
    const nextStandardised = p.retention * standardised / 100
    const nextValue = p.meanY + p.sdY * nextStandardised
    return p.level === 6 ? p.followup - nextValue : nextValue
  },
  render: (p, skin) => [
    ...text(`An engineer studies output from ${skin === 'machines' ? 'machines' : 'test batteries'}, in output units. ${p.level <= 2 ? `An observed output of ${p.mean + p.signal + p.noise} equals stable output plus a one-off measurement error of ${p.noise} units. The error is known in this exercise. What is the stable output?` : p.level === 3 ? 'Two readings have errors of equal size and opposite sign. Their stable output is the same.' : p.level === 4 ? `The population mean is ${p.mean}. For this stated prediction model, an observed output of ${p.mean + p.signal} is retained with probability ${p.retention}%; otherwise the next output is the population mean. What is the expected next output?` : `At measurement 1 the population mean is ${p.mean}, its standard deviation is ${p.sdX}, and the observed output is ${p.mean + p.signal}. At measurement 2 the population mean is ${p.meanY} and standard deviation is ${p.sdY}. The stated linear prediction model predicts a measurement-2 standardised deviation of ${p.retention}/100 times the measurement-1 standardised deviation.`}`),
    ...(p.level === 3 ? [{ t: 'chart' as const, kind: 'line' as const, title: 'Paired output readings', xLabel: 'Reading', yLabel: 'Output units', points: [{ label: 'First', value: p.mean + p.signal + p.noise }, { label: 'Second', value: p.mean + p.signal - p.noise }] }, ...text('What is the stable output?')] : []),
    ...(p.level === 5 ? text('What is the predicted output at measurement 2, in output units?') : []),
    ...(p.level === 6 ? text(`The actual follow-up output is ${p.followup}. What is actual follow-up minus the model prediction, in output units? A negative value is allowed. This difference alone does not identify an intervention effect.`) : []),
  ],
  answer: () => ({ type: 'number', unit: 'output units', tolerance: exact }),
  misconceptions: [
    { id: 'treat-extreme-reading-as-stable', value: p => p.level <= 3 ? p.mean + p.signal + p.noise : p.level === 6 ? p.followup : p.mean + p.signal, feedback: () => 'A noisy or extreme reading need not be the stable or expected future output. Apply the stated error or prediction model before interpreting the result.' },
    { id: 'return-to-mean-completely', value: p => p.level <= 3 ? p.mean + p.signal - p.noise : p.level === 6 ? p.followup - p.meanY : p.level === 4 ? p.mean : p.meanY, feedback: () => 'Removing a known error is different from erasing the entire deviation. Under partial regression, retain the fraction of the standardised deviation specified by the model.' },
  ],
  steps: [
    { prompt: p => text(p.level <= 3 ? 'What is the known error in the first reading?' : 'How far above its population mean is the first observed output, in output units?'), answer: p => p.level <= 3 ? p.noise : p.signal, tolerance: exact, explain: () => text('Separate the observed level into a reference level, a stable deviation and any specified one-off error.') },
    { prompt: p => text(p.level <= 3 ? 'What is the first reading with its known error removed?' : 'What fraction of the first standardised deviation does the prediction model retain?'), answer: p => p.level <= 3 ? p.mean + p.signal : p.retention / 100, tolerance: exact, explain: p => text(p.level <= 3 ? 'Subtract the signed error; subtracting a negative error adds its magnitude.' : `The retention factor is ${p.retention}/100. Standardise before comparing measurements with different spreads.`) },
    { prompt: () => text('What is the final requested output or deviation from prediction?'), answer: regressionAnswer, tolerance: exact, explain: p => text(`Apply the model in the stated units. Result: ${display(regressionAnswer(p))}.`) },
  ],
  solution: p => text(p.level <= 2 ? `Stable output = observed output − signed error = ${p.mean + p.signal + p.noise} − (${p.noise}) = ${p.mean + p.signal}. A negative error lowers the observed reading, so removing it increases the estimate.` : p.level === 3 ? `The equal and opposite errors cancel: (${p.mean + p.signal + p.noise} + ${p.mean + p.signal - p.noise})/2 = ${p.mean + p.signal}. This cancellation follows from the given paired-error model, not from every pair of noisy measurements.` : p.level === 4 ? `Expected next output = ${p.retention}/100 × ${p.mean + p.signal} + (1 − ${p.retention}/100) × ${p.mean} = ${display(predicted(p))}. It is a conditional expectation, not a guarantee for a particular object.` : `Standardise the first deviation: (${p.mean + p.signal} − ${p.mean})/${p.sdX} = ${display(p.signal / p.sdX)}. Retain ${p.retention}/100 of it, then return to measurement-2 units: ${p.meanY} + ${p.sdY} × ${p.retention}/100 × ${display(p.signal / p.sdX)} = ${display(predicted(p))}. ${p.level === 6 ? `Actual minus prediction = ${p.followup} − ${display(predicted(p))} = ${display(regressionAnswer(p))}. That residual is not by itself a causal effect.` : ''}`),
}

type Odds = { level: number; a: number; b: number; likelihood: number; counter: number; threshold: number }
function oddsAnswer(p: Odds): number {
  if (p.level === 1) return 100 * p.a / (p.a + p.b)
  if (p.level === 2) return p.a / (100 - p.a)
  if (p.level === 3) return p.a / p.b * p.likelihood
  if (p.level === 6) return p.threshold / (100 - p.threshold) / (p.a / p.b)
  const odds = p.a / p.b * p.likelihood / (p.level === 5 ? p.counter : 1)
  return 100 * odds / (1 + odds)
}
export const oddsFoundation: Template<Odds> = {
  id: 'judgment.odds.foundations', version: 1, track: 'judgment', concept: 'judgment.odds', family: 'odds-conversion-basics',
  status: 'draft', review, levels, skins: ['components', 'shipments'], dailyLevels: [6],
  sample: (rng, level) => ({ level, a: level === 2 ? rng.int(5, 95) : rng.int(1, level === 1 ? 12 : 40), b: level === 2 ? 1 : rng.int(1, level === 1 ? 12 : 80), likelihood: level >= 3 && level <= 5 ? rng.int(2, 20) : 1, counter: level === 5 ? rng.int(2, 15) : 1, threshold: level === 6 ? rng.int(50, 95) : 50 }),
  solve: oddsAnswer,
  verify(p) {
    if (p.level === 1) return 100 / (1 + p.b / p.a)
    if (p.level === 2) { const chance = p.a / 100; return chance / (1 - chance) }
    if (p.level === 3) return p.a * p.likelihood / p.b
    if (p.level === 6) return p.threshold * p.b / ((100 - p.threshold) * p.a)
    const favourableWeight = p.a * p.likelihood
    const alternativeWeight = p.b * (p.level === 5 ? p.counter : 1)
    return 100 * favourableWeight / (favourableWeight + alternativeWeight)
  },
  render: (p, skin) => [
    ...text(`A quality analyst models whether ${skin === 'components' ? 'a component' : 'a shipment'} has property H. H and not-H are the only possibilities. Odds H:not-H mean a weight for H compared with a weight for not-H.`),
    ...text(p.level === 1 ? `The odds are ${p.a}:${p.b}. What is the probability of H, as a percentage?` : p.level === 2 ? `The probability of H is ${p.a}%. What are its decimal odds H:not-H? Give one number equal to the H weight divided by the not-H weight.` : p.level === 6 ? `The prior odds are ${p.a}:${p.b}. Evidence multiplies these odds by its likelihood ratio. What is the minimum likelihood ratio required to reach a posterior H probability of ${p.threshold}%?` : `The prior odds are ${p.a}:${p.b}. Evidence E is ${p.likelihood} times as likely under H as under not-H. ${p.level === 5 ? `A second cue has likelihood ratio 1/${p.counter}. The cues are conditionally independent given H and also given not-H, so their likelihood ratios multiply.` : ''} ${p.level === 3 ? 'What are the posterior decimal odds H:not-H? Give the H weight divided by the not-H weight.' : 'What is the posterior probability of H, as a percentage?'}`),
  ],
  answer: p => ({ type: 'number', unit: p.level === 1 || p.level === 4 || p.level === 5 ? '%' : 'ratio', tolerance: exact }),
  misconceptions: [
    { id: 'odds-equal-probability', value: p => p.level === 2 ? p.a / 100 : p.level === 6 ? p.threshold / 100 / (p.a / p.b) : p.level === 3 ? 100 * p.a * p.likelihood / (p.a * p.likelihood + p.b) : 100 * p.a / p.b * p.likelihood / (p.level === 5 ? p.counter : 1), feedback: () => 'Odds divide H weight by not-H weight; probability divides H weight by total weight. Convert between these forms before using or reporting a likelihood ratio.' },
    { id: 'ignore-evidence-or-denominator', value: p => p.level === 1 ? 100 * p.b / (p.a + p.b) : p.level === 2 ? 100 / p.a : p.level === 6 ? p.threshold / (100 - p.threshold) : p.level === 3 ? p.a / p.b : 100 * p.a / (p.a + p.b), feedback: () => 'Track which hypothesis is in the numerator and update the prior odds with every stated cue. A target posterior odds value is not itself the evidence multiplier.' },
  ],
  steps: [
    { prompt: p => text(p.level === 2 ? 'What is the probability of not-H, as a percentage?' : 'What are the prior decimal odds H:not-H?'), answer: p => p.level === 2 ? 100 - p.a : p.a / p.b, tolerance: exact, explain: () => text('Odds compare H with not-H. Probability compares H with both possibilities combined.') },
    { prompt: p => text(p.level === 6 ? 'What decimal posterior odds correspond to the target percentage?' : 'What is the total probability weight before converting the result to a percentage?'), answer: p => p.level === 6 ? p.threshold / (100 - p.threshold) : p.level === 2 ? 100 : p.a * p.likelihood + p.b * (p.level === 5 ? p.counter : 1), tolerance: exact, explain: () => text('Use total weight for a probability and not-H weight for odds; keep the requested form explicit.') },
    { prompt: () => text('What is the requested probability, decimal odds or minimum likelihood ratio?'), answer: oddsAnswer, tolerance: exact, explain: p => text(`Update weights or invert the target-odds equation as required. Result: ${display(oddsAnswer(p))}.`) },
  ],
  solution: p => text(p.level === 1 ? `With H:not-H weights ${p.a}:${p.b}, total weight is ${p.a + p.b}. Probability H = 100 × ${p.a}/${p.a + p.b} = ${display(oddsAnswer(p))}%.` : p.level === 2 ? `H has probability ${p.a}/100 and not-H has probability ${100 - p.a}/100. Their ratio is ${p.a}/${100 - p.a} = ${display(oddsAnswer(p))}.` : p.level === 6 ? `Target odds = ${p.threshold}/${100 - p.threshold}. Posterior odds = prior odds × likelihood ratio. Therefore the minimum multiplier is (${p.threshold}/${100 - p.threshold}) / (${p.a}/${p.b}) = ${display(oddsAnswer(p))}.` : `Multiply prior odds ${p.a}/${p.b} by likelihood ratio ${p.likelihood}${p.level === 5 ? ` and 1/${p.counter}` : ''}. ${p.level === 3 ? 'Report that decimal odds ratio.' : 'Convert updated odds o to probability 100 × o/(1 + o).'} Result: ${display(oddsAnswer(p))}${p.level === 3 ? '' : '%'}. A likelihood ratio describes how evidence discriminates hypotheses; it is not itself a hypothesis probability.`),
}

export const JUDGMENT_FOUNDATIONS = [frequenciesFoundation, estimationFoundation, conditionalFoundation, baseRatesFoundation, expectedValueFoundation, riskFoundation, independenceFoundation, regressionFoundation, oddsFoundation] as const
