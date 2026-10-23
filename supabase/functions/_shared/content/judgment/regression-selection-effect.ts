import type { Answer, AnswerSpec, Block, Rng, Step, Template } from '../types.ts'

export type RegressionSelectionParams = {
  level: number
  popMean: number // e.g. 500 pts
  initialScore: number // e.g. 650 pts
  reliability: number // e.g. 0.60
  varTrue?: number // Level 2: True variance
  varError?: number // Level 2: Error variance
  observedRetest?: number // Level 3: Score after intervention
}

export type RegressionSkin = 'flight' | 'sales' | 'sports'

const steps: Step<RegressionSelectionParams>[] = [
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the initial deviation of the candidate’s first score from the population mean (Score 1 − Mean)?',
      },
    ],
    answer: (p) => p.initialScore - p.popMean,
    tolerance: { abs: 0.1 },
    explain: (p) => [
      {
        t: 'p',
        text: `Deviation = ${p.initialScore} − ${p.popMean} = ${p.initialScore - p.popMean} pts.`,
      },
    ],
  },
  {
    prompt: (p) => [
      {
        t: 'p',
        text: p.level === 2 && p.varTrue && p.varError
          ? 'What is the test-retest reliability coefficient r (true variance / total variance)?'
          : 'What is the regressed deviation from the mean expected on the second evaluation?',
      },
    ],
    answer: (p) => {
      let r = p.reliability
      if (p.level === 2 && p.varTrue && p.varError) {
        r = p.varTrue / (p.varTrue + p.varError)
        return r
      }
      return r * (p.initialScore - p.popMean)
    },
    tolerance: { abs: 0.05 },
    explain: (p) => {
      let r = p.reliability
      if (p.level === 2 && p.varTrue && p.varError) {
        r = p.varTrue / (p.varTrue + p.varError)
        return [
          {
            t: 'p',
            text: `Reliability r = ${p.varTrue} / (${p.varTrue} + ${p.varError}) = ${r.toFixed(2)}.`,
          },
        ]
      }
      const regressedDev = r * (p.initialScore - p.popMean)
      return [
        {
          t: 'p',
          text: `Regressed deviation = ${r.toFixed(2)} × (${p.initialScore - p.popMean}) = ${regressedDev.toFixed(2)} pts.`,
        },
      ]
    },
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the expected second performance score (or regression effect, in points)?',
      },
    ],
    answer: (p) => {
      let r = p.reliability
      if (p.level === 2 && p.varTrue && p.varError) {
        r = p.varTrue / (p.varTrue + p.varError)
      }
      const expectedRetest = p.popMean + r * (p.initialScore - p.popMean)
      if (p.level === 3) {
        // Natural regression contribution = expectedRetest - initialScore = (1 - r)*(popMean - initialScore)
        return expectedRetest - p.initialScore
      }
      return expectedRetest
    },
    tolerance: { abs: 0.2 },
    explain: (p) => {
      let r = p.reliability
      if (p.level === 2 && p.varTrue && p.varError) {
        r = p.varTrue / (p.varTrue + p.varError)
      }
      const expectedRetest = p.popMean + r * (p.initialScore - p.popMean)
      let ans = expectedRetest
      if (p.level === 3) {
        ans = expectedRetest - p.initialScore
      }
      return [
        {
          t: 'p',
          text: `Final expected value = ${ans.toFixed(2)} pts.`,
        },
      ]
    },
  },
]

