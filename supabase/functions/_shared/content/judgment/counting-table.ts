import type { Answer, AnswerSpec, Block, Rng, Step, Template } from '../types.ts'

export type CountingTableParams = {
  level: number
  a: number // Cell (1,1): Condition A and Condition B
  b: number // Cell (1,2): Condition A and Not B
  c: number // Cell (2,1): Not A and Condition B
  d: number // Cell (2,2): Not A and Not B
}

export type CountingTableSkin = 'applicant' | 'inspection' | 'clinic'

const steps: Step<CountingTableParams>[] = [
  {
    prompt: () => [
      {
        t: 'p',
        text: `What is the total count of all items observed in the entire cohort?`,
      },
    ],
    answer: (p) => p.a + p.b + p.c + p.d,
    tolerance: { abs: 0 },
    explain: (p) => [
      {
        t: 'p',
        text: `Summing all four mutually exclusive categories: ${p.a} + ${p.b} + ${p.c} + ${p.d} = ${p.a + p.b + p.c + p.d}.`,
      },
    ],
  },
  {
    prompt: (p) => [
      {
        t: 'p',
        text: p.level === 5
          ? 'What is the sum of items satisfying neither or both conditions?'
          : 'What is the marginal total for the primary category row?',
      },
    ],
    answer: (p) => (p.level === 5 ? p.a + p.d : p.a + p.b),
    tolerance: { abs: 0 },
    explain: (p) => [
      {
        t: 'p',
        text: p.level === 5
          ? `Items in both or neither: ${p.a} + ${p.d} = ${p.a + p.d}.`
          : `Row total: ${p.a} + ${p.b} = ${p.a + p.b}.`,
      },
    ],
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the final requested count for the target cell or group?',
      },
    ],
    answer: (p) => {
      switch (p.level) {
        case 1:
          return p.d
        case 2:
          return p.b
        case 3:
          return p.c
        case 4:
          return p.a
        case 5:
        default:
          return p.b + p.c
      }
    },
    tolerance: { abs: 0 },
    explain: () => [
      {
        t: 'p',
        text: 'Subtract the non-target segments from the appropriate margin or total to isolate the target count.',
      },
    ],
  },
]

