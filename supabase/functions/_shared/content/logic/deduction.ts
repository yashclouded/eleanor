import type { Template } from '../types.ts'
import { labels, levels } from './helpers.ts'

type Chain = { names: string[]; start: number; end: number; reverse: boolean }
export const chainsTemplate: Template<Chain> = {
  id: 'logic.deduction.chains', version: 1, track: 'logic', concept: 'logic.deduction', family: 'implication-chain',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels,
  skins: ['workshop', 'archive'], dailyLevels: [4, 5],
  sample(rng, level) {
    const names = labels(rng, 6)
    const start = rng.int(0, 1)
    return { names, start, end: Math.min(5, start + Math.min(level, 4)), reverse: level === 5 }
  },
  solve: (p) => p.names[p.reverse ? p.start : p.end],
  verify(p) {
    const facts = new Set([p.reverse ? `not:${p.names[p.end]}` : p.names[p.start]])
    for (let pass = 0; pass < p.names.length; pass++) {
      for (let i = p.start; i < p.end; i++) {
        if (facts.has(p.names[i])) facts.add(p.names[i + 1])
        if (facts.has(`not:${p.names[i + 1]}`)) facts.add(`not:${p.names[i]}`)
      }
    }
    const candidates = p.names.filter((name) => facts.has(p.reverse ? `not:${name}` : name))
    return p.reverse ? candidates[0] : candidates[candidates.length - 1]
  },
  render: (p, skin) => [
    { t: 'p', text: `${skin === 'workshop' ? 'A workshop uses processing stages' : 'An archive uses access permissions'} labelled ${p.names.join(', ')}. Each rule applies to every record.` },
    { t: 'list', items: p.names.slice(p.start, p.end).map((name, i) => `If a record has ${name}, it has ${p.names[p.start + i + 1]}.`) },
    { t: 'p', text: p.reverse
      ? `A record does not have ${p.names[p.end]}. Which earliest stage in the listed chain must it lack?`
      : `A record has ${p.names[p.start]}. Which furthest stage in the listed chain must it have?` },
  ],
  answer: (p) => ({ type: 'choice', options: p.names.map((id) => ({ id, label: id })) }),
  misconceptions: [
    { id: 'stop-at-given-fact', value: (p) => p.names[p.reverse ? p.end : p.start], feedback: () => 'This repeats the given fact. Follow every applicable implication to the requested end of the chain.' },
    { id: 'stop-one-link-early', value: (p) => p.names[p.reverse ? p.start + 1 : Math.max(p.start, p.end - 1)], feedback: () => 'Stopping before the last link misses another forced conclusion. For a negative fact, follow contrapositives backwards.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'How many implication links are listed?' }], answer: (p) => p.end - p.start, tolerance: { abs: 0 }, explain: () => [{ t: 'p', text: 'Each listed if–then rule supplies one link, not its converse.' }] },
    { prompt: () => [{ t: 'p', text: 'Are we following contrapositives backwards? Enter 1 for yes, 0 for no.' }], answer: (p) => Number(p.reverse), tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: p.reverse ? 'Not having a consequence rules out its antecedent.' : 'Having the antecedent forces its consequence.' }] },
    { prompt: (p) => [{ t: 'p', text: `Number labels 1–6 in this order: ${p.names.join(', ')}. What is the position of the requested conclusion?` }], answer: (p) => (p.reverse ? p.start : p.end) + 1, tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: `Following all links gives ${p.reverse ? 'not ' : ''}${p.names[p.reverse ? p.start : p.end]}. Select that label.` }] },
  ],
  solution: (p) => [{ t: 'p', text: `Represent the rules as ${p.names.slice(p.start, p.end + 1).join(' → ')}. ${p.reverse ? 'Starting with the missing final property, apply each contrapositive backwards' : 'Starting with the given property, apply each implication forwards'}. The requested conclusion is ${p.reverse ? 'not ' : ''}${p.names[p.reverse ? p.start : p.end]}. No converse is assumed.` }],
}

