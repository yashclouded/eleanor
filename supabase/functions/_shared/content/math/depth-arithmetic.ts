import type { Block, Option, Rng, Step, Template } from '../types.ts'
import { display, exact } from './common.ts'

const draft = { version: 1, track: 'math' as const, status: 'draft' as const, review: { author: 'GPT-6', reviewer: null, reviewedAt: null } }
const foundationLevels = [1, 2, 3, 4, 5, 6].map(level => ({ level, initialRating: 200 + 200 * level }))
const advancedLevels = [1, 2, 3, 4].map(level => ({ level, initialRating: 1500 + 300 * level }))
const varietyLevels = [1, 2, 3, 4].map(level => ({ level, initialRating: 600 + 400 * level }))
const text = (value: string): Block[] => [{ t: 'p', text: value }]
const numeric = () => ({ type: 'number' as const, tolerance: exact })
function step<P>(prompt: string | ((p: P) => string), answer: (p: P) => number, explain: (p: P) => string): Step<P> { return { prompt: p => text(typeof prompt === 'string' ? prompt : prompt(p)), answer, tolerance: exact, explain: p => text(explain(p)) } }
function gcd(a: number, b: number): number { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a }
const mod = (a: number, b: number) => ((a % b) + b) % b
function shuffle<T>(values: readonly T[], rng: Rng): T[] { const out = [...values]; for (let i = out.length - 1; i > 0; i--) { const j = rng.int(0, i); [out[i], out[j]] = [out[j], out[i]] } return out }
type Fraction = { n: number; d: number }
function fraction(n: number, d: number): Fraction { const g = gcd(n, d); return { n: n / g * Math.sign(d), d: Math.abs(d / g) } }
const fractionText = (q: Fraction) => q.d === 1 ? String(q.n) : `${q.n}/${q.d}`
function equalFractions(a: Fraction, b: Fraction): boolean { return BigInt(a.n) * BigInt(b.d) === BigInt(b.n) * BigInt(a.d) }

type RatioBasics = { level: number; a: number; b: number; c: number; total: number; given: number; post: number[] }
function ratioAnswer(p: RatioBasics): number {
  if (p.level === 1) return p.given * p.b / p.a
  if (p.level === 2) return p.total * p.a / (p.a + p.b)
  if (p.level === 3) return p.total * p.b / (p.a + p.b + p.c)
  if (p.level === 4) return p.total * p.a / ((p.a + p.b) * p.c + p.total * p.b)
  const [r, s] = p.post
  return p.level === 5 ? (p.a + p.b) * p.c * s / (p.b * r - p.a * s) : p.a * p.c * (r + s) / (p.a * s - p.b * r)
}

type Coupon = { id: string; discount: number; fee: number; cap: number; minimum: number; credit: number; feeTaxed: boolean }
type Coupons = { level: number; price: number; tax: number; offers: Coupon[] }
function couponCost(p: Coupons, o: Coupon): number {
  const discounted = p.price - (p.level === 1 ? p.price * o.discount / 100 : Math.min(p.price * o.discount / 100, o.cap))
  if (p.level < 3) return discounted + o.fee
  return (discounted - o.credit + (o.feeTaxed ? o.fee : 0)) * (100 + p.tax) / 100 + (o.feeTaxed ? 0 : o.fee)
}
const eligibleCoupons = (p: Coupons) => p.offers.filter(o => p.level === 1 || p.price >= o.minimum)
const couponWinner = (p: Coupons) => [...eligibleCoupons(p)].sort((a, b) => couponCost(p, a) - couponCost(p, b))[0].id
function couponOptions(p: Coupons): Option[] { return p.offers.map(o => ({ id: o.id, label: `${o.id}: ${o.discount}% discount; ${o.fee}-credit fee${p.level > 1 ? `; discount cap ${o.cap}; qualifying original subtotal ≥${o.minimum}` : ''}${p.level === 3 ? `; ${o.credit}-credit reduction before tax; fee ${o.feeTaxed ? 'is' : 'is not'} taxable` : ''}` })) }
export const couponPolicyTemplate: Template<Coupons> = {
  ...draft, id: 'math.percent-change.variety.coupon-policy', concept: 'math.percent-change', family: 'piecewise-coupon-tax-policy', levels: varietyLevels.slice(0, 3), skins: ['equipment', 'supplies'],
  sample(rng, level) {
    const price = rng.int(100, 1000), tax = rng.int(1, 25)
    for (let attempt = 0; attempt < 100; attempt++) {
      const offers = shuffle(Array.from({ length: 6 }, (_, i) => ({ id: `p${i + 1}`, discount: rng.int(5, 60), fee: rng.int(0, 80), cap: rng.int(10, Math.floor(price / 2)), minimum: rng.int(1, price + 100), credit: rng.int(1, Math.floor(price / 4)), feeTaxed: rng.int(0, 1) === 1 })), rng)
      const p = { level, price, tax, offers }, eligible = eligibleCoupons(p)
      if (eligible.length >= 2 && new Set(eligible.map(o => couponCost(p, o))).size === eligible.length) return p
    }
    throw new Error('Could not draw distinct coupon invoices')
  },
  solve: couponWinner,
  verify(p) {
    // Compute each invoice as original subtotal minus savings plus separately expanded tax.
    let best = '', bestCost = Infinity
    for (const o of p.offers) {
      if (p.level > 1 && o.minimum > p.price) continue
      const saving = p.level === 1 ? o.discount * p.price / 100 : Math.min(o.cap, o.discount * p.price / 100)
      const value = p.level < 3 ? p.price + o.fee - saving : p.price + o.fee - saving - o.credit + (p.price - saving - o.credit + (o.feeTaxed ? o.fee : 0)) * p.tax / 100
      if (value < bestCost) { best = o.id; bestCost = value }
    }
    return best
  },
  render(p, skin) { return [...text(`An order of ${skin} has original subtotal ${p.price} hypothetical credits. Choose the eligible policy giving the smallest final invoice. Policies cannot be combined. Credits are continuous quantities; perform no intermediate or final currency rounding. ${p.level === 1 ? 'Apply the advertised percentage discount to the original subtotal, then add the fixed fee. There is no tax or eligibility threshold.' : `Eligibility uses the original subtotal, with the displayed minimum included. The percentage discount is limited by its stated cap; then add the fee. ${p.level === 3 ? `Also subtract the displayed fixed credit from the discounted subtotal before applying ${p.tax}% tax. Include the fee in that tax base only when the policy says it is taxable; otherwise add the fee after tax.` : 'There is no tax or extra fixed credit.'}`}`), { t: 'list', items: couponOptions(p).map(o => o.label) }] },
  answer: p => ({ type: 'choice', options: couponOptions(p) }),
  misconceptions: [
    { id: 'largest-advertised-percent', value: p => [...eligibleCoupons(p)].sort((a, b) => b.discount - a.discount)[0].id, feedback: () => 'An advertised percentage alone does not determine the final invoice. Apply the cap, fixed amounts and stated tax base.' },
    { id: 'ignore-discount-and-pick-smallest-fee', value: p => [...eligibleCoupons(p)].sort((a, b) => a.fee - b.fee)[0].id, feedback: () => 'The smallest fixed fee need not offset a smaller discount. Compare complete eligible invoices.' },
    { id: 'maximize-instead-of-minimize-cost', value: p => [...eligibleCoupons(p)].sort((a, b) => couponCost(p, b) - couponCost(p, a))[0].id, feedback: () => 'The task asks for the lowest complete invoice, rather than the largest amount charged.' },
  ],
  steps: [
    step('For the first displayed policy, what discount amount applies before any fixed credit or tax?', p => p.level === 1 ? p.price * p.offers[0].discount / 100 : Math.min(p.price * p.offers[0].discount / 100, p.offers[0].cap), () => 'Compute the advertised discount and, when present, limit it by the cap.'),
    step('What invoice does the first displayed policy produce, ignoring eligibility for this calculation?', p => couponCost(p, p.offers[0]), () => 'Apply each fixed amount in its stated place and use precisely the declared tax base.'),
    step('What is the smallest eligible invoice?', p => Math.min(...eligibleCoupons(p).map(o => couponCost(p, o))), () => 'Discard ineligible policies and compare complete invoices without rounding.'),
  ],
  solution(p) { return text(`Eligible policies and their exact invoice values are ${eligibleCoupons(p).map(o => `${o.id}: ${display(couponCost(p, o))}`).join('; ')} credits. The correct selection is ${couponWinner(p)}. A minimum threshold applies to the original subtotal. A cap limits the discount amount, and tax follows the explicitly stated treatment of the fixed fee.`) },
}

