import type { Answer, AnswerSpec, Block, Rng, Step, Template } from '../types.ts'

export type FermiQuantityParams = {
  level: number
  factor1: number
  factor2: number
  factor3: number
  factor4: number
  factor5?: number
}

export type FermiSkin = 'datacenter' | 'transit' | 'packaging'

const steps: Step<FermiQuantityParams>[] = [
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Estimate the primary baseline volume by combining the first two core factors.',
      },
    ],
    answer: (p) => p.factor1 * p.factor2,
    tolerance: { abs: 1, rel: 0.05 },
    explain: (p) => [
      {
        t: 'p',
        text: `Multiplying factor 1 (${p.factor1}) by factor 2 (${p.factor2}) yields ${p.factor1 * p.factor2}.`,
      },
    ],
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Scale the baseline volume across the third operational parameter.',
      },
    ],
    answer: (p) => p.factor1 * p.factor2 * p.factor3,
    tolerance: { abs: 1, rel: 0.05 },
    explain: (p) => [
      {
        t: 'p',
        text: `Multiplying by factor 3 (${p.factor3}) yields ${p.factor1 * p.factor2 * p.factor3}.`,
      },
    ],
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Calculate the total estimated aggregate quantity across the full scope.',
      },
    ],
    answer: (p) => {
      let prod = p.factor1 * p.factor2 * p.factor3 * p.factor4
      if (p.factor5) prod *= p.factor5
      return prod
    },
    tolerance: { abs: 1, rel: 0.05 },
    explain: (p) => {
      let prod = p.factor1 * p.factor2 * p.factor3 * p.factor4
      if (p.factor5) prod *= p.factor5
      return [
        {
          t: 'p',
          text: `Multiplying all independent factors together produces the total estimated magnitude of ${prod.toLocaleString()}.`,
        },
      ]
    },
  },
]