type Contra = { names: string[]; negated: boolean; negativeConsequence: boolean; count: number }
function contraOptions(p: Contra) {
  const [a, nameB] = p.names
  const b = p.negativeConsequence ? `not ${nameB}` : nameB
  const notB = p.negativeConsequence ? nameB : `not ${nameB}`
  const left = p.negated ? `not ${a}` : a
  const opposite = p.negated ? a : `not ${a}`
  return [
    { id: 'contra', label: `If ${notB}, then ${opposite}.` },
    { id: 'or', label: `Either ${opposite} or ${b} (or both).` },
    { id: 'converse', label: `If ${b}, then ${left}.` },
    { id: 'inverse', label: `If ${opposite}, then ${notB}.` },
    { id: 'both', label: `Both ${left} and ${b}.` },
    { id: 'not-both', label: `It is not the case that both ${left} and ${notB}.` },
  ].slice(0, p.count)
}
export const contrapositiveTemplate: Template<Contra> = {
  id: 'logic.deduction.contrapositive', version: 1, track: 'logic', concept: 'logic.deduction', family: 'equivalent-conditionals',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['equipment', 'records'], dailyLevels: [4, 5],
  sample: (rng, level) => ({ names: labels(rng, 2), negated: level >= 4, negativeConsequence: level === 5, count: Math.min(6, level + 3) }),
  solve: (p) => p.count === 6 ? ['contra', 'or', 'not-both'] : ['contra', 'or'],
  verify(p) {
    const rows = [false, true].flatMap((a) => [false, true].map((b) => {
      const x = p.negated ? !a : a
      const y = p.negativeConsequence ? !b : b
      return { rule: !x || y, values: [y || !x, !x || y, !y || x, x || !y, x && y, !(x && !y)] }
    }))
    return contraOptions(p).filter((_, i) => rows.every((r) => r.values[i] === r.rule)).map((o) => o.id)
  },
  render: (p, skin) => [
    { t: 'p', text: `${skin === 'equipment' ? 'An equipment policy' : 'A records policy'} uses yes/no properties ${p.names.join(' and ')}. The rule is: if ${p.negated ? 'not ' : ''}${p.names[0]}, then ${p.negativeConsequence ? 'not ' : ''}${p.names[1]}.` },
    { t: 'p', text: 'Select every statement logically equivalent to the rule, for every possible assignment of the two properties. “If” is a material implication.' },
  ],
  answer: (p) => ({ type: 'multi', options: contraOptions(p) }),
  misconceptions: [
    { id: 'converse-and-inverse', value: () => ['converse', 'inverse'], feedback: () => 'The converse and inverse reverse the permitted cases. Test the case where the antecedent is false and the consequence true.' },
    { id: 'contrapositive-only', value: () => ['contra'], feedback: () => 'The contrapositive is equivalent, but so is “not antecedent or consequence”. Select every equivalent form.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'How many truth assignments exist for two yes/no properties?' }], answer: () => 4, tolerance: { abs: 0 }, explain: () => [{ t: 'p', text: 'Each property has two states: 2 × 2 = 4 rows.' }] },
    { prompt: () => [{ t: 'p', text: 'In how many rows is an implication false?' }], answer: () => 1, tolerance: { abs: 0 }, explain: () => [{ t: 'p', text: 'Only a true antecedent and false consequence falsify the rule.' }] },
    { prompt: () => [{ t: 'p', text: 'How many options have exactly the same truth table as the rule?' }], answer: (p) => p.count === 6 ? 3 : 2, tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: `Select the contrapositive and the “or” form${p.count === 6 ? ', and the “not both” form' : ''}. They exclude exactly the same forbidden row.` }] },
  ],
  solution: (p) => [{ t: 'p', text: `Let X mean ${p.negated ? 'not ' : ''}${p.names[0]}, and Y mean ${p.negativeConsequence ? 'not ' : ''}${p.names[1]}. X → Y is false only at X=true, Y=false. Its contrapositive, not Y → not X, and not X or Y exclude exactly that row.${p.count === 6 ? ' So does not (X and not Y).' : ''} The converse and inverse exclude a different row.` }],
}