type PercentClaims = { level: number; base: number; rate: number; second: number; fee: number; claims: Fraction[] }
function claimValues(p: Omit<PercentClaims, 'claims'>): Fraction[] {
  const { base: b, rate: r, second: s, fee: f } = p
  if (p.level === 1) return [fraction(b * r, 100), fraction(b * (100 + r), 100), fraction(b * (100 - r), 100), fraction(r, 100), fraction(100 * r, 100 - r), fraction(100 - r, 1)]
  if (p.level === 2) return [fraction(b * (100 + r), 100), fraction(b * (100 + r) * (100 - s), 10000), fraction(100 * (r - s) - r * s, 100), fraction(b, 1), fraction(100 * s, 100 - s), fraction((100 + r) * (100 - s), 10000)]
  const discounted = b * (100 - r), subtotal = discounted + 100 * f
  return [fraction(discounted, 100), fraction(subtotal, 100), fraction(subtotal * s, 10000), fraction(subtotal * (100 + s), 10000), fraction(discounted * (100 + s) + 10000 * f, 10000), fraction(f * s, 100)]
}
function claimQuestions(p: PercentClaims): string[] {
  if (p.level === 1) return ['The percentage amount is', 'After an increase, the amount is', 'After a decrease, the amount is', 'The rate expressed as a fraction of one is', 'The percent increase needed to undo the decrease is', 'The percentage of the original remaining after the decrease is']
  if (p.level === 2) return ['The amount after the first change is', 'The final amount is', 'The signed net percentage change from the original is', 'Reversing both changes from the actual amount produced by the two changes recovers the original', 'The percentage increase needed to undo only the second change is', 'The overall multiplicative factor is']
  return ['The discounted subtotal is', 'The subtotal including the fee before tax is', 'The tax charged on that subtotal is', 'The final invoice is', 'If the same fee were instead added after tax, the final invoice would be', 'Adding the fee before tax rather than after tax increases the invoice by']
}
function percentClaimOptions(p: PercentClaims): Option[] { return p.claims.map((q, i) => ({ id: `c${i + 1}`, label: `${claimQuestions(p)[i]} ${fractionText(q)}${p.level === 1 && (i === 4 || i === 5) || p.level === 2 && (i === 2 || i === 4) ? '%' : ''}.` })) }
const trueClaimIds = (p: PercentClaims) => claimValues(p).flatMap((value, i) => equalFractions(value, p.claims[i]) ? [`c${i + 1}`] : [])
function claimsUnderWrongMethod(p: PercentClaims, fixedUnits: boolean): string[] {
  const b = p.base, r = p.rate, s = p.second, f = p.fee
  let values: number[]
  if (fixedUnits) {
    const first = b + r, last = first - s, discounted = b - r
    values = p.level === 1 ? [r, first, discounted, r, r, b - r] : p.level === 2 ? [first, last, r - s, last - r + s, s, last / b] : [discounted, discounted + f, s, discounted + f + s, discounted + s + f, 0]
  } else {
    const first = b * (1 + r / 100), final = b * (1 + (r - s) / 100), discounted = b * (1 - r / 100)
    values = p.level === 1 ? [b * r / 100, first, discounted, r / 100, r, 100 - r] : p.level === 2 ? [first, final, r - s, final / (1 + (r - s) / 100), s, 1 + (r - s) / 100] : [discounted, discounted + f, discounted * s / 100, discounted * (1 + s / 100) + f, discounted * (1 + s / 100) + f, 0]
  }
  return values.flatMap((value, i) => Math.abs(value - p.claims[i].n / p.claims[i].d) < 1e-8 ? [`c${i + 1}`] : [])
}
export const percentClaimsTemplate: Template<PercentClaims> = {
  ...draft, id: 'math.percent-change.variety.percent-claims', concept: 'math.percent-change', family: 'percentage-base-identity-audit', levels: varietyLevels.slice(0, 3), skins: ['material', 'digital-units'],
  sample(rng, level) {
    const base = rng.int(50, 1000), rate = rng.int(1, 70), second = rng.int(1, 60), fee = rng.int(1, 80), p = { level, base, rate, second, fee }, values = claimValues(p)
    const selected = Array.from({ length: 6 }, () => rng.int(0, 1) === 1)
    if (selected.every(Boolean)) selected[0] = false
    if (selected.every(value => !value)) selected[0] = true
    return { ...p, claims: values.map((q, i) => selected[i] ? q : fraction(q.n + (rng.int(0, 1) ? 1 : -1) * rng.int(1, 12) * q.d, q.d)) }
  },
  solve: trueClaimIds,
  verify(p) {
    const b = p.base, q = p.rate / 100, s = p.second / 100, f = p.fee
    // Evaluate changes directly on balances, separately from the rational formula construction.
    const first = p.level === 3 ? b - b * q : b + b * q
    const final = p.level === 2 ? first - first * s : (first + f) + (first + f) * s
    const values = p.level === 1 ? [b * q, first, b - b * q, q, (b / (b - b * q) - 1) * 100, (b - b * q) / b * 100] : p.level === 2 ? [first, final, (final / b - 1) * 100, final / (1 - s) / (1 + q), (first / final - 1) * 100, final / b] : [first, first + f, (first + f) * s, final, first + first * s + f, f * s]
    return values.flatMap((value, i) => Math.abs(value - p.claims[i].n / p.claims[i].d) < 1e-8 ? [`c${i + 1}`] : [])
  },
  render(p, skin) { return text(`${skin === 'material' ? 'A divisible material amount' : 'A balance of divisible digital units'} starts at ${p.base}. All amounts are exact real quantities with no rounding. ${p.level === 1 ? `Consider either increasing or decreasing this original amount by ${p.rate}%, as each statement specifies. Statements about undoing a decrease start from the decreased amount.` : p.level === 2 ? `First increase the original amount by ${p.rate}%, then decrease that new amount by ${p.second}%. Each percentage uses the amount immediately before its own change.` : `Reduce the original amount by ${p.rate}%, add a fixed fee of ${p.fee}, then charge ${p.second}% tax on that subtotal including the fee. The comparison policy mentioned in a statement uses the same discount but adds the fee after tax.`} Select every mathematically correct statement. Percentage change is signed; a negative value means a decrease.`) },
  answer: p => ({ type: 'multi', options: percentClaimOptions(p) }),
  misconceptions: [
    { id: 'select-false-instead-of-true', value: p => percentClaimOptions(p).filter(o => !trueClaimIds(p).includes(o.id)).map(o => o.id), feedback: () => 'Select the statements that follow from the stated operations. A counterexample or numerical mismatch makes a statement false.' },
    { id: 'reuse-original-base-or-exclude-taxable-fee', value: p => claimsUnderWrongMethod(p, false), feedback: () => 'A later percentage uses the updated amount. Recovery from a decrease uses the reduced base; a fee explicitly included in the tax base also incurs tax.' },
    { id: 'treat-percentages-as-fixed-units', value: p => claimsUnderWrongMethod(p, true), feedback: () => 'A percentage is a fraction of the stated amount, rather than a fixed number of units. Convert it to a multiplier before adding or subtracting quantities.' },
  ],
  steps: [
    step('What amount results from applying the first stated percentage change?', p => p.base * (100 + (p.level === 3 ? -p.rate : p.rate)) / 100, () => 'Use the original amount as the base of the first percentage.'),
    step('What is the main ending amount: increased amount at level 1, final amount otherwise?', p => { const v = claimValues(p); return v[p.level === 1 ? 1 : p.level === 2 ? 1 : 3].n / v[p.level === 1 ? 1 : p.level === 2 ? 1 : 3].d }, () => 'Apply changes in the given order, updating the percentage base each time.'),
    step('How many of the six statements are correct?', p => trueClaimIds(p).length, () => 'Check each assertion against its own quantity and units, including percentage versus fraction.'),
  ],
  solution(p) { return text(`Correct selections: ${trueClaimIds(p).join(', ')}. The six exact quantities, in statement order, are ${claimValues(p).map(fractionText).join('; ')}. Calculate a percentage on its stated base. Successive multipliers compose by multiplication; reversing a decrease divides by its remaining fraction. A fee in the tax base incurs its own tax.`) },
}
export const ratioFoundation: Template<RatioBasics> = {
  ...draft, id: 'math.ratios.foundation.equal-parts', concept: 'math.ratios', family: 'ratio-equal-parts-foundation', levels: foundationLevels, skins: ['beads', 'tiles'], dailyLevels: [6],
  sample(rng, level) {
    const a = rng.int(1, 8), b = a + rng.int(1, 5), unit = rng.int(2, 25), c = level === 3 ? rng.int(1, 9) : rng.int(1, Math.min(15, a * unit - 1))
    const post = level === 5 ? [a * unit + c, b * unit] : [a * unit - c, b * unit + c], g = gcd(post[0], post[1])
    return { level, a, b, c, total: (a + b + (level === 3 ? c : 0)) * unit, given: a * unit, post: post.map(value => value / g) }
  },
  solve: ratioAnswer,
  verify(p) {
    if (p.level === 1) return p.given / p.a * p.b
    if (p.level === 2) return p.total - p.total * p.b / (p.a + p.b)
    if (p.level === 3) return p.total - p.total * (p.a + p.c) / (p.a + p.b + p.c)
    if (p.level === 4) { const a = p.total / (p.a + p.b) * p.a; return a / (p.total - a + p.c) }
    for (let unit = 1; unit <= 100; unit++) {
      const a = p.a * unit + (p.level === 5 ? p.c : -p.c), b = p.b * unit + (p.level === 5 ? 0 : p.c)
      if (a > 0 && a * p.post[1] === b * p.post[0]) return p.level === 5 ? (p.a + p.b) * unit : p.a * unit
    }
    throw new Error('Ratio model must have one positive integer scale')
  },
  render(p, skin) {
    const noun = skin === 'beads' ? 'beads' : 'tiles'
    return text(`A collection contains whole ${noun} in labelled groups. Ratios compare counts in the order stated. ${p.level === 1 ? `A:B=${p.a}:${p.b}, and A contains ${p.given} ${noun}. How many are in B?` : p.level === 2 ? `A:B=${p.a}:${p.b}, with ${p.total} ${noun} altogether. How many are in A?` : p.level === 3 ? `A:B:C=${p.a}:${p.b}:${p.c}, with ${p.total} ${noun} altogether. How many are in B?` : p.level === 4 ? `Initially A:B=${p.a}:${p.b}, with ${p.total} ${noun} altogether. Add ${p.c} new ${noun} to B only. Give the new ratio A/B as one number.` : p.level === 5 ? `Initially A:B=${p.a}:${p.b}. Add ${p.c} ${noun} to A only, obtaining A:B=${p.post[0]}:${p.post[1]}. How many ${noun} were there originally altogether?` : `Initially A:B=${p.a}:${p.b}. Move ${p.c} ${noun} from A to B, obtaining A:B=${p.post[0]}:${p.post[1]}. How many ${noun} were originally in A?`}`)
  },
  answer: numeric,
  misconceptions: [
    { id: 'confuse-part-with-whole', value: p => p.level === 1 ? p.given * p.b / (p.a + p.b) : p.level < 4 ? p.total * p.a / p.b : p.level === 4 ? p.total * p.a / (p.total * p.b) : ratioAnswer(p) + p.c, feedback: () => 'A part-to-part ratio is not a part-to-total fraction. Track whether the stated change adds new objects or merely transfers them.' },
    { id: 'reverse-labelled-ratio', value: p => p.level === 1 ? p.given * p.a / p.b : p.level === 2 ? p.total * p.b / (p.a + p.b) : p.level === 3 ? p.total * p.a / (p.a + p.b + p.c) : p.level === 4 ? 1 / ratioAnswer(p) : p.level === 5 ? p.c * (p.a + p.b) : ratioAnswer(p) * p.b / p.a, feedback: () => 'Keep the labels attached to the ratio terms. The scale is determined by the given part or the changed ratio; an added count is not automatically one ratio unit.' },
  ],
  steps: [
    step(p => p.level === 1 ? 'How many objects does one original ratio part represent?' : p.level <= 3 ? 'How many parts are in the entire displayed ratio?' : p.level === 4 ? 'How many objects are originally in A?' : 'After cross-multiplication, what positive coefficient multiplies the original ratio scale k?', p => p.level === 1 ? p.given / p.a : p.level <= 3 ? p.a + p.b + (p.level === 3 ? p.c : 0) : p.level === 4 ? p.total * p.a / (p.a + p.b) : p.level === 5 ? p.b * p.post[0] - p.a * p.post[1] : p.a * p.post[1] - p.b * p.post[0], () => 'Match the original labelled groups to one common scale. Include every group when forming a total; for an inverse change collect the cross-product scale terms.'),
    step(p => p.level === 1 ? 'What multiplier converts the A count directly to the B count?' : p.level <= 3 ? 'How many objects does one ratio part represent?' : p.level === 4 ? 'How many objects are in B after the addition?' : 'What is the original common ratio scale k?', p => p.level === 1 ? p.b / p.a : p.level <= 3 ? p.total / (p.a + p.b + (p.level === 3 ? p.c : 0)) : p.level === 4 ? p.total * p.b / (p.a + p.b) + p.c : p.level === 5 ? p.c * p.post[1] / (p.b * p.post[0] - p.a * p.post[1]) : p.c * (p.post[0] + p.post[1]) / (p.a * p.post[1] - p.b * p.post[0]), () => 'Divide the matched whole or cross-product constant by its scale coefficient, preserving the direction of the stated change.'),
    step('What is the requested count or decimal ratio?', ratioAnswer, p => `Represent counts as a common positive scale times the ratio terms, then apply the stated change. Result: ${display(ratioAnswer(p))}.`),
  ],
  solution: p => text(`Use a common scale k for the original ratio terms. ${p.level === 1 ? `A=${p.a}k=${p.given}, so B=${p.b}k.` : p.level <= 3 ? `The total is the sum of the displayed ratio parts times k. Divide the total by that sum before taking the requested part.` : p.level === 4 ? `The new counts are A=${p.a}×${p.total}/(${p.a}+${p.b}) and B=${p.b}×${p.total}/(${p.a}+${p.b})+${p.c}.` : p.level === 5 ? `Solve (${p.a}k+${p.c})/(${p.b}k)=${p.post[0]}/${p.post[1]}; then recover the original total.` : `Solve (${p.a}k−${p.c})/(${p.b}k+${p.c})=${p.post[0]}/${p.post[1]}; then recover the original A count.`} The requested result is ${display(ratioAnswer(p))}.`),
}

