import type { Answer, Block, Rng, Step, Template } from '../types.ts'

export type IslanderId = 'A' | 'B' | 'C'
const ISLANDERS: IslanderId[] = ['A', 'B', 'C']
const BOOLS = [false, true]

export type StmtData = {
  speaker: IslanderId
  pattern: string
  targets: IslanderId[]
  text: string
}

export type KnightsTwoParams = {
  level: number
  statements: StmtData[]
  solutionKnights: IslanderId[]
}

function evalStmt(st: StmtData, s: Record<IslanderId, boolean>): boolean {
  const [t1, t2] = st.targets
  switch (st.pattern) {
    case 'is_knight':
      return s[t1]
    case 'is_knave':
      return !s[t1]
    case 'both_knights':
      return s[t1] && s[t2]
    case 'at_least_one_knave':
      return !s[t1] || !s[t2]
    case 'same_type':
      return s[t1] === s[t2]
    case 'diff_type':
      return s[t1] !== s[t2]
    case 'xor':
      return (s[t1] ? 1 : 0) + (s[t2] ? 1 : 0) === 1
    case 'all_knaves':
      return !s.A && !s.B && !s.C
    case 'exactly_one_knight':
      return (s.A ? 1 : 0) + (s.B ? 1 : 0) + (s.C ? 1 : 0) === 1
    case 'exactly_two_knights':
      return (s.A ? 1 : 0) + (s.B ? 1 : 0) + (s.C ? 1 : 0) === 2
    case 'implies_knight':
      return !s[t1] || s[t2]
    case 'implies_knave':
      return !s[t1] || !s[t2]
    default:
      throw new Error(`Unknown pattern: ${st.pattern}`)
  }
}

function solveStmts(stmts: StmtData[]): Record<IslanderId, boolean>[] {
  const sols: Record<IslanderId, boolean>[] = []
  for (const a of BOOLS) {
    for (const b of BOOLS) {
      for (const c of BOOLS) {
        const s: Record<IslanderId, boolean> = { A: a, B: b, C: c }
        let ok = true
        for (const st of stmts) {
          if (s[st.speaker] !== evalStmt(st, s)) {
            ok = false
            break
          }
        }
        if (ok) sols.push(s)
      }
    }
  }
  return sols
}

function getStatementTemplates(speaker: IslanderId, level: number): StmtData[] {
  const others = ISLANDERS.filter((x) => x !== speaker)
  const [o1, o2] = others
  const list: StmtData[] = []

  // Level 1: Statements about others, pairings, or speaker + other
  for (const o of others) {
    list.push({ speaker, pattern: 'is_knight', targets: [o], text: `${o} is a knight.` })
    list.push({ speaker, pattern: 'is_knave', targets: [o], text: `${o} is a knave.` })
  }
  list.push({ speaker, pattern: 'both_knights', targets: [o1, o2], text: `Both ${o1} and ${o2} are knights.` })
  list.push({ speaker, pattern: 'at_least_one_knave', targets: [o1, o2], text: `At least one of ${o1} and ${o2} is a knave.` })
  list.push({ speaker, pattern: 'same_type', targets: [o1, o2], text: `${o1} and ${o2} are of the same type.` })
  list.push({ speaker, pattern: 'diff_type', targets: [o1, o2], text: `${o1} and ${o2} are of different types.` })
  list.push({ speaker, pattern: 'xor', targets: [o1, o2], text: `Exactly one of ${o1} and ${o2} is a knight.` })
  list.push({ speaker, pattern: 'at_least_one_knave', targets: [speaker, o1], text: `At least one of us (${speaker} or ${o1}) is a knave.` })
  list.push({ speaker, pattern: 'at_least_one_knave', targets: [speaker, o2], text: `At least one of us (${speaker} or ${o2}) is a knave.` })
  list.push({ speaker, pattern: 'same_type', targets: [speaker, o1], text: `${speaker} and ${o1} are of the same type.` })
  list.push({ speaker, pattern: 'same_type', targets: [speaker, o2], text: `${speaker} and ${o2} are of the same type.` })
  list.push({ speaker, pattern: 'diff_type', targets: [speaker, o1], text: `${speaker} and ${o1} are of different types.` })
  list.push({ speaker, pattern: 'diff_type', targets: [speaker, o2], text: `${speaker} and ${o2} are of different types.` })
  list.push({ speaker, pattern: 'implies_knight', targets: [o1, o2], text: `If ${o1} is a knight, then ${o2} is a knight.` })
  list.push({ speaker, pattern: 'implies_knave', targets: [o1, o2], text: `If ${o1} is a knight, then ${o2} is a knave.` })
  list.push({ speaker, pattern: 'implies_knight', targets: [o2, o1], text: `If ${o2} is a knight, then ${o1} is a knight.` })
  list.push({ speaker, pattern: 'implies_knave', targets: [o2, o1], text: `If ${o2} is a knight, then ${o1} is a knave.` })
  list.push({ speaker, pattern: 'implies_knight', targets: [speaker, o1], text: `If ${speaker} is a knight, then ${o1} is a knight.` })
  list.push({ speaker, pattern: 'implies_knave', targets: [speaker, o1], text: `If ${speaker} is a knight, then ${o1} is a knave.` })
  list.push({ speaker, pattern: 'implies_knight', targets: [speaker, o2], text: `If ${speaker} is a knight, then ${o2} is a knight.` })
  list.push({ speaker, pattern: 'implies_knave', targets: [speaker, o2], text: `If ${speaker} is a knight, then ${o2} is a knave.` })

  // Level 2 adds group quantification
  if (level >= 2) {
    list.push({ speaker, pattern: 'all_knaves', targets: [], text: 'All three of us are knaves.' })
    list.push({ speaker, pattern: 'exactly_one_knight', targets: [], text: 'Exactly one of the three of us is a knight.' })
    list.push({ speaker, pattern: 'exactly_two_knights', targets: [], text: 'Exactly two of the three of us are knights.' })
  }

  return list
}

