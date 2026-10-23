import type { Answer, AnswerSpec, Block, Rng, Step, Template } from '../types.ts'

export type RiskRelativeAbsoluteParams = {
  level: number
  baselineRiskPercent: number // e.g. 4.0%
  treatedRiskPercent: number // e.g. 2.4%
  baselineRiskBPercent?: number // Level 3: Program B
  treatedRiskBPercent?: number
}

export type RiskSkin = 'preventative' | 'cybersecurity' | 'agriculture'

const steps: Step<RiskRelativeAbsoluteParams>[] = [
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the absolute risk reduction (in percentage points) achieved by the primary intervention?',
      },
    ],
    answer: (p) => p.baselineRiskPercent - p.treatedRiskPercent,
    tolerance: { abs: 0.01 },
    explain: (p) => [
      {
        t: 'p',
        text: `Absolute risk reduction = Baseline risk (${p.baselineRiskPercent}%) − Treated risk (${p.treatedRiskPercent}%) = ${(p.baselineRiskPercent - p.treatedRiskPercent).toFixed(2)} percentage points.`,
      },
    ],
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'In a standard reference cohort of 10,000 individuals or units, how many adverse events are prevented?',
      },
    ],
    answer: (p) => {
      const arr = (p.baselineRiskPercent - p.treatedRiskPercent) / 100
      return Math.round(10000 * arr)
    },
    tolerance: { abs: 1 },
    explain: (p) => {
      const arr = (p.baselineRiskPercent - p.treatedRiskPercent) / 100
      const prevented = Math.round(10000 * arr)
      return [
        {
          t: 'p',
          text: `In 10,000 units, events drop from ${Math.round(10000 * (p.baselineRiskPercent / 100))} to ${Math.round(10000 * (p.treatedRiskPercent / 100))}, preventing ${prevented} events.`,
        },
      ]
    },
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the final requested risk metric percentage?',
      },
    ],
    answer: (p) => {
      if (p.level === 1) {
        // ARR in percentage points
        return p.baselineRiskPercent - p.treatedRiskPercent
      } else if (p.level === 2) {
        // RRR in percentage
        const arr = p.baselineRiskPercent - p.treatedRiskPercent
        return (arr / p.baselineRiskPercent) * 100
      } else if (p.level === 3) {
        // Difference in ARR between Intervention A and Intervention B
        const arrA = p.baselineRiskPercent - p.treatedRiskPercent
        const arrB = (p.baselineRiskBPercent ?? 10) - (p.treatedRiskBPercent ?? 7)
        return arrA - arrB
      } else {
        // Level 4: RRR
        const arr = p.baselineRiskPercent - p.treatedRiskPercent
        return (arr / p.baselineRiskPercent) * 100
      }
    },
    tolerance: { abs: 0.05 },
    explain: (p) => {
      let finalVal = p.baselineRiskPercent - p.treatedRiskPercent
      if (p.level === 2 || p.level === 4) {
        finalVal = (finalVal / p.baselineRiskPercent) * 100
      } else if (p.level === 3) {
        const arrB = (p.baselineRiskBPercent ?? 10) - (p.treatedRiskBPercent ?? 7)
        finalVal = finalVal - arrB
      }
      return [
        {
          t: 'p',
          text: `Final calculated metric = ${finalVal.toFixed(2)}%.`,
        },
      ]
    },
  },
]