type Blend = { level: number; low: number; high: number; target: number; massLow: number; massHigh: number; demand: number; stockLow: number; stockHigh: number; priceLow: number; priceHigh: number; budget: number }
function blendUnit(p: Blend): { low: number; high: number; mass: number; cost: number } {
  const a = (p.high - p.target) * p.massHigh, b = (p.target - p.low) * p.massLow, g = gcd(a, b), low = a / g, high = b / g
  return { low, high, mass: low * p.massLow + high * p.massHigh, cost: low * p.priceLow + high * p.priceHigh }
}
function blendAnswer(p: Blend): number {
  if (p.level === 1) return p.demand * (p.high - p.target) / (p.high - p.low)
  const u = blendUnit(p), lower = Math.ceil(p.demand / u.mass), stock = Math.min(Math.floor(p.stockLow / u.low), Math.floor(p.stockHigh / u.high))
  if (p.level === 2) return lower * u.high
  if (p.level === 3) return stock * u.mass
  return Math.max(0, Math.min(stock, Math.floor(p.budget / u.cost)) - lower + 1)
}
export const integerBlendTemplate: Template<Blend> = {
  ...draft, id: 'math.ratios.advanced.integer-blends', concept: 'math.ratios', family: 'integer-container-alligation', levels: advancedLevels, skins: ['pigment', 'alloy'],
  sample(rng, level) {
    const low = rng.int(1, 30), high = rng.int(60, 99), target = rng.int(low + 1, high - 1)
    const p: Blend = { level, low, high, target, massLow: rng.int(1, 20), massHigh: rng.int(1, 20), demand: rng.int(50, 5000), stockLow: 0, stockHigh: 0, priceLow: rng.int(1, 40), priceHigh: rng.int(1, 40), budget: 0 }
    const u = blendUnit(p), k = rng.int(2, 25)
    p.stockLow = u.low * (k + rng.int(0, 8)) + rng.int(0, u.low - 1)
    p.stockHigh = u.high * (k + rng.int(0, 8)) + rng.int(0, u.high - 1)
    if (level === 4) { const wanted = rng.int(1, k); p.demand = (wanted - 1) * u.mass + rng.int(1, u.mass); p.budget = u.cost * rng.int(wanted, k + 3) + rng.int(0, u.cost - 1) }
    return p
  },
  solve: blendAnswer,
  verify(p) {
    if (p.level === 1) { const highMass = p.demand * (p.target - p.low) / (p.high - p.low); return p.demand - highMass }
    // Enumerate the low-container residue until the conservation equation gives a whole high count.
    let primitiveLow = 1
    while ((p.target - p.low) * p.massLow * primitiveLow % ((p.high - p.target) * p.massHigh)) primitiveLow++
    const primitiveHigh = (p.target - p.low) * p.massLow * primitiveLow / ((p.high - p.target) * p.massHigh)
    const mass = primitiveLow * p.massLow + primitiveHigh * p.massHigh
    if (p.level === 2) { let k = 1; while (k * mass < p.demand) k++; return k * primitiveHigh }
    let best = 0, count = 0
    for (let k = 1; k * primitiveLow <= p.stockLow && k * primitiveHigh <= p.stockHigh; k++) {
      best = k * mass
      if (best >= p.demand && k * (primitiveLow * p.priceLow + primitiveHigh * p.priceHigh) <= p.budget) count++
    }
    return p.level === 3 ? best : count
  },
  render(p, skin) {
    return text(`Two ${skin === 'pigment' ? 'pigment mixtures' : 'alloy feeds'} contain ${p.low}% and ${p.high}% active material by mass. Masses add with no loss, evaporation or reaction. The desired blend is exactly ${p.target}% active material. ${p.level === 1 ? `Make exactly ${p.demand} kg; portions may be any nonnegative real mass. How many kg of the lower-concentration feed are needed?` : `The low feed comes in ${p.massLow}-kg containers and the high feed in ${p.massHigh}-kg containers. Containers must be used whole, with no discarded contents. ${p.level === 2 ? `There is unlimited stock. What is the smallest number of high-feed containers in any exact blend weighing at least ${p.demand} kg?` : `At most ${p.stockLow} low-feed and ${p.stockHigh} high-feed containers are available. ${p.level === 3 ? 'What is the largest total mass in kg of an exact blend that can be made?' : `A low container costs ${p.priceLow} credits and a high container costs ${p.priceHigh} credits. Count distinct positive integer container-count pairs making at least ${p.demand} kg and costing at most ${p.budget} credits. The demand and budget boundaries are inclusive; arrangements of the same containers do not count separately.`}`}`}`)
  },
  answer: numeric,
  misconceptions: [
    { id: 'average-percentages-without-mass', value: p => p.level === 1 ? p.demand / 2 : p.level === 2 ? Math.ceil(p.demand / (p.massLow + p.massHigh)) : p.level === 3 ? p.stockLow * p.massLow + p.stockHigh * p.massHigh : 1, feedback: () => 'Conserve the mass of active material. An unweighted mean or using every stocked container need not attain the exact target concentration.' },
    { id: 'ignore-container-integrality', value: p => p.level === 1 ? p.demand * (p.target - p.low) / (p.high - p.low) : p.level === 2 ? p.demand * (p.target - p.low) / ((p.high - p.low) * p.massHigh) : p.level === 3 ? Math.min(p.stockLow / blendUnit(p).low, p.stockHigh / blendUnit(p).high) * blendUnit(p).mass : blendAnswer(p) + 1, feedback: p => p.level === 4 ? 'The empty allocation is not a positive blend and cannot satisfy a positive demand. Do not count it as one additional feasible pair.' : 'The continuous mixture ratio must also be realizable by whole containers. Reduce the container-count ratio before applying demand or stock limits.' },
  ],
  steps: [
    step(p => p.level === 1 ? 'What is the difference between the high concentration and target, in percentage points?' : 'How many low-feed containers belong to the primitive positive exact-blend pair?', p => p.level === 1 ? p.high - p.target : blendUnit(p).low, () => 'Balance the excess and deficit of active material. For containers, incorporate their masses and reduce the two count terms by their gcd.'),
    step(p => p.level === 1 ? 'What is the low-feed mass fraction in a continuous exact blend?' : 'How many high-feed containers belong to that primitive exact-blend pair?', p => p.level === 1 ? (p.high - p.target) / (p.high - p.low) : blendUnit(p).high, () => 'The two concentration gaps determine a mass ratio; container counts also incorporate the different container masses.'),
    step(p => p.level === 1 ? 'What high-feed mass, in kg, complements the low-feed mass?' : 'What is the mass in kg of one primitive exact-blend pair?', p => p.level === 1 ? p.demand * (p.target - p.low) / (p.high - p.low) : blendUnit(p).mass, () => 'Use mass conservation. Every integer blend is a positive whole multiple of the primitive container pair.'),
    step('What is the requested mass, whole-container count, or number of feasible pairs?', blendAnswer, p => `Use the conservation ratio and the stated continuous or integer domain. Result: ${display(blendAnswer(p))}.`),
  ],
  solution(p) { const u = blendUnit(p); return text(`Write (target−low)×low mass=(high−target)×high mass. ${p.level === 1 ? `Thus the low mass is ${p.demand}×(${p.high}−${p.target})/(${p.high}−${p.low}).` : `After allowing for container masses and reducing, the smallest positive container counts are ${u.low} low and ${u.high} high. Every exact whole-container blend is an integer multiple k of this pair, weighing ${u.mass} kg${p.level === 4 ? ` and costing ${u.cost} credits` : ''} per k. Apply the displayed ${p.level === 2 ? 'demand lower bound' : p.level === 3 ? 'stock upper bounds' : 'demand, stock and budget bounds'} to k, rounding lower bounds up and upper bounds down.`} Requested result: ${display(blendAnswer(p))}.`) },
}