const steps: Step<KnightsTwoParams>[] = [
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Is Islander A a knight (1) or a knave (0)?',
      },
    ],
    answer: (p) => (p.solutionKnights.includes('A') ? 1 : 0),
    tolerance: { abs: 0 },
    explain: (p) => [
      {
        t: 'p',
        text: `Islander A is a ${p.solutionKnights.includes('A') ? 'knight' : 'knave'}.`,
      },
    ],
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Is Islander B a knight (1) or a knave (0)?',
      },
    ],
    answer: (p) => (p.solutionKnights.includes('B') ? 1 : 0),
    tolerance: { abs: 0 },
    explain: (p) => [
      {
        t: 'p',
        text: `Islander B is a ${p.solutionKnights.includes('B') ? 'knight' : 'knave'}.`,
      },
    ],
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Is Islander C a knight (1) or a knave (0)?',
      },
    ],
    answer: (p) => (p.solutionKnights.includes('C') ? 1 : 0),
    tolerance: { abs: 0 },
    explain: (p) => [
      {
        t: 'p',
        text: `Islander C is a ${p.solutionKnights.includes('C') ? 'knight' : 'knave'}.`,
      },
    ],
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'How many of the three islanders are knights in total?',
      },
    ],
    answer: (p) => p.solutionKnights.length,
    tolerance: { abs: 0 },
    explain: (p) => [
      {
        t: 'p',
        text: `There are ${p.solutionKnights.length} knight(s): ${
          p.solutionKnights.length > 0 ? p.solutionKnights.join(', ') : 'none'
        }.`,
      },
    ],
  },
]

