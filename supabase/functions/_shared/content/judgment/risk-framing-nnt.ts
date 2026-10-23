import type { Answer, AnswerSpec, Block, Rng, Step, Template } from '../types.ts'

export type RiskNntParams = {
  level: number
  baselinePercent: number // e.g. 5.0%
  treatedPercent: number // e.g. 2.5%
  cohortSize0?: number // Level 2
  events0?: number
  cohortSize1?: number
  events1?: number
  unitCost?: number // Level 4
}

export type RiskNntSkin = 'safety' | 'energy' | 'retention'

const steps: Step<RiskNntParams>[] = [
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the absolute risk reduction (ARR, expressed as a decimal proportion)?',
      },
    ],
    answer: (p) => {
      let r0 = p.baselinePercent / 100
      let r1 = p.treatedPercent / 100
      if (p.level === 2 && p.cohortSize0 && p.events0 && p.cohortSize1 && p.events1) {
        r0 = p.events0 / p.cohortSize0
        r1 = p.events1 / p.cohortSize1
      }
      return r0 - r1
    },
    tolerance: { abs: 0.001 },
    explain: (p) => {
      let r0 = p.baselinePercent / 100
      let r1 = p.treatedPercent / 100
      if (p.level === 2 && p.cohortSize0 && p.events0 && p.cohortSize1 && p.events1) {
        r0 = p.events0 / p.cohortSize0
        r1 = p.events1 / p.cohortSize1
      }
      const arr = r0 - r1
      return [
        {
          t: 'p',
          text: `ARR = Baseline (${(r0 * 100).toFixed(2)}%) − Treated (${(r1 * 100).toFixed(2)}%) = ${(arr * 100).toFixed(2)}% (decimal: ${arr.toFixed(4)}).`,
        },
      ]
    },
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Calculate the unrounded reciprocal of ARR (1 / ARR).',
      },
    ],
    answer: (p) => {
      let r0 = p.baselinePercent / 100
      let r1 = p.treatedPercent / 100
      if (p.level === 2 && p.cohortSize0 && p.events0 && p.cohortSize1 && p.events1) {
        r0 = p.events0 / p.cohortSize0
        r1 = p.events1 / p.cohortSize1
      }
      return 1 / (r0 - r1)
    },
    tolerance: { abs: 0.2 },
    explain: (p) => {
      let r0 = p.baselinePercent / 100
      let r1 = p.treatedPercent / 100
      if (p.level === 2 && p.cohortSize0 && p.events0 && p.cohortSize1 && p.events1) {
        r0 = p.events0 / p.cohortSize0
        r1 = p.events1 / p.cohortSize1
      }
      const rawNnt = 1 / (r0 - r1)
      return [
        {
          t: 'p',
          text: `1 / ARR = 1 / ${(r0 - r1).toFixed(4)} ≈ ${rawNnt.toFixed(2)}.`,
        },
      ]
    },
  },
  {
    prompt: (p) => [
      {
        t: 'p',
        text: p.level === 4
          ? 'What is the total expenditure (in dollars) required to prevent one adverse event (NNT × unit cost)?'
          : 'What is the Number Needed to Treat (NNT), rounded up to the nearest whole integer?',
      },
    ],
    answer: (p) => {
      let r0 = p.baselinePercent / 100
      let r1 = p.treatedPercent / 100
      if (p.level === 2 && p.cohortSize0 && p.events0 && p.cohortSize1 && p.events1) {
        r0 = p.events0 / p.cohortSize0
        r1 = p.events1 / p.cohortSize1
      }
      const nnt = Math.ceil(1 / (r0 - r1) - 1e-9)
      if (p.level === 4 && p.unitCost) {
        return nnt * p.unitCost
      }
      return nnt
    },
    tolerance: { abs: 0 },
    explain: (p) => {
      let r0 = p.baselinePercent / 100
      let r1 = p.treatedPercent / 100
      if (p.level === 2 && p.cohortSize0 && p.events0 && p.cohortSize1 && p.events1) {
        r0 = p.events0 / p.cohortSize0
        r1 = p.events1 / p.cohortSize1
      }
      const nnt = Math.ceil(1 / (r0 - r1) - 1e-9)
      if (p.level === 4 && p.unitCost) {
        return [
          {
            t: 'p',
            text: `NNT = ${nnt}. Multiplying by unit cost ($${p.unitCost}): ${nnt} × $${p.unitCost} = $${(nnt * p.unitCost).toLocaleString()}.`,
          },
        ]
      }
      return [
        {
          t: 'p',
          text: `Rounding up to ensure at least one full event is prevented gives NNT = ${nnt}.`,
        },
      ]
    },
  },
]