type Journey = { id: string; distances: number[]; speeds: number[]; wait: number; still: number; current: number }
type Journeys = { level: number; plans: Journey[] }
function journeyFraction(p: Journeys, j: Journey): Fraction {
  const [a, b] = p.level === 3 ? [j.still + j.current, j.still - j.current] : j.speeds
  return fraction((j.distances[0] + j.distances[1]) * 60 * a * b, 60 * (j.distances[0] * b + j.distances[1] * a) + j.wait * a * b)
}
function journeyOrder(p: Journeys): string[] { return [...p.plans].sort((a, b) => { const x = journeyFraction(p, a), y = journeyFraction(p, b); return y.n * x.d - x.n * y.d }).map(j => j.id) }
export const journeyRankingTemplate: Template<Journeys> = {
  ...draft, id: 'math.ratios.variety.journey-ranking', concept: 'math.ratios', family: 'average-journey-speed-ranking', levels: varietyLevels.slice(0, 3), skins: ['couriers', 'inspection'], dailyLevels: [2],
  sample(rng, level) {
    const plans: Journey[] = []
    for (let i = 0; i < 6; i++) {
      for (let attempt = 0; attempt < 100; attempt++) {
        const distance = rng.int(5, 100), still = rng.int(25, 80)
        const plan = { id: `r${i + 1}`, distances: [distance, level === 1 ? distance : rng.int(5, 100)], speeds: [rng.int(5, 80), rng.int(5, 80)], wait: level >= 2 ? rng.int(1, 45) : 0, still, current: rng.int(1, 20) }
        if (plans.every(existing => !equalFractions(journeyFraction({ level, plans }, existing), journeyFraction({ level, plans }, plan)))) { plans.push(plan); break }
        if (attempt === 99) throw new Error('Could not draw six distinct journey speeds')
      }
    }
    return { level, plans: shuffle(plans, rng) }
  },
  solve: journeyOrder,
  verify(p) {
    const remaining = p.plans.map(j => { const [a, b] = p.level === 3 ? [j.still + j.current, j.still - j.current] : j.speeds; return { id: j.id, timePerKm: (j.distances[0] / a + j.distances[1] / b + j.wait / 60) / (j.distances[0] + j.distances[1]) } })
    const result: string[] = []
    while (remaining.length) { let best = 0; for (let i = 1; i < remaining.length; i++) if (remaining[i].timePerKm < remaining[best].timePerKm) best = i; result.push(remaining.splice(best, 1)[0].id) }
    return result
  },
  render(p, skin) { return [...text(`Six ${skin === 'couriers' ? 'courier journeys' : 'inspection journeys'} each contain two legs. Speeds are constant within each leg. ${p.level === 1 ? 'There is no stationary wait.' : 'Include the stated stationary wait in total elapsed time.'} ${p.level === 3 ? 'The first leg is downstream and the second upstream; the current has the same constant magnitude on both legs, and each stated still-water speed exceeds that current.' : ''} Rank from highest to lowest average speed over the entire journey. There are no ties.`), { t: 'table', head: ['Journey', 'Leg 1 km', 'Leg 2 km', ...(p.level === 3 ? ['Still-water km/h', 'Current km/h'] : ['Leg 1 km/h', 'Leg 2 km/h']), ...(p.level >= 2 ? ['Wait minutes'] : [])], rows: p.plans.map(j => [j.id.toUpperCase(), ...j.distances.map(String), ...(p.level === 3 ? [String(j.still), String(j.current)] : j.speeds.map(String)), ...(p.level >= 2 ? [String(j.wait)] : [])]) }] },
  answer: p => ({ type: 'sequence', items: p.plans.map(j => ({ id: j.id, label: `Journey ${j.id.toUpperCase()}` })) }),
  misconceptions: [
    { id: 'average-leg-speeds', value: p => [...p.plans].sort((a, b) => (p.level === 3 ? b.still - a.still : b.speeds[0] + b.speeds[1] - a.speeds[0] - a.speeds[1])).map(j => j.id), feedback: () => 'Average speed is total distance divided by total elapsed time. Averaging leg speeds ignores unequal travel times and any stationary wait.' },
    { id: 'reverse-time-and-speed-ranking', value: p => journeyOrder(p).reverse(), feedback: () => 'A smaller time per kilometre means a larger average speed. Rank descending speed, not ascending speed.' },
  ],
  steps: [
    step('What is the total distance of the first displayed journey, in kilometres?', p => p.plans[0].distances[0] + p.plans[0].distances[1], () => 'Add distances, not speeds.'),
    step('What is its average speed in kilometres per hour?', p => { const f = journeyFraction(p, p.plans[0]); return f.n / f.d }, () => 'Compute both travel times and the wait in hours, then divide total distance by their sum.'),
    step('What is the largest average speed among the six journeys?', p => Math.max(...p.plans.map(j => { const f = journeyFraction(p, j); return f.n / f.d })), () => 'Compare the complete journey fractions; do not rank individual legs.'),
  ],
  solution(p) { return [...text('For each journey use (distance 1 + distance 2)/(distance 1/speed 1 + distance 2/speed 2 + wait/60). For current, effective speeds are still-water speed plus current downstream and minus current upstream.'), { t: 'list', items: p.plans.map(j => `${j.id.toUpperCase()}: ${fractionText(journeyFraction(p, j))} km/h.`) }, ...text(`Correct order: ${journeyOrder(p).map(id => id.toUpperCase()).join(' → ')}.`)] },
}

type Partition = { level: number; a: number; b: number; c: number; d: number; e: number; f: number; demand: number; packet: number }
function partitionRawCounts(p: Partition): number[] { return p.level === 1 ? [p.a * p.c, p.b * p.c, p.b * p.d] : [p.a * p.e * (p.c + p.d), p.b * p.e * (p.c + p.d), p.c * p.f * (p.a + p.b), p.d * p.f * (p.a + p.b)] }
function partitionCounts(p: Partition): number[] {
  const q = partitionRawCounts(p)
  const g = q.reduce(gcd)
  return q.map(n => n / g)
}
function partitionAnswer(p: Partition): number {
  const counts = partitionCounts(p), total = counts.reduce((a, b) => a + b, 0)
  if (p.level < 3) return total
  const period = p.packet / gcd(counts[0], p.packet)
  return total * period * Math.ceil(p.demand / (total * period))
}
export const nestedPartitionTemplate: Template<Partition> = {
  ...draft, id: 'math.ratios.variety.nested-partitions', concept: 'math.ratios', family: 'nested-ratio-integer-realization', levels: varietyLevels.slice(0, 3), skins: ['tokens', 'components'], dailyLevels: [2],
  sample: (rng, level) => ({ level, a: rng.int(1, 8), b: rng.int(1, 8), c: rng.int(1, 8), d: rng.int(1, 8), e: rng.int(1, 8), f: rng.int(1, 8), demand: rng.int(50, 5000), packet: rng.int(2, 20) }),
  solve: partitionAnswer,
  verify(p) {
    const shares = p.level === 1 ? [fraction(p.a * p.c, p.a * p.c + p.b * p.c + p.b * p.d), fraction(p.b * p.c, p.a * p.c + p.b * p.c + p.b * p.d), fraction(p.b * p.d, p.a * p.c + p.b * p.c + p.b * p.d)] : [fraction(p.e * p.a, (p.e + p.f) * (p.a + p.b)), fraction(p.e * p.b, (p.e + p.f) * (p.a + p.b)), fraction(p.f * p.c, (p.e + p.f) * (p.c + p.d)), fraction(p.f * p.d, (p.e + p.f) * (p.c + p.d))]
    const base = shares.reduce((n, q) => n / gcd(n, q.d) * q.d, 1)
    if (p.level < 3) return base
    for (let k = Math.ceil(p.demand / base); ; k++) if (k * base * shares[0].n / shares[0].d % p.packet === 0) return k * base
  },
  render(p, skin) { return text(`A collection of whole ${skin === 'tokens' ? 'tokens' : 'components'} is divided into nonempty labelled groups. ${p.level === 1 ? `A:B=${p.a}:${p.b} and B:C=${p.c}:${p.d}. Find the smallest possible total A+B+C.` : `A:B=${p.a}:${p.b}, C:D=${p.c}:${p.d}, and (A+B):(C+D)=${p.e}:${p.f}. ${p.level === 3 ? `The total must be at least ${p.demand}, and the number in A must be divisible by ${p.packet}. Find the smallest possible total.` : 'Find the smallest possible total A+B+C+D.'}`} Ratios are exact; do not round fractional group sizes into integers.`) },
  answer: numeric,
  misconceptions: [
    { id: 'add-unmatched-ratio-parts', value: p => p.level === 1 ? p.a + p.b + p.c + p.d : p.a + p.b + p.c + p.d + p.e + p.f, feedback: () => 'Ratio terms from different comparisons do not initially share one scale. Match common groups or compute group shares before enforcing integrality.' },
    { id: 'keep-unreduced-matched-count-vector', value: p => { const counts = partitionRawCounts(p), total = counts.reduce((a, b) => a + b, 0); if (p.level < 3) return total; const period = p.packet / gcd(counts[0], p.packet); return total * period * Math.ceil(p.demand / (total * period)) }, feedback: () => 'Matching scales gives a valid count vector, but it may have a common factor. Reduce that gcd before finding the smallest realization or applying the packet and demand constraints.' },
  ],
  steps: [
    step('What is the smallest positive integer A count in the unrestricted primitive ratio realization?', p => partitionCounts(p)[0], () => 'Match the linked scales, then divide all counts by their common gcd.'),
    step('What is the total of that primitive realization?', p => partitionCounts(p).reduce((a, b) => a + b, 0), () => 'Every positive whole-number realization is an integer multiple of this vector.'),
    step('What is the requested smallest feasible total?', partitionAnswer, p => `Apply any total lower bound and packet divisibility to the common integer multiplier. Result: ${partitionAnswer(p)}.`),
  ],
  solution(p) { return text(`The primitive counts are ${partitionCounts(p).join(':')}, giving total ${partitionCounts(p).reduce((a, b) => a + b, 0)}. ${p.level === 3 ? `For a multiplier k, require kA divisible by ${p.packet} and k×total≥${p.demand}; the smallest permissible multiplier satisfies both conditions.` : 'A smaller total would make at least one required group share nonintegral.'} The smallest total is ${partitionAnswer(p)}.`) },
}

