import type { Answer, Block, Rng, Step, Template } from '../types.ts'

export type ScreeningSkin = 'factory' | 'medical' | 'spam'

export type BaseRateScreeningParams = {
  level: number
  population: number
  baseRatePercent: number
  sensitivityPercent: number
  falsePositiveRatePercent: number
  distractingPercent?: number
  stage2SensitivityPercent?: number
  stage2FalsePositiveRatePercent?: number
}

function normal(rng: Rng): number {
  let u = 0
  let v = 0
  while (u === 0) u = rng.next()
  while (v === 0) v = rng.next()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function binom(n: number, p: number, rng: Rng): number {
  const mean = n * p
  const std = Math.sqrt(n * p * (1 - p))
  const val = Math.round(mean + std * normal(rng))
  return Math.max(0, Math.min(n, val))
}

const steps: Step<BaseRateScreeningParams>[] = [
  {
    prompt: (p) => [
      {
        t: 'p',
        text: `In a reference population of ${p.population.toLocaleString()}, how many true positive cases are correctly flagged?`,
      },
    ],
    answer: (p) =>
      Math.round(
        p.population * (p.baseRatePercent / 100) * (p.sensitivityPercent / 100),
      ),
    tolerance: { abs: 0.5 },
    explain: (p) => [
      {
        t: 'p',
        text: `With a base rate of ${p.baseRatePercent}%, there are ${Math.round(
          p.population * (p.baseRatePercent / 100),
        )} actual cases. At ${p.sensitivityPercent}% sensitivity, ${Math.round(
          p.population *
            (p.baseRatePercent / 100) *
            (p.sensitivityPercent / 100),
        )} are flagged.`,
      },
    ],
  },
  {
    prompt: (p) => [
      {
        t: 'p',
        text: `In that same population of ${p.population.toLocaleString()}, how many false positive cases are incorrectly flagged?`,
      },
    ],
    answer: (p) =>
      Math.round(
        p.population *
          (1 - p.baseRatePercent / 100) *
          (p.falsePositiveRatePercent / 100),
      ),
    tolerance: { abs: 0.5 },
    explain: (p) => [
      {
        t: 'p',
        text: `There are ${Math.round(
          p.population * (1 - p.baseRatePercent / 100),
        )} non-cases. At a ${p.falsePositiveRatePercent}% false positive rate, ${Math.round(
          p.population *
            (1 - p.baseRatePercent / 100) *
            (p.falsePositiveRatePercent / 100),
        )} false alarms occur.`,
      },
    ],
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the total number of flagged cases (true positives + false positives)?',
      },
    ],
    answer: (p) => {
      const tp = Math.round(
        p.population * (p.baseRatePercent / 100) * (p.sensitivityPercent / 100),
      )
      const fp = Math.round(
        p.population *
          (1 - p.baseRatePercent / 100) *
          (p.falsePositiveRatePercent / 100),
      )
      return tp + fp
    },
    tolerance: { abs: 0.5 },
    explain: (p) => {
      const tp = Math.round(
        p.population * (p.baseRatePercent / 100) * (p.sensitivityPercent / 100),
      )
      const fp = Math.round(
        p.population *
          (1 - p.baseRatePercent / 100) *
          (p.falsePositiveRatePercent / 100),
      )
      return [
        {
          t: 'p',
          text: `Total flagged = true positives (${tp}) + false positives (${fp}) = ${
            tp + fp
          }.`,
        },
      ]
    },
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What percentage of flagged cases are actually true cases?',
      },
    ],
    answer: (p) => {
      const tp =
        p.population * (p.baseRatePercent / 100) * (p.sensitivityPercent / 100)
      const fp =
        p.population *
        (1 - p.baseRatePercent / 100) *
        (p.falsePositiveRatePercent / 100)
      if (p.level === 4) {
        const p1 = tp / (tp + fp)
        const sens2 = (p.stage2SensitivityPercent ?? 90) / 100
        const fpr2 = (p.stage2FalsePositiveRatePercent ?? 10) / 100
        const num2 = p1 * sens2
        const den2 = p1 * sens2 + (1 - p1) * fpr2
        return (num2 / den2) * 100
      }
      return (tp / (tp + fp)) * 100
    },
    tolerance: { abs: 0.1 },
    explain: () => [
      {
        t: 'p',
        text: 'Divide true positives by total flagged cases and multiply by 100 to obtain the final percentage.',
      },
    ],
  },
]

