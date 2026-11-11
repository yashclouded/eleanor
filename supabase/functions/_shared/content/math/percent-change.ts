import type { Template } from '../types.ts'
import { display, exact, levels } from './common.ts'

type Successive = { initial: number; changes: number[]; net: boolean }
function factor(p: Successive): number { return p.changes.reduce((v, pct) => v * (1 + pct / 100), 1) }
function successiveAnswer(p: Successive): number { return p.net ? 100 * (factor(p) - 1) : p.initial * factor(p) }
export const successiveTemplate: Template<Successive> = {
  id: 'math.percent-change.successive', version: 1, track: 'math', concept: 'math.percent-change', family: 'percentage-multipliers',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['inventory', 'capacity'], dailyLevels: [4, 5],
  sample(rng, level) {
    const first = rng.int(1, 6) * 5
    const changes = level === 1 ? [first, first] : [first, -(level === 2 ? first : rng.int(1, 6) * 5)]
    if (level >= 4) changes.push(rng.int(1, 5) * 5)
    return { initial: rng.int(10, 150) * 100, changes, net: level === 5 }
  },
  solve: successiveAnswer,
  verify(p) {
    let amount = p.initial
    for (const percent of p.changes) amount += amount * percent / 100
    return p.net ? (amount - p.initial) / p.initial * 100 : amount
  },
  render: (p, skin) => [
    { t: 'p', text: `${skin === 'inventory' ? 'A store tracks inventory by a continuous volume measure' : 'A facility tracks available storage capacity'}. The starting amount is ${p.initial} units. Apply these changes in order, each to the amount immediately before it. Do not round intermediate amounts.` },
    { t: 'list', ordered: true, items: p.changes.map((pct) => `${pct > 0 ? 'Increase' : 'Decrease'} by ${Math.abs(pct)}%.`) },
    { t: 'p', text: p.net ? 'What is the overall percentage change from the starting amount? Use a negative value for a decrease.' : 'What is the final amount in units?' },
  ],
  answer: (p) => ({ type: 'number', unit: p.net ? '%' : 'units', tolerance: exact }),
  misconceptions: [
    { id: 'add-percentages', value: (p) => p.net ? p.changes.reduce((a, b) => a + b, 0) : p.initial * (1 + p.changes.reduce((a, b) => a + b, 0) / 100), feedback: () => 'Each change uses the current amount, so successive factors multiply. Adding percentages treats every change as a share of the original amount.' },
    { id: 'apply-only-first-change', value: (p) => p.net ? p.changes[0] : p.initial * (1 + p.changes[0] / 100), feedback: () => 'The first change is only one stage. Carry its new amount into every later stage before computing the result.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'What is the multiplier for the first change?' }], answer: (p) => 1 + p.changes[0] / 100, tolerance: exact, explain: () => [{ t: 'p', text: 'An increase of r% multiplies by 1 + r/100; a decrease multiplies by 1 − r/100.' }] },
    { prompt: () => [{ t: 'p', text: 'What is the product of all the change multipliers?' }], answer: factor, tolerance: exact, explain: (p) => [{ t: 'p', text: `${p.changes.map((r) => display(1 + r / 100)).join(' × ')} = ${display(factor(p))}.` }] },
    { prompt: (p) => [{ t: 'p', text: p.net ? 'What is the net percentage change?' : 'What is the final amount?' }], answer: successiveAnswer, tolerance: exact, explain: (p) => [{ t: 'p', text: p.net ? `Subtract 1 from the product and multiply by 100: ${display(successiveAnswer(p))}%.` : `Multiply the initial ${p.initial} by the combined factor to get ${display(successiveAnswer(p))}.` }] },
  ],
  solution: (p) => [{ t: 'p', text: `Represent the changes by multipliers: ${p.changes.map((r) => display(1 + r / 100)).join(' × ')} = ${display(factor(p))}. ${p.net ? `Net percentage change = (${display(factor(p))} − 1) × 100 = ${display(successiveAnswer(p))}%.` : `Final amount = ${p.initial} × ${display(factor(p))} = ${display(successiveAnswer(p))} units.`} A rise and equal percentage fall do not cancel because their bases differ.` }],
}

type Reverse = { final: number; changes: number[]; fee: number }
function reverseFactor(p: Reverse): number { return p.changes.reduce((v, pct) => v * (1 + pct / 100), 1) }
function original(p: Reverse): number { return (p.final - p.fee) / reverseFactor(p) }
export const reversePercentTemplate: Template<Reverse> = {
  id: 'math.percent-change.reverse', version: 1, track: 'math', concept: 'math.percent-change', family: 'percentage-multipliers',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['rental', 'supplies'], dailyLevels: [4, 5],
  sample(rng, level) {
    const changes = [(level === 1 ? 1 : -1) * rng.int(1, 6) * 5]
    if (level >= 3) changes.push(rng.int(1, 5) * 5)
    if (level === 5) changes.push(-rng.int(1, 4) * 5)
    const fee = level >= 4 ? rng.int(2, 30) : 0
    const base = rng.int(10, 180) * 20
    const final = Number((base * changes.reduce((v, r) => v * (1 + r / 100), 1) + fee).toFixed(6))
    return { final, changes, fee }
  },
  solve: original,
  verify(p) {
    let amount = p.final - p.fee
    for (const pct of [...p.changes].reverse()) amount = amount * 100 / (100 + pct)
    return amount
  },
  render: (p, skin) => [
    { t: 'p', text: `${skin === 'rental' ? 'A rental invoice' : 'A supplies invoice'} starts with an unknown base price in credits. Apply the following changes in order, each to the current price, then add a fixed fee of ${p.fee} credits. No other charges apply, and no intermediate rounding is used.` },
    { t: 'list', ordered: true, items: p.changes.map((r) => `${r > 0 ? 'Increase' : 'Decrease'} by ${Math.abs(r)}%.`) },
    { t: 'p', text: `The final invoice is ${display(p.final)} credits. What was the base price?` },
  ],
  answer: () => ({ type: 'number', unit: 'credits', tolerance: exact }),
  misconceptions: [
    { id: 'subtract-percentages-from-final', value: (p) => (p.final - p.fee) * (1 - p.changes.reduce((a, b) => a + b, 0) / 100), feedback: () => 'Undoing a percentage change requires dividing by its multiplier. Subtracting the same percentage uses the final amount as the wrong base.' },
    { id: 'multiply-instead-of-divide', value: (p) => (p.final - p.fee) * reverseFactor(p), feedback: () => 'Multiplying applies the changes again. To recover the base, remove the fee and divide by the combined factor.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'What is the final price excluding the fixed fee?' }], answer: (p) => p.final - p.fee, tolerance: exact, explain: (p) => [{ t: 'p', text: `${display(p.final)} − ${p.fee} = ${display(p.final - p.fee)} credits.` }] },
    { prompt: () => [{ t: 'p', text: 'What is the combined multiplier for the percentage changes?' }], answer: reverseFactor, tolerance: exact, explain: (p) => [{ t: 'p', text: `Multiply ${p.changes.map((r) => display(1 + r / 100)).join(' × ')} to get ${display(reverseFactor(p))}.` }] },
    { prompt: () => [{ t: 'p', text: 'What base price gives that final price after the changes?' }], answer: original, tolerance: exact, explain: (p) => [{ t: 'p', text: `${display(p.final - p.fee)} / ${display(reverseFactor(p))} = ${display(original(p))} credits.` }] },
  ],
  solution: (p) => [{ t: 'p', text: `Let x be the base. The invoice equation is x × ${p.changes.map((r) => display(1 + r / 100)).join(' × ')} + ${p.fee} = ${display(p.final)}. Subtract the fee first, then divide by the multiplier ${display(reverseFactor(p))}. Thus x = ${display(original(p))} credits. Substitution recreates the final invoice.` }],
}
