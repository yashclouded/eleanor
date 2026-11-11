import type { Answer, AnswerSpec, Block, Rng, Step, Template } from '../types.ts'

export type ExpectedValueInsuranceParams = {
  level: number
  pLossPercent: number // e.g. 5%
  lossAmount: number // e.g. $10,000
  deductible: number // e.g. $1,000
  pLoss2Percent?: number // Level 3: Severe loss tier
  loss2Amount?: number
  premiumLoadingPercent?: number // Level 4: Administrative markup (e.g. 20%)
}

export type ExpectedValueInsuranceSkin = 'shipping' | 'equipment' | 'cloud'

const steps: Step<ExpectedValueInsuranceParams>[] = [
  {
    prompt: (p) => [
      {
        t: 'p',
        text: p.level === 1
          ? 'What is the full financial exposure of the incident before insurance?'
          : 'What is the insurer payout per covered incident after the deductible is subtracted?',
      },
    ],
    answer: (p) => (p.level === 1 ? p.lossAmount : Math.max(0, p.lossAmount - p.deductible)),
    tolerance: { abs: 0.1 },
    explain: (p) => {
      const netClaim = Math.max(0, p.lossAmount - p.deductible)
      return [
        {
          t: 'p',
          text: p.level === 1
            ? `The baseline loss amount is $${p.lossAmount.toLocaleString()}.`
            : `Subtract the deductible ($${p.deductible}) from the loss ($${p.lossAmount}): $${p.lossAmount} - $${p.deductible} = $${netClaim.toLocaleString()}.`,
        },
      ]
    },
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the expected claim payout for the primary loss category?',
      },
    ],
    answer: (p) => {
      const netClaim = p.level === 1 ? p.lossAmount : Math.max(0, p.lossAmount - p.deductible)
      return (p.pLossPercent / 100) * netClaim
    },
    tolerance: { abs: 0.5 },
    explain: (p) => {
      const netClaim = p.level === 1 ? p.lossAmount : Math.max(0, p.lossAmount - p.deductible)
      const ev = (p.pLossPercent / 100) * netClaim
      return [
        {
          t: 'p',
          text: `Multiply incident probability (${p.pLossPercent}%) by net claim ($${netClaim}): (${p.pLossPercent} / 100) × $${netClaim} = $${ev.toFixed(2)}.`,
        },
      ]
    },
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the final requested expected value (in dollars)?',
      },
    ],
    answer: (p) => {
      if (p.level === 1) {
        return (p.pLossPercent / 100) * p.lossAmount
      } else if (p.level === 2) {
        return (p.pLossPercent / 100) * Math.max(0, p.lossAmount - p.deductible)
      } else if (p.level === 3) {
        const ev1 = (p.pLossPercent / 100) * Math.max(0, p.lossAmount - p.deductible)
        const ev2 =
          ((p.pLoss2Percent ?? 1) / 100) *
          Math.max(0, (p.loss2Amount ?? 25000) - p.deductible)
        return ev1 + ev2
      } else {
        // Level 4: Premium with administrative loading
        const pureEv =
          (p.pLossPercent / 100) * Math.max(0, p.lossAmount - p.deductible)
        const loading = 1 + (p.premiumLoadingPercent ?? 20) / 100
        return pureEv * loading
      }
    },
    tolerance: { abs: 0.5 },
    explain: (p) => {
      let finalVal = 0
      if (p.level === 1) {
        finalVal = (p.pLossPercent / 100) * p.lossAmount
      } else if (p.level === 2) {
        finalVal = (p.pLossPercent / 100) * Math.max(0, p.lossAmount - p.deductible)
      } else if (p.level === 3) {
        const ev1 = (p.pLossPercent / 100) * Math.max(0, p.lossAmount - p.deductible)
        const ev2 =
          ((p.pLoss2Percent ?? 1) / 100) *
          Math.max(0, (p.loss2Amount ?? 25000) - p.deductible)
        finalVal = ev1 + ev2
      } else {
        const pureEv =
          (p.pLossPercent / 100) * Math.max(0, p.lossAmount - p.deductible)
        const loading = 1 + (p.premiumLoadingPercent ?? 20) / 100
        finalVal = pureEv * loading
      }
      return [
        {
          t: 'p',
          text: `Final expected financial value = $${finalVal.toFixed(2)}.`,
        },
      ]
    },
  },
]