type PercentBasics = { level: number; base: number; rate: number; fee: number }
function percentBasicAnswer(p: PercentBasics): number {
  if (p.level === 1) return p.base * p.rate / 100
  if (p.level <= 3) return p.rate
  if (p.level === 4) return p.base
  if (p.level === 5) return 100 * p.rate / (100 - p.rate)
  return 100 * ((p.base * (100 - p.rate) / 100 + p.fee) / p.base - 1)
}
export const percentFoundation: Template<PercentBasics> = {
  ...draft, id: 'math.percent-change.foundation.percent-bases', concept: 'math.percent-change', family: 'percentage-base-foundation', levels: foundationLevels, skins: ['stock', 'capacity'], dailyLevels: [6],
  sample: (rng, level) => ({ level, base: rng.int(1, 20) * 20, rate: level === 5 ? rng.int(1, 80) : rng.int(1, level >= 4 ? 12 : 10) * 5, fee: rng.int(1, 30) }),
  solve: percentBasicAnswer,
  verify(p) {
    const part = p.base / 100 * p.rate
    if (p.level === 1) return part
    if (p.level === 2) return 100 / (p.base / part)
    if (p.level === 3) return ((p.base + part) / p.base - 1) * 100
    if (p.level === 4) return (p.base + part) / (1 + p.rate / 100)
    if (p.level === 5) return (100 / (100 - p.rate) - 1) * 100
    return (p.fee - part) / p.base * 100
  },
  render(p, skin) {
    const object = skin === 'stock' ? 'a stock quantity' : 'a capacity allocation'
    return text(`${p.level === 1 ? `Find ${p.rate}% of ${p.base} units of ${object}.` : p.level === 2 ? `${p.base * p.rate / 100} units are what percentage of ${p.base} units of ${object}?` : p.level === 3 ? `An amount of ${object} rises from ${p.base} to ${p.base + p.base * p.rate / 100} units. What is its percentage increase relative to the original amount?` : p.level === 4 ? `An amount of ${object} increases by ${p.rate}% to ${p.base + p.base * p.rate / 100} units. What was the original amount?` : p.level === 5 ? `An amount of ${object} falls by ${p.rate}%. What percentage increase, applied to the reduced amount, restores the original amount?` : `An amount of ${object} starts at ${p.base} units, decreases by ${p.rate}%, then receives an addition of ${p.fee} units. What is the net percentage change from the starting amount? A negative answer denotes a decrease.`} Quantities are continuous; do not round intermediate calculations.`)
  },
  answer: p => ({ type: 'number', tolerance: exact, unit: [2, 3, 5, 6].includes(p.level) ? '%' : 'units' }),
  misconceptions: [
    { id: 'use-wrong-percentage-base', value: p => p.level === 1 ? p.base + p.rate : p.level === 2 ? p.base * p.rate / 100 : p.level === 3 ? 100 * p.rate / (100 + p.rate) : p.level === 4 ? (p.base + p.base * p.rate / 100) * (1 - p.rate / 100) : p.level === 5 ? p.rate : -p.rate + p.fee, feedback: () => 'A percentage is a fraction of its named base. A final amount, a fixed addition and a percentage rate are not interchangeable bases.' },
    { id: 'invert-or-repeat-the-percentage-operation', value: p => p.level === 1 ? p.base * 100 / p.rate : p.level === 2 || p.level === 3 ? 10000 / p.rate : p.level === 4 ? (p.base + p.base * p.rate / 100) * (1 + p.rate / 100) : p.level === 5 ? -p.rate : p.rate + 100 * p.fee / p.base, feedback: () => 'Undo a multiplier by dividing, preserve increase/decrease signs, and express a fixed change as a fraction of the original base before combining it with a percentage.' },
  ],
  steps: [
    step(p => p.level === 1 ? 'What is the stated percentage as a fraction of one?' : p.level === 2 ? 'What fraction of the whole is the displayed part?' : p.level === 3 ? 'What is the increase in units?' : p.level === 4 ? 'What multiplier maps the original amount to the displayed final amount?' : p.level === 5 ? 'What fraction of the original remains after the decrease?' : 'What amount remains immediately after the percentage decrease?', p => p.level <= 2 ? p.rate / 100 : p.level === 3 ? p.base * p.rate / 100 : p.level === 4 ? 1 + p.rate / 100 : p.level === 5 ? 1 - p.rate / 100 : p.base * (1 - p.rate / 100), () => 'Identify the base of the displayed percentage before applying or reversing a change.'),
    step(p => p.level === 1 || p.level === 2 ? 'How many units are one percent of the displayed whole?' : p.level === 3 ? 'What fraction of the original amount is the increase?' : p.level === 4 ? 'What reciprocal multiplier recovers the original from the final amount?' : p.level === 5 ? 'What multiplier restores the original from the reduced amount?' : 'What is the signed net change in units after both changes?', p => p.level <= 2 ? p.base / 100 : p.level === 3 ? p.rate / 100 : p.level === 4 ? 1 / (1 + p.rate / 100) : p.level === 5 ? 1 / (1 - p.rate / 100) : p.fee - p.base * p.rate / 100, () => 'Use inverse multipliers for recovery and a signed difference for net change. Convert fractions of a base into percentages only at the end.'),
    step('What is the requested quantity or percentage?', percentBasicAnswer, p => `Identify the correct base before applying or reversing the change. Result: ${display(percentBasicAnswer(p))}.`),
  ],
  solution: p => text(`${p.level === 1 ? `${p.rate}% means ${p.rate}/100, so multiply that fraction by ${p.base}.` : p.level === 2 ? 'Divide the part by the whole and multiply by 100.' : p.level === 3 ? 'Divide the increase by the original amount, not by the final amount.' : p.level === 4 ? `The final amount is the original multiplied by 1+${p.rate}/100, so divide by that multiplier.` : p.level === 5 ? `After the loss, the remaining fraction is (100−${p.rate})/100. Recovery multiplies by its reciprocal, giving an increase of 100×${p.rate}/(100−${p.rate})%.` : `Net change in units is ${p.fee}−${p.base}×${p.rate}/100. Divide by the original ${p.base} and multiply by 100.`} Requested result: ${display(percentBasicAnswer(p))}.`),
}

