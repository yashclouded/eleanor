import type { Answer, AnswerSpec, Block, Rng, Step, Template } from '../types.ts'

export type ConditionalTreeParams = {
  level: number
  pRoot1: number // Percentage branch 1 at root (e.g. 60%)
  pRoot2: number // Percentage branch 2 at root (e.g. 40%)
  pBranch1: number // P(Outcome | Root 1) in % (e.g. 80%)
  pBranch2: number // P(Outcome | Root 2) in % (e.g. 20%)
  pRoot3?: number // Level 4: 3-branch root
  pBranch3?: number
}

export type ConditionalTreeSkin = 'pipeline' | 'manufacturing' | 'exploration'

const steps: Step<ConditionalTreeParams>[] = [
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Calculate the total joint path probability (percentage of whole) for the primary branch reaching the outcome.',
      },
    ],
    answer: (p) => (p.pRoot1 * p.pBranch1) / 100,
    tolerance: { abs: 0.1 },
    explain: (p) => [
      {
        t: 'p',
        text: `Multiply branch 1 probability (${p.pRoot1}%) by conditional success rate (${p.pBranch1}%): (${p.pRoot1} × ${p.pBranch1}) / 100 = ${((p.pRoot1 * p.pBranch1) / 100).toFixed(2)}%.`,
      },
    ],
  },
  {
    prompt: (p) => [
      {
        t: 'p',
        text: p.level === 1
          ? 'What is the requested path probability as a percentage?'
          : 'What is the overall total probability of the outcome occurring across all branches (law of total probability)?',
      },
    ],
    answer: (p) => {
      if (p.level === 1) {
        return (p.pRoot1 * p.pBranch1) / 100
      }
      let tot = (p.pRoot1 * p.pBranch1) / 100 + (p.pRoot2 * p.pBranch2) / 100
      if (p.level === 4 && p.pRoot3 && p.pBranch3) {
        tot += (p.pRoot3 * p.pBranch3) / 100
      }
      return tot
    },
    tolerance: { abs: 0.1 },
    explain: (p) => {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `The single path probability is ${((p.pRoot1 * p.pBranch1) / 100).toFixed(2)}%.`,
          },
        ]
      }
      let tot = (p.pRoot1 * p.pBranch1) / 100 + (p.pRoot2 * p.pBranch2) / 100
      if (p.level === 4 && p.pRoot3 && p.pBranch3) {
        tot += (p.pRoot3 * p.pBranch3) / 100
      }
      return [
        {
          t: 'p',
          text: `Sum the joint probabilities of each path leading to the outcome: total = ${tot.toFixed(2)}%.`,
        },
      ]
    },
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the final answer as a percentage?',
      },
    ],
    answer: (p) => {
      const path1 = (p.pRoot1 * p.pBranch1) / 100
      if (p.level === 1) {
        return path1
      }
      let totalOutcome = path1 + (p.pRoot2 * p.pBranch2) / 100
      if (p.level === 4 && p.pRoot3 && p.pBranch3) {
        totalOutcome += (p.pRoot3 * p.pBranch3) / 100
      }
      if (p.level === 2) {
        return totalOutcome
      }
      // Level 3 & 4: Bayes inverse P(Root 1 | Outcome)
      return (path1 / totalOutcome) * 100
    },
    tolerance: { abs: 0.1 },
    explain: (p) => {
      const path1 = (p.pRoot1 * p.pBranch1) / 100
      let totalOutcome = path1 + (p.pRoot2 * p.pBranch2) / 100
      if (p.level === 4 && p.pRoot3 && p.pBranch3) {
        totalOutcome += (p.pRoot3 * p.pBranch3) / 100
      }
      const ans =
        p.level === 1
          ? path1
          : p.level === 2
            ? totalOutcome
            : (path1 / totalOutcome) * 100
      return [
        {
          t: 'p',
          text: `Final calculated probability is ${ans.toFixed(2)}%.`,
        },
      ]
    },
  },
]

