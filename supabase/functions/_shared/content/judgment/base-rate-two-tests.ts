import type { Answer, AnswerSpec, Block, Rng, Step, Template } from '../types.ts'

export type BaseRateTwoTestsParams = {
  level: number
  baseRatePercent: number // e.g. 2%
  sens1Percent: number // e.g. 90%
  fpr1Percent: number // e.g. 10%
  sens2Percent: number // e.g. 85%
  fpr2Percent: number // e.g. 5%
  result2IsPositive: boolean // true for (+, +), false for (+, -)
}

export type BaseRateTwoTestsSkin = 'lab' | 'aerospace' | 'biometrics'

const steps: Step<BaseRateTwoTestsParams>[] = [
  {
    prompt: () => [
      {
        t: 'p',
        text: 'In a hypothetical population of 100,000 items, how many true cases produce this specific pair of test results?',
      },
    ],
    answer: (p) => {
      const p1 = p.sens1Percent / 100
      const p2 = p.result2IsPositive
        ? p.sens2Percent / 100
        : 1 - p.sens2Percent / 100
      return Math.round(100000 * (p.baseRatePercent / 100) * p1 * p2)
    },
    tolerance: { abs: 2 },
    explain: (p) => {
      const p1 = p.sens1Percent / 100
      const p2 = p.result2IsPositive
        ? p.sens2Percent / 100
        : 1 - p.sens2Percent / 100
      const count = Math.round(100000 * (p.baseRatePercent / 100) * p1 * p2)
      return [
        {
          t: 'p',
          text: `Base cases = ${100000 * (p.baseRatePercent / 100)}. Multiplying independent test outcome rates: ${count} cases match.`,
        },
      ]
    },
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'In that same hypothetical population of 100,000 items, how many negative (non-case) items produce this specific pair of test results?',
      },
    ],
    answer: (p) => {
      const fp1 = p.fpr1Percent / 100
      const fp2 = p.result2IsPositive
        ? p.fpr2Percent / 100
        : 1 - p.fpr2Percent / 100
      return Math.round(100000 * (1 - p.baseRatePercent / 100) * fp1 * fp2)
    },
    tolerance: { abs: 2 },
    explain: (p) => {
      const fp1 = p.fpr1Percent / 100
      const fp2 = p.result2IsPositive
        ? p.fpr2Percent / 100
        : 1 - p.fpr2Percent / 100
      const count = Math.round(
        100000 * (1 - p.baseRatePercent / 100) * fp1 * fp2,
      )
      return [
        {
          t: 'p',
          text: `Non-cases = ${100000 * (1 - p.baseRatePercent / 100)}. Multiplying false alarm rates: ${count} false matches.`,
        },
      ]
    },
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the updated posterior probability (as a percentage) that the item is a true positive condition?',
      },
    ],
    answer: (p) => {
      const p1 = p.sens1Percent / 100
      const p2 = p.result2IsPositive
        ? p.sens2Percent / 100
        : 1 - p.sens2Percent / 100
      const fp1 = p.fpr1Percent / 100
      const fp2 = p.result2IsPositive
        ? p.fpr2Percent / 100
        : 1 - p.fpr2Percent / 100

      const trueWeighted = (p.baseRatePercent / 100) * p1 * p2
      const falseWeighted = (1 - p.baseRatePercent / 100) * fp1 * fp2
      return (trueWeighted / (trueWeighted + falseWeighted)) * 100
    },
    tolerance: { abs: 0.1 },
    explain: (p) => {
      const p1 = p.sens1Percent / 100
      const p2 = p.result2IsPositive
        ? p.sens2Percent / 100
        : 1 - p.sens2Percent / 100
      const fp1 = p.fpr1Percent / 100
      const fp2 = p.result2IsPositive
        ? p.fpr2Percent / 100
        : 1 - p.fpr2Percent / 100

      const trueWeighted = (p.baseRatePercent / 100) * p1 * p2
      const falseWeighted = (1 - p.baseRatePercent / 100) * fp1 * fp2
      const pct = (trueWeighted / (trueWeighted + falseWeighted)) * 100
      return [
        {
          t: 'p',
          text: `Posterior probability = (${trueWeighted.toFixed(5)} / ${(
            trueWeighted + falseWeighted
          ).toFixed(5)}) × 100 = ${pct.toFixed(2)}%.`,
        },
      ]
    },
  },
]