type Recurrence = { level: number; rate: number; periods: number; initial: number; delta: number; final: Fraction; cash: number[]; floors: number[] }
function recurrenceValue(initial: number, rate: number, cash: number[]): Fraction {
  let value = fraction(initial, 1)
  for (const amount of cash) value = fraction(value.n * (100 + rate) + amount * value.d * 100, value.d * 100)
  return value
}
function recurrenceLowerBound(p: Recurrence): number {
  const q = 1 + p.rate / 100
  let multiplier = 1, offset = 0, lower = 0
  p.cash.forEach((cash, i) => { multiplier *= q; offset = q * offset + cash; lower = Math.max(lower, (p.floors[i] - offset) / multiplier) })
  return lower
}
function recurrenceAnswer(p: Recurrence): number {
  if (p.level === 4) {
    let lo = 0, hi = 100
    while (lo < hi) { const mid = Math.floor((lo + hi) / 2), value = recurrenceValue(p.initial, mid, Array(p.periods).fill(p.delta)); if (value.n / value.d < p.final.n / p.final.d) lo = mid + 1; else hi = mid }
    return lo
  }
  const r = 1 + p.rate / 100
  if (p.level === 3) {
    // Quarter-step rates and at most six periods keep every noninteger bound >1e-9 from an integer.
    return Math.ceil(recurrenceLowerBound(p) - 1e-9)
  }
  const multiplier = r ** p.periods, sum = (multiplier - 1) / (r - 1)
  return p.level === 1 ? (p.final.n / p.final.d - p.delta * sum) / multiplier : (p.final.n / p.final.d - p.initial * multiplier) / sum
}
export const affineRecurrenceTemplate: Template<Recurrence> = {
  ...draft, id: 'math.percent-change.advanced.affine-recurrence', concept: 'math.percent-change', family: 'inverse-affine-percentage-recurrence', levels: advancedLevels, skins: ['reservoir', 'inventory'],
  sample(rng, level) {
    const periods = level === 4 ? rng.int(2, 3) : rng.int(2, level === 3 ? 6 : 5), rate = level === 3 ? rng.int(1, 4) * 25 : rng.int(1, 40), initial = rng.int(10, 3000), delta = rng.int(1, 200)
    return { level, periods, rate, initial, delta, final: recurrenceValue(initial, rate, Array(periods).fill(delta)), cash: Array.from({ length: periods }, () => rng.int(-100, 100)), floors: Array.from({ length: periods }, () => rng.int(30, 500)) }
  },
  solve: recurrenceAnswer,
  verify(p) {
    if (p.level === 3) {
      for (let initial = 0; initial <= 5000; initial++) {
        let value = fraction(initial, 1), feasible = true
        p.cash.forEach((cash, i) => { value = fraction(value.n * (100 + p.rate) + cash * value.d * 100, value.d * 100); if (value.n < p.floors[i] * value.d) feasible = false })
        if (feasible) return initial
      }
      throw new Error('Intermediate floors exceeded supported search domain')
    }
    if (p.level === 1) { let value = p.final.n / p.final.d; for (let i = 0; i < p.periods; i++) value = (value - p.delta) * 100 / (100 + p.rate); return value }
    if (p.level === 2) {
      let baseline = p.initial, response = 0
      for (let i = 0; i < p.periods; i++) { baseline += baseline * p.rate / 100; response = response + response * p.rate / 100 + 1 }
      return (p.final.n / p.final.d - baseline) / response
    }
    for (let rate = 0; rate <= 100; rate++) {
      const power = (100 + rate) ** p.periods, denominator = 100 ** p.periods
      let numerator = p.initial * power
      for (let i = 0; i < p.periods; i++) numerator += p.delta * (100 + rate) ** i * 100 ** (p.periods - i)
      if (equalFractions(fraction(numerator, denominator), p.final)) return rate
    }
    throw new Error('No integer percentage rate realizes the stated final amount')
  },
  render(p, skin) {
    const start = `A continuous ${skin === 'reservoir' ? 'reservoir volume' : 'inventory quantity'} changes at the end of each period. First multiply the current amount by 1+r/100; then apply the signed fixed addition for that period. Additions happen after growth and also grow in later periods. No rounding, physical overflow or other losses occur.`
    if (p.level === 3) return [...text(`${start} The known rate is r=${p.rate}%. The initial amount must be a nonnegative whole number. After each period it must be at least that period’s displayed floor, inclusively. What is the smallest feasible initial amount?`), { t: 'table', head: ['Period', 'Signed addition', 'Required ending floor'], rows: p.cash.map((cash, i) => [String(i + 1), String(cash), String(p.floors[i])]) }]
    return text(`${start} There are ${p.periods} periods. ${p.level === 4 ? 'The same unknown rate r is an integer percentage from 0 through 100 inclusive.' : `The known rate is r=${p.rate}%.`} ${p.level === 1 ? 'The initial amount is unknown.' : `The initial amount is ${p.initial} units.`} ${p.level === 2 ? 'The same fixed addition is unknown and is applied in every period.' : `The fixed addition is ${p.delta} units in every period.`} The final amount is exactly ${fractionText(p.final)} units. ${p.level === 1 ? 'Find the initial amount.' : p.level === 2 ? 'Find the fixed addition per period.' : 'Find the unknown integer percentage rate r.'}`)
  },
  answer: p => ({ type: 'number', tolerance: exact, unit: p.level === 4 ? '%' : 'units' }),
  misconceptions: [
    { id: 'ignore-growth-of-earlier-additions', value: p => p.level === 1 ? (p.final.n / p.final.d - p.periods * p.delta) / (1 + p.rate / 100) ** p.periods : p.level === 2 ? (p.final.n / p.final.d - p.initial * (1 + p.rate / 100) ** p.periods) / p.periods : p.level === 3 ? Math.max(...p.floors) : 100 * (p.final.n / p.final.d - p.initial - p.periods * p.delta) / (p.initial * p.periods), feedback: () => 'Every fixed addition participates in later percentage changes. Its timing matters; add-on totals cannot replace the weighted recurrence.' },
    { id: 'check-only-final-period-or-reapply-forward', value: p => p.level === 3 ? Math.max(0, Math.ceil((p.floors.at(-1)! - p.cash.at(-1)!) / (1 + p.rate / 100))) : p.level === 1 ? p.final.n / p.final.d * (1 + p.rate / 100) ** p.periods : p.level === 2 ? p.final.n / p.final.d - p.initial : 100 * (p.final.n / p.final.d / p.initial - 1), feedback: () => 'Inverting an accumulated process is different from applying its growth again. Floor constraints apply to every intermediate state, and a multi-period net percentage is not one period’s rate.' },
  ],
  steps: [
    step(p => p.level === 4 ? 'What final amount would candidate r=0 produce?' : p.level === 3 ? 'What coefficient of the initial amount appears after the first period?' : 'What multiplier acts on the initial amount after all periods?', p => p.level === 4 ? p.initial + p.periods * p.delta : p.level === 3 ? 1 + p.rate / 100 : (1 + p.rate / 100) ** p.periods, () => 'Compose the growth factors; for a zero-rate endpoint only the fixed additions accumulate.'),
    step(p => p.level === 4 ? 'What final amount would candidate r=100 produce?' : p.level === 3 ? 'What is the strongest real lower bound on the initial amount, including zero?' : 'What is the accumulated factor multiplying the common fixed addition?', p => p.level === 4 ? p.initial * 2 ** p.periods + p.delta * (2 ** p.periods - 1) : p.level === 3 ? recurrenceLowerBound(p) : ((1 + p.rate / 100) ** p.periods - 1) / (p.rate / 100), () => 'For a fixed addition sum its later growth multipliers. For floor constraints intersect every affine lower bound. Candidate rate endpoints bracket a strictly increasing final amount.'),
    step('What is the requested inverse value or minimum feasible initial amount?', recurrenceAnswer, p => `Compose the affine updates, reverse them, or intersect the intermediate lower bounds as required. Result: ${display(recurrenceAnswer(p))}.`),
  ],
  solution(p) { return text(`With multiplier q, a constant-addition process ends at q^n×initial + addition×(1+q+…+q^(n−1)). ${p.level === 3 ? 'For each displayed period express the ending amount as A×initial+B. Its floor gives initial≥(floor−B)/A. Intersect all these lower bounds with initial≥0 and round the final lower bound upward once.' : p.level === 4 ? 'The final amount strictly increases with the common rate for the given positive initial amount and additions. Locate the integer rate and substitute it into every period.' : 'Isolate the unknown initial amount or fixed addition; do not replace the geometric sum by the number of periods.'} Requested result: ${display(recurrenceAnswer(p))}. The exact final fraction avoids introducing rounded givens into an inverse calculation.`) },
}

type Balance = { level: number; a: number; b: number; c: number; d: number; rhs: number }
function balanceAnswer(p: Balance): number {
  if (p.level === 1) return p.rhs - p.b
  if (p.level === 2) return p.rhs / p.a
  if (p.level === 3) return (p.rhs - p.b) / p.a
  if (p.level === 4) return (p.rhs - p.b) / (p.a - p.c)
  if (p.level === 5) return (p.rhs * p.c - p.b) / p.a
  return (p.rhs - p.d) * p.c / p.a + p.b
}
function balanceEquation(p: Balance): string {
  return p.level === 1 ? `x+${p.b}=${p.rhs}` : p.level === 2 ? `${p.a}x=${p.rhs}` : p.level === 3 ? `${p.a}x+${p.b}=${p.rhs}` : p.level === 4 ? `${p.a}x+${p.b}=${p.c}x+${p.rhs}` : p.level === 5 ? `(${p.a}x+${p.b})/${p.c}=${p.rhs}` : `${p.a}(x−${p.b})/${p.c}+${p.d}=${p.rhs}`
}
export const linearFoundation: Template<Balance> = {
  ...draft, id: 'math.linear.foundation.balance-steps', concept: 'math.linear', family: 'inverse-balance-foundation', levels: foundationLevels, skins: ['balance', 'machine'], dailyLevels: [6],
  sample(rng, level) {
    const c = rng.int(2, 9), a = c + rng.int(1, 9), b = level === 5 ? c * rng.int(1, 10) : rng.int(1, 20), d = rng.int(1, 20), x = level === 5 ? c * rng.int(1, 20) : level === 6 ? b + c * rng.int(1, 20) : rng.int(1, 30)
    const rhs = level === 1 ? x + b : level === 2 ? a * x : level === 3 ? a * x + b : level === 4 ? (a - c) * x + b : level === 5 ? (a * x + b) / c : a * (x - b) / c + d
    return { level, a, b, c, d, rhs }
  },
  solve: balanceAnswer,
  verify(p) {
    // Test integer candidates against the original equation after clearing its denominator.
    for (let x = 0; x <= 200; x++) {
      const left = p.level === 1 ? x + p.b : p.level === 2 ? p.a * x : p.level === 3 || p.level === 5 ? p.a * x + p.b : p.level === 4 ? (p.a - p.c) * x + p.b : p.a * (x - p.b) + p.c * p.d
      const right = p.rhs * (p.level >= 5 ? p.c : 1)
      if (left === right) return x
    }
    throw new Error('The displayed equation must have a whole solution within the authored range')
  },
  render(p, skin) { return text(`${skin === 'balance' ? 'A balanced equality' : 'An exact reversible calculation machine'} is represented by ${balanceEquation(p)}. Multiplication is denoted by adjacency, so ax means a×x. Find the unknown nonnegative whole number x. All arithmetic is exact.`) },
  answer: numeric,
  misconceptions: [
    { id: 'undo-addition-with-addition', value: p => p.level === 1 ? p.rhs + p.b : p.level === 2 ? p.rhs * p.a : p.level === 3 ? (p.rhs + p.b) / p.a : p.level === 4 ? (p.rhs + p.b) / (p.a - p.c) : p.level === 5 ? (p.rhs * p.c + p.b) / p.a : (p.rhs + p.d) * p.c / p.a + p.b, feedback: () => 'Undo an addition by subtracting the same amount from both sides. Undo multiplication by division.' },
    { id: 'skip-one-inverse-operation', value: p => p.level === 1 ? p.rhs : p.level === 2 ? p.a / p.rhs : p.level === 3 ? p.rhs / p.a : p.level === 4 ? (p.rhs - p.b) / p.a : p.level === 5 ? (p.rhs - p.b) / p.a : (p.rhs - p.d) / p.a + p.b, feedback: () => 'Reverse every operation in the proper order. When x occurs on both sides, combine its coefficients first.' },
  ],
  steps: [
    step('After clearing a denominator if present and collecting variable terms, what coefficient multiplies x?', p => p.level === 1 ? 1 : p.level === 4 ? p.a - p.c : p.a, () => 'For the denominator levels multiply the whole equation by the denominator; for variables on both sides subtract the right coefficient.'),
    step('After isolating that variable term, what is the right-hand amount?', p => p.level === 1 ? p.rhs - p.b : p.level === 2 ? p.rhs : p.level === 3 || p.level === 4 ? p.rhs - p.b : p.level === 5 ? p.c * p.rhs - p.b : p.c * (p.rhs - p.d) + p.a * p.b, () => 'Apply the inverse fixed operations to both sides before the final division.'),
    step('What is x?', balanceAnswer, p => `Divide by the remaining coefficient and substitute into the original equality: x=${display(balanceAnswer(p))}.`),
  ],
  solution(p) { return text(`Start from ${balanceEquation(p)}. ${p.level === 4 ? 'Collect the x terms on one side, giving (a−c)x=rhs−b.' : p.level === 5 ? 'Multiply both sides by the denominator before subtracting the fixed term.' : p.level === 6 ? 'Subtract the outer fixed term, multiply by the denominator, divide by the outer coefficient, then add the inner subtracted term.' : 'Perform the inverse fixed operation first, then divide by the coefficient if needed.'} This gives x=${display(balanceAnswer(p))}. Substitution restores the original equality.`) },
}

