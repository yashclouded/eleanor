import type { Answer, AnswerSpec, Block, Rng, Step, Template } from '../types.ts'

export type ConditionalTwoWayParams = {
  level: number
  a: number // Condition A and Outcome B
  b: number // Condition A and Not Outcome B
  c: number // Not Condition A and Outcome B
  d: number // Not Condition A and Not Outcome B
}

export type ConditionalTwoWaySkin = 'inspection' | 'credit' | 'student'

const steps: Step<ConditionalTwoWayParams>[] = [
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the total number of items in the conditioning group (the denominator)?',
      },
    ],
    answer: (p) => {
      switch (p.level) {
        case 1:
          return p.a + p.b // given condition A
        case 2:
          return p.a + p.c // given outcome B
        case 3:
          return p.c + p.d // given not condition A
        case 4:
        default:
          return p.b + p.d // given not outcome B
      }
    },
    tolerance: { abs: 0 },
    explain: (p) => {
      const denom =
        p.level === 1
          ? p.a + p.b
          : p.level === 2
            ? p.a + p.c
            : p.level === 3
              ? p.c + p.d
              : p.b + p.d
      return [
        {
          t: 'p',
          text: `In conditional probability, we restrict our universe to the conditioning event: denominator = ${denom}.`,
        },
      ]
    },
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'How many items in that conditioning group also satisfy the target outcome (the numerator)?',
      },
    ],
    answer: (p) => {
      switch (p.level) {
        case 1:
          return p.a
        case 2:
          return p.a
        case 3:
          return p.c
        case 4:
        default:
          return p.b
      }
    },
    tolerance: { abs: 0 },
    explain: (p) => {
      const num =
        p.level === 1
          ? p.a
          : p.level === 2
            ? p.a
            : p.level === 3
              ? p.c
              : p.b
      return [
        {
          t: 'p',
          text: `The intersection count meeting both the condition and the outcome is ${num}.`,
        },
      ]
    },
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Divide the numerator by the denominator and multiply by 100 to find the conditional probability percentage.',
      },
    ],
    answer: (p) => {
      const num =
        p.level === 1 ? p.a : p.level === 2 ? p.a : p.level === 3 ? p.c : p.b
      const denom =
        p.level === 1
          ? p.a + p.b
          : p.level === 2
            ? p.a + p.c
            : p.level === 3
              ? p.c + p.d
              : p.b + p.d
      return (num / denom) * 100
    },
    tolerance: { abs: 0.1 },
    explain: (p) => {
      const num =
        p.level === 1 ? p.a : p.level === 2 ? p.a : p.level === 3 ? p.c : p.b
      const denom =
        p.level === 1
          ? p.a + p.b
          : p.level === 2
            ? p.a + p.c
            : p.level === 3
              ? p.c + p.d
              : p.b + p.d
      const pct = (num / denom) * 100
      return [
        {
          t: 'p',
          text: `(${num} / ${denom}) × 100 = ${pct.toFixed(2)}%.`,
        },
      ]
    },
  },
]

