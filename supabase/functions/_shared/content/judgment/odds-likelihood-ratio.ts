import type { Answer, AnswerSpec, Block, Rng, Step, Template } from '../types.ts'

export type OddsLikelihoodRatioParams = {
  level: number
  priorA: number // Prior odds a:b (e.g. 1 : 9)
  priorB: number
  lr1: number // Likelihood ratio (e.g. 18)
  lr2?: number // Level 2 & 3: Second likelihood ratio
}

export type OddsSkin = 'forensic' | 'astronomy' | 'epidemiology'

const steps: Step<OddsLikelihoodRatioParams>[] = [
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Convert the prior odds or prior probability into an unnormalized decimal prior odds value (a / b).',
      },
    ],
    answer: (p) => p.priorA / p.priorB,
    tolerance: { abs: 0.001 },
    explain: (p) => [
      {
        t: 'p',
        text: `Prior odds = ${p.priorA} / ${p.priorB} = ${(p.priorA / p.priorB).toFixed(4)}.`,
      },
    ],
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Multiply the prior odds by the Bayes factor likelihood ratio(s) to compute the updated posterior odds.',
      },
    ],
    answer: (p) => {
      let postOdds = (p.priorA / p.priorB) * p.lr1
      if (p.lr2) postOdds *= p.lr2
      return postOdds
    },
    tolerance: { abs: 0.01 },
    explain: (p) => {
      let postOdds = (p.priorA / p.priorB) * p.lr1
      if (p.lr2) postOdds *= p.lr2
      return [
        {
          t: 'p',
          text: `Posterior odds = Prior odds × LR = ${(p.priorA / p.priorB).toFixed(4)} × ${p.lr1}${p.lr2 ? ` × ${p.lr2}` : ''} = ${postOdds.toFixed(4)}.`,
        },
      ]
    },
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Convert the posterior odds into a posterior probability (as a percentage: (odds / (1 + odds)) × 100).',
      },
    ],
    answer: (p) => {
      let postOdds = (p.priorA / p.priorB) * p.lr1
      if (p.lr2) postOdds *= p.lr2
      return (postOdds / (1 + postOdds)) * 100
    },
    tolerance: { abs: 0.1 },
    explain: (p) => {
      let postOdds = (p.priorA / p.priorB) * p.lr1
      if (p.lr2) postOdds *= p.lr2
      const prob = (postOdds / (1 + postOdds)) * 100
      return [
        {
          t: 'p',
          text: `Probability = (${postOdds.toFixed(4)} / (1 + ${postOdds.toFixed(4)})) × 100 = ${prob.toFixed(2)}%.`,
        },
      ]
    },
  },
]