type Diophantine = { level: number; a: number; b: number; total: number; maxX: number; maxY: number; modulus: number; residue: number; costX: number; costY: number }
function inverse(a: number, modulus: number): number {
  if (modulus === 1) return 0
  let oldR = a, r = modulus, oldS = 1, s = 0
  while (r) { const q = Math.floor(oldR / r); [oldR, r] = [r, oldR - q * r]; [oldS, s] = [s, oldS - q * s] }
  if (oldR !== 1) throw new Error('Inverse requires coprime arguments')
  return mod(oldS, modulus)
}
function diophantineProgression(p: Diophantine): { x: number; y: number; dx: number; dy: number; first: number; last: number; stride: number; count: number } {
  const g = gcd(p.a, p.b), dx = p.b / g, dy = p.a / g
  const empty = { x: 0, y: 0, dx, dy, first: 0, last: -1, stride: 1, count: 0 }
  if (p.total % g) return empty
  const x = mod(p.total / g * inverse(p.a / g, dx), dx), y = (p.total - p.a * x) / p.b
  const maxX = p.level === 1 ? Math.floor(p.total / p.a) : p.maxX, maxY = p.level === 1 ? Math.floor(p.total / p.b) : p.maxY
  const lower = Math.max(Math.ceil(-x / dx), Math.ceil((y - maxY) / dy)), upper = Math.min(Math.floor((maxX - x) / dx), Math.floor(y / dy))
  if (lower > upper) return empty
  let stride = 1, residue = 0
  if (p.level >= 3) {
    const coefficient = mod(dx - dy, p.modulus), target = mod(p.residue - x - y, p.modulus), h = gcd(coefficient, p.modulus)
    if (target % h) return empty
    stride = p.modulus / h
    residue = mod(target / h * inverse(coefficient / h, stride), stride)
  }
  const first = lower + mod(residue - lower, stride), last = upper - mod(upper - residue, stride)
  return { x, y, dx, dy, first, last, stride, count: first > last ? 0 : (last - first) / stride + 1 }
}
function diophantineAnswer(p: Diophantine): number {
  const u = diophantineProgression(p)
  if (p.level < 4) return u.count
  if (!u.count) return -1
  const k = p.costX * u.dx - p.costY * u.dy >= 0 ? u.first : u.last
  return p.costX * (u.x + u.dx * k) + p.costY * (u.y - u.dy * k)
}
export const diophantineTemplate: Template<Diophantine> = {
  ...draft, id: 'math.linear.advanced.diophantine-bounds', concept: 'math.linear', family: 'bounded-linear-congruence-lattice', levels: advancedLevels, skins: ['packing', 'production'],
  sample(rng, level) {
    const modulus = rng.int(2, 12), p = { level, a: rng.int(2, 80), b: rng.int(2, 80), total: rng.int(50, 2500), maxX: rng.int(5, 100), maxY: rng.int(5, 100), modulus, residue: rng.int(0, modulus - 1), costX: rng.int(1, 50), costY: rng.int(1, 50) }
    // Mix witnessed solutions with unrestricted draws: feasibility is a question, not a default answer.
    if (rng.int(0, 99) < 65) {
      const x = rng.int(1, p.maxX), y = rng.int(1, p.maxY)
      p.total = p.a * x + p.b * y
      p.residue = mod(x + y, p.modulus)
    }
    return p
  },
  solve: diophantineAnswer,
  verify(p) {
    let count = 0, cost = Infinity
    for (let x = 0; x <= Math.floor(p.total / p.a) && (p.level === 1 || x <= p.maxX); x++) {
      const remaining = p.total - p.a * x
      if (remaining % p.b) continue
      const y = remaining / p.b
      if (p.level > 1 && y > p.maxY || p.level >= 3 && mod(x + y, p.modulus) !== p.residue) continue
      count++; cost = Math.min(cost, p.costX * x + p.costY * y)
    }
    return p.level === 4 ? Number.isFinite(cost) ? cost : -1 : count
  },
  render(p, skin) { return text(`A ${skin === 'packing' ? 'packing allocation' : 'production plan'} uses x units of type A and y of type B. Both x and y are nonnegative integers, with no fractions or discarded output. The exact requirement is ${p.a}x+${p.b}y=${p.total}. ${p.level > 1 ? `Also 0≤x≤${p.maxX} and 0≤y≤${p.maxY}, with all boundaries inclusive. ` : ''}${p.level >= 3 ? `The remainder when x+y is divided by ${p.modulus} must equal ${p.residue}. ` : ''}${p.level === 4 ? `Type A costs ${p.costX} credits per unit and type B costs ${p.costY}. Find the minimum total cost among feasible pairs; enter −1 if there are none.` : 'How many distinct ordered pairs (x,y) satisfy all the requirements?'}`) },
  answer: numeric,
  misconceptions: [
    { id: 'count-every-continuous-x-candidate', value: p => Math.floor(Math.min(p.total / p.a, p.level === 1 ? Infinity : p.maxX)) + 1, feedback: () => 'A candidate x also needs a whole nonnegative y and must satisfy every displayed bound and remainder constraint. A candidate count is not an optimized cost.' },
    { id: 'include-the-empty-allocation', value: p => p.level === 4 ? 0 : diophantineAnswer(p) + 1, feedback: () => 'The empty pair (0,0) produces zero, so it cannot meet the positive exact requirement. A minimum cost cannot include an infeasible zero-cost plan.' },
    { id: 'omit-the-remainder-constraint', value: p => p.level >= 3 ? diophantineAnswer({ ...p, level: 2 }) : Math.floor(p.total / gcd(p.a, p.b)) + 1, feedback: () => 'The equation, bounds and modular condition apply simultaneously; a gcd divisibility condition alone does not count bounded allocations.' },
  ],
  steps: [
    step('What is gcd(a,b), the necessary divisibility unit?', p => gcd(p.a, p.b), () => 'Every integer linear combination of the two coefficients is divisible by their gcd.'),
    step('What is the increase in x between consecutive integer solutions before bounds and remainder conditions?', p => p.b / gcd(p.a, p.b), () => 'Increasing x by b/gcd(a,b) decreases y by a/gcd(a,b), preserving the exact requirement.'),
    step('How many feasible pairs remain after all stated constraints?', p => diophantineProgression(p).count, () => 'Intersect the integer parameter interval with the required residue progression.'),
    step('What requested count or minimum cost follows?', diophantineAnswer, p => `The objective is affine along the feasible integer progression, so an extremal feasible parameter gives its minimum. Result: ${diophantineAnswer(p)}.`),
  ],
  solution(p) { const u = diophantineProgression(p); return text(`The equation has integer solutions only if gcd(${p.a},${p.b}) divides ${p.total}. A solution family advances by (Δx,Δy)=(${u.dx},−${u.dy}). Intersect its parameter interval with nonnegativity and the displayed upper bounds; when required solve the resulting linear congruence for the parameter. There are ${u.count} feasible pairs. ${p.level === 4 ? 'Cost is affine along their arithmetic progression, so compare its feasible endpoints; if the progression is empty use −1.' : 'Each feasible parameter gives exactly one ordered pair.'} The requested answer is ${diophantineAnswer(p)}.`) },
}