export const riskFramingRelativeAbsoluteTemplate: Template<RiskRelativeAbsoluteParams> = {
  id: 'judgment.risk-framing.relative-absolute',
  version: 1,
  track: 'judgment',
  concept: 'judgment.risk-framing',
  family: 'risk-relative-absolute',
  status: 'draft',
  review: {
    author: 'Eleanor Team',
    reviewer: null,
    reviewedAt: null,
    notes: 'Distinguishing relative risk reduction (RRR) from absolute risk reduction (ARR)',
  },
  levels: [
    { level: 1, initialRating: 1000 },
    { level: 2, initialRating: 1200 },
    { level: 3, initialRating: 1400 },
    { level: 4, initialRating: 1600 },
  ],
  skins: ['preventative', 'cybersecurity', 'agriculture'],
  dailyLevels: [3, 4],

  sample(rng: Rng, level: number): RiskRelativeAbsoluteParams {
    const baselines = [2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0, 7.5, 8.0, 10.0, 12.0]
    const baselineRiskPercent = rng.pick(baselines)
    const relativeReductions = [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6]
    const relRed = rng.pick(relativeReductions)
    const treatedRiskPercent = Number(
      (baselineRiskPercent * (1 - relRed)).toFixed(2),
    )

    if (level === 3) {
      const baselineRiskBPercent = rng.pick([6.0, 8.0, 12.0, 15.0])
      const relRedB = rng.pick([0.2, 0.25, 0.35])
      const treatedRiskBPercent = Number(
        (baselineRiskBPercent * (1 - relRedB)).toFixed(2),
      )
      return {
        level,
        baselineRiskPercent,
        treatedRiskPercent,
        baselineRiskBPercent,
        treatedRiskBPercent,
      }
    }

    return { level, baselineRiskPercent, treatedRiskPercent }
  },

  solve(p: RiskRelativeAbsoluteParams): Answer {
    if (p.level === 1) {
      return p.baselineRiskPercent - p.treatedRiskPercent
    } else if (p.level === 2) {
      const arr = p.baselineRiskPercent - p.treatedRiskPercent
      return (arr / p.baselineRiskPercent) * 100
    } else if (p.level === 3) {
      const arrA = p.baselineRiskPercent - p.treatedRiskPercent
      const arrB = (p.baselineRiskBPercent ?? 10) - (p.treatedRiskBPercent ?? 7)
      return arrA - arrB
    } else {
      const arr = p.baselineRiskPercent - p.treatedRiskPercent
      return (arr / p.baselineRiskPercent) * 100
    }
  },

  verify(p: RiskRelativeAbsoluteParams): Answer {
    // Independent derivation through natural frequencies across 100,000 cohort
    const N = 100000
    const controlEvents = Math.round(N * (p.baselineRiskPercent / 100))
    const treatedEvents = Math.round(N * (p.treatedRiskPercent / 100))
    const preventedEvents = controlEvents - treatedEvents

    if (p.level === 1) {
      return (preventedEvents / N) * 100
    } else if (p.level === 2 || p.level === 4) {
      return (preventedEvents / controlEvents) * 100
    } else {
      const controlEventsB = Math.round(
        N * ((p.baselineRiskBPercent ?? 10) / 100),
      )
      const treatedEventsB = Math.round(
        N * ((p.treatedRiskBPercent ?? 7) / 100),
      )
      const preventedB = controlEventsB - treatedEventsB
      const arrA = (preventedEvents / N) * 100
      const arrB = (preventedB / N) * 100
      return arrA - arrB
    }
  },

  render(p: RiskRelativeAbsoluteParams, skin: string): Block[] {
    const rrr = (
      ((p.baselineRiskPercent - p.treatedRiskPercent) /
        p.baselineRiskPercent) *
      100
    ).toFixed(1)

    if (skin === 'preventative') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `An industrial ergonomics program is advertised as reducing workstation repetitive strain injuries by ${rrr}% (relative risk reduction). Standard safety records indicate that the baseline injury risk without the program is ${p.baselineRiskPercent.toFixed(1)}%. With the program, the injury risk drops to ${p.treatedRiskPercent.toFixed(1)}%.`,
          },
          {
            t: 'p',
            text: 'What is the absolute risk reduction (in percentage points) achieved by the ergonomics program?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `In a manufacturing facility, the baseline rate of repetitive strain injuries is ${p.baselineRiskPercent.toFixed(1)}%. After introducing ergonomic tool redesigns, the injury rate decreases to ${p.treatedRiskPercent.toFixed(1)}%.`,
          },
          {
            t: 'p',
            text: 'What is the relative risk reduction (as a percentage) achieved by the ergonomic tool redesign?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A plant manager compares two safety interventions:`,
          },
          {
            t: 'list',
            items: [
              `Intervention A: Reduces injury risk from ${p.baselineRiskPercent.toFixed(1)}% down to ${p.treatedRiskPercent.toFixed(1)}%.`,
              `Intervention B: Reduces injury risk from ${p.baselineRiskBPercent?.toFixed(1)}% down to ${p.treatedRiskBPercent?.toFixed(1)}%.`,
            ],
          },
          {
            t: 'p',
            text: 'What is the difference in absolute risk reduction (ARR of Intervention A minus ARR of Intervention B, in percentage points)?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A corporate health study notes that workers without periodic micro-breaks have an annual repetitive strain incidence of ${p.baselineRiskPercent.toFixed(1)}%, while workers adhering to mandatory micro-breaks have an incidence of ${p.treatedRiskPercent.toFixed(1)}%.`,
          },
          {
            t: 'p',
            text: 'If a safety director presents this outcome as a relative risk reduction to emphasize its impact, what percentage reduction will they report?',
          },
        ]
      }
    } else if (skin === 'cybersecurity') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A security software vendor claims that its endpoint agent provides a ${rrr}% relative risk reduction against phishing compromise. Fleet logs show an untreated baseline breach risk of ${p.baselineRiskPercent.toFixed(1)}%, which falls to ${p.treatedRiskPercent.toFixed(1)}% when protected.`,
          },
          {
            t: 'p',
            text: 'What is the actual absolute risk reduction (in percentage points)?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `Across enterprise workstations, the baseline malware infection risk without advanced isolation is ${p.baselineRiskPercent.toFixed(1)}%. Deploying browser sandboxing reduces this infection rate to ${p.treatedRiskPercent.toFixed(1)}%.`,
          },
          {
            t: 'p',
            text: 'Calculate the relative risk reduction (as a percentage).',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `An IT security committee evaluates two security controls:`,
          },
          {
            t: 'list',
            items: [
              `Control A: Cuts compromise risk from ${p.baselineRiskPercent.toFixed(1)}% to ${p.treatedRiskPercent.toFixed(1)}%.`,
              `Control B: Cuts compromise risk from ${p.baselineRiskBPercent?.toFixed(1)}% to ${p.treatedRiskBPercent?.toFixed(1)}%.`,
            ],
          },
          {
            t: 'p',
            text: 'What is the difference in absolute risk reduction (Control A ARR minus Control B ARR, in percentage points)?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `An annual audit reveals credential theft incidents at ${p.baselineRiskPercent.toFixed(1)}% on password-only accounts, compared to ${p.treatedRiskPercent.toFixed(1)}% on accounts with hardware security keys.`,
          },
          {
            t: 'p',
            text: 'What is the relative risk reduction (in percent) achieved by hardware keys?',
          },
        ]
      }
    } else {
      // Default: agriculture
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A biological fungicide trial reports a ${rrr}% relative risk reduction in fungal blight across orchard test plots. Untreated control trees experience a blight incidence of ${p.baselineRiskPercent.toFixed(1)}%, while treated trees have an incidence of ${p.treatedRiskPercent.toFixed(1)}%.`,
          },
          {
            t: 'p',
            text: 'What is the absolute reduction in blight incidence (in percentage points)?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `A field trial measures seasonal mildew crop losses at ${p.baselineRiskPercent.toFixed(1)}% in untreated rows, compared to ${p.treatedRiskPercent.toFixed(1)}% in rows treated with organic bio-coatings.`,
          },
          {
            t: 'p',
            text: 'What is the relative risk reduction (as a percentage)?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `An agricultural cooperative tests two soil treatments:`,
          },
          {
            t: 'list',
            items: [
              `Treatment A: Reduces blight from ${p.baselineRiskPercent.toFixed(1)}% to ${p.treatedRiskPercent.toFixed(1)}%.`,
              `Treatment B: Reduces blight from ${p.baselineRiskBPercent?.toFixed(1)}% to ${p.treatedRiskBPercent?.toFixed(1)}%.`,
            ],
          },
          {
            t: 'p',
            text: 'What is the difference in absolute risk reduction (Treatment A ARR minus Treatment B ARR, in percentage points)?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `Crop yield data records root rot disease incidence at ${p.baselineRiskPercent.toFixed(1)}% in conventional tillage, versus ${p.treatedRiskPercent.toFixed(1)}% under conservation strip-tillage.`,
          },
          {
            t: 'p',
            text: 'Express the protection offered by strip-tillage as a relative risk reduction percentage.',
          },
        ]
      }
    }
  },

  answer(): AnswerSpec {
    return {
      type: 'number',
      unit: '%',
      tolerance: { abs: 0.05, rel: 0.01 },
    }
  },

  misconceptions: [
    {
      id: 'confusing-relative-and-absolute',
      value: (p) => {
        // Reporting RRR when ARR is requested (or vice versa)
        if (p.level === 1) {
          return (
            ((p.baselineRiskPercent - p.treatedRiskPercent) /
              p.baselineRiskPercent) *
            100
          )
        }
        return p.baselineRiskPercent - p.treatedRiskPercent
      },
      feedback: () =>
        'You confused relative risk reduction (RRR) with absolute risk reduction (ARR). Relative risk divides by baseline risk; absolute risk is the direct difference in percentages.',
    },
    {
      id: 'relative-risk-ratio',
      value: (p) => {
        // Reporting R1/R0 instead of 1 - R1/R0
        return (p.treatedRiskPercent / p.baselineRiskPercent) * 100
      },
      feedback: () =>
        'You calculated the relative risk ratio (R_treated / R_baseline) rather than the relative risk reduction (1 − R_treated / R_baseline).',
    },
  ],

  steps,

  solution(p: RiskRelativeAbsoluteParams): Block[] {
    const arr = p.baselineRiskPercent - p.treatedRiskPercent
    const rrr = (arr / p.baselineRiskPercent) * 100

    return [
      {
        t: 'p',
        text: 'Risk framing requires separating absolute changes from proportional changes:',
      },
      {
        t: 'list',
        items: [
          `Baseline Risk (R₀) = ${p.baselineRiskPercent.toFixed(2)}%`,
          `Treated Risk (R₁) = ${p.treatedRiskPercent.toFixed(2)}%`,
          `Absolute Risk Reduction (ARR) = R₀ − R₁ = ${arr.toFixed(2)} percentage points`,
          `Relative Risk Reduction (RRR) = (ARR / R₀) × 100 = (${arr.toFixed(2)} / ${p.baselineRiskPercent.toFixed(2)}) × 100 = ${rrr.toFixed(1)}%`,
        ],
      },
    ]
  },
}