export const oddsLikelihoodRatioTemplate: Template<OddsLikelihoodRatioParams> = {
  id: 'judgment.odds.likelihood-ratio',
  version: 1,
  track: 'judgment',
  concept: 'judgment.odds',
  family: 'odds-likelihood-ratio',
  status: 'draft',
  review: {
    author: 'Eleanor Team',
    reviewer: null,
    reviewedAt: null,
    notes: 'Bayesian belief updating using odds form and likelihood ratios (Bayes factors)',
  },
  levels: [
    { level: 1, initialRating: 1500 },
    { level: 2, initialRating: 1700 },
    { level: 3, initialRating: 1900 },
  ],
  skins: ['forensic', 'astronomy', 'epidemiology'],
  dailyLevels: [1, 2, 3],

  sample(rng: Rng, level: number): OddsLikelihoodRatioParams {
    if (level === 1) {
      return { level, priorA: 1, priorB: rng.int(3, 49), lr1: rng.int(4, 30) }
    } else if (level === 2) {
      return { level, priorA: 1, priorB: rng.int(4, 99), lr1: rng.int(4, 15), lr2: rng.int(3, 10) }
    } else {
      return { level, priorA: 1, priorB: rng.int(2, 19), lr1: rng.int(10, 30), lr2: rng.int(10, 40) / 100 }
    }
  },

  solve(p: OddsLikelihoodRatioParams): Answer {
    let postOdds = (p.priorA / p.priorB) * p.lr1
    if (p.lr2) postOdds *= p.lr2
    return (postOdds / (1 + postOdds)) * 100
  },

  verify(p: OddsLikelihoodRatioParams): Answer {
    // Independent derivation using direct probability Bayes rule
    const p0 = p.priorA / (p.priorA + p.priorB)
    const combinedLr = p.lr1 * (p.lr2 ?? 1)
    const postProb = (p0 * combinedLr) / (p0 * combinedLr + (1 - p0))
    return postProb * 100
  },

  render(p: OddsLikelihoodRatioParams, skin: string): Block[] {
    const p0Pct = ((p.priorA / (p.priorA + p.priorB)) * 100).toFixed(1)

    const assumption: Block[] = p.lr2 === undefined ? [] : [{ t: 'note', text: 'Assume the evidence items are conditionally independent given either hypothesis; each likelihood ratio compares that same hypothesis with its alternative.' }]

    if (skin === 'forensic') {
      if (p.level === 1) {
        return [
          ...assumption,
          {
            t: 'p',
            text: `In a criminal forensic evaluation, the prior odds that a suspect was present at the crime scene are estimated at ${p.priorA}:${p.priorB} (corresponding to a prior probability of approximately ${p0Pct}%). A forensic DNA electropherogram profile recovered from a latent trace produces a Likelihood Ratio (Bayes Factor) of ${p.lr1} in favor of presence.`,
          },
          {
            t: 'p',
            text: 'What is the updated posterior probability (as a percentage) that the suspect was present?',
          },
        ]
      } else if (p.level === 2) {
        return [
          ...assumption,
          {
            t: 'p',
            text: `An investigative inquiry begins with prior odds of ${p.priorA}:${p.priorB} regarding suspect involvement. Forensic analysts introduce two independent pieces of physical evidence:`,
          },
          {
            t: 'list',
            items: [
              `Toolmark striation match: Likelihood Ratio = ${p.lr1}`,
              `Fiber spectrophotometry match: Likelihood Ratio = ${p.lr2}`,
            ],
          },
          {
            t: 'p',
            text: 'What is the final posterior probability (as a percentage) after incorporating both pieces of evidence?',
          },
        ]
      } else {
        return [
          ...assumption,
          {
            t: 'p',
            text: `A forensic case has prior odds of ${p.priorA}:${p.priorB}. Two independent forensic tests produce conflicting results:`,
          },
          {
            t: 'list',
            items: [
              `Test 1 (Positive trace evidence): Likelihood Ratio = ${p.lr1}`,
              `Test 2 (Alibi cell-tower log): Likelihood Ratio = ${p.lr2}`,
            ],
          },
          {
            t: 'p',
            text: 'What is the net posterior probability (as a percentage) after combining both pieces of evidence?',
          },
        ]
      }
    } else if (skin === 'astronomy') {
      if (p.level === 1) {
        return [
          ...assumption,
          {
            t: 'p',
            text: `In an exoplanet transit survey, the prior odds that a target star possesses a transiting terrestrial planet are ${p.priorA}:${p.priorB}. Spectroscopic photometry observes a periodic dip with a Bayes factor (likelihood ratio) of ${p.lr1} favoring a true planetary transit over instrumental noise.`,
          },
          {
            t: 'p',
            text: 'What is the posterior probability (as a percentage) that the transit signal represents a genuine exoplanet?',
          },
        ]
      } else if (p.level === 2) {
        return [
          ...assumption,
          {
            t: 'p',
            text: `An astrophysical search for gravitational wave anomalies begins with prior candidate odds of ${p.priorA}:${p.priorB}. Two independent interferometers record correlated chirps:`,
          },
          {
            t: 'list',
            items: [
              `Detector Alpha chirp: Bayes Factor = ${p.lr1}`,
              `Detector Beta chirp: Bayes Factor = ${p.lr2}`,
            ],
          },
          {
            t: 'p',
            text: 'What is the posterior probability (as a percentage) that the detection is an authentic astrophysical event?',
          },
        ]
      } else {
        return [
          ...assumption,
          {
            t: 'p',
            text: `An astronomical radio signal candidate has prior odds of ${p.priorA}:${p.priorB}. Two observational tests yield conflicting Bayes factors:`,
          },
          {
            t: 'list',
            items: [
              `Narrowband dispersion signature: Bayes Factor = ${p.lr1}`,
              `Secondary polarization check: Bayes Factor = ${p.lr2}`,
            ],
          },
          {
            t: 'p',
            text: 'What is the updated posterior probability (as a percentage)?',
          },
        ]
      }
    } else {
      // Default: epidemiology
      if (p.level === 1) {
        return [
          ...assumption,
          {
            t: 'p',
            text: `In an outbreak surveillance area, the prior odds of infection with a novel pathogen are ${p.priorA}:${p.priorB}. A clinical biomarker test yields a positive result with a Diagnostic Likelihood Ratio (sensitivity / false positive rate) of ${p.lr1}.`,
          },
          {
            t: 'p',
            text: 'What is the posterior probability (as a percentage) that the patient is infected?',
          },
        ]
      } else if (p.level === 2) {
        return [
          ...assumption,
          {
            t: 'p',
            text: `Clinical evaluation starts with prior infection odds of ${p.priorA}:${p.priorB}. A patient undergoes two independent diagnostic evaluations:`,
          },
          {
            t: 'list',
            items: [
              `Rapid Antigen Assay: Likelihood Ratio = ${p.lr1}`,
              `High-Resolution CT imaging sign: Likelihood Ratio = ${p.lr2}`,
            ],
          },
          {
            t: 'p',
            text: 'What is the posterior probability of infection (as a percentage)?',
          },
        ]
      } else {
        return [
          ...assumption,
          {
            t: 'p',
            text: `A diagnostic evaluation begins with prior odds of ${p.priorA}:${p.priorB}. Two independent clinical assays give conflicting readings:`,
          },
          {
            t: 'list',
            items: [
              `Assay 1: Likelihood Ratio = ${p.lr1}`,
              `Assay 2: Likelihood Ratio = ${p.lr2}`,
            ],
          },
          {
            t: 'p',
            text: 'What is the net posterior probability of diagnosis (as a percentage)?',
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
      id: 'additive-odds',
      value: (p) => {
        // Adding LR to prior odds instead of multiplying: (O + LR) / (1 + O + LR) * 100
        const badOdds = p.priorA / p.priorB + p.lr1
        return (badOdds / (1 + badOdds)) * 100
      },
      feedback: () =>
        'You added the likelihood ratio to the prior odds instead of multiplying. Bayes rule in odds form is multiplicative: Posterior Odds = Prior Odds × Likelihood Ratio.',
    },
    {
      id: 'treating-odds-as-probability',
      value: (p) => {
        // Reporting posterior odds directly as probability without dividing by (1 + odds)
        let postOdds = (p.priorA / p.priorB) * p.lr1
        if (p.lr2) postOdds *= p.lr2
        return postOdds * 100
      },
      feedback: () =>
        'You reported the posterior odds directly without converting to probability. Probability is obtained from odds via P = Odds / (1 + Odds).',
    },
  ],

  steps,

  solution(p: OddsLikelihoodRatioParams): Block[] {
    const priorOdds = p.priorA / p.priorB
    let postOdds = priorOdds * p.lr1
    if (p.lr2) postOdds *= p.lr2
    const postProb = (postOdds / (1 + postOdds)) * 100

    return [
      {
        t: 'p',
        text: 'Sequential Bayesian updating in odds form:',
      },
      {
        t: 'list',
        items: [
          `Prior Odds = ${p.priorA} : ${p.priorB} = ${priorOdds.toFixed(4)}`,
          `Bayes Factor (Likelihood Ratio) = ${p.lr1}${p.lr2 ? ` × ${p.lr2}` : ''}`,
          `Posterior Odds = Prior Odds × LR = ${postOdds.toFixed(4)}`,
          `Posterior Probability = Posterior Odds / (1 + Posterior Odds) = ${postOdds.toFixed(4)} / ${(1 + postOdds).toFixed(4)} ≈ ${postProb.toFixed(2)}%`,
        ],
      },
    ]
  },
}
