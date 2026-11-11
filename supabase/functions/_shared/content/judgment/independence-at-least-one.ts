import type { Answer, AnswerSpec, Block, Rng, Step, Template } from '../types.ts'

export type IndependenceAtLeastOneParams = {
  level: number
  pSinglePercent: number // e.g. 15%
  numTrials: number // e.g. 4
  probsArray?: number[] // Level 2: e.g. [10, 15, 20, 25]
}

export type AtLeastOneSkin = 'qa' | 'mining' | 'security'

const steps: Step<IndependenceAtLeastOneParams>[] = [
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the probability (as a percentage) that the first trial experiences NO occurrence (the event fails to occur)?',
      },
    ],
    answer: (p) => 100 - p.pSinglePercent,
    tolerance: { abs: 0.05 },
    explain: (p) => [
      {
        t: 'p',
        text: `Complement rule: 100% − ${p.pSinglePercent}% = ${100 - p.pSinglePercent}%.`,
      },
    ],
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the joint probability (as a percentage) that ZERO occurrences happen across all independent trials?',
      },
    ],
    answer: (p) => {
      if (p.level === 2 && p.probsArray) {
        const pZero = p.probsArray.reduce((acc, prob) => acc * (1 - prob / 100), 1)
        return pZero * 100
      }
      const q = 1 - p.pSinglePercent / 100
      return Math.pow(q, p.numTrials) * 100
    },
    tolerance: { abs: 0.1 },
    explain: (p) => {
      let pZero = Math.pow(1 - p.pSinglePercent / 100, p.numTrials)
      if (p.level === 2 && p.probsArray) {
        pZero = p.probsArray.reduce((acc, prob) => acc * (1 - prob / 100), 1)
      }
      return [
        {
          t: 'p',
          text: `Under independence, multiply the individual non-occurrence probabilities: P(zero occurrences) = ${(pZero * 100).toFixed(2)}%.`,
        },
      ]
    },
  },
  {
    prompt: (p) => [
      {
        t: 'p',
        text: p.level === 3
          ? 'Subtract the probabilities of zero and exactly one occurrence from 100% to find the probability of at least two occurrences.'
          : 'Subtract the non-occurrence probability from 100% to calculate the probability of at least one occurrence.',
      },
    ],
    answer: (p) => {
      if (p.level === 2 && p.probsArray) {
        const pZero = p.probsArray.reduce((acc, prob) => acc * (1 - prob / 100), 1)
        return (1 - pZero) * 100
      }
      const prob = p.pSinglePercent / 100
      const n = p.numTrials
      if (p.level === 3) {
        // At least TWO occurrences: 1 - P(0) - P(1)
        const p0 = Math.pow(1 - prob, n)
        const p1 = n * prob * Math.pow(1 - prob, n - 1)
        return (1 - p0 - p1) * 100
      }
      return (1 - Math.pow(1 - prob, n)) * 100
    },
    tolerance: { abs: 0.1 },
    explain: (p) => {
      let ans = (1 - Math.pow(1 - p.pSinglePercent / 100, p.numTrials)) * 100
      if (p.level === 2 && p.probsArray) {
        const pZero = p.probsArray.reduce((acc, prob) => acc * (1 - prob / 100), 1)
        ans = (1 - pZero) * 100
      } else if (p.level === 3) {
        const prob = p.pSinglePercent / 100
        const n = p.numTrials
        const p0 = Math.pow(1 - prob, n)
        const p1 = n * prob * Math.pow(1 - prob, n - 1)
        ans = (1 - p0 - p1) * 100
      }
      return [
        {
          t: 'p',
          text: `The complementary probability equals ${ans.toFixed(2)}%.`,
        },
      ]
    },
  },
]