type Cards = { names: string[]; cards: { id: string; face: string; side: 'a' | 'b'; positive: boolean }[] }
export const cardSelectionTemplate: Template<Cards> = {
  id: 'logic.conditionals.card-selection', version: 1, track: 'logic', concept: 'logic.conditionals', family: 'wason-cards',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['parcels', 'passes'], dailyLevels: [4, 5],
  sample(rng, level) {
    const names = labels(rng, 2)
    const cards: Cards['cards'] = [
      { id: 'a', face: names[0], side: 'a', positive: true },
      { id: 'not-a', face: `not ${names[0]}`, side: 'a', positive: false },
      { id: 'b', face: names[1], side: 'b', positive: true },
      { id: 'not-b', face: `not ${names[1]}`, side: 'b', positive: false },
    ]
    for (let i = 0; i < level - 1; i++) {
      const side = rng.pick(['a', 'b'] as const)
      const positive = rng.pick([true, false])
      cards.push({ id: `extra-${i}`, face: `${positive ? '' : 'not '}${names[side === 'a' ? 0 : 1]}`, side, positive })
    }
    return { names, cards }
  },
  solve: (p) => p.cards.filter((c) => c.side === 'a' ? c.positive : !c.positive).map((c) => c.id),
  verify: (p) => p.cards.filter((c) => [false, true].some((hidden) => {
    const a = c.side === 'a' ? c.positive : hidden
    const b = c.side === 'b' ? c.positive : hidden
    return a && !b
  })).map((c) => c.id),
  render: (p, skin) => [
    { t: 'p', text: `${skin === 'parcels' ? 'Parcel inspection cards' : 'Access-pass inspection cards'} have one A-side and one B-side. The A-side says ${p.names[0]} or not ${p.names[0]}; the B-side says ${p.names[1]} or not ${p.names[1]}. Only one side is visible.` },
    { t: 'p', text: `Rule: if the A-side says ${p.names[0]}, the B-side says ${p.names[1]}. Select the smallest set of cards you must turn over to check whether any card violates the rule. Each card is independent.` },
  ],
  answer: (p) => ({ type: 'multi', options: p.cards.map((c) => ({ id: c.id, label: `${c.id}: ${c.face}` })) }),
  misconceptions: [
    { id: 'confirm-consequent', value: (p) => p.cards.filter((c) => c.positive).map((c) => c.id), feedback: () => 'A positive consequence cannot violate the rule. A negative consequence might hide a positive antecedent and must be checked.' },
    { id: 'antecedent-only', value: (p) => p.cards.filter((c) => c.side === 'a' && c.positive).map((c) => c.id), feedback: () => 'This misses cards showing the negative consequence. They could hide the antecedent and violate the rule.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'Does a true antecedent with a false consequence violate the rule? Enter 1 for yes, 0 for no.' }], answer: () => 1, tolerance: { abs: 0 }, explain: () => [{ t: 'p', text: 'That is the only forbidden combination.' }] },
    { prompt: () => [{ t: 'p', text: 'How many visible positive antecedents need turning?' }], answer: (p) => p.cards.filter((c) => c.side === 'a' && c.positive).length, tolerance: { abs: 0 }, explain: () => [{ t: 'p', text: 'Each might hide a negative consequence.' }] },
    { prompt: () => [{ t: 'p', text: 'How many cards in total need turning?' }], answer: (p) => p.cards.filter((c) => c.side === 'a' ? c.positive : !c.positive).length, tolerance: { abs: 0 }, explain: () => [{ t: 'p', text: 'Select every positive antecedent and every negative consequence, and no others.' }] },
  ],
  solution: (p) => [{ t: 'p', text: `The only counterexample has ${p.names[0]} on the A-side and not ${p.names[1]} on the B-side. Turn all cards showing either of those faces. A negative antecedent imposes no requirement; a positive consequence is compatible with either antecedent. The required cards are ${p.cards.filter((c) => c.side === 'a' ? c.positive : !c.positive).map((c) => c.id).join(', ')}.` }],
}