export const expectedValueInsuranceTemplate: Template<ExpectedValueInsuranceParams> = {
  id: 'judgment.expected-value.insurance',
  version: 1,
  track: 'judgment',
  concept: 'judgment.expected-value',
  family: 'ev-insurance',
  status: 'draft',
  review: {
    author: 'Eleanor Team',
    reviewer: null,
    reviewedAt: null,
    notes: 'Actuarially fair insurance premiums, deductibles, and tiered coverage expected payouts',
  },
  levels: [
    { level: 1, initialRating: 1000 },
    { level: 2, initialRating: 1200 },
    { level: 3, initialRating: 1400 },
    { level: 4, initialRating: 1600 },
  ],
  skins: ['shipping', 'equipment', 'cloud'],
  dailyLevels: [3, 4],

  sample(rng: Rng, level: number): ExpectedValueInsuranceParams {
    const pLossPercent = rng.int(2, 12)
    const lossAmount = rng.int(40, 150) * 100
    const deductible = rng.int(5, 20) * 100

    if (level === 1) {
      return { level, pLossPercent, lossAmount, deductible: 0 }
    } else if (level === 2) {
      return { level, pLossPercent, lossAmount, deductible }
    } else if (level === 3) {
      const pLoss2Percent = rng.int(1, 3)
      const loss2Amount = rng.int(250, 400) * 100
      return {
        level,
        pLossPercent,
        lossAmount,
        deductible,
        pLoss2Percent,
        loss2Amount,
      }
    } else {
      const premiumLoadingPercent = rng.int(15, 30)
      return {
        level,
        pLossPercent,
        lossAmount,
        deductible,
        premiumLoadingPercent,
      }
    }
  },

  solve(p: ExpectedValueInsuranceParams): Answer {
    if (p.level === 1) {
      return (p.pLossPercent / 100) * p.lossAmount
    } else if (p.level === 2) {
      return (p.pLossPercent / 100) * Math.max(0, p.lossAmount - p.deductible)
    } else if (p.level === 3) {
      const ev1 = (p.pLossPercent / 100) * Math.max(0, p.lossAmount - p.deductible)
      const ev2 =
        ((p.pLoss2Percent ?? 1) / 100) *
        Math.max(0, (p.loss2Amount ?? 25000) - p.deductible)
      return ev1 + ev2
    } else {
      const pureEv =
        (p.pLossPercent / 100) * Math.max(0, p.lossAmount - p.deductible)
      const loading = 1 + (p.premiumLoadingPercent ?? 20) / 100
      return pureEv * loading
    }
  },

  verify(p: ExpectedValueInsuranceParams): Answer {
    // Independent derivation using total expected damage minus expected retained deductible
    if (p.level === 1) {
      return (p.lossAmount * p.pLossPercent) / 100
    } else if (p.level === 2) {
      const expGrossLoss = (p.pLossPercent / 100) * p.lossAmount
      const expDeductiblePaid = (p.pLossPercent / 100) * p.deductible
      return expGrossLoss - expDeductiblePaid
    } else if (p.level === 3) {
      const p1 = p.pLossPercent / 100
      const p2 = (p.pLoss2Percent ?? 1) / 100
      const loss2 = p.loss2Amount ?? 25000
      const expGross = p1 * p.lossAmount + p2 * loss2
      const expDeductible = (p1 + p2) * p.deductible
      return expGross - expDeductible
    } else {
      const p1 = p.pLossPercent / 100
      const netClaim = p.lossAmount - p.deductible
      const loadingRatio = (p.premiumLoadingPercent ?? 20) / 100
      return p1 * netClaim + p1 * netClaim * loadingRatio
    }
  },

  render(p: ExpectedValueInsuranceParams, skin: string): Block[] {
    if (skin === 'shipping') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A maritime shipping logistics operator estimates that a cargo container transit leg has a ${p.pLossPercent}% probability of experiencing rough-sea cargo damage, with an average damage cost of $${p.lossAmount.toLocaleString()}.`,
          },
          {
            t: 'p',
            text: 'What is the actuarially fair insurance premium (expected loss in dollars) per container without a deductible?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `A cargo insurance policy covers container freight with an incident probability of ${p.pLossPercent}%. If damage occurs, the gross loss is $${p.lossAmount.toLocaleString()}. The policy specifies a deductible of $${p.deductible.toLocaleString()} per claim paid by the shipper.`,
          },
          {
            t: 'p',
            text: 'What is the insurer’s expected claim payout (in dollars) per insured container transit?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A freight fleet policy classifies maritime transit risks into two mutually exclusive damage tiers, both subject to a $${p.deductible.toLocaleString()} deductible:`,
          },
          {
            t: 'list',
            items: [
              `Minor seawater leakage: ${p.pLossPercent}% probability, causing $${p.lossAmount.toLocaleString()} gross damage.`,
              `Major hull impact: ${p.pLoss2Percent}% probability, causing $${p.loss2Amount?.toLocaleString()} gross damage.`,
            ],
          },
          {
            t: 'p',
            text: 'Calculate the total expected payout (in dollars) made by the insurer per voyage across both risk tiers.',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A maritime freight carrier insures cargo against loss with a ${p.pLossPercent}% incident rate and $${p.lossAmount.toLocaleString()} gross loss, subject to a $${p.deductible.toLocaleString()} deductible. The underwriter quotes a commercial premium loaded with a ${p.premiumLoadingPercent}% administrative overhead markup above the pure expected claim payout.`,
          },
          {
            t: 'p',
            text: 'What is the commercial insurance premium charged by the underwriter (in dollars)?',
          },
        ]
      }
    } else if (skin === 'equipment') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A construction equipment leasing firm estimates a ${p.pLossPercent}% annual probability of catastrophic motor burnout on its heavy cranes, with an average repair cost of $${p.lossAmount.toLocaleString()}.`,
          },
          {
            t: 'p',
            text: 'What is the actuarially fair annual warranty cost (in dollars) with zero deductible?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `An extended warranty program for industrial cranes covers hydraulic breakdowns occurring with ${p.pLossPercent}% probability, incurring $${p.lossAmount.toLocaleString()} in repair expenses. The contractor pays an initial deductible of $${p.deductible.toLocaleString()} per repair.`,
          },
          {
            t: 'p',
            text: 'What is the warranty provider’s expected payout (in dollars) per crane per coverage period?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `An industrial machinery warranty protects against two distinct malfunction categories, each subject to a $${p.deductible.toLocaleString()} customer deductible:`,
          },
          {
            t: 'list',
            items: [
              `Hydraulic valve failure: ${p.pLossPercent}% probability, costing $${p.lossAmount.toLocaleString()} to service.`,
              `Main axle fracture: ${p.pLoss2Percent}% probability, costing $${p.loss2Amount?.toLocaleString()} to replace.`,
            ],
          },
          {
            t: 'p',
            text: 'What is the expected reimbursement payout (in dollars) from the warranty underwriter per machine?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A machinery protection plan covers equipment failure occurring with ${p.pLossPercent}% probability and $${p.lossAmount.toLocaleString()} damage, with a $${p.deductible.toLocaleString()} deductible. The provider prices the plan with a ${p.premiumLoadingPercent}% operational margin added on top of the pure expected loss payout.`,
          },
          {
            t: 'p',
            text: 'What is the total annual protection plan fee (in dollars)?',
          },
        ]
      }
    } else {
      // Default: cloud
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `An enterprise cloud hosting provider estimates a ${p.pLossPercent}% monthly chance of a major multi-zone outage triggering SLA customer compensation penalties averaging $${p.lossAmount.toLocaleString()}.`,
          },
          {
            t: 'p',
            text: 'What is the expected monthly compensation liability (in dollars) without risk retention?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `A cloud outage insurance policy covers downtime penalties having an incident rate of ${p.pLossPercent}% and gross damages of $${p.lossAmount.toLocaleString()}. The enterprise retains the first $${p.deductible.toLocaleString()} in SLA penalties as a deductible per event.`,
          },
          {
            t: 'p',
            text: 'What is the insurer’s expected reimbursement payout (in dollars) per coverage period?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `An enterprise IT downtime insurance covers two severity levels with a $${p.deductible.toLocaleString()} policy deductible:`,
          },
          {
            t: 'list',
            items: [
              `Severity 2 latency degradation: ${p.pLossPercent}% chance, causing $${p.lossAmount.toLocaleString()} in SLA penalties.`,
              `Severity 1 total blackout: ${p.pLoss2Percent}% chance, causing $${p.loss2Amount?.toLocaleString()} in SLA penalties.`,
            ],
          },
          {
            t: 'p',
            text: 'Calculate the expected insurance claim payment (in dollars) across both outage tiers.',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A cyber risk underwriter insures against cloud SLA breaches having a ${p.pLossPercent}% probability and $${p.lossAmount.toLocaleString()} loss, after a $${p.deductible.toLocaleString()} policyholder deductible. The policy premium is priced with a ${p.premiumLoadingPercent}% administrative loading above expected claim payouts.`,
          },
          {
            t: 'p',
            text: 'What is the annual premium charged for this cyber risk policy (in dollars)?',
          },
        ]
      }
    }
  },

  answer(): AnswerSpec {
    return {
      type: 'number',
      unit: '$',
      tolerance: { abs: 0.5, rel: 0.01 },
    }
  },

  misconceptions: [
    {
      id: 'ignoring-deductible',
      value: (p) => {
        // Paying total loss without subtracting deductible
        if (p.level === 1) return (p.pLossPercent / 100) * (p.lossAmount + 500)
        return (p.pLossPercent / 100) * p.lossAmount
      },
      feedback: () =>
        'You forgot to subtract the deductible from the gross loss. The insurer only pays the portion of damage exceeding the policyholder deductible.',
    },
    {
      id: 'multiplying-deductible-by-probability-alone',
      value: (p) => {
        // Reporting deductible * probability
        if (p.level === 1) return (p.lossAmount / 10)
        return (p.pLossPercent / 100) * p.deductible
      },
      feedback: () =>
        'You calculated the expected deductible payment rather than the insurer payout above the deductible.',
    },
  ],

  steps,

  solution(p: ExpectedValueInsuranceParams): Block[] {
    const netLoss1 = Math.max(0, p.lossAmount - p.deductible)
    const ev1 = (p.pLossPercent / 100) * netLoss1

    let finalVal = ev1
    if (p.level === 1) {
      finalVal = (p.pLossPercent / 100) * p.lossAmount
    } else if (p.level === 3) {
      const netLoss2 = Math.max(0, (p.loss2Amount ?? 25000) - p.deductible)
      const ev2 = ((p.pLoss2Percent ?? 1) / 100) * netLoss2
      finalVal = ev1 + ev2
    } else if (p.level === 4) {
      const loading = 1 + (p.premiumLoadingPercent ?? 20) / 100
      finalVal = ev1 * loading
    }

    return [
      {
        t: 'p',
        text: 'Calculate the expected insurance claim value based on coverage terms:',
      },
      {
        t: 'list',
        items: [
          `Gross Loss = $${p.lossAmount.toLocaleString()}`,
          `Deductible = $${p.deductible.toLocaleString()}`,
          `Net Insurer Claim per event = $${netLoss1.toLocaleString()}`,
          `Probability of Incident = ${p.pLossPercent}%`,
          `Expected Claim Payout = ${p.pLossPercent}% × $${netLoss1.toLocaleString()} = $${ev1.toFixed(2)}`,
          `Final Value = $${finalVal.toFixed(2)}`,
        ],
      },
    ]
  },
}