export const conditionalTreeTemplate: Template<ConditionalTreeParams> = {
  id: 'judgment.conditional.tree',
  version: 1,
  track: 'judgment',
  concept: 'judgment.conditional',
  family: 'conditional-tree',
  status: 'draft',
  review: {
    author: 'Eleanor Team',
    reviewer: null,
    reviewedAt: null,
    notes: 'Probability tree path analysis, law of total probability, and Bayesian inversion',
  },
  levels: [
    { level: 1, initialRating: 900 },
    { level: 2, initialRating: 1100 },
    { level: 3, initialRating: 1300 },
    { level: 4, initialRating: 1500 },
  ],
  skins: ['pipeline', 'manufacturing', 'exploration'],
  dailyLevels: [3, 4],

  sample(rng: Rng, level: number): ConditionalTreeParams {
    if (level === 4) {
      // 3 branches at root summing to 100%
      const pRoot1 = rng.int(20, 50)
      const pRoot2 = rng.int(20, 30)
      const pRoot3 = 100 - pRoot1 - pRoot2
      const pBranch1 = rng.int(60, 90)
      const pBranch2 = rng.int(20, 50)
      const pBranch3 = rng.int(10, 35)
      return { level, pRoot1, pRoot2, pRoot3, pBranch1, pBranch2, pBranch3 }
    } else {
      const pRoot1 = rng.int(40, 80)
      const pRoot2 = 100 - pRoot1
      const pBranch1 = rng.int(60, 90)
      const pBranch2 = rng.int(10, 40)
      return { level, pRoot1, pRoot2, pBranch1, pBranch2 }
    }
  },

  solve(p: ConditionalTreeParams): Answer {
    const path1 = (p.pRoot1 * p.pBranch1) / 100
    if (p.level === 1) {
      return path1
    }
    let totalOutcome = path1 + (p.pRoot2 * p.pBranch2) / 100
    if (p.level === 4 && p.pRoot3 && p.pBranch3) {
      totalOutcome += (p.pRoot3 * p.pBranch3) / 100
    }
    if (p.level === 2) {
      return totalOutcome
    }
    // Level 3 & 4: Bayes inverse P(Root 1 | Outcome)
    return (path1 / totalOutcome) * 100
  },

  verify(p: ConditionalTreeParams): Answer {
    // Independent derivation using integer frequency cohort of 100,000 cases
    const N = 100000
    const countRoot1 = (N * p.pRoot1) / 100
    const countOutcome1 = (countRoot1 * p.pBranch1) / 100

    const countRoot2 = (N * p.pRoot2) / 100
    const countOutcome2 = (countRoot2 * p.pBranch2) / 100

    let countOutcome3 = 0
    if (p.level === 4 && p.pRoot3 && p.pBranch3) {
      const countRoot3 = (N * p.pRoot3) / 100
      countOutcome3 = (countRoot3 * p.pBranch3) / 100
    }

    const totalOutcomeCount = countOutcome1 + countOutcome2 + countOutcome3

    if (p.level === 1) {
      return (countOutcome1 / N) * 100
    }
    if (p.level === 2) {
      return (totalOutcomeCount / N) * 100
    }
    return (countOutcome1 / totalOutcomeCount) * 100
  },

  render(p: ConditionalTreeParams, skin: string): Block[] {
    if (skin === 'pipeline') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `In a continuous integration workflow, ${p.pRoot1}% of build jobs are Backend services, while ${p.pRoot2}% are Frontend applications. Historical logs indicate that ${p.pBranch1}% of Backend jobs pass all static analysis checks on their first attempt.`,
          },
          {
            t: 'p',
            text: 'What is the joint probability (as a percentage) that a randomly chosen build is a Backend service AND passes all static analysis checks on its first attempt?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `In a deployment pipeline, builds originate from two sources: ${p.pRoot1}% come from the Main repository branch, and ${p.pRoot2}% come from Feature branches. Automated test suites pass on ${p.pBranch1}% of Main branch builds, but on only ${p.pBranch2}% of Feature branch builds.`,
          },
          {
            t: 'p',
            text: 'Across all incoming builds, what is the overall total percentage of builds that pass automated tests (law of total probability)?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A software repository processes builds from two sources: ${p.pRoot1}% from the Main branch and ${p.pRoot2}% from Feature branches. Build pass rates are ${p.pBranch1}% for Main and ${p.pBranch2}% for Feature branches.`,
          },
          {
            t: 'p',
            text: 'If a notification indicates that a build has PASSED automated tests, what is the conditional probability (as a percentage) that it originated from the Main branch?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A cloud build system distributes tasks across three execution tiers: Tier 1 (${p.pRoot1}%), Tier 2 (${p.pRoot2}%), and Tier 3 (${p.pRoot3}%). The first-pass success rates on these tiers are ${p.pBranch1}%, ${p.pBranch2}%, and ${p.pBranch3}% respectively.`,
          },
          {
            t: 'p',
            text: 'If a build run successfully finishes on its first pass, what is the probability (as a percentage) that it was executed on Tier 1?',
          },
        ]
      }
    } else if (skin === 'manufacturing') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A precision electronics factory produces ${p.pRoot1}% of its circuit boards on Assembly Line A, and ${p.pRoot2}% on Assembly Line B. Quality tests show that ${p.pBranch1}% of Line A boards achieve top-grade acoustic performance.`,
          },
          {
            t: 'p',
            text: 'What is the probability (as a percentage) that a randomly selected circuit board is produced on Line A AND achieves top-grade acoustic performance?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `An electronics plant fabricates components across two lines: Line A handles ${p.pRoot1}% of total volume with a defect rate of ${p.pBranch1}%, while Line B handles ${p.pRoot2}% of volume with a defect rate of ${p.pBranch2}%.`,
          },
          {
            t: 'p',
            text: 'What is the overall total defect rate (as a percentage) across all manufactured components?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `An industrial facility manufactures parts on Line A (${p.pRoot1}%) and Line B (${p.pRoot2}%). Parts pass high-stress thermal testing at a rate of ${p.pBranch1}% on Line A, compared to ${p.pBranch2}% on Line B.`,
          },
          {
            t: 'p',
            text: 'If an inspected part passes thermal testing, what is the probability (as a percentage) that it was manufactured on Line A?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A manufacturing plant produces components across three specialized workshops: Workshop Alpha (${p.pRoot1}%), Workshop Beta (${p.pRoot2}%), and Workshop Gamma (${p.pRoot3}%). Component tolerance pass rates are ${p.pBranch1}% for Alpha, ${p.pBranch2}% for Beta, and ${p.pBranch3}% for Gamma.`,
          },
          {
            t: 'p',
            text: 'Given that a randomly inspected component meets all tolerances, what is the probability (as a percentage) that it was fabricated in Workshop Alpha?',
          },
        ]
      }
    } else {
      // Default: exploration
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A geological mineral exploration survey estimates that ${p.pRoot1}% of prospect sectors are Volcanic formations, while ${p.pRoot2}% are Sedimentary basins. In Volcanic formations, ${p.pBranch1}% of exploratory core samples show high magnetic anomalies.`,
          },
          {
            t: 'p',
            text: 'What is the joint probability (as a percentage) that a randomly chosen site is a Volcanic formation AND yields a high magnetic anomaly?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `A geological basin is divided into High-Elevation terrain (${p.pRoot1}%) and Low-Elevation terrain (${p.pRoot2}%). Core samples hit commercial-grade ore at a rate of ${p.pBranch1}% in High-Elevation zones and ${p.pBranch2}% in Low-Elevation zones.`,
          },
          {
            t: 'p',
            text: 'Across the entire survey region, what is the overall probability (as a percentage) that a randomly drilled borehole strikes commercial-grade ore?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `Geological surveys categorize survey plots into Zone 1 (${p.pRoot1}%) and Zone 2 (${p.pRoot2}%). The likelihood of finding quartz vein mineralization is ${p.pBranch1}% in Zone 1, and ${p.pBranch2}% in Zone 2.`,
          },
          {
            t: 'p',
            text: 'If quartz vein mineralization is discovered at a drill site, what is the probability (as a percentage) that the drill site is located in Zone 1?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `An energy survey evaluates three geological strata: Strata A (${p.pRoot1}%), Strata B (${p.pRoot2}%), and Strata C (${p.pRoot3}%). Hydrocarbon indicator signatures appear in ${p.pBranch1}% of Strata A sites, ${p.pBranch2}% of Strata B sites, and ${p.pBranch3}% of Strata C sites.`,
          },
          {
            t: 'p',
            text: 'Given that a hydrocarbon indicator signature is detected at a drill location, what is the probability (as a percentage) that the strata is Strata A?',
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
      id: 'unnormalized-joint-probability',
      value: (p) => {
        // Omitting division by total probability: reporting path probability as posterior
        if (p.level <= 2) return p.pBranch1
        return (p.pRoot1 * p.pBranch1) / 100
      },
      feedback: () =>
        'You calculated the unnormalized joint path probability P(A and B) instead of dividing by the total evidence probability P(B) to get the posterior conditional probability.',
    },
    {
      id: 'unweighted-average',
      value: (p) => {
        // Equal weighting average of branch probabilities
        if (p.level === 4 && p.pBranch3) {
          return (p.pBranch1 + p.pBranch2 + p.pBranch3) / 3
        }
        return (p.pBranch1 + p.pBranch2) / 2
      },
      feedback: () =>
        'Do not take a simple average of the conditional branch rates. Each branch must be weighted by its prior root probability.',
    },
  ],

  steps,

  solution(p: ConditionalTreeParams): Block[] {
    const path1 = (p.pRoot1 * p.pBranch1) / 100
    const path2 = (p.pRoot2 * p.pBranch2) / 100
    let totalOutcome = path1 + path2
    if (p.level === 4 && p.pRoot3 && p.pBranch3) {
      totalOutcome += (p.pRoot3 * p.pBranch3) / 100
    }

    const items = [
      `Branch 1 Path: ${p.pRoot1}% × ${p.pBranch1}% = ${path1.toFixed(2)}%`,
      `Branch 2 Path: ${p.pRoot2}% × ${p.pBranch2}% = ${path2.toFixed(2)}%`,
    ]
    if (p.level === 4 && p.pRoot3 && p.pBranch3) {
      const path3 = (p.pRoot3 * p.pBranch3) / 100
      items.push(
        `Branch 3 Path: ${p.pRoot3}% × ${p.pBranch3}% = ${path3.toFixed(2)}%`,
      )
    }
    items.push(`Total Outcome Probability = ${totalOutcome.toFixed(2)}%`)

    if (p.level === 1) {
      return [
        {
          t: 'p',
          text: `The joint path probability is computed along Branch 1: (${p.pRoot1} / 100) × (${p.pBranch1} / 100) × 100 = ${path1.toFixed(2)}%.`,
        },
      ]
    }

    if (p.level === 2) {
      return [
        {
          t: 'p',
          text: 'Apply the Law of Total Probability by summing the mutually exclusive paths reaching the outcome:',
        },
        {
          t: 'list',
          items,
        },
      ]
    }

    const posterior = (path1 / totalOutcome) * 100
    return [
      {
        t: 'p',
        text: 'Trace the probability tree and invert conditionally using Bayes theorem:',
      },
      {
        t: 'list',
        items,
      },
      {
        t: 'p',
        text: `Posterior P(Branch 1 | Outcome) = (${path1.toFixed(2)} / ${totalOutcome.toFixed(2)}) × 100 ≈ ${posterior.toFixed(2)}%.`,
      },
    ]
  },
}