export const knightsTwoTemplate: Template<KnightsTwoParams> = {
  id: 'logic.knights.two',
  version: 1,
  track: 'logic',
  concept: 'logic.knights',
  family: 'knights-basic',
  status: 'draft',
  review: {
    author: 'Eleanor Team',
    reviewer: null,
    reviewedAt: null,
    notes: 'Reference template for 2 and 3 islander Knights and Knaves puzzles',
  },
  levels: [
    { level: 1, initialRating: 1100 },
    { level: 2, initialRating: 1300 },
    { level: 3, initialRating: 1500 },
  ],
  skins: ['island', 'court'],

  sample(rng: Rng, level: number): KnightsTwoParams {
    const speakers: IslanderId[] = level === 1 ? ['A', 'B'] : ['A', 'B', 'C']
    const pools = speakers.map((sp) => getStatementTemplates(sp, level))

    while (true) {
      const statements: StmtData[] = pools.map((pool) => rng.pick(pool))
      const sols = solveStmts(statements)

      if (sols.length === 1) {
        const sol = sols[0]
        // Make sure not all speakers are knights so misconception took-statement-at-face-value is not dropped
        const allSpeakersKnights = speakers.every((sp) => sol[sp])
        if (!allSpeakersKnights) {
          const solutionKnights = ISLANDERS.filter((i) => sol[i])
          return {
            level,
            statements,
            solutionKnights,
          }
        }
      }
    }
  },

  solve(p: KnightsTwoParams): Answer {
    return p.solutionKnights
  },

  verify(p: KnightsTwoParams): Answer {
    const sols = solveStmts(p.statements)
    if (sols.length !== 1) {
      throw new Error(`Verification failed: puzzle has ${sols.length} consistent assignments (expected 1)`)
    }
    return ISLANDERS.filter((i) => sols[0][i])
  },

  render(p: KnightsTwoParams, skin: string): Block[] {
    const blocks: Block[] = []
    if (skin === 'court') {
      blocks.push({
        t: 'p',
        text: 'In a court of law, witnesses are either Truth-tellers (who always speak the truth) or Liars (who always lie).',
      })
      if (p.level === 1) {
        blocks.push({
          t: 'p',
          text: 'Three witnesses (A, B, and C) are present. Witness C remains silent while A and B give the following testimony:',
        })
      } else {
        blocks.push({
          t: 'p',
          text: 'Three witnesses (A, B, and C) give the following testimony:',
        })
      }
      blocks.push({
        t: 'list',
        items: p.statements.map(
          (s) =>
            `Witness ${s.speaker}: "${s.text
              .replace(/knights/g, 'Truth-tellers')
              .replace(/knight/g, 'Truth-teller')
              .replace(/knaves/g, 'Liars')
              .replace(/knave/g, 'Liar')}"`,
        ),
      })
      blocks.push({
        t: 'p',
        text: 'Select all witnesses who are Truth-tellers (if none, leave unselected):',
      })
    } else {
      // Default: island
      blocks.push({
        t: 'p',
        text: 'On the Island of Knights and Knaves, every inhabitant is either a Knight (who always tells the truth) or a Knave (who always lies).',
      })
      if (p.level === 1) {
        blocks.push({
          t: 'p',
          text: 'You encounter three islanders: A, B, and C. Islander C says nothing, while A and B make the following statements:',
        })
      } else {
        blocks.push({
          t: 'p',
          text: 'You encounter three islanders: A, B, and C. They make the following statements:',
        })
      }
      blocks.push({
        t: 'list',
        items: p.statements.map((s) => `Islander ${s.speaker}: "${s.text}"`),
      })
      blocks.push({
        t: 'p',
        text: 'Select all islanders who are Knights (if none, leave unselected):',
      })
    }
    return blocks
  },

  answer: () => ({
    type: 'multi',
    options: [
      { id: 'A', label: 'A' },
      { id: 'B', label: 'B' },
      { id: 'C', label: 'C' },
    ],
  }),

  misconceptions: [
    {
      id: 'took-statement-at-face-value',
      value: (p) => p.statements.map((s) => s.speaker),
      feedback: () =>
        'You assumed that all speaking islanders are knights. On this island, knaves also speak and their claims must be analyzed as potential lies.',
    },
  ],

  steps,

  solution(p: KnightsTwoParams): Block[] {
    const list = p.solutionKnights.length > 0 ? p.solutionKnights.join(', ') : 'none'
    return [
      {
        t: 'p',
        text: 'To solve the puzzle, test each possible combination of Knight and Knave assignments for the islanders:',
      },
      {
        t: 'list',
        items: p.statements.map(
          (s) =>
            `If ${s.speaker} were a Knight, then "${s.text}" must be true. If ${s.speaker} were a Knave, it must be false.`,
        ),
      },
      {
        t: 'p',
        text: `The only consistent assignment is that the Knights are: ${list}.`,
      },
    ]
  },
}