export const conditionalTwoWayTemplate: Template<ConditionalTwoWayParams> = {
  id: 'judgment.conditional.two-way-table',
  version: 1,
  track: 'judgment',
  concept: 'judgment.conditional',
  family: 'conditional-two-way',
  status: 'draft',
  review: {
    author: 'Eleanor Team',
    reviewer: null,
    reviewedAt: null,
    notes: 'Conditional probability derived from restricted rows or columns in a 2x2 contingency table',
  },
  levels: [
    { level: 1, initialRating: 900 },
    { level: 2, initialRating: 1100 },
    { level: 3, initialRating: 1300 },
    { level: 4, initialRating: 1500 },
  ],
  skins: ['inspection', 'credit', 'student'],
  dailyLevels: [3, 4],

  sample(rng: Rng, level: number): ConditionalTwoWayParams {
    const a = rng.int(120, 350)
    const b = rng.int(80, 260)
    const c = rng.int(70, 240)
    const d = rng.int(150, 380)
    return { level, a, b, c, d }
  },

  solve(p: ConditionalTwoWayParams): Answer {
    const num =
      p.level === 1 ? p.a : p.level === 2 ? p.a : p.level === 3 ? p.c : p.b
    const denom =
      p.level === 1
        ? p.a + p.b
        : p.level === 2
          ? p.a + p.c
          : p.level === 3
            ? p.c + p.d
            : p.b + p.d
    return (num / denom) * 100
  },

  verify(p: ConditionalTwoWayParams): Answer {
    // Independent derivation: compute complement in the restricted conditioning subspace
    if (p.level === 1) {
      const comp = p.b / (p.a + p.b)
      return (1 - comp) * 100
    } else if (p.level === 2) {
      const comp = p.c / (p.a + p.c)
      return (1 - comp) * 100
    } else if (p.level === 3) {
      const comp = p.d / (p.c + p.d)
      return (1 - comp) * 100
    } else {
      const comp = p.d / (p.b + p.d)
      return (1 - comp) * 100
    }
  },

  render(p: ConditionalTwoWayParams, skin: string): Block[] {
    const total = p.a + p.b + p.c + p.d
    const r1 = p.a + p.b
    const r2 = p.c + p.d
    const c1 = p.a + p.c
    const c2 = p.b + p.d

    if (skin === 'inspection') {
      const tableBlock: Block = {
        t: 'table',
        head: ['Inspection Reading', 'Flaw Verified', 'No Flaw', 'Total'],
        rows: [
          ['Sensor Alert', `${p.a}`, `${p.b}`, `${r1}`],
          ['No Alert', `${p.c}`, `${p.d}`, `${r2}`],
          ['Total', `${c1}`, `${c2}`, `${total}`],
        ],
        caption: 'Pipeline acoustic weld testing records',
      }

      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `An inspection team verified ${total} pipeline welds using an acoustic scanner and destructive metallurgical analysis.`,
          },
          tableBlock,
          {
            t: 'p',
            text: 'Given that a weld triggered a Sensor Alert, what is the conditional probability (as a percentage) that it has a verified flaw?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `An inspection team recorded ${total} pipeline weld assessments.`,
          },
          tableBlock,
          {
            t: 'p',
            text: 'Given that a weld actually has a Flaw Verified, what is the probability (as a percentage) that it triggered a Sensor Alert?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A testing record tracks ${total} pipeline welds.`,
          },
          tableBlock,
          {
            t: 'p',
            text: 'Given that a weld showed No Alert, what is the probability (as a percentage) that it actually had a Flaw Verified (false omission rate)?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `An inspection facility audited ${total} pipeline welds.`,
          },
          tableBlock,
          {
            t: 'p',
            text: 'Given that a weld had No Flaw, what is the probability (as a percentage) that it triggered a Sensor Alert (false alarm rate)?',
          },
        ]
      }
    } else if (skin === 'credit') {
      const tableBlock: Block = {
        t: 'table',
        head: ['Credit Tier', 'Defaulted (24 mo)', 'Current / Repaid', 'Total'],
        rows: [
          ['Tier B / C', `${p.a}`, `${p.b}`, `${r1}`],
          ['Tier A (Prime)', `${p.c}`, `${p.d}`, `${r2}`],
          ['Total', `${c1}`, `${c2}`, `${total}`],
        ],
        caption: 'Consumer loan portfolio 24-month performance',
      }

      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A credit analytics firm analyzed a portfolio of ${total} commercial loans.`,
          },
          tableBlock,
          {
            t: 'p',
            text: 'Given that a loan was classified in Tier B / C, what is the probability (as a percentage) that it defaulted within 24 months?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `A credit bureau reviewed performance across ${total} consumer loans.`,
          },
          tableBlock,
          {
            t: 'p',
            text: 'Given that a borrower Defaulted, what is the probability (as a percentage) that they were originally scored in Tier B / C?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A regional bank monitored ${total} credit facilities.`,
          },
          tableBlock,
          {
            t: 'p',
            text: 'Given that a borrower was scored in Tier A (Prime), what is the probability (as a percentage) that they defaulted within 24 months?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A bank risk audit reviewed ${total} borrower accounts.`,
          },
          tableBlock,
          {
            t: 'p',
            text: 'Given that a loan remained Current / Repaid, what is the probability (as a percentage) that the borrower was in Tier B / C?',
          },
        ]
      }
    } else {
      // Default: student
      const tableBlock: Block = {
        t: 'table',
        head: ['Degree Track', 'On-Time Defense', 'Delayed Defense', 'Total'],
        rows: [
          ['Accelerated Track', `${p.a}`, `${p.b}`, `${r1}`],
          ['Standard Track', `${p.c}`, `${p.d}`, `${r2}`],
          ['Total', `${c1}`, `${c2}`, `${total}`],
        ],
        caption: 'Graduate academic progress registry',
      }

      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A university registrar tracked ${total} graduate students preparing their master's defense.`,
          },
          tableBlock,
          {
            t: 'p',
            text: 'Given that a student was in the Accelerated Track, what is the conditional probability (as a percentage) that they completed an On-Time Defense?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `An academic review evaluated ${total} graduate student outcomes.`,
          },
          tableBlock,
          {
            t: 'p',
            text: 'Given that a student achieved an On-Time Defense, what is the probability (as a percentage) that they were enrolled in the Accelerated Track?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A university cohort study followed ${total} students.`,
          },
          tableBlock,
          {
            t: 'p',
            text: 'Given that a student was enrolled in the Standard Track, what is the probability (as a percentage) that they completed an On-Time Defense?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `Graduate school administrators surveyed ${total} degree candidates.`,
          },
          tableBlock,
          {
            t: 'p',
            text: 'Given that a student had a Delayed Defense, what is the probability (as a percentage) that they were enrolled in the Accelerated Track?',
          },
        ]
      }
    }
  },

  answer(): AnswerSpec {
    return {
      type: 'number',
      unit: '%',
      tolerance: { abs: 0.2, rel: 0.01 },
    }
  },

  misconceptions: [
    {
      id: 'unconditional-probability',
      value: (p) => {
        const total = p.a + p.b + p.c + p.d
        const num =
          p.level === 1 ? p.a : p.level === 2 ? p.a : p.level === 3 ? p.c : p.b
        return (num / total) * 100
      },
      feedback: () =>
        'You divided by the total table population instead of conditioning on the subset specified by the given event.',
    },
    {
      id: 'inverted-condition',
      value: (p) => {
        // Swap conditioning event and outcome: e.g. Level 1 asks P(B | A) = a / (a + b); inverted is P(A | B) = a / (a + c)
        if (p.level === 1) return (p.a / (p.a + p.c)) * 100
        if (p.level === 2) return (p.a / (p.a + p.b)) * 100
        if (p.level === 3) return (p.c / (p.a + p.c)) * 100
        return (p.b / (p.a + p.b)) * 100
      },
      feedback: () =>
        'You inverted the conditional probability: P(A | B) is not generally equal to P(B | A). Check which attribute is given in the condition.',
    },
  ],

  steps,

  solution(p: ConditionalTwoWayParams): Block[] {
    const num =
      p.level === 1 ? p.a : p.level === 2 ? p.a : p.level === 3 ? p.c : p.b
    const denom =
      p.level === 1
        ? p.a + p.b
        : p.level === 2
          ? p.a + p.c
          : p.level === 3
            ? p.c + p.d
            : p.b + p.d
    const pct = (num / denom) * 100

    return [
      {
        t: 'p',
        text: 'To calculate conditional probability P(Outcome | Condition):',
      },
      {
        t: 'list',
        items: [
          `1. Restrict the reference population to items satisfying the Condition: denominator = ${denom}.`,
          `2. Count items within this restricted subset that satisfy the Outcome: numerator = ${num}.`,
          `3. Conditional probability = (${num} / ${denom}) × 100 ≈ ${pct.toFixed(2)}%.`,
        ],
      },
    ]
  },
}