export const regressionSelectionEffectTemplate: Template<RegressionSelectionParams> = {
  id: 'judgment.regression.selection-effect',
  version: 1,
  track: 'judgment',
  concept: 'judgment.regression',
  family: 'regression-selection',
  status: 'draft',
  review: {
    author: 'Eleanor Team',
    reviewer: null,
    reviewedAt: null,
    notes: 'Regression to the mean following extreme selection in noisy performance evaluations',
  },
  levels: [
    { level: 1, initialRating: 1400 },
    { level: 2, initialRating: 1600 },
    { level: 3, initialRating: 1800 },
  ],
  skins: ['flight', 'sales', 'sports'],
  dailyLevels: [1, 2, 3],

  sample(rng: Rng, level: number): RegressionSelectionParams {
    const popMean = rng.pick([450, 500, 550, 600])
    const reliabilities = [0.4, 0.5, 0.6, 0.7, 0.75]
    const reliability = rng.pick(reliabilities)

    if (level === 1) {
      // Outlier initial score: e.g. +100 to +250 pts above mean
      const dev = rng.pick([80, 100, 120, 150, 180, 200])
      const initialScore = popMean + dev
      return { level, popMean, initialScore, reliability }
    } else if (level === 2) {
      // Decompose reliability into varTrue and varError
      const varTrue = rng.pick([3600, 4900, 6400])
      const varError = rng.pick([1600, 2500, 3600])
      const r = varTrue / (varTrue + varError)
      const dev = rng.pick([80, 120, 160, 200])
      return {
        level,
        popMean,
        initialScore: popMean + dev,
        reliability: r,
        varTrue,
        varError,
      }
    } else {
      // Level 3: Underperforming cohort receiving intervention
      // e.g. initial score 100 pts below mean
      const dev = rng.pick([-120, -100, -80, -60])
      const initialScore = popMean + dev
      const expectedRetest = popMean + reliability * dev
      const observedRetest = expectedRetest + rng.pick([10, 15, 20, 25])
      return {
        level,
        popMean,
        initialScore,
        reliability,
        observedRetest,
      }
    }
  },

  solve(p: RegressionSelectionParams): Answer {
    let r = p.reliability
    if (p.level === 2 && p.varTrue && p.varError) {
      r = p.varTrue / (p.varTrue + p.varError)
    }
    const expectedRetest = p.popMean + r * (p.initialScore - p.popMean)
    if (p.level === 3) {
      return expectedRetest - p.initialScore
    }
    return expectedRetest
  },

  verify(p: RegressionSelectionParams): Answer {
    // Independent derivation using convex combination: E[X2] = r * X1 + (1 - r) * popMean
    let r = p.reliability
    if (p.level === 2 && p.varTrue && p.varError) {
      r = p.varTrue / (p.varTrue + p.varError)
    }
    const expectedRetest = r * p.initialScore + (1 - r) * p.popMean
    if (p.level === 3) {
      return (1 - r) * (p.popMean - p.initialScore)
    }
    return expectedRetest
  },

  render(p: RegressionSelectionParams, skin: string): Block[] {
    let r = p.reliability
    if (p.level === 2 && p.varTrue && p.varError) {
      r = p.varTrue / (p.varTrue + p.varError)
    }

    if (skin === 'flight') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `In a flight training simulator, landing precision scores across all cadet pilots follow a distribution with a mean of ${p.popMean} pts. The test-retest reliability coefficient of the flight simulator scoring algorithm is r = ${r.toFixed(2)}.`,
          },
          {
            t: 'p',
            text: `Cadet Miller achieves an exceptional score of ${p.initialScore} pts on their first landing trial.`,
          },
          {
            t: 'p',
            text: 'Accounting for regression to the mean, what is Cadet Miller’s expected score (in points) on their second landing trial?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `A flight school landing evaluation model separates performance into true piloting skill variance (σ_T² = ${p.varTrue}) and random environmental measurement noise variance (σ_e² = ${p.varError}). The population baseline mean is ${p.popMean} pts.`,
          },
          {
            t: 'p',
            text: `A cadet scores an outstanding ${p.initialScore} pts on their initial flight trial.`,
          },
          {
            t: 'p',
            text: 'What is the cadet’s expected score (in points) on an immediate retest?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `Cadet pilots with struggling initial performance (scoring ${p.initialScore} pts on Trial 1, below the fleet average of ${p.popMean} pts) were placed in an intensive remedial landing seminar. Simulator test-retest reliability is r = ${r.toFixed(2)}. On Trial 2, the group improved to ${p.observedRetest} pts.`,
          },
          {
            t: 'p',
            text: 'How much of the group’s score improvement (in points) is attributable purely to natural regression to the mean rather than the seminar?',
          },
        ]
      }
    } else if (skin === 'sales') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `Quarterly sales performance across regional commercial representatives averages ${p.popMean} pts. Because quarterly sales involve significant deal-timing variance, quarterly quota reliability is r = ${r.toFixed(2)}.`,
          },
          {
            t: 'p',
            text: `A top-performing representative closes a record quarter of ${p.initialScore} pts.`,
          },
          {
            t: 'p',
            text: 'What is the statistically expected performance score (in points) for this representative in the subsequent quarter?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `Sales productivity tracking determines that underlying rep closing ability has variance σ_T² = ${p.varTrue}, while market volatility introduces random error variance σ_e² = ${p.varError}. The department average score is ${p.popMean} pts.`,
          },
          {
            t: 'p',
            text: `A representative achieves ${p.initialScore} pts in Q1.`,
          },
          {
            t: 'p',
            text: 'What is the representative’s expected score (in points) in Q2?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `Representatives who scored in the bottom tier in Q1 (${p.initialScore} pts, compared to the company average of ${p.popMean} pts) were given mandatory sales coaching. Quota test-retest correlation is r = ${r.toFixed(2)}. In Q2, the coached representatives averaged ${p.observedRetest} pts.`,
          },
          {
            t: 'p',
            text: 'How many points of their score gain from Q1 are accounted for solely by regression to the mean?',
          },
        ]
      }
    } else {
      // Default: sports
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `In athletic decathlon sprint trials, benchmark trial scores average ${p.popMean} pts across national competitors. Test-retest score reliability across independent trial sessions is r = ${r.toFixed(2)}.`,
          },
          {
            t: 'p',
            text: `An athlete achieves a standout score of ${p.initialScore} pts on their first sprint session.`,
          },
          {
            t: 'p',
            text: 'What is the expected score (in points) for this athlete on their second sprint session?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `Biomechanical athletic modeling decomposes sprint trial variance into true physiological capacity variance (σ_T² = ${p.varTrue}) and random session condition variance (σ_e² = ${p.varError}). The squad average is ${p.popMean} pts.`,
          },
          {
            t: 'p',
            text: `A sprinter records a trial score of ${p.initialScore} pts.`,
          },
          {
            t: 'p',
            text: 'What is the sprinter’s expected score (in points) on their next trial session?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `Athletes performing poorly on Trial 1 (${p.initialScore} pts, below the squad mean of ${p.popMean} pts) were placed on a revised recovery nutrition regimen. Session reliability is r = ${r.toFixed(2)}. On Trial 2, their score rose to ${p.observedRetest} pts.`,
          },
          {
            t: 'p',
            text: 'How many points of the observed score increase are due solely to regression to the mean?',
          },
        ]
      }
    }
  },

  answer(): AnswerSpec {
    return {
      type: 'number',
      unit: 'pts',
      tolerance: { abs: 0.2, rel: 0.01 },
    }
  },

  misconceptions: [
    {
      id: 'naive-extrapolation',
      value: (p) => {
        // Assuming second score equals first score (r = 1.0)
        if (p.level === 3) return 0
        return p.initialScore
      },
      feedback: () =>
        'You assumed the second score would remain identical to the first. Because performance measurements contain random error, extreme scores regress toward the population mean.',
    },
    {
      id: 'complete-reversion-to-mean',
      value: (p) => {
        // Assuming second score completely reverts to mean (r = 0.0)
        if (p.level === 3) return p.popMean - p.initialScore
        return p.popMean
      },
      feedback: () =>
        'You assumed the second score regresses completely to the population average. The expected score regresses partially, weighted by the reliability coefficient r.',
    },
  ],

  steps,

  solution(p: RegressionSelectionParams): Block[] {
    let r = p.reliability
    if (p.level === 2 && p.varTrue && p.varError) {
      r = p.varTrue / (p.varTrue + p.varError)
    }
    const dev = p.initialScore - p.popMean
    const expectedRetest = p.popMean + r * dev

    return [
      {
        t: 'p',
        text: 'Regression to the mean shrinkage formula:',
      },
      {
        t: 'list',
        items: [
          `Population Mean (μ) = ${p.popMean} pts`,
          `Initial Score (X₁) = ${p.initialScore} pts (Deviation: ${dev > 0 ? '+' : ''}${dev} pts)`,
          `Reliability (r) = ${r.toFixed(2)}`,
          `Expected Follow-up Score = μ + r(X₁ − μ) = ${p.popMean} + ${r.toFixed(2)} × (${dev}) = ${expectedRetest.toFixed(2)} pts`,
        ],
      },
    ]
  },
}