type Pencil = { level: number; a: number; b: number; c: number; d: number; e: number; total: number; lo: number; hi: number; bound: number }
function pencilAnswer(p: Pencil): number {
  if (p.level === 1) return p.b * p.d / p.a
  if (p.level === 2) { const x = (p.c - p.b * p.total) / (p.a - p.b); return (p.e - p.d * x) / (p.total - x) }
  let count = 0
  for (let parameter = p.lo; parameter <= p.hi; parameter++) {
    const det = p.a * parameter - p.b * p.d, nx = p.c * parameter - p.b * p.e, ny = p.a * p.e - p.d * p.c
    if (det && nx % det === 0 && ny % det === 0 && nx / det >= 0 && nx / det <= p.bound && ny / det >= 0 && ny / det <= p.bound) count++
  }
  return count
}
export const parameterPencilTemplate: Template<Pencil> = {
  ...draft, id: 'math.linear.variety.parameter-pencil', concept: 'math.linear', family: 'parameter-dependent-system-diagnosis', levels: varietyLevels.slice(0, 3), skins: ['equations', 'constraints'],
  sample(rng, level) {
    const a = rng.int(3, 20), b = rng.int(1, a - 1), d = rng.int(1, 20), x = rng.int(2, 25), y = rng.int(2, 25), parameter = rng.int(1, 25), lo = rng.int(1, 10)
    let c = level === 3 ? rng.int(50, 500) : a * x + b * y
    if (level === 3 && c % a === 0) c++
    const p = { level, a, b, c, d, e: level === 3 ? rng.int(20, 800) : d * x + parameter * y, total: x + y, lo, hi: lo + rng.int(10, 30), bound: rng.int(10, 50) }
    if (level === 3) {
      const mode = rng.int(0, 99)
      if (mode < 60) {
        // (λ−d)y=K exposes a varied divisor count, rather than a nearly always empty lattice.
        const k = rng.pick([2, 4, 6, 8, 12, 24, 36, 48]), scale = rng.int(1, 9)
        return { ...p, a: scale, b: scale, c: scale * k, e: (d + 1) * k, lo: d + 1, hi: d + k, bound: k }
      }
      if (mode < 75) {
        const x = rng.int(0, p.bound), y = rng.int(1, p.bound)
        let parameter = rng.int(p.lo, p.hi)
        if (a * parameter === b * d) parameter += parameter < p.hi ? 1 : -1
        p.c = a * x + b * y; p.e = d * x + parameter * y
      }
    }
    return p
  },
  solve: pencilAnswer,
  verify(p) {
    if (p.level === 1) { const scale = p.d / p.a; return scale * p.b }
    if (p.level === 2) {
      for (let x = 0; x <= p.total; x++) { const y = p.total - x; if (y > 0 && p.a * x + p.b * y === p.c) return (p.e - p.d * x) / y }
      throw new Error('The total constraint must locate the first equation’s whole intersection')
    }
    const parameters = new Set<number>()
    for (let x = 0; x <= p.bound; x++) for (let y = 0; y <= p.bound; y++) {
      if (p.a * x + p.b * y !== p.c) continue
      if (y) { const value = (p.e - p.d * x) / y; if (Number.isInteger(value) && value >= p.lo && value <= p.hi && p.a * value !== p.b * p.d) parameters.add(value) }
      else if (p.d * x === p.e) for (let value = p.lo; value <= p.hi; value++) if (p.a * value !== p.b * p.d) parameters.add(value)
    }
    return parameters.size
  },
  render(p, skin) { return text(`Consider ${skin === 'equations' ? 'a parameter-dependent linear system' : 'two exact linear constraints'}, with real variables x and y and parameter λ. ${p.level === 1 ? `The left sides are ${p.a}x+${p.b}y and ${p.d}x+λy. Find the real λ for which these left sides are proportional. No right-hand constants are specified or needed.` : `The equations are ${p.a}x+${p.b}y=${p.c} and ${p.d}x+λy=${p.e}. ${p.level === 2 ? `Their solution must also satisfy x+y=${p.total}. Find λ.` : `Count integer λ from ${p.lo} through ${p.hi}, inclusive, for which the system has exactly one real solution and that solution has whole coordinates 0≤x≤${p.bound}, 0≤y≤${p.bound}. A singular system does not qualify even if it has many feasible points.`}`}`) },
  answer: numeric,
  misconceptions: [
    { id: 'reverse-proportionality-or-ignore-constants', value: p => p.level === 1 ? p.a * p.d / p.b : p.level === 2 ? p.b * p.d / p.a : p.hi - p.lo + 1, feedback: () => 'Proportionality must use the same scale on both coefficients. An intersection or integer feasibility question also needs the right-hand constants and uniqueness.' },
    { id: 'assume-equal-variables-or-count-no-solutions', value: p => p.level === 1 ? p.b + p.d : p.level === 2 ? (p.e - p.d * p.total / 2) / (p.total / 2) : -1, feedback: () => 'A total does not imply equal variables. A requested count is zero for an empty feasible set, rather than a negative sentinel.' },
  ],
  steps: [
    step('What parameter value makes the coefficient determinant zero?', p => p.b * p.d / p.a, () => 'Set aλ−bd=0. At this value the left-hand coefficient rows are proportional.'),
    step('For the total-constrained case what is x; for a counted range what is its first determinant; otherwise what is the row scale?', p => p.level === 2 ? (p.c - p.b * p.total) / (p.a - p.b) : p.level === 3 ? p.a * p.lo - p.b * p.d : p.d / p.a, () => 'Use the total to eliminate y, or calculate the determinant before dividing. Proportional rows share one scale.'),
    step('What is the requested parameter or count?', pencilAnswer, p => `Enforce the stated constraints; requested answer ${display(pencilAnswer(p))}.`),
  ],
  solution(p) { return text(`The determinant is ${p.a}λ−${p.b * p.d}. ${p.level === 1 ? 'Its zero identifies proportional coefficient rows.' : p.level === 2 ? `Substitute y=${p.total}−x into the first equation. Then recover λ from the second using its nonzero y value.` : `For each integer λ in the displayed range, discard determinant zero. Otherwise x=(${p.c}λ−${p.b * p.e})/det and y=${p.a * p.e - p.d * p.c}/det. Retain exactly those whose two coordinates are integers in the stated inclusive bounds.`} The answer is ${display(pencilAnswer(p))}.`) },
}

type AbsoluteLocus = { level: number; a: number; b: number; c: number; radius: number }
function locusInterval(p: AbsoluteLocus): [number, number] {
  if (p.level === 1) return [p.a - p.radius, p.a + p.radius]
  if (p.level < 4) return [(p.a + p.b - p.radius) / 2, (p.a + p.b + p.radius) / 2]
  const left = p.radius >= 2 * p.b + p.c - 3 * p.a ? (p.a + 2 * p.b + p.c - p.radius) / 4 : (2 * p.b + p.c - p.a - p.radius) / 2
  const right = p.radius >= 3 * p.c - p.a - 2 * p.b ? (p.a + 2 * p.b + p.c + p.radius) / 4 : (p.radius + p.a + 2 * p.b - p.c) / 2
  return [left, right]
}
function locusAnswer(p: AbsoluteLocus): number { const [lo, hi] = locusInterval(p); return p.level <= 2 ? hi : p.level === 3 ? Math.floor(hi) - Math.ceil(lo) + 1 : Math.ceil(lo) || 0 }
export const absoluteLocusTemplate: Template<AbsoluteLocus> = {
  ...draft, id: 'math.linear.variety.absolute-locus', concept: 'math.linear', family: 'piecewise-linear-distance-locus', levels: varietyLevels, skins: ['number-line', 'track-coordinate'],
  sample(rng, level) { const a = rng.int(-100, 100), b = a + rng.int(1, 80), c = b + rng.int(1, 80); return { level, a, b, c, radius: level === 1 ? rng.int(1, 50) : level < 4 ? b - a + rng.int(1, 200) : c - a + rng.int(1, 1000) } },
  solve: locusAnswer,
  verify(p) {
    if (p.level === 1) return p.a + p.radius
    if (p.level === 2) {
      // The outer right region has both distances positive; verify the candidate in the original expression.
      const root = p.b + (p.radius - (p.b - p.a)) / 2
      if (Math.abs(root - p.a) + Math.abs(root - p.b) !== p.radius) throw new Error('Invalid outer absolute-value root')
      return root
    }
    let count = 0
    for (let x = p.a - p.radius; x <= p.c + p.radius; x++) {
      const distance = Math.abs(x - p.a) + (p.level === 4 ? 2 : 1) * Math.abs(x - p.b) + (p.level === 4 ? Math.abs(x - p.c) : 0)
      if (distance <= p.radius) { if (p.level === 4) return x; count++ }
    }
    return count
  },
  render(p, skin) { return text(`Use a real coordinate x on ${skin === 'number-line' ? 'a number line' : 'a straight track with signed coordinates'}. Absolute value |x−a| means distance from coordinate a. ${p.level === 1 ? `Find the larger real solution of |x−(${p.a})|=${p.radius}.` : p.level === 2 ? `Find the larger real solution of |x−(${p.a})|+|x−(${p.b})|=${p.radius}.` : p.level === 3 ? `How many integer x satisfy |x−(${p.a})|+|x−(${p.b})|≤${p.radius}? The boundary is included.` : `Find the least integer x satisfying |x−(${p.a})|+2|x−(${p.b})|+|x−(${p.c})|≤${p.radius}. The boundary is included; the middle distance has weight two.`}`) },
  answer: numeric,
  misconceptions: [
    { id: 'ignore-the-distance-to-the-other-sites', value: p => p.level === 1 ? p.a - p.radius : p.level === 2 ? p.b + p.radius : p.level === 3 ? 2 * p.radius + 1 : p.a - p.radius, feedback: () => 'Use every displayed distance and its weight. A larger-root question also requires choosing the right endpoint.' },
    { id: 'confuse-real-interval-with-integer-answer', value: p => p.level === 1 ? p.radius : p.level === 2 ? p.radius / 2 : p.level === 3 ? locusInterval(p)[1] - locusInterval(p)[0] : locusInterval(p)[0], feedback: () => 'An interval width is not its count of integer coordinates. For an inclusive interval [L,U], integers run from ceil(L) to floor(U); a least integer is ceil(L).' },
    { id: 'strict-boundary-instead-of-inclusive', value: p => p.level === 3 ? Math.ceil(locusInterval(p)[1]) - Math.floor(locusInterval(p)[0]) - 1 : p.level === 4 ? Math.floor(locusInterval(p)[0]) + 1 : locusAnswer(p) + 1, feedback: () => 'The stated non-strict inequality includes its boundary. Apply the requested root or integer endpoint to the closed feasible interval.' },
  ],
  steps: [
    step('What is the least value of the displayed distance expression over real x?', p => p.level === 1 ? 0 : p.level < 4 ? p.b - p.a : p.c - p.a, () => 'For two unweighted sites the entire segment between them minimizes total distance; for weights 1,2,1 the middle site is a minimizing weighted median.'),
    step('What is the left endpoint of the real equality or feasible interval?', p => locusInterval(p)[0], () => 'Split at the displayed site coordinates and solve the affine expression in the region containing the left endpoint.'),
    step('What requested root, integer count or least integer follows?', locusAnswer, p => `Use the proper endpoint and, for integers, the inclusive ceiling/floor rule. Result: ${display(locusAnswer(p))}.`),
  ],
  solution(p) { const [lo, hi] = locusInterval(p); return text(`Absolute values become affine expressions on the intervals cut by the displayed sites. The ${p.level <= 2 ? 'outer equality roots are' : 'closed feasible interval has endpoints'} ${display(lo)} and ${display(hi)}. ${p.level <= 2 ? 'Choose the larger root.' : p.level === 3 ? 'The inclusive integer count is floor(upper)−ceil(lower)+1.' : 'The least feasible integer is ceil(lower); the middle distance retains its weight two.'} The requested result is ${display(locusAnswer(p))}.`) },
}

export const MATH_ARITHMETIC = [ratioFoundation, integerBlendTemplate, journeyRankingTemplate, nestedPartitionTemplate, percentFoundation, affineRecurrenceTemplate, couponPolicyTemplate, percentClaimsTemplate, linearFoundation, diophantineTemplate, parameterPencilTemplate, absoluteLocusTemplate] as const
