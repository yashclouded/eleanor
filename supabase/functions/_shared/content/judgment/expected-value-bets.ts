import type { Answer, AnswerSpec, Block, Rng, Step, Template } from '../types.ts'

export type ExpectedValueBetsParams = {
  level: number
  pWinPercent: number // e.g. 40%
  winPayout: number // e.g. 500
  lossCost: number // e.g. 200
  pPushPercent?: number // Level 2
  pWinBPercent?: number // Level 3: Bet B
  winPayoutB?: number
  lossCostB?: number
  stage2WinPercent?: number // Level 4: 2nd stage
  stage2Payout?: number
}

export type ExpectedValueBetsSkin = 'auction' | 'drilling' | 'venture'

const steps: Step<ExpectedValueBetsParams>[] = [
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Calculate the probability-weighted return from the favorable winning outcome.',
      },
    ],
    answer: (p) => p.level === 4
      ? (p.pWinPercent / 100) * ((p.stage2WinPercent ?? 50) / 100) * (p.stage2Payout ?? 800)
      : (p.pWinPercent / 100) * p.winPayout,
    tolerance: { abs: 0.1 },
    explain: (p) => [
      {
        t: 'p',
        text: p.level === 4
          ? `The favorable terminal outcome requires success at both stages: (${p.pWinPercent} / 100) × (${p.stage2WinPercent} / 100) × ${p.stage2Payout}.`
          : `Multiply win probability (${p.pWinPercent}%) by win payoff (${p.winPayout}): (${p.pWinPercent} / 100) × ${p.winPayout} = ${((p.pWinPercent / 100) * p.winPayout).toFixed(2)}.`,
      },
    ],
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Calculate the probability-weighted cost from the unfavorable loss outcome.',
      },
    ],
    answer: (p) => {
      const pLoss = p.level === 4
        ? 100 - p.pWinPercent * ((p.stage2WinPercent ?? 50) / 100)
        : 100 - p.pWinPercent - (p.pPushPercent ?? 0)
      return (pLoss / 100) * p.lossCost
    },
    tolerance: { abs: 0.1 },
    explain: (p) => {
      const pLoss = p.level === 4
        ? 100 - p.pWinPercent * ((p.stage2WinPercent ?? 50) / 100)
        : 100 - p.pWinPercent - (p.pPushPercent ?? 0)
      return [
        {
          t: 'p',
          text: `Multiply loss probability (${pLoss}%) by loss amount (${p.lossCost}): (${pLoss} / 100) × ${p.lossCost} = ${((pLoss / 100) * p.lossCost).toFixed(2)}.`,
        },
      ]
    },
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Subtract expected costs from expected returns to determine the final net expected value.',
      },
    ],
    answer: (p) => {
      if (p.level === 1) {
        const pLoss = 1 - p.pWinPercent / 100
        return (p.pWinPercent / 100) * p.winPayout - pLoss * p.lossCost
      } else if (p.level === 2) {
        const pLoss = (100 - p.pWinPercent - (p.pPushPercent ?? 0)) / 100
        return (p.pWinPercent / 100) * p.winPayout - pLoss * p.lossCost
      } else if (p.level === 3) {
        const evA =
          (p.pWinPercent / 100) * p.winPayout -
          (1 - p.pWinPercent / 100) * p.lossCost
        const evB =
          ((p.pWinBPercent ?? 50) / 100) * (p.winPayoutB ?? 300) -
          (1 - (p.pWinBPercent ?? 50) / 100) * (p.lossCostB ?? 150)
        return evA - evB
      } else {
        // Level 4: Stage 1 win leads to Stage 2
        const p1 = p.pWinPercent / 100
        const p2 = (p.stage2WinPercent ?? 50) / 100
        const r2 = (p.stage2Payout ?? 800)
        const netStage2 = p2 * r2 - (1 - p2) * p.lossCost
        return p1 * netStage2 - (1 - p1) * p.lossCost
      }
    },
    tolerance: { abs: 0.1 },
    explain: () => [
      {
        t: 'p',
        text: 'The net expected value equals the sum of all outcomes weighted by their respective probabilities.',
      },
    ],
  },
]