export const baseRateTwoTestsTemplate: Template<BaseRateTwoTestsParams> = {
  id: 'judgment.base-rate.two-tests',
  version: 1,
  track: 'judgment',
  concept: 'judgment.base-rates',
  family: 'base-rate-two-tests',
  status: 'draft',
  review: {
    author: 'Eleanor Team',
    reviewer: null,
    reviewedAt: null,
    notes: 'Sequential Bayesian updating across two conditionally independent diagnostic tests',
  },
  levels: [
    { level: 1, initialRating: 1100 },
    { level: 2, initialRating: 1300 },
    { level: 3, initialRating: 1500 },
    { level: 4, initialRating: 1700 },
  ],
  skins: ['lab', 'aerospace', 'biometrics'],
  dailyLevels: [2, 3, 4],

  sample(rng: Rng, level: number): BaseRateTwoTestsParams {
    const baseRates = [1, 2, 3, 4, 5, 6, 8, 10]
    const baseRatePercent = rng.pick(baseRates)

    if (level === 1) {
      // Identical tests, both positive (+, +)
      const sens = rng.pick([80, 85, 90, 92, 95])
      const fpr = rng.pick([4, 5, 6, 8, 10])
      return {
        level,
        baseRatePercent,
        sens1Percent: sens,
        fpr1Percent: fpr,
        sens2Percent: sens,
        fpr2Percent: fpr,
        result2IsPositive: true,
      }
    } else if (level === 2) {
      // Conflicting tests (+, -)
      const sens = rng.pick([80, 85, 90, 92, 95])
      const fpr = rng.pick([4, 5, 6, 8, 10])
      return {
        level,
        baseRatePercent,
        sens1Percent: sens,
        fpr1Percent: fpr,
        sens2Percent: sens,
        fpr2Percent: fpr,
        result2IsPositive: false,
      }
    } else if (level === 3) {
      // Asymmetric tests, both positive (+, +)
      const sens1Percent = rng.pick([75, 80, 85, 90])
      const fpr1Percent = rng.pick([6, 8, 10, 12])
      const sens2Percent = rng.pick([88, 90, 95, 98])
      const fpr2Percent = rng.pick([2, 3, 4, 5])
      return {
        level,
        baseRatePercent,
        sens1Percent,
        fpr1Percent,
        sens2Percent,
        fpr2Percent,
        result2IsPositive: true,
      }
    } else {
      // Level 4: Asymmetric tests, conflicting (+, -)
      const sens1Percent = rng.pick([80, 85, 90, 95])
      const fpr1Percent = rng.pick([8, 10, 15, 20])
      const sens2Percent = rng.pick([75, 80, 85, 90])
      const fpr2Percent = rng.pick([2, 3, 5, 8])
      return {
        level,
        baseRatePercent,
        sens1Percent,
        fpr1Percent,
        sens2Percent,
        fpr2Percent,
        result2IsPositive: false,
      }
    }
  },

  solve(p: BaseRateTwoTestsParams): Answer {
    const p1 = p.sens1Percent / 100
    const p2 = p.result2IsPositive
      ? p.sens2Percent / 100
      : 1 - p.sens2Percent / 100
    const fp1 = p.fpr1Percent / 100
    const fp2 = p.result2IsPositive
      ? p.fpr2Percent / 100
      : 1 - p.fpr2Percent / 100

    const trueWeighted = (p.baseRatePercent / 100) * p1 * p2
    const falseWeighted = (1 - p.baseRatePercent / 100) * fp1 * fp2
    return (trueWeighted / (trueWeighted + falseWeighted)) * 100
  },

  verify(p: BaseRateTwoTestsParams): Answer {
    // Independent derivation using odds formulation:
    // Posterior Odds = Prior Odds * LR1 * LR2
    const priorOdds = (p.baseRatePercent / 100) / (1 - p.baseRatePercent / 100)

    const lr1 = (p.sens1Percent / 100) / (p.fpr1Percent / 100)
    const lr2 = p.result2IsPositive
      ? (p.sens2Percent / 100) / (p.fpr2Percent / 100)
      : (1 - p.sens2Percent / 100) / (1 - p.fpr2Percent / 100)

    const postOdds = priorOdds * lr1 * lr2
    const postProb = postOdds / (1 + postOdds)
    return postProb * 100
  },

  render(p: BaseRateTwoTestsParams, skin: string): Block[] {
    const test2OutcomeText = p.result2IsPositive ? 'POSITIVE' : 'NEGATIVE'

    if (skin === 'lab') {
      return [
        {
          t: 'p',
          text: `In a biochemical repository, a specific chemical contaminant has a baseline prevalence of ${p.baseRatePercent}%. Two diagnostic assays, conditionally independent given contamination status, are used sequentially to check suspicious sample batches:`,
        },
        {
          t: 'list',
          items: [
            `Assay 1 (Spectrometry): Sensitivity ${p.sens1Percent}%, False Positive Rate ${p.fpr1Percent}%.`,
            `Assay 2 (Chromatography): Sensitivity ${p.sens2Percent}%, False Positive Rate ${p.fpr2Percent}%.`,
          ],
        },
        {
          t: 'p',
          text: `A sample batch is tested. Assay 1 returns a POSITIVE result, and Assay 2 returns a ${test2OutcomeText} result.`,
        },
        {
          t: 'p',
          text: 'What is the updated conditional probability (as a percentage) that the sample batch is actually contaminated?',
        },
      ]
    } else if (skin === 'aerospace') {
      return [
        {
          t: 'p',
          text: `An avionics diagnostic unit monitors for micro-fractures in turbine rotor blades, an anomaly with a background incidence of ${p.baseRatePercent}% per fleet inspection cycle. Two telemetry sensors, conditionally independent given fracture status, scan each blade:`,
        },
        {
          t: 'list',
          items: [
            `Sensor Alpha (Eddy Current): Sensitivity ${p.sens1Percent}%, False Alarm Rate ${p.fpr1Percent}%.`,
            `Sensor Beta (Ultrasonic Pulse): Sensitivity ${p.sens2Percent}%, False Alarm Rate ${p.fpr2Percent}%.`,
          ],
        },
        {
          t: 'p',
          text: `During an automated pre-flight scan, Sensor Alpha reports a POSITIVE warning, and Sensor Beta reports a ${test2OutcomeText} warning.`,
        },
        {
          t: 'p',
          text: 'Assuming sensor errors are conditionally independent, what is the probability (as a percentage) that the blade truly has a micro-fracture?',
        },
      ]
    } else {
      // Default: biometrics
      return [
        {
          t: 'p',
          text: `A vault access checkpoint verifies credentials against a restricted watch-list that comprises ${p.baseRatePercent}% of authorized facility entrants. Two biometric verification engines, conditionally independent given watch-list status, scan every entrant:`,
        },
        {
          t: 'list',
          items: [
            `Engine 1 (Facial Feature Scan): True Match Rate ${p.sens1Percent}%, False Match Rate ${p.fpr1Percent}%.`,
            `Engine 2 (Fingerprint Minutiae): True Match Rate ${p.sens2Percent}%, False Match Rate ${p.fpr2Percent}%.`,
          ],
        },
        {
          t: 'p',
          text: `An entrant is scanned. Engine 1 indicates a POSITIVE match, while Engine 2 indicates a ${test2OutcomeText} match.`,
        },
        {
          t: 'p',
          text: 'What is the posterior probability (as a percentage) that the entrant is indeed on the watch-list?',
        },
      ]
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
      id: 'base-rate-neglect',
      value: (p) => {
        // Ignoring base rate: using only test accuracy ratios
        const p1 = p.sens1Percent / 100
        const p2 = p.result2IsPositive
          ? p.sens2Percent / 100
          : 1 - p.sens2Percent / 100
        const fp1 = p.fpr1Percent / 100
        const fp2 = p.result2IsPositive
          ? p.fpr2Percent / 100
          : 1 - p.fpr2Percent / 100
        return ((p1 * p2) / (p1 * p2 + fp1 * fp2)) * 100
      },
      feedback: () =>
        'You neglected the prior base rate. Test accuracies must be weighted by the low background prevalence of the condition.',
    },
    {
      id: 'single-test-only',
      value: (p) => {
        // Only updating on test 1 and ignoring test 2
        const p1 = p.sens1Percent / 100
        const fp1 = p.fpr1Percent / 100
        const base = p.baseRatePercent / 100
        return ((base * p1) / (base * p1 + (1 - base) * fp1)) * 100
      },
      feedback: () =>
        'You calculated the probability based only on the first test, ignoring the outcome of the second diagnostic test.',
    },
  ],

  steps,

  solution(p: BaseRateTwoTestsParams): Block[] {
    const p1 = p.sens1Percent / 100
    const p2 = p.result2IsPositive
      ? p.sens2Percent / 100
      : 1 - p.sens2Percent / 100
    const fp1 = p.fpr1Percent / 100
    const fp2 = p.result2IsPositive
      ? p.fpr2Percent / 100
      : 1 - p.fpr2Percent / 100

    const trueWeighted = (p.baseRatePercent / 100) * p1 * p2
    const falseWeighted = (1 - p.baseRatePercent / 100) * fp1 * fp2
    const posterior = (trueWeighted / (trueWeighted + falseWeighted)) * 100

    return [
      {
        t: 'p',
        text: 'Apply Bayes theorem sequentially with two conditionally independent tests:',
      },
      {
        t: 'list',
        items: [
          `P(Evidence | Condition) = ${p.sens1Percent}% × ${(p2 * 100).toFixed(0)}% = ${(p1 * p2).toFixed(4)}`,
          `P(Evidence | No Condition) = ${p.fpr1Percent}% × ${(fp2 * 100).toFixed(0)}% = ${(fp1 * fp2).toFixed(4)}`,
          `Prior Weight = ${p.baseRatePercent}% true cases vs ${100 - p.baseRatePercent}% non-cases`,
          `Numerator: ${p.baseRatePercent}% × ${(p1 * p2).toFixed(4)} = ${trueWeighted.toFixed(5)}`,
          `Denominator: ${trueWeighted.toFixed(5)} + ${(1 - p.baseRatePercent / 100).toFixed(4)} × ${(fp1 * fp2).toFixed(4)} = ${(trueWeighted + falseWeighted).toFixed(5)}`,
        ],
      },
      {
        t: 'p',
        text: `Posterior probability = (${trueWeighted.toFixed(5)} / ${(
          trueWeighted + falseWeighted
        ).toFixed(5)}) × 100 ≈ ${posterior.toFixed(2)}%.`,
      },
    ]
  },
}