export const riskFramingNntTemplate: Template<RiskNntParams> = {
  id: 'judgment.risk-framing.nnt',
  version: 1,
  track: 'judgment',
  concept: 'judgment.risk-framing',
  family: 'risk-nnt',
  status: 'draft',
  review: {
    author: 'Eleanor Team',
    reviewer: null,
    reviewedAt: null,
    notes: 'Number Needed to Treat (NNT = ceil(1/ARR)) and cost-effectiveness scaling',
  },
  levels: [
    { level: 1, initialRating: 1000 },
    { level: 2, initialRating: 1200 },
    { level: 3, initialRating: 1400 },
    { level: 4, initialRating: 1600 },
  ],
  skins: ['safety', 'energy', 'retention'],
  dailyLevels: [3, 4],

  sample(rng: Rng, level: number): RiskNntParams {
    if (level === 1) {
      const bVals = [3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 7.0, 8.0, 9.0, 10.0]
      const b = rng.pick(bVals)
      const diffs = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0]
      const diff = rng.pick(diffs)
      const t = Number((b - diff).toFixed(1))
      return { level, baselinePercent: b, treatedPercent: t }
    } else if (level === 2) {
      const cohortSize0 = rng.pick([1000, 2000, 2500, 4000, 5000])
      const cohortSize1 = rng.pick([1000, 2000, 2500, 4000, 5000])
      const r0 = rng.pick([0.04, 0.05, 0.06, 0.07, 0.08, 0.1])
      const r1 = rng.pick([0.015, 0.02, 0.025, 0.03])
      const events0 = Math.round(cohortSize0 * r0)
      const events1 = Math.round(cohortSize1 * r1)
      return {
        level,
        baselinePercent: r0 * 100,
        treatedPercent: r1 * 100,
        cohortSize0,
        events0,
        cohortSize1,
        events1,
      }
    } else if (level === 3) {
      const baselines = [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5]
      const b = rng.pick(baselines)
      const reductions = [1.2, 1.5, 1.8, 2.0, 2.4, 2.8, 3.0, 3.5]
      const red = rng.pick(reductions)
      return { level, baselinePercent: b, treatedPercent: Number((b - red).toFixed(1)) }
    } else {
      const bVals = [4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 12.0]
      const b = rng.pick(bVals)
      const t = rng.pick([1.0, 1.5, 2.0, 2.5, 3.0, 3.5])
      const unitCost = rng.pick([100, 150, 200, 250, 300, 400, 500])
      return { level, baselinePercent: b, treatedPercent: t, unitCost }
    }
  },

  solve(p: RiskNntParams): Answer {
    let r0 = p.baselinePercent / 100
    let r1 = p.treatedPercent / 100
    if (p.level === 2 && p.cohortSize0 && p.events0 && p.cohortSize1 && p.events1) {
      r0 = p.events0 / p.cohortSize0
      r1 = p.events1 / p.cohortSize1
    }
    const arr = r0 - r1
    const nnt = Math.ceil(1 / arr - 1e-9)
    if (p.level === 4 && p.unitCost) {
      return nnt * p.unitCost
    }
    return nnt
  },

  verify(p: RiskNntParams): Answer {
    let r0 = p.baselinePercent / 100
    let r1 = p.treatedPercent / 100
    if (p.level === 2 && p.cohortSize0 && p.events0 && p.cohortSize1 && p.events1) {
      r0 = p.events0 / p.cohortSize0
      r1 = p.events1 / p.cohortSize1
    }
    const arr = r0 - r1

    let k = 1
    while (k * arr < 1 - 1e-9) {
      k++
    }

    if (p.level === 4 && p.unitCost) {
      return k * p.unitCost
    }
    return k
  },

  render(p: RiskNntParams, skin: string): Block[] {
    let r0 = p.baselinePercent
    let r1 = p.treatedPercent
    if (p.level === 2 && p.cohortSize0 && p.events0 && p.cohortSize1 && p.events1) {
      r0 = (p.events0 / p.cohortSize0) * 100
      r1 = (p.events1 / p.cohortSize1) * 100
    }

    if (skin === 'safety') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A commercial delivery fleet studies automated collision avoidance sensors. Vehicles without sensors experience a ${r0.toFixed(1)}% annual collision rate. Equipping vehicles with sensors lowers this rate to ${r1.toFixed(1)}%.`,
          },
          {
            t: 'p',
            text: 'What is the Number Needed to Treat (NNT)—the number of vehicles that must be equipped to prevent one collision (rounded up to the nearest whole vehicle)?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `A logistics audit monitored two vehicle cohorts: among ${p.cohortSize0?.toLocaleString()} unequipped control vehicles, ${p.events0} collisions occurred; among ${p.cohortSize1?.toLocaleString()} sensor-equipped vehicles, ${p.events1} collisions occurred.`,
          },
          {
            t: 'p',
            text: 'What is the Number Needed to Treat (NNT) to prevent one collision (rounded up to the nearest whole number)?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A transportation safety commission measures crash rates: baseline unassisted driving records an annual accident rate of ${r0.toFixed(1)}%, while collision mitigation braking reduces it to ${r1.toFixed(1)}%.`,
          },
          {
            t: 'p',
            text: 'Calculate the Number Needed to Treat (NNT, rounded up to the nearest whole vehicle).',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A fleet operator considers installing automated collision radar on delivery vans. The sensor costs $${p.unitCost?.toLocaleString()} per vehicle. The collision rate drops from ${r0.toFixed(1)}% to ${r1.toFixed(1)}%.`,
          },
          {
            t: 'p',
            text: 'What is the total expenditure (in dollars) required across the fleet to prevent exactly one collision (NNT × sensor cost)?',
          },
        ]
      }
    } else if (skin === 'energy') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `An industrial smelter monitors boiler thermal breakdown trips. Standard refractory lining allows an overheating trip rate of ${r0.toFixed(1)}% per production cycle. Upgrading to advanced ceramic lining reduces this failure rate to ${r1.toFixed(1)}%.`,
          },
          {
            t: 'p',
            text: 'What is the Number Needed to Treat (NNT)—the number of boilers that must be retrofitted to prevent one overheating trip (rounded up)?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `A manufacturing plant records boiler performance across two facilities: in Plant A, ${p.events0} of ${p.cohortSize0?.toLocaleString()} standard boilers suffered unplanned shutdowns; in Plant B, ${p.events1} of ${p.cohortSize1?.toLocaleString()} retrofitted boilers suffered shutdowns.`,
          },
          {
            t: 'p',
            text: 'Calculate the Number Needed to Treat (NNT) to prevent one unplanned boiler shutdown (rounded up).',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A power plant study assesses thermal maintenance. Standard turbines have an annual seal failure rate of ${r0.toFixed(1)}%, which drops to ${r1.toFixed(1)}% under proactive synthetic insulation.`,
          },
          {
            t: 'p',
            text: 'What is the Number Needed to Treat (NNT, rounded up)?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `Retrofitting a boiler with advanced composite insulation costs $${p.unitCost?.toLocaleString()} per unit. The retrofit reduces annual overheating outage risk from ${r0.toFixed(1)}% to ${r1.toFixed(1)}%.`,
          },
          {
            t: 'p',
            text: 'What is the total retrofit expenditure (in dollars) required to prevent one overheating outage (NNT × unit cost)?',
          },
        ]
      }
    } else {
      // Default: retention
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A software subscription platform studies customer churn. Accounts receiving standard self-service onboarding churn at ${r0.toFixed(1)}%. Providing proactive dedicated specialist onboarding reduces churn to ${r1.toFixed(1)}%.`,
          },
          {
            t: 'p',
            text: 'What is the Number Needed to Treat (NNT)—how many customer accounts must receive proactive onboarding to prevent one churned account (rounded up)?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `A customer success analysis tracked two cohorts: among ${p.cohortSize0?.toLocaleString()} self-service users, ${p.events0} churned; among ${p.cohortSize1?.toLocaleString()} guided users, ${p.events1} churned.`,
          },
          {
            t: 'p',
            text: 'What is the Number Needed to Treat (NNT) to prevent one customer churn (rounded up)?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `An enterprise SaaS platform records annual client contract cancellations at ${r0.toFixed(1)}% for standard accounts, compared to ${r1.toFixed(1)}% for accounts assigned a technical account manager.`,
          },
          {
            t: 'p',
            text: 'Calculate the Number Needed to Treat (NNT, rounded up).',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A dedicated onboarding program costs $${p.unitCost?.toLocaleString()} in staff time per customer account. The intervention reduces annual churn risk from ${r0.toFixed(1)}% down to ${r1.toFixed(1)}%.`,
          },
          {
            t: 'p',
            text: 'What is the total onboarding investment (in dollars) required to save one customer account from churning (NNT × unit cost)?',
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
      id: 'inverting-relative-reduction',
      value: (p) => {
        // Inverting relative risk reduction instead of ARR: 1 / RRR
        let r0 = p.baselinePercent / 100
        let r1 = p.treatedPercent / 100
        if (p.level === 2 && p.cohortSize0 && p.events0 && p.cohortSize1 && p.events1) {
          r0 = p.events0 / p.cohortSize0
          r1 = p.events1 / p.cohortSize1
        }
        const rrr = (r0 - r1) / r0
        return Math.ceil(1 / rrr)
      },
      feedback: () =>
        'You inverted the relative risk reduction (1 / RRR) rather than the absolute risk reduction. NNT is defined strictly as 1 / ARR.',
    },
    {
      id: 'reporting-arr-directly',
      value: (p) => {
        // Forgetting to take the reciprocal: reporting integer percentage points
        let r0 = p.baselinePercent
        let r1 = p.treatedPercent
        if (p.level === 2 && p.cohortSize0 && p.events0 && p.cohortSize1 && p.events1) {
          r0 = (p.events0 / p.cohortSize0) * 100
          r1 = (p.events1 / p.cohortSize1) * 100
        }
        return Math.round(r0 - r1)
      },
      feedback: () =>
        'You reported the absolute risk reduction percentage directly instead of taking its reciprocal (1 / ARR) to determine the count of subjects needed.',
    },
  ],

  steps,

  solution(p: RiskNntParams): Block[] {
    let r0 = p.baselinePercent / 100
    let r1 = p.treatedPercent / 100
    if (p.level === 2 && p.cohortSize0 && p.events0 && p.cohortSize1 && p.events1) {
      r0 = p.events0 / p.cohortSize0
      r1 = p.events1 / p.cohortSize1
    }
    const arr = r0 - r1
    const rawNnt = 1 / arr
    const nnt = Math.ceil(rawNnt)

    const items = [
      `Baseline Risk (R₀) = ${(r0 * 100).toFixed(2)}%`,
      `Treated Risk (R₁) = ${(r1 * 100).toFixed(2)}%`,
      `Absolute Risk Reduction (ARR) = R₀ − R₁ = ${(arr * 100).toFixed(2)}% (or ${arr.toFixed(4)})`,
      `1 / ARR = 1 / ${arr.toFixed(4)} = ${rawNnt.toFixed(2)}`,
      `NNT (rounded up to nearest whole person/unit) = ${nnt}`,
    ]
    if (p.level === 4 && p.unitCost) {
      items.push(`Total Cost = NNT × Unit Cost = ${nnt} × $${p.unitCost} = $${(nnt * p.unitCost).toLocaleString()}`)
    }

    return [
      {
        t: 'p',
        text: 'The Number Needed to Treat (NNT) measures the clinical or operational effort required to prevent a single adverse event:',
      },
      {
        t: 'list',
        items,
      },
    ]
  },
}