export const expectedValueBetsTemplate: Template<ExpectedValueBetsParams> = {
  id: 'judgment.expected-value.bets',
  version: 1,
  track: 'judgment',
  concept: 'judgment.expected-value',
  family: 'ev-bets',
  status: 'draft',
  review: {
    author: 'Eleanor Team',
    reviewer: null,
    reviewedAt: null,
    notes: 'Expected monetary value of single-stage, multi-outcome, and sequential wagers and investments',
  },
  levels: [
    { level: 1, initialRating: 1000 },
    { level: 2, initialRating: 1200 },
    { level: 3, initialRating: 1400 },
    { level: 4, initialRating: 1600 },
  ],
  skins: ['auction', 'drilling', 'venture'],
  dailyLevels: [3, 4],

  sample(rng: Rng, level: number): ExpectedValueBetsParams {
    const pWinPercent = rng.int(30, 65)
    const winPayout = rng.int(30, 80) * 10
    const lossCost = rng.int(10, 25) * 10

    if (level === 1) {
      return { level, pWinPercent, winPayout, lossCost }
    } else if (level === 2) {
      const pPushPercent = rng.int(15, 25)
      return { level, pWinPercent, winPayout, lossCost, pPushPercent }
    } else if (level === 3) {
      const pWinBPercent = rng.int(50, 60)
      const winPayoutB = rng.int(25, 45) * 10
      const lossCostB = rng.int(8, 18) * 10
      return {
        level,
        pWinPercent,
        winPayout,
        lossCost,
        pWinBPercent,
        winPayoutB,
        lossCostB,
      }
    } else {
      const stage2WinPercent = rng.int(40, 60)
      const stage2Payout = rng.int(70, 120) * 10
      return {
        level,
        pWinPercent,
        winPayout,
        lossCost,
        stage2WinPercent,
        stage2Payout,
      }
    }
  },

  solve(p: ExpectedValueBetsParams): Answer {
    if (p.level === 1) {
      const pLoss = 1 - p.pWinPercent / 100
      return (p.pWinPercent / 100) * p.winPayout - pLoss * p.lossCost
    } else if (p.level === 2) {
      const pLoss = (100 - p.pWinPercent - (p.pPushPercent ?? 0)) / 100
      return (p.pWinPercent / 100) * p.winPayout - pLoss * p.lossCost
    } else if (p.level === 3) {
      const evA =
        (p.pWinPercent / 100) * p.winPayout -
        (1 - p.pWinPercent / 100) * p.lossCost
      const evB =
        ((p.pWinBPercent ?? 50) / 100) * (p.winPayoutB ?? 300) -
        (1 - (p.pWinBPercent ?? 50) / 100) * (p.lossCostB ?? 150)
      return evA - evB
    } else {
      const p1 = p.pWinPercent / 100
      const p2 = (p.stage2WinPercent ?? 50) / 100
      const r2 = p.stage2Payout ?? 800
      const netStage2 = p2 * r2 - (1 - p2) * p.lossCost
      return p1 * netStage2 - (1 - p1) * p.lossCost
    }
  },

  verify(p: ExpectedValueBetsParams): Answer {
    // Independent derivation using baseline subtraction: EV = -Loss + p*(Win + Loss)
    if (p.level === 1) {
      return -p.lossCost + (p.pWinPercent / 100) * (p.winPayout + p.lossCost)
    } else if (p.level === 2) {
      const pWin = p.pWinPercent / 100
      const pPush = (p.pPushPercent ?? 0) / 100
      const pLoss = 1 - pWin - pPush
      return pWin * p.winPayout + pPush * 0 - pLoss * p.lossCost
    } else if (p.level === 3) {
      const pWinA = p.pWinPercent / 100
      const evA = -p.lossCost + pWinA * (p.winPayout + p.lossCost)
      const pWinB = (p.pWinBPercent ?? 50) / 100
      const evB =
        -(p.lossCostB ?? 150) +
        pWinB * ((p.winPayoutB ?? 300) + (p.lossCostB ?? 150))
      return evA - evB
    } else {
      const p1 = p.pWinPercent / 100
      const p2 = (p.stage2WinPercent ?? 50) / 100
      const r2 = p.stage2Payout ?? 800
      // Expanded path probabilities:
      // Path 1 (Win R1 & Win R2): prob p1*p2, payoff r2
      // Path 2 (Win R1 & Lose R2): prob p1*(1-p2), payoff -lossCost
      // Path 3 (Lose R1): prob (1-p1), payoff -lossCost
      return (
        p1 * p2 * r2 -
        p1 * (1 - p2) * p.lossCost -
        (1 - p1) * p.lossCost
      )
    }
  },

  render(p: ExpectedValueBetsParams, skin: string): Block[] {
    const pLossPercent = 100 - p.pWinPercent - (p.pPushPercent ?? 0)

    if (skin === 'auction') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A wholesale asset liquidator bids on distressed commercial inventory packages. Analysis shows a ${p.pWinPercent}% chance of reselling the package for a net profit of ${p.winPayout} pts, and a ${pLossPercent}% chance of incurring a net disposal loss of ${p.lossCost} pts.`,
          },
          {
            t: 'p',
            text: 'What is the expected value (in points) of bidding on this package?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `An equipment auction lot offers three possible financial outcomes: a ${p.pWinPercent}% chance of a net profit of ${p.winPayout} pts, a ${p.pPushPercent}% chance of breaking exactly even (0 pts return), and a ${pLossPercent}% chance of a loss of ${p.lossCost} pts.`,
          },
          {
            t: 'p',
            text: 'Calculate the overall net expected value (in points) of purchasing the lot.',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `An asset trading desk must choose between two auction opportunities:`,
          },
          {
            t: 'list',
            items: [
              `Auction A: ${p.pWinPercent}% chance to gain ${p.winPayout} pts, otherwise lose ${p.lossCost} pts.`,
              `Auction B: ${p.pWinBPercent}% chance to gain ${p.winPayoutB} pts, otherwise lose ${p.lossCostB} pts.`,
            ],
          },
          {
            t: 'p',
            text: 'What is the difference in expected value (EV of Auction A minus EV of Auction B, in points)?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `An asset acquisition is structured in two stages. Stage 1 has a ${p.pWinPercent}% chance of qualifying the bidder; if disqualified, the deposit of ${p.lossCost} pts is lost. If qualified for Stage 2, there is a ${p.stage2WinPercent}% chance to close the acquisition for a net profit of ${p.stage2Payout} pts, or fail closing and lose ${p.lossCost} pts.`,
          },
          {
            t: 'p',
            text: 'What is the net expected value (in points) of initiating this two-stage acquisition from the start?',
          },
        ]
      }
    } else if (skin === 'drilling') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `An energy firm evaluates an offshore exploratory borehole concession. Seismic surveys show a ${p.pWinPercent}% probability of striking commercial reserves yielding a net payoff of ${p.winPayout} pts, and a ${pLossPercent}% probability of a dry hole costing ${p.lossCost} pts.`,
          },
          {
            t: 'p',
            text: 'What is the expected monetary value (in points) of drilling the well?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `An exploration lease provides three geologic outcomes: a ${p.pWinPercent}% chance of high reserves (+${p.winPayout} pts), a ${p.pPushPercent}% chance of marginal reserves that exactly cover exploration costs (0 pts), and a ${pLossPercent}% chance of a dry hole (-${p.lossCost} pts).`,
          },
          {
            t: 'p',
            text: 'What is the net expected value (in points) of the exploration lease?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A geophysical firm compares two exploratory prospects:`,
          },
          {
            t: 'list',
            items: [
              `Prospect A: ${p.pWinPercent}% chance to strike +${p.winPayout} pts, otherwise lose ${p.lossCost} pts.`,
              `Prospect B: ${p.pWinBPercent}% chance to strike +${p.winPayoutB} pts, otherwise lose ${p.lossCostB} pts.`,
            ],
          },
          {
            t: 'p',
            text: 'What is the expected value advantage of Prospect A over Prospect B (EV of A minus EV of B, in points)?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A deep-sea drilling program proceeds in two phases. Phase 1 exploration has a ${p.pWinPercent}% probability of discovering hydrocarbon traces; a dry hole loses ${p.lossCost} pts. If traces are found, Phase 2 commercial appraisal has a ${p.stage2WinPercent}% chance of yielding a commercial reservoir worth ${p.stage2Payout} pts, or failing production at a cost of ${p.lossCost} pts.`,
          },
          {
            t: 'p',
            text: 'What is the net expected value (in points) of undertaking the initial Phase 1 exploratory drilling?',
          },
        ]
      }
    } else {
      // Default: venture
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A seed technology incubator invests in an early-stage startup milestone. Market modeling indicates a ${p.pWinPercent}% chance that the startup attains commercial traction yielding ${p.winPayout} pts net gain, and a ${pLossPercent}% chance that the venture fails, forfeiting ${p.lossCost} pts.`,
          },
          {
            t: 'p',
            text: 'What is the expected value (in points) of the milestone investment?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `A technology grant has three prospective outcomes: a ${p.pWinPercent}% chance of full patent licensing (+${p.winPayout} pts), a ${p.pPushPercent}% chance of recouping research costs with no net gain (0 pts), and a ${pLossPercent}% chance of project abandonment (-${p.lossCost} pts).`,
          },
          {
            t: 'p',
            text: 'Calculate the expected net return (in points) of the research grant.',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A corporate venture portfolio evaluates two funding agreements:`,
          },
          {
            t: 'list',
            items: [
              `Venture A: ${p.pWinPercent}% chance of +${p.winPayout} pts return, otherwise -${p.lossCost} pts.`,
              `Venture B: ${p.pWinBPercent}% chance of +${p.winPayoutB} pts return, otherwise -${p.lossCostB} pts.`,
            ],
          },
          {
            t: 'p',
            text: 'What is the difference in expected return (EV of Venture A minus EV of Venture B, in points)?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A venture investment tranche is deployed in two stages. Stage 1 has a ${p.pWinPercent}% chance of achieving prototype validation; failing forfeits ${p.lossCost} pts. Upon validation, the firm exercises its follow-on option, which has a ${p.stage2WinPercent}% chance of returning ${p.stage2Payout} pts, or failing with a loss of ${p.lossCost} pts.`,
          },
          {
            t: 'p',
            text: 'What is the total expected value (in points) of the investment strategy from initial deployment?',
          },
        ]
      }
    }
  },

  answer(): AnswerSpec {
    return {
      type: 'number',
      unit: 'pts',
      tolerance: { abs: 0.1, rel: 0.01 },
    }
  },

  misconceptions: [
    {
      id: 'optimism-bias-ignore-loss',
      value: (p) => {
        // Only calculating probability * win payout, ignoring downside
        return (p.pWinPercent / 100) * p.winPayout
      },
      feedback: () =>
        'You calculated the expected upside but ignored the probability-weighted cost of losses. Both gains and losses must be included in expected value.',
    },
    {
      id: 'equal-weighting',
      value: (p) => {
        // Averaging payoffs without weighting by probabilities
        return (p.winPayout - p.lossCost) / 2
      },
      feedback: () =>
        'Do not simply take the unweighted average of the winning and losing amounts. Each outcome must be multiplied by its specific probability.',
    },
  ],

  steps,

  solution(p: ExpectedValueBetsParams): Block[] {
    const pWin = p.pWinPercent / 100
    const terminalWin = p.level === 4 ? pWin * ((p.stage2WinPercent ?? 50) / 100) : pWin
    const pLoss = p.level === 4 ? 1 - terminalWin : (100 - p.pWinPercent - (p.pPushPercent ?? 0)) / 100
    const payout = p.level === 4 ? (p.stage2Payout ?? 800) : p.winPayout
    const gain = terminalWin * payout
    const loss = pLoss * p.lossCost

    let res = gain - loss
    if (p.level === 3) {
      const pWinB = (p.pWinBPercent ?? 50) / 100
      const evB = pWinB * (p.winPayoutB ?? 300) - (1 - pWinB) * (p.lossCostB ?? 150)
      res = (gain - (1 - pWin) * p.lossCost) - evB
    } else if (p.level === 4) {
      const p2 = (p.stage2WinPercent ?? 50) / 100
      const r2 = p.stage2Payout ?? 800
      const netStage2 = p2 * r2 - (1 - p2) * p.lossCost
      res = pWin * netStage2 - (1 - pWin) * p.lossCost
    }

    return [
      {
        t: 'p',
        text: 'Expected value is the sum of each potential outcome multiplied by its probability of occurrence:',
      },
      {
        t: 'list',
        items: [
          `Expected Gain = ${(terminalWin * 100).toFixed(2)}% × ${payout} = ${gain.toFixed(2)} pts`,
          `Expected Loss = ${(pLoss * 100).toFixed(2)}% × ${p.lossCost} = ${loss.toFixed(2)} pts`,
          `Net Expected Value = ${res.toFixed(2)} pts`,
        ],
      },
    ]
  },
}
