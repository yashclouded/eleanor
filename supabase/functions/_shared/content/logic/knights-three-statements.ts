import type { Template } from '../types.ts'
import { labels, levels } from './helpers.ts'

type Claim = { speaker: number; left: number; right: number; kind: 'knight' | 'knave' | 'and' | 'or' | 'same' | 'different' }
type Puzzle = { names: string[]; claims: Claim[] }
function trueClaim(c: Claim, truth: boolean[]): boolean {
  const a = truth[c.left], b = truth[c.right]
  switch (c.kind) {
    case 'knight': return a
    case 'knave': return !a
    case 'and': return a && b
    case 'or': return a || b
    case 'same': return a === b
    case 'different': return a !== b
  }
}
function assignments(p: Puzzle): boolean[][] {
  const candidates: boolean[][] = []
  function assign(truth: boolean[]) {
    if (truth.length === 3) {
      if (p.claims.every((c) => truth[c.speaker] === trueClaim(c, truth))) candidates.push(truth)
      return
    }
    assign([...truth, false])
    assign([...truth, true])
  }
  assign([])
  return candidates
}
function claimText(p: Puzzle, c: Claim): string {
  const a = p.names[c.left], b = p.names[c.right]
  switch (c.kind) {
    case 'knight': return `${a} is a truth-teller.`
    case 'knave': return `${a} is a liar.`
    case 'and': return `${a} and ${b} are both truth-tellers.`
    case 'or': return `At least one of ${a} and ${b} is a truth-teller.`
    case 'same': return `${a} and ${b} have the same type.`
    case 'different': return `${a} and ${b} have different types.`
  }
}
export const threeStatementsTemplate: Template<Puzzle> = {
  id: 'logic.knights.three-statements', version: 1, track: 'logic', concept: 'logic.knights', family: 'knights-basic',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels: levels.slice(0, 4), skins: ['island', 'simulation'], dailyLevels: [4],
  sample(rng, level) {
    const names = labels(rng, 3)
    const kinds: Claim['kind'][] = level === 1 ? ['knight', 'knave', 'and']
      : level === 2 ? ['knight', 'knave', 'and', 'or'] : level === 3 ? ['knight', 'knave', 'and', 'or', 'same'] : ['and', 'or', 'same', 'different']
    for (let attempt = 0; attempt < 10000; attempt++) {
      const claims = names.map((_, speaker): Claim => {
        const others = [0, 1, 2].filter((i) => i !== speaker)
        const left = rng.pick(others)
        return { speaker, left, right: others.find((i) => i !== left)!, kind: rng.pick(kinds) }
      })
      const puzzle = { names, claims }
      if (assignments(puzzle).length === 1) return puzzle
    }
    throw new Error('Unable to sample a unique three-statement puzzle')
  },
  solve(p) {
    const valid = assignments(p)
    if (valid.length !== 1) throw new Error('Expected a unique truth assignment')
    return p.names.filter((_, i) => valid[0][i])
  },
  verify(p) {
    const valid: number[] = []
    for (let mask = 0; mask < 8; mask++) {
      const bit = (i: number) => (mask >> i) & 1
      const consistent = p.claims.every((c) => {
        const a = bit(c.left), b = bit(c.right)
        let value: number
        switch (c.kind) {
          case 'knight': value = a; break
          case 'knave': value = 1 - a; break
          case 'and': value = a * b; break
          case 'or': value = Math.min(1, a + b); break
          case 'same': value = 1 - (a ^ b); break
          case 'different': value = a ^ b; break
        }
        return bit(c.speaker) === value
      })
      if (consistent) valid.push(mask)
    }
    if (valid.length !== 1) throw new Error('Independent truth table is not unique')
    return p.names.filter((_, i) => (valid[0] & (1 << i)) !== 0)
  },
  render: (p, skin) => [
    { t: 'p', text: `${skin === 'island' ? 'On an imaginary island' : 'In a logic simulation'}, each of ${p.names.join(', ')} is either a truth-teller, whose statement is true, or a liar, whose statement is false. Each makes exactly one statement.` },
    { t: 'list', items: p.claims.map((c) => `${p.names[c.speaker]}: “${claimText(p, c)}”`) },
    { t: 'p', text: 'Select all truth-tellers. Leave all options unselected if there are none.' },
  ],
  answer: (p) => ({ type: 'multi', options: p.names.map((id) => ({ id, label: id })) }),
  misconceptions: [
    { id: 'believe-every-speaker', value: (p) => p.names, feedback: () => 'Speaking does not make a person truthful. Each claim must agree with its speaker’s assigned type.' },
    { id: 'distrust-every-speaker', value: () => [], feedback: () => 'Assigning everyone as a liar also needs checking: every statement would have to be false at the same time.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'How many possible type assignments are there for three people?' }], answer: () => 8, tolerance: { abs: 0 }, explain: () => [{ t: 'p', text: 'Each person has two possible types, giving 2 × 2 × 2 assignments.' }] },
    { prompt: () => [{ t: 'p', text: 'How many assignments make each statement agree with the type of its speaker?' }], answer: () => 1, tolerance: { abs: 0 }, explain: () => [{ t: 'p', text: 'For each row of the truth table, compare all three claims to their speakers. Exactly one row survives.' }] },
    { prompt: () => [{ t: 'p', text: 'How many truth-tellers are in that surviving assignment?' }], answer: (p) => assignments(p)[0].filter(Boolean).length, tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: `The truth-tellers are ${p.names.filter((_, i) => assignments(p)[0][i]).join(', ') || 'none'}. Select those labels.` }] },
  ],
  solution: (p) => [
    { t: 'p', text: 'Use one row per possible truth assignment. A row survives only if a true claim has a truth-teller as speaker and a false claim has a liar as speaker.' },
    { t: 'table', head: [...p.names, 'All claims consistent?'], rows: Array.from({ length: 8 }, (_, mask) => {
      const truth = p.names.map((_, i) => Boolean(mask & (1 << i)))
      return [...truth.map((v) => v ? 'truth-teller' : 'liar'), p.claims.every((c) => truth[c.speaker] === trueClaim(c, truth)) ? 'yes' : 'no']
    }) },
  ],
}
