import type { Template } from '../types.ts'
import { display, exact, levels } from './common.ts'

type Equation = { a: number; b: number; c: number; d: number; groups: number }
function equationAnswer(p: Equation): number { return (p.d - p.b) / (p.a - p.c) }
export const wordEquationsTemplate: Template<Equation> = {
  id: 'math.linear.word-equations', version: 1, track: 'math', concept: 'math.linear', family: 'one-variable-cost',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['printing', 'delivery'], dailyLevels: [4, 5],
  sample(rng, level) {
    const groups = level === 3 || level === 5 ? rng.int(2, 5) : 1
    const a = groups * rng.int(3, 15)
    const c = level >= 4 ? rng.int(1, a - 1) : 0
    const b = level >= 2 ? groups * rng.int(1, 30) : 0
    return { a, b, c, d: b + (a - c) * rng.int(2, 100), groups }
  },
  solve: equationAnswer,
  verify(p) {
    const solutions: number[] = []
    for (let count = 0; count <= 200; count++) if (p.a * count + p.b === p.c * count + p.d) solutions.push(count)
    if (solutions.length !== 1) throw new Error('Expected one nonnegative integer quantity')
    return solutions[0]
  },
  render: (p, skin) => [
    { t: 'p', text: `${skin === 'printing' ? 'A printing service' : 'A local delivery service'} charges ${p.a / p.groups} credits per item plus a fixed ${p.b / p.groups} credits per batch. There are ${p.groups} identical batches, each with the same unknown whole number of items.` },
    { t: 'p', text: p.c ? `The total bill equals an alternative quote of ${p.c} credits times the number of items in ONE batch, plus ${p.d} credits. How many items are in each batch?` : `The total bill is ${p.d} credits. How many items are in each batch?` },
  ],
  answer: () => ({ type: 'integer', unit: 'items per batch' }),
  misconceptions: [
    { id: 'ignore-fixed-charges', value: (p) => p.d / p.a, feedback: () => 'Divide only after moving fixed charges and any variable term from the alternative quote to the correct side.' },
    { id: 'add-fixed-charge', value: (p) => (p.d + p.b) / (p.a - p.c), feedback: () => 'A fixed charge already contributes to the bill. Subtract it when isolating the item count; adding it counts it again.' },
    { id: 'multiply-instead-of-divide', value: (p) => (p.d - p.b) * (p.a - p.c), feedback: () => 'The coefficient multiplies the item count. Undo that multiplication by dividing, not multiplying again.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'After expanding all batches and moving variable terms left, what is the coefficient of the unknown count?' }], answer: (p) => p.a - p.c, tolerance: exact, explain: (p) => [{ t: 'p', text: `The left coefficient is ${p.a} − ${p.c} = ${p.a - p.c}.` }] },
    { prompt: () => [{ t: 'p', text: 'After moving the fixed charges right, what is the right-hand constant?' }], answer: (p) => p.d - p.b, tolerance: exact, explain: (p) => [{ t: 'p', text: `${p.d} − ${p.b} = ${p.d - p.b}.` }] },
    { prompt: () => [{ t: 'p', text: 'How many items are in each batch?' }], answer: equationAnswer, tolerance: exact, explain: (p) => [{ t: 'p', text: `Divide ${p.d - p.b} by ${p.a - p.c} to get ${equationAnswer(p)}.` }] },
  ],
  solution: (p) => [{ t: 'p', text: `Let x be items in one batch. Expanding ${p.groups} × (${p.a / p.groups}x + ${p.b / p.groups}) gives ${p.a}x + ${p.b} = ${p.c}x + ${p.d}. Rearrange to ${p.a - p.c}x = ${p.d - p.b}; therefore x = ${equationAnswer(p)}. Both quotes give ${p.a * equationAnswer(p) + p.b} credits at that count.` }],
}

type TwoUnknowns = { a: number; b: number; c: number; d: number; total1: number; total2: number; fee: number; discount: number }
function subtotal1(p: TwoUnknowns): number { return p.total1 / (1 - p.discount / 100) - p.fee }
function subtotal2(p: TwoUnknowns): number { return p.total2 / (1 - p.discount / 100) - p.fee }
// Prices are whole credits; remove floating-point residue from undoing invoice discounts.
function priceA(p: TwoUnknowns): number { return Math.round((subtotal1(p) * p.d - subtotal2(p) * p.b) / (p.a * p.d - p.b * p.c)) }
export const twoUnknownsTemplate: Template<TwoUnknowns> = {
  id: 'math.linear.two-unknowns', version: 1, track: 'math', concept: 'math.linear', family: 'two-product-prices',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['supplies', 'tickets'], dailyLevels: [4, 5],
  sample(rng, level) {
    const a = level === 1 ? 1 : rng.int(1, 6), b = level === 1 ? 1 : rng.int(1, 6)
    let c = level === 1 ? 1 : rng.int(1, 6), d = level === 1 ? 2 : rng.int(1, 6)
    while (a * d === b * c) { c = rng.int(1, 6); d = rng.int(1, 6) }
    const x = rng.int(2, 50), y = rng.int(2, 50)
    const fee = level === 3 || level === 5 ? rng.int(1, 20) : 0
    const discount = level >= 4 ? rng.int(1, 5) * 5 : 0
    return { a, b, c, d, fee, discount, total1: Number(((a * x + b * y + fee) * (1 - discount / 100)).toFixed(6)), total2: Number(((c * x + d * y + fee) * (1 - discount / 100)).toFixed(6)) }
  },
  solve: priceA,
  verify(p) {
    const matches: number[] = []
    for (let x = 1; x <= 50; x++) {
      const y = (subtotal1(p) - p.a * x) / p.b
      if (y >= 1 - 1e-8 && y <= 50 + 1e-8 && Math.abs(y - Math.round(y)) < 1e-8 && Math.abs(p.c * x + p.d * y - subtotal2(p)) < 1e-8) matches.push(x)
    }
    if (matches.length !== 1) throw new Error('Two orders must determine one pair of integer prices')
    return matches[0]
  },
  render: (p, skin) => [
    { t: 'p', text: `${skin === 'supplies' ? 'Two types of supplies' : 'Two types of event tickets'}, A and B, have fixed whole-credit unit prices between 1 and 50. Each order adds a ${p.fee}-credit fixed fee, then discounts the ENTIRE bill, including the fee, by ${p.discount}%. There is no rounding.` },
    { t: 'table', head: ['Order', 'A quantity', 'B quantity', 'Final total (credits)'], rows: [['1', String(p.a), String(p.b), display(p.total1)], ['2', String(p.c), String(p.d), display(p.total2)]] },
    { t: 'p', text: 'What is the unit price of A in credits?' },
  ],
  answer: () => ({ type: 'integer', unit: 'credits' }),
  misconceptions: [
    { id: 'average-all-items', value: (p) => subtotal1(p) / (p.a + p.b), feedback: () => 'Dividing by all items assumes A and B share a price. Use both orders to separate the two unit prices.' },
    { id: 'assign-entire-order-to-A', value: (p) => subtotal1(p) / p.a, feedback: () => 'The order total includes B as well as A. Eliminate B using the second order before dividing by the A coefficient.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'After undoing the discount and removing the fee, what is the first order’s item subtotal?' }], answer: subtotal1, tolerance: exact, explain: (p) => [{ t: 'p', text: `${display(p.total1)} / ${display(1 - p.discount / 100)} − ${p.fee} = ${display(subtotal1(p))}.` }] },
    { prompt: () => [{ t: 'p', text: 'Multiply the first item equation by the second order’s B quantity and the second by the first order’s B quantity. After subtracting, what coefficient of A remains?' }], answer: (p) => p.a * p.d - p.b * p.c, tolerance: exact, explain: (p) => [{ t: 'p', text: `The B terms cancel and the coefficient is ${p.a} × ${p.d} − ${p.c} × ${p.b}.` }] },
    { prompt: () => [{ t: 'p', text: 'What is A’s unit price?' }], answer: priceA, tolerance: exact, explain: (p) => [{ t: 'p', text: `Divide the similarly subtracted totals by the coefficient to get ${display(priceA(p))} credits.` }] },
  ],
  solution: (p) => [{ t: 'p', text: `Undo each invoice adjustment: item totals are ${display(subtotal1(p))} and ${display(subtotal2(p))}. With x and y as prices, ${p.a}x + ${p.b}y = ${display(subtotal1(p))} and ${p.c}x + ${p.d}y = ${display(subtotal2(p))}. Multiply these equations by ${p.d} and ${p.b}, respectively, and subtract: (${p.a * p.d - p.b * p.c})x = ${display(subtotal1(p) * p.d - subtotal2(p) * p.b)}. Thus A costs ${display(priceA(p))} credits.` }],
}