export const countingTableTemplate: Template<CountingTableParams> = {
  id: 'judgment.frequencies.counting-table',
  version: 1,
  track: 'judgment',
  concept: 'judgment.frequencies',
  family: 'counting-table',
  status: 'draft',
  review: {
    author: 'Eleanor Team',
    reviewer: null,
    reviewedAt: null,
    notes: 'Natural frequencies contingency table inference across discrete categories',
  },
  levels: [
    { level: 1, initialRating: 800 },
    { level: 2, initialRating: 1000 },
    { level: 3, initialRating: 1200 },
    { level: 4, initialRating: 1400 },
    { level: 5, initialRating: 1600 },
  ],
  skins: ['applicant', 'inspection', 'clinic'],
  dailyLevels: [4, 5],

  sample(rng: Rng, level: number): CountingTableParams {
    // Generate distinct non-trivial integer counts
    const a = rng.int(110, 320)
    const b = rng.int(90, 280)
    const c = rng.int(85, 260)
    const d = rng.int(125, 340)
    return { level, a, b, c, d }
  },

  solve(p: CountingTableParams): Answer {
    switch (p.level) {
      case 1:
        return p.d
      case 2:
        return p.b
      case 3:
        return p.c
      case 4:
        return p.a
      case 5:
      default:
        return p.b + p.c
    }
  },

  verify(p: CountingTableParams): Answer {
    const total = p.a + p.b + p.c + p.d
    const r1 = p.a + p.b
    const r2 = p.c + p.d
    const c1 = p.a + p.c
    const c2 = p.b + p.d

    switch (p.level) {
      case 1:
        // Independent verification via column margins
        return c2 - p.b
      case 2:
        // Verification via total minus others
        return total - p.a - r2
      case 3:
        // Verification via column 1 margin minus cell a
        return c1 - p.a
      case 4:
        // Verification via row 1 margin minus cell b
        return r1 - p.b
      case 5:
      default:
        // Verification: total minus (both + neither)
        return total - (p.a + p.d)
    }
  },

  render(p: CountingTableParams, skin: string): Block[] {
    const total = p.a + p.b + p.c + p.d
    const r1 = p.a + p.b
    const r2 = p.c + p.d
    const c1 = p.a + p.c
    const c2 = p.b + p.d

    if (skin === 'applicant') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A hiring department screened a total of ${total} applicants, tracking degree background and assessment outcome.`,
          },
          {
            t: 'table',
            head: ['Category', 'Assessment Passed', 'Assessment Retest', 'Total'],
            rows: [
              ['Technical Degree', `${p.a}`, `${p.b}`, `${r1}`],
              ['Non-Technical Degree', `${p.c}`, '?', `${r2}`],
              ['Total', `${c1}`, `${c2}`, `${total}`],
            ],
            caption: 'Applicant assessment breakdown',
          },
          {
            t: 'p',
            text: 'How many applicants with a non-technical degree required an assessment retest?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `In a cohort of ${total} job applicants, ${r1} hold a technical degree. Among those holding a technical degree, ${p.a} passed the technical assessment on their first attempt.`,
          },
          {
            t: 'p',
            text: 'How many applicants holding a technical degree did NOT pass on their first attempt?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `Out of ${total} applicants evaluated, exactly ${c1} passed the technical assessment. Company records show that ${p.a} of those who passed hold a technical degree.`,
          },
          {
            t: 'p',
            text: 'How many applicants who passed the assessment hold a non-technical degree?',
          },
        ]
      } else if (p.level === 4) {
        return [
          {
            t: 'p',
            text: `A review of ${total} applicants revealed that ${r1} hold a technical degree, and ${c2} required an assessment retest. Exactly ${p.d} applicants neither hold a technical degree nor passed the assessment.`,
          },
          {
            t: 'p',
            text: 'How many applicants both hold a technical degree AND passed the assessment?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A talent study reviewed ${total} applicants. Exactly ${p.a} applicants held a technical degree and passed the assessment, while ${p.d} held non-technical degrees and required a retest.`,
          },
          {
            t: 'p',
            text: 'How many applicants satisfied exactly one of these criteria (either holding a technical degree and retesting, or holding a non-technical degree and passing)?',
          },
        ]
      }
    } else if (skin === 'inspection') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `An industrial quality audit inspected ${total} components produced across two fabrication shifts.`,
          },
          {
            t: 'table',
            head: ['Shift', 'Passed Inspection', 'Required Rework', 'Total'],
            rows: [
              ['Shift 1', `${p.a}`, `${p.b}`, `${r1}`],
              ['Shift 2', `${p.c}`, '?', `${r2}`],
              ['Total', `${c1}`, `${c2}`, `${total}`],
            ],
            caption: 'Component quality verification table',
          },
          {
            t: 'p',
            text: 'How many components manufactured in Shift 2 required rework?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `During an inspection cycle of ${total} precision valves, ${r1} were fabricated during Shift 1. Of those Shift 1 valves, ${p.a} passed automated pressure testing.`,
          },
          {
            t: 'p',
            text: 'How many Shift 1 valves required rework after failing automated pressure testing?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A factory audit of ${total} parts found that ${c1} parts passed all tolerances. Of those passing parts, ${p.a} were manufactured during Shift 1.`,
          },
          {
            t: 'p',
            text: 'How many parts that passed inspection were produced during Shift 2?',
          },
        ]
      } else if (p.level === 4) {
        return [
          {
            t: 'p',
            text: `An inspection facility checked ${total} parts. Exactly ${r1} parts came from Shift 1, and ${c2} parts required rework. Exactly ${p.d} parts came from Shift 2 and required rework.`,
          },
          {
            t: 'p',
            text: 'How many parts came from Shift 1 and passed inspection?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A quality review examined ${total} assemblies. Exactly ${p.a} were Shift 1 assemblies that passed, while ${p.d} were Shift 2 assemblies that required rework.`,
          },
          {
            t: 'p',
            text: 'How many assemblies met mixed criteria (either Shift 1 requiring rework, or Shift 2 passing inspection)?',
          },
        ]
      }
    } else {
      // Default: clinic
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A health clinic tracked ${total} visiting patients over a surveillance week.`,
          },
          {
            t: 'table',
            head: ['Patient Group', 'Fever Present', 'No Fever', 'Total'],
            rows: [
              ['Recent Travel', `${p.a}`, `${p.b}`, `${r1}`],
              ['Local Residence', `${p.c}`, '?', `${r2}`],
              ['Total', `${c1}`, `${c2}`, `${total}`],
            ],
            caption: 'Clinic patient symptom counts',
          },
          {
            t: 'p',
            text: 'How many local patients did not present with a fever?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `In a clinic intake of ${total} patients, ${r1} had a history of recent international travel. Of those travelers, ${p.a} presented with an acute fever.`,
          },
          {
            t: 'p',
            text: 'How many recent travelers did not present with a fever?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A clinic study recorded ${c1} patients with acute fever out of ${total} total intakes. Exactly ${p.a} of the febrile patients had a history of recent travel.`,
          },
          {
            t: 'p',
            text: 'How many febrile patients had no history of recent travel (local patients)?',
          },
        ]
      } else if (p.level === 4) {
        return [
          {
            t: 'p',
            text: `Among ${total} patients, ${r1} were recent travelers, and ${c2} presented with no fever. Exactly ${p.d} patients were local residents with no fever.`,
          },
          {
            t: 'p',
            text: 'How many patients were recent travelers who presented with a fever?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A cohort of ${total} clinic patients was assessed. Exactly ${p.a} were travelers with fever, and ${p.d} were locals without fever.`,
          },
          {
            t: 'p',
            text: 'How many patients presented with mismatched attributes (either travelers with no fever, or locals with fever)?',
          },
        ]
      }
    }
  },

  answer(): AnswerSpec {
    return {
      type: 'integer',
      unit: 'count',
    }
  },

  misconceptions: [
    {
      id: 'wrong-margin-subtraction',
      value: (p) => {
        // Subtracting from the wrong marginal (e.g. subtracting from total or wrong row)
        if (p.level === 1) return p.c + p.d
        if (p.level === 2) return (p.a + p.c) - p.a + 15
        if (p.level === 3) return (p.a + p.b) - p.a + 15
        if (p.level === 4) return (p.a + p.b + p.c + p.d) - (p.a + p.b)
        return p.a + p.d
      },
      feedback: () =>
        'Be careful to subtract the known cell count from its specific row or column total, rather than an unrelated marginal sum.',
    },
    {
      id: 'confusing-joint-with-marginal',
      value: (p) => {
        if (p.level === 1) return p.b + p.d
        if (p.level === 2) return p.a + p.b
        if (p.level === 3) return p.a + p.c
        if (p.level === 4) return p.b + p.d
        return p.a + p.b + p.c
      },
      feedback: () =>
        'You reported a marginal row or column total rather than isolating the specific joint cell count.',
    },
  ],

  steps,

  solution(p: CountingTableParams): Block[] {
    const total = p.a + p.b + p.c + p.d
    const r1 = p.a + p.b
    const r2 = p.c + p.d
    const c1 = p.a + p.c
    const c2 = p.b + p.d

    return [
      {
        t: 'p',
        text: 'Represent the categories as a complete 2×2 natural frequency table:',
      },
      {
        t: 'table',
        head: ['Category', 'Condition B', 'Not Condition B', 'Total'],
        rows: [
          ['Condition A', `${p.a}`, `${p.b}`, `${r1}`],
          ['Not Condition A', `${p.c}`, `${p.d}`, `${r2}`],
          ['Total', `${c1}`, `${c2}`, `${total}`],
        ],
      },
      {
        t: 'p',
        text: `Using the table marginals, the requested value is determined directly by subtraction, yielding ${
          p.level === 1
            ? p.d
            : p.level === 2
              ? p.b
              : p.level === 3
                ? p.c
                : p.level === 4
                  ? p.a
                  : p.b + p.c
        }.`,
      },
    ]
  },
}