export const fermiQuantityTemplate: Template<FermiQuantityParams> = {
  id: 'judgment.estimation.fermi-quantity',
  version: 1,
  track: 'judgment',
  concept: 'judgment.estimation',
  family: 'fermi-quantity',
  status: 'draft',
  review: {
    author: 'Eleanor Team',
    reviewer: null,
    reviewedAt: null,
    notes: 'Order of magnitude Fermi estimation decomposing unknown quantities into structural factors',
  },
  levels: [
    { level: 1, initialRating: 900 },
    { level: 2, initialRating: 1100 },
    { level: 3, initialRating: 1300 },
    { level: 4, initialRating: 1500 },
  ],
  skins: ['datacenter', 'transit', 'packaging'],
  dailyLevels: [3, 4],

  sample(rng: Rng, level: number): FermiQuantityParams {
    if (level === 1) {
      const factor1 = rng.pick([200, 300, 400, 500, 600, 700, 800, 900, 1000])
      const factor2 = rng.pick([20, 25, 30, 35, 40, 45, 50, 55, 60])
      const factor3 = rng.pick([100, 150, 200, 250, 300])
      return { level, factor1, factor2, factor3, factor4: 1 }
    } else if (level === 2) {
      const factor1 = rng.pick([50, 60, 80, 100, 120, 140, 150, 160])
      const factor2 = rng.pick([15, 20, 25, 30, 35, 40])
      const factor3 = rng.pick([12, 18, 24, 30, 36, 48])
      const factor4 = rng.pick([250, 260, 300, 350, 365])
      return { level, factor1, factor2, factor3, factor4 }
    } else if (level === 3) {
      const factor1 = rng.pick([500000, 600000, 800000, 1000000, 1200000, 1500000, 2000000])
      const factor2 = rng.pick([0.05, 0.08, 0.1, 0.12, 0.15, 0.18, 0.2])
      const factor3 = rng.pick([4, 5, 6, 8, 10, 12])
      const factor4 = rng.pick([200, 220, 250, 260, 300])
      return { level, factor1, factor2, factor3, factor4 }
    } else {
      // Level 4: 5 factors
      const factor1 = rng.pick([100, 150, 200, 250, 300, 400, 500])
      const factor2 = rng.pick([30, 40, 50, 60])
      const factor3 = rng.pick([300, 350, 400, 450, 500])
      const factor4 = rng.pick([8000, 8760])
      const factor5 = rng.pick([1.2, 1.4, 1.5, 1.6])
      return { level, factor1, factor2, factor3, factor4, factor5 }
    }
  },

  solve(p: FermiQuantityParams): Answer {
    let res = p.factor1 * p.factor2 * p.factor3 * p.factor4
    if (p.factor5) res *= p.factor5
    return Math.round(res)
  },

  verify(p: FermiQuantityParams): Answer {
    // Independent derivation: grouping factors from right to left
    let tail = p.factor4 * (p.factor5 ?? 1)
    tail = tail * p.factor3
    tail = tail * p.factor2
    return Math.round(tail * p.factor1)
  },

  render(p: FermiQuantityParams, skin: string): Block[] {
    if (skin === 'datacenter') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A cloud services company operates ${p.factor1.toLocaleString()} edge computing nodes. Each edge node houses ${p.factor2} server processors, and each processor consumes approximately ${p.factor3} kWh of electricity per operational year.`,
          },
          {
            t: 'p',
            text: 'Estimate the total annual electricity consumption (in kWh) across all operational edge nodes.',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `An enterprise infrastructure team manages ${p.factor1} data center server racks. Each rack hosts ${p.factor2} blade servers, each server consumes an average of ${p.factor3} kilowatt-hours per day, and the facility runs for ${p.factor4} active production days per year.`,
          },
          {
            t: 'p',
            text: 'Estimate the total annual energy consumed by these servers (in kWh).',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A metropolitan region has a population of ${p.factor1.toLocaleString()} smartphone users. Market surveys indicate that ${(p.factor2 * 100).toFixed(0)}% of them use a real-time cloud backup service. Each active backup user generates an average of ${p.factor3} megabytes of network traffic per business day, over a standard ${p.factor4}-day working year.`,
          },
          {
            t: 'p',
            text: 'Estimate the total annual backup traffic generated (in megabytes).',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A hyperscale data center facility contains ${p.factor1} equipment rows. Each row holds ${p.factor2} chassis, with each chassis drawing ${p.factor3} watts of electrical power. The servers operate continuously for ${p.factor4} hours annually, and the cooling overhead multiplier (Power Usage Effectiveness) is ${p.factor5}.`,
          },
          {
            t: 'p',
            text: 'Estimate the total annual watt-hours of electrical energy consumed by the data center facility.',
          },
        ]
      }
    } else if (skin === 'transit') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A regional transit authority operates ${p.factor1} bus routes. Each route deploys ${p.factor2} commuter buses, and each bus travels an average of ${p.factor3} kilometers each day of service.`,
          },
          {
            t: 'p',
            text: 'Estimate the total bus fleet distance traveled (in kilometers) on a single day.',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `A rail transit line operates ${p.factor1} trains. Each train consists of ${p.factor2} carriages, each carriage accommodates an average of ${p.factor3} passengers per trip, and each train completes ${p.factor4} scheduled passenger runs each year.`,
          },
          {
            t: 'p',
            text: 'Estimate the total annual passenger-trips provided by the rail line.',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `An urban center has ${p.factor1.toLocaleString()} daily commuters. Approximately ${(p.factor2 * 100).toFixed(0)}% of commuters take the subway system. A typical subway commuter travels an average of ${p.factor3} kilometers per commute day, commuting ${p.factor4} days annually.`,
          },
          {
            t: 'p',
            text: 'Estimate the total annual commuter-kilometers traveled on the subway system.',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A high-speed rail network operates ${p.factor1} trainsets. Each trainset carries ${p.factor2} passengers per departure, completes trips covering ${p.factor3} track kilometers, runs for ${p.factor4} departures per year, with a network service utilization factor of ${p.factor5}.`,
          },
          {
            t: 'p',
            text: 'Estimate the total passenger-kilometers delivered by the high-speed rail network per year.',
          },
        ]
      }
    } else {
      // Default: packaging
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A national logistics warehouse ships goods from ${p.factor1} distribution bays. Each bay handles ${p.factor2} outbound pallets per shift, and each pallet contains ${p.factor3} corrugated cardboard cartons.`,
          },
          {
            t: 'p',
            text: 'Estimate the total number of cardboard cartons dispatched during one full shift.',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `An e-commerce fulfillment network has ${p.factor1} packing stations. Each station operates ${p.factor2} packaging lines, each line seals ${p.factor3} parcels per hour, operating for ${p.factor4} hours annually.`,
          },
          {
            t: 'p',
            text: 'Estimate the total number of parcels processed across the network annually.',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `A retail chain serves ${p.factor1.toLocaleString()} active loyalty members. About ${(p.factor2 * 100).toFixed(0)}% of these members order deliveries each week. Each delivery uses an average of ${p.factor3} biodegradable packaging pouches, over ${p.factor4} operating days per year.`,
          },
          {
            t: 'p',
            text: 'Estimate the total quantity of packaging pouches used per year.',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `An automated logistics campus has ${p.factor1} sorting modules. Each module processes ${p.factor2} containers per cycle, each container consumes ${p.factor3} grams of protective paper padding, running for ${p.factor4} operating cycles each year, scaled by an operational buffer margin of ${p.factor5}.`,
          },
          {
            t: 'p',
            text: 'Estimate the total grams of protective paper padding used annually.',
          },
        ]
      }
    }
  },

  answer(): AnswerSpec {
    return {
      type: 'estimate',
      unit: 'units',
      log10Tolerance: 0.3,
    }
  },

  misconceptions: [
    {
      id: 'order-of-magnitude-underestimate',
      value: (p) => {
        let res = p.factor1 * p.factor2 * p.factor3 * p.factor4
        if (p.factor5) res *= p.factor5
        return res / 10
      },
      feedback: () =>
        'Your estimate is an entire order of magnitude too small. Check your unit conversions or verify that you did not omit a factor (such as multiplying by days or rate).',
    },
    {
      id: 'order-of-magnitude-overestimate',
      value: (p) => {
        let res = p.factor1 * p.factor2 * p.factor3 * p.factor4
        if (p.factor5) res *= p.factor5
        return res * 10
      },
      feedback: () =>
        'Your estimate is an order of magnitude too large. Double check whether a rate was already expressed on an annual or daily basis before scaling.',
    },
  ],

  steps,

  solution(p: FermiQuantityParams): Block[] {
    let res = p.factor1 * p.factor2 * p.factor3 * p.factor4
    if (p.factor5) res *= p.factor5

    const items = [
      `Factor 1: ${p.factor1.toLocaleString()}`,
      `Factor 2: ${p.factor2.toLocaleString()}`,
      `Factor 3: ${p.factor3.toLocaleString()}`,
      `Factor 4: ${p.factor4.toLocaleString()}`,
    ]
    if (p.factor5) {
      items.push(`Factor 5: ${p.factor5.toLocaleString()}`)
    }
    items.push(`Combined Product = ${res.toLocaleString()}`)

    return [
      {
        t: 'p',
        text: 'Break down the target estimation into its constituent multiplicative structural components:',
      },
      {
        t: 'list',
        items,
      },
      {
        t: 'p',
        text: `The product of these decomposition terms yields an expected estimate of approximately ${res.toLocaleString()}. Any estimate within a factor of about 2 (log10 tolerance 0.3) is accepted as calibrated.`,
      },
    ]
  },
}