export const independenceAtLeastOneTemplate: Template<IndependenceAtLeastOneParams> = {
  id: 'judgment.independence.at-least-one',
  version: 1,
  track: 'judgment',
  concept: 'judgment.independence',
  family: 'independence-at-least-one',
  status: 'draft',
  review: {
    author: 'Eleanor Team',
    reviewer: null,
    reviewedAt: null,
    notes: 'Complementary probability of at least one occurrence across repeated independent trials',
  },
  levels: [
    { level: 1, initialRating: 1100 },
    { level: 2, initialRating: 1300 },
    { level: 3, initialRating: 1500 },
    { level: 4, initialRating: 1700 },
  ],
  skins: ['qa', 'mining', 'security'],
  dailyLevels: [2, 3, 4],

  sample(rng: Rng, level: number): IndependenceAtLeastOneParams {
    if (level === 1) {
      const pSinglePercent = rng.int(5, 35)
      const numTrials = rng.int(3, 10)
      return { level, pSinglePercent, numTrials }
    } else if (level === 2) {
      const p1 = rng.int(10, 20)
      const p2 = rng.int(12, 25)
      const p3 = rng.int(20, 35)
      const p4 = rng.int(10, 40)
      return {
        level,
        pSinglePercent: p1,
        numTrials: 4,
        probsArray: [p1, p2, p3, p4],
      }
    } else if (level === 3) {
      const pSinglePercent = rng.int(15, 50)
      const numTrials = rng.int(4, 10)
      return { level, pSinglePercent, numTrials }
    } else {
      const pSinglePercent = rng.int(1, 10)
      const numTrials = rng.int(10, 40)
      return { level, pSinglePercent, numTrials }
    }
  },

  solve(p: IndependenceAtLeastOneParams): Answer {
    if (p.level === 2 && p.probsArray) {
      const pZero = p.probsArray.reduce((acc, prob) => acc * (1 - prob / 100), 1)
      return (1 - pZero) * 100
    }
    const prob = p.pSinglePercent / 100
    const n = p.numTrials
    if (p.level === 3) {
      const p0 = Math.pow(1 - prob, n)
      const p1 = n * prob * Math.pow(1 - prob, n - 1)
      return (1 - p0 - p1) * 100
    }
    return (1 - Math.pow(1 - prob, n)) * 100
  },

  verify(p: IndependenceAtLeastOneParams): Answer {
    // Independent derivation using binomial expansion sum
    if (p.level === 2 && p.probsArray) {
      // Enumerate the non-empty success subsets instead of using the complement.
      let sum = 0
      for (let mask = 1; mask < 2 ** p.probsArray.length; mask++) {
        let probability = 1
        for (let i = 0; i < p.probsArray.length; i++) {
          const chance = p.probsArray[i] / 100
          probability *= mask & (1 << i) ? chance : 1 - chance
        }
        sum += probability
      }
      return sum * 100
    }

    const prob = p.pSinglePercent / 100
    const q = 1 - prob
    const n = p.numTrials

    if (p.level === 3) {
      // Sum for k = 2 to n of nCk * p^k * q^(n-k)
      let sum = 0
      for (let k = 2; k <= n; k++) {
        let comb = 1
        for (let i = 0; i < k; i++) {
          comb = (comb * (n - i)) / (i + 1)
        }
        sum += comb * Math.pow(prob, k) * Math.pow(q, n - k)
      }
      return sum * 100
    }

    // Sum for k = 1 to n of nCk * p^k * q^(n-k)
    let sum = 0
    for (let k = 1; k <= n; k++) {
      let comb = 1
      for (let i = 0; i < k; i++) {
        comb = (comb * (n - i)) / (i + 1)
      }
      sum += comb * Math.pow(prob, k) * Math.pow(q, n - k)
    }
    return sum * 100
  },

  render(p: IndependenceAtLeastOneParams, skin: string): Block[] {
    if (skin === 'qa') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `An automated regression test suite is run against an asynchronous microservice. A rare race condition has a ${p.pSinglePercent}% probability of surfacing on any single execution. The test runner executes ${p.numTrials} independent test runs.`,
          },
          {
            t: 'p',
            text: 'What is the probability (as a percentage) that the race condition surfaces on AT LEAST ONE of the test runs?',
          },
        ]
      } else if (p.level === 2) {
        const probsStr = p.probsArray?.map((pr, idx) => `Test Run ${idx + 1}: ${pr}%`).join(', ')
        return [
          {
            t: 'p',
            text: `A testing harness executes 4 consecutive independent stress tests with varying workloads. The defect trigger probabilities for each run are: ${probsStr}.`,
          },
          {
            t: 'p',
            text: 'What is the probability (as a percentage) that the defect is caught on at least one run?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A concurrency stress tester executes ${p.numTrials} independent test iterations. On each run, a memory barrier violation occurs with ${p.pSinglePercent}% probability.`,
          },
          {
            t: 'p',
            text: 'What is the probability (as a percentage) that the violation is observed AT LEAST TWICE across the test iterations?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A critical release pipeline executes ${p.numTrials} independent validation suites. Each run has a ${p.pSinglePercent}% chance of triggering an intermittent timeout flake.`,
          },
          {
            t: 'p',
            text: 'What is the probability (as a percentage) that at least one timeout occurs across the entire validation run?',
          },
        ]
      }
    } else if (skin === 'mining') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A mineral exploration company drills ${p.numTrials} independent exploratory core boreholes in a prospective lithium geological formation. Each independent drill hole has a ${p.pSinglePercent}% chance of intersecting commercial-grade pegmatite mineralization.`,
          },
          {
            t: 'p',
            text: 'What is the probability (as a percentage) of finding commercial-grade mineralization in AT LEAST ONE borehole?',
          },
        ]
      } else if (p.level === 2) {
        const probsStr = p.probsArray?.map((pr, idx) => `Site ${idx + 1}: ${pr}%`).join(', ')
        return [
          {
            t: 'p',
            text: `Exploratory drilling samples 4 independent geological anomaly sites with the following strike probabilities: ${probsStr}.`,
          },
          {
            t: 'p',
            text: 'What is the probability (as a percentage) that at least one drill site yields a strike?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `An exploratory survey drills ${p.numTrials} independent boreholes. Each borehole has a ${p.pSinglePercent}% chance of striking commercial grade ore. To justify building a processing plant, geologists need at least two successful strikes.`,
          },
          {
            t: 'p',
            text: 'What is the probability (as a percentage) of achieving AT LEAST TWO successful strikes?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A wide-area geothermal prospect drills ${p.numTrials} scout boreholes across a fault zone. Each borehole has an independent ${p.pSinglePercent}% probability of tapping a high-temperature geothermal reservoir.`,
          },
          {
            t: 'p',
            text: 'What is the probability (as a percentage) that at least one borehole taps the geothermal reservoir?',
          },
        ]
      }
    } else {
      // Default: security
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A corporate network deploys ${p.numTrials} decoy honeypot servers along its perimeter. Any automated external port-scanning probe has an independent ${p.pSinglePercent}% probability of probing each honeypot.`,
          },
          {
            t: 'p',
            text: 'What is the probability (as a percentage) that an incoming scan triggers AT LEAST ONE honeypot alert?',
          },
        ]
      } else if (p.level === 2) {
        const probsStr = p.probsArray?.map((pr, idx) => `Honeypot ${idx + 1}: ${pr}%`).join(', ')
        return [
          {
            t: 'p',
            text: `A security perimeter monitors 4 independent honeypot sensors with individual detection probabilities: ${probsStr}.`,
          },
          {
            t: 'p',
            text: 'What is the probability (as a percentage) that an adversary triggers at least one honeypot sensor?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A network security system monitors ${p.numTrials} perimeter sensors. Each sensor independently triggers an alert on an adversary probe with ${p.pSinglePercent}% probability. Security protocol requires at least two sensor alerts to confirm an active intrusion.`,
          },
          {
            t: 'p',
            text: 'What is the probability (as a percentage) that AT LEAST TWO sensors trigger an alert?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A cloud security perimeter deploys ${p.numTrials} decentralized intrusion detection monitors. Each monitor has an independent ${p.pSinglePercent}% chance of detecting a stealthy advanced persistent threat probe.`,
          },
          {
            t: 'p',
            text: 'What is the probability (as a percentage) that the stealthy probe is detected by at least one monitor?',
          },
        ]
      }
    }
  },

  answer(): AnswerSpec {
    return {
      type: 'number',
      unit: '%',
      tolerance: { abs: 0.1, rel: 0.01 },
    }
  },

  misconceptions: [
    {
      id: 'additive-fallacy',
      value: (p) => {
        // Linearly multiplying n * p
        if (p.level === 2 && p.probsArray) {
          return p.probsArray.reduce((acc, v) => acc + v, 0)
        }
        return Math.min(100, p.numTrials * p.pSinglePercent)
      },
      feedback: () =>
        'You committed the additive fallacy by multiplying n × p. Probabilities cannot be summed across independent trials, as this ignores overlap and can exceed 100%.',
    },
    {
      id: 'forgetting-complement',
      value: (p) => {
        // Computing P(none) and forgetting to subtract from 100%
        if (p.level === 2 && p.probsArray) {
          const pZero = p.probsArray.reduce((acc, prob) => acc * (1 - prob / 100), 1)
          return pZero * 100
        }
        return Math.pow(1 - p.pSinglePercent / 100, p.numTrials) * 100
      },
      feedback: () =>
        'You computed the probability that NO event occurs (P(none)). To find the probability of at least one occurrence, subtract this value from 100%.',
    },
  ],

  steps,

  solution(p: IndependenceAtLeastOneParams): Block[] {
    const prob = p.pSinglePercent / 100
    const q = 1 - prob
    const n = p.numTrials
    const pZero = p.level === 2 && p.probsArray
      ? p.probsArray.reduce((product, chance) => product * (1 - chance / 100), 1)
      : Math.pow(q, n)
    const pOne = p.level === 3 ? n * prob * Math.pow(q, n - 1) : 0
    const target = p.level === 3 ? 'at least two' : 'at least one'
    const items = [
      p.level === 2 && p.probsArray
        ? `P(zero successes) = ${p.probsArray.map((chance) => `(1 − ${chance / 100})`).join(' × ')} = ${(pZero * 100).toFixed(2)}%`
        : `P(zero successes in ${n} trials) = (1 − ${prob})^${n} = ${(pZero * 100).toFixed(2)}%`,
    ]
    if (p.level === 3) items.push(`P(exactly one success) = ${n} × ${prob} × ${q}^${n - 1} = ${(pOne * 100).toFixed(2)}%`)
    items.push(`P(${target} success${p.level === 3 ? 'es' : ''}) = 100% − ${(pZero * 100).toFixed(2)}%${p.level === 3 ? ` − ${(pOne * 100).toFixed(2)}%` : ''} = ${((1 - pZero - pOne) * 100).toFixed(2)}%`)

    return [
      {
        t: 'p',
        text: `Find the probability of ${target} successes by subtracting the excluded outcomes from 100%:`,
      },
      {
        t: 'list',
        items,
      },
    ]
  },
}