export const baseRateScreeningTemplate: Template<BaseRateScreeningParams> = {
  id: 'judgment.base-rate.screening',
  version: 1,
  track: 'judgment',
  concept: 'judgment.base-rates',
  family: 'base-rate-screening',
  status: 'draft',
  review: {
    author: 'Eleanor Team',
    reviewer: null,
    reviewedAt: null,
    notes: 'Reference template for base rate screening problems',
  },
  levels: [
    { level: 1, initialRating: 900 },
    { level: 2, initialRating: 1100 },
    { level: 3, initialRating: 1300 },
    { level: 4, initialRating: 1500 },
  ],
  skins: ['factory', 'medical', 'spam'],

  sample(rng: Rng, level: number): BaseRateScreeningParams {
    const baseRates = [1, 2, 4, 5]
    const sensitivities = [80, 85, 90, 95]
    const fprs = [5, 8, 10, 12]
    const populations = [10000, 20000, 50000]

    const baseRatePercent = rng.pick(baseRates)
    const sensitivityPercent = rng.pick(sensitivities)
    const falsePositiveRatePercent = rng.pick(fprs)
    const population = rng.pick(populations)

    const params: BaseRateScreeningParams = {
      level,
      population,
      baseRatePercent,
      sensitivityPercent,
      falsePositiveRatePercent,
    }

    if (level === 3) {
      params.distractingPercent = rng.pick([65, 72, 80, 85])
    }

    if (level === 4) {
      params.stage2SensitivityPercent = 90
      params.stage2FalsePositiveRatePercent = 10
    }

    return params
  },

  solve(p: BaseRateScreeningParams): Answer {
    const tp = (p.baseRatePercent / 100) * (p.sensitivityPercent / 100)
    const fp =
      (1 - p.baseRatePercent / 100) * (p.falsePositiveRatePercent / 100)
    const p1 = tp / (tp + fp)

    if (p.level === 4) {
      const sens2 = (p.stage2SensitivityPercent ?? 90) / 100
      const fpr2 = (p.stage2FalsePositiveRatePercent ?? 10) / 100
      const p2 = (p1 * sens2) / (p1 * sens2 + (1 - p1) * fpr2)
      return p2 * 100
    }

    return p1 * 100
  },

  verify(p: BaseRateScreeningParams, rng: Rng): Answer {
    const N = 10000000
    const b = p.baseRatePercent / 100
    const s = p.sensitivityPercent / 100
    const f = p.falsePositiveRatePercent / 100

    const nDef = binom(N, b, rng)
    const tp = binom(nDef, s, rng)
    const fp = binom(N - nDef, f, rng)

    if (p.level === 4) {
      const sens2 = (p.stage2SensitivityPercent ?? 90) / 100
      const fpr2 = (p.stage2FalsePositiveRatePercent ?? 10) / 100
      const tp2 = binom(tp, sens2, rng)
      const fp2 = binom(fp, fpr2, rng)
      const total2 = tp2 + fp2
      return total2 > 0 ? (tp2 / total2) * 100 : 0
    }

    const total = tp + fp
    return total > 0 ? (tp / total) * 100 : 0
  },

  render(p: BaseRateScreeningParams, skin: string): Block[] {
    const blocks: Block[] = []
    const tpCount = Math.round(
      p.population * (p.baseRatePercent / 100) * (p.sensitivityPercent / 100),
    )
    const fpCount = Math.round(
      p.population *
        (1 - p.baseRatePercent / 100) *
        (p.falsePositiveRatePercent / 100),
    )
    const defCount = Math.round(p.population * (p.baseRatePercent / 100))
    const nonDefCount = p.population - defCount

    if (skin === 'medical') {
      if (p.level === 1) {
        blocks.push({
          t: 'p',
          text: `In a screening study of ${p.population.toLocaleString()} patients, ${defCount.toLocaleString()} have a rare condition. A diagnostic test correctly identifies ${tpCount.toLocaleString()} of the ${defCount.toLocaleString()} patients with the condition. It also incorrectly flags ${fpCount.toLocaleString()} of the ${nonDefCount.toLocaleString()} healthy patients.`,
        })
      } else {
        blocks.push({
          t: 'p',
          text: `A medical condition has a prevalence of ${p.baseRatePercent}% in a tested population. A diagnostic test has a sensitivity of ${p.sensitivityPercent}% and a false positive rate of ${p.falsePositiveRatePercent}%.`,
        })
      }
      if (p.level === 3 && p.distractingPercent) {
        blocks.push({
          t: 'note',
          text: `Hospital records show that ${p.distractingPercent}% of testing staff recently completed diagnostic protocol refresher training.`,
        })
      }
      if (p.level === 4) {
        blocks.push({
          t: 'p',
          text: `Patients who test positive undergo an immediate second independent confirmation test with ${p.stage2SensitivityPercent}% sensitivity and ${p.stage2FalsePositiveRatePercent}% false positive rate.`,
        })
        blocks.push({
          t: 'p',
          text: 'If a patient tests positive on BOTH tests, what is the probability (as a percentage) that they actually have the condition?',
        })
      } else {
        blocks.push({
          t: 'p',
          text: 'If a randomly selected patient tests positive, what is the probability (as a percentage) that they actually have the condition?',
        })
      }
    } else if (skin === 'spam') {
      if (p.level === 1) {
        blocks.push({
          t: 'p',
          text: `Across ${p.population.toLocaleString()} incoming emails, ${defCount.toLocaleString()} are spam. A security filter correctly marks ${tpCount.toLocaleString()} of the ${defCount.toLocaleString()} spam emails. It also mistakenly marks ${fpCount.toLocaleString()} of the ${nonDefCount.toLocaleString()} legitimate emails as spam.`,
        })
      } else {
        blocks.push({
          t: 'p',
          text: `In an email stream, ${p.baseRatePercent}% of messages are spam. A filter has a detection rate of ${p.sensitivityPercent}% and a false positive rate of ${p.falsePositiveRatePercent}% on legitimate messages.`,
        })
      }
      if (p.level === 3 && p.distractingPercent) {
        blocks.push({
          t: 'note',
          text: `The mail server operates at ${p.distractingPercent}% bandwidth utilization during business hours.`,
        })
      }
      if (p.level === 4) {
        blocks.push({
          t: 'p',
          text: `Emails flagged by the first filter pass through a secondary heuristic analyzer with ${p.stage2SensitivityPercent}% sensitivity and ${p.stage2FalsePositiveRatePercent}% false positive rate.`,
        })
        blocks.push({
          t: 'p',
          text: 'If an email is flagged by BOTH filters, what is the probability (as a percentage) that it is truly spam?',
        })
      } else {
        blocks.push({
          t: 'p',
          text: 'If an email is flagged as spam by the filter, what is the probability (as a percentage) that it is actually spam?',
        })
      }
    } else {
      // Default: factory
      if (p.level === 1) {
        blocks.push({
          t: 'p',
          text: `In a production run of ${p.population.toLocaleString()} components, ${defCount.toLocaleString()} are defective. An automated inspection scanner correctly detects ${tpCount.toLocaleString()} of the ${defCount.toLocaleString()} defective components. However, it also mistakenly flags ${fpCount.toLocaleString()} of the ${nonDefCount.toLocaleString()} functional components.`,
        })
      } else {
        blocks.push({
          t: 'p',
          text: `In a factory assembly line, ${p.baseRatePercent}% of manufactured components are defective. A quality scanner has a sensitivity of ${p.sensitivityPercent}% and a false positive rate of ${p.falsePositiveRatePercent}%.`,
        })
      }
      if (p.level === 3 && p.distractingPercent) {
        blocks.push({
          t: 'note',
          text: `Factory inspection reports show that ${p.distractingPercent}% of calibration audits met optimal standards last month.`,
        })
      }
      if (p.level === 4) {
        blocks.push({
          t: 'p',
          text: `Components flagged by the scanner undergo a second independent sensor check with ${p.stage2SensitivityPercent}% sensitivity and ${p.stage2FalsePositiveRatePercent}% false positive rate.`,
        })
        blocks.push({
          t: 'p',
          text: 'If a component is flagged by BOTH inspection checks, what is the probability (as a percentage) that it is actually defective?',
        })
      } else {
        blocks.push({
          t: 'p',
          text: 'If a component is flagged as defective by the scanner, what is the probability (as a percentage) that it is actually defective?',
        })
      }
    }

    return blocks
  },

  answer: () => ({
    type: 'number',
    unit: '%',
    tolerance: { abs: 0.1 },
  }),

  misconceptions: [
    {
      id: 'base-rate-neglect',
      value: (p) => p.sensitivityPercent,
      feedback: (p) =>
        `You answered ${p.sensitivityPercent}%, which is the test sensitivity P(positive | condition). To find P(condition | positive), you must take the base rate and false alarms into account.`,
    },
    {
      id: 'ignored-false-positives',
      value: () => 100,
      feedback: () =>
        'Answering 100% assumes that the test never makes a false alarm. In reality, healthy/functional items can trigger false positives.',
    },
  ],

  steps,

  solution(p: BaseRateScreeningParams): Block[] {
    const tpRate = (p.baseRatePercent / 100) * (p.sensitivityPercent / 100)
    const fpRate =
      (1 - p.baseRatePercent / 100) * (p.falsePositiveRatePercent / 100)
    const totalPosRate = tpRate + fpRate
    const finalPct = (tpRate / totalPosRate) * 100

    return [
      {
        t: 'p',
        text: `Consider a sample population of 10,000 items:`,
      },
      {
        t: 'list',
        items: [
          `True cases = 10,000 × ${p.baseRatePercent}% = ${Math.round(
            10000 * (p.baseRatePercent / 100),
          )}`,
          `True positives flagged = ${Math.round(
            10000 * (p.baseRatePercent / 100),
          )} × ${p.sensitivityPercent}% = ${Math.round(10000 * tpRate)}`,
          `Non-cases = 10,000 × ${100 - p.baseRatePercent}% = ${Math.round(
            10000 * (1 - p.baseRatePercent / 100),
          )}`,
          `False alarms flagged = ${Math.round(
            10000 * (1 - p.baseRatePercent / 100),
          )} × ${p.falsePositiveRatePercent}% = ${Math.round(10000 * fpRate)}`,
          `Total flagged = ${Math.round(10000 * tpRate)} + ${Math.round(
            10000 * fpRate,
          )} = ${Math.round(10000 * totalPosRate)}`,
        ],
      },
      {
        t: 'p',
        text: `The probability that a flagged item is a true case is ${Math.round(
          10000 * tpRate,
        )} / ${Math.round(10000 * totalPosRate)} ≈ ${finalPct.toFixed(2)}%.`,
      },
    ]
  },
}
