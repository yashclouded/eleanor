import type { Answer, AnswerSpec, Block, Rng, Step, Template } from '../types.ts'

export type IndependenceCompoundParams = {
  level: number
  pAPercent: number // e.g. 30%
  pBPercent: number // e.g. 20%
  pCPercent?: number // Level 2: e.g. 40%
  pJointPercent?: number // Level 3: observed joint rate
  commonCausePercent?: number // Level 4: common cause failure rate
}

export type IndependenceSkin = 'microservice' | 'aerospace' | 'logistics'

const steps: Step<IndependenceCompoundParams>[] = [
  {
    prompt: () => [
      {
        t: 'p',
        text: 'Assuming independence, what is the joint probability (as a percentage) of Event A and Event B both occurring together?',
      },
    ],
    answer: (p) => (p.pAPercent * p.pBPercent) / 100,
    tolerance: { abs: 0.05 },
    explain: (p) => [
      {
        t: 'p',
        text: `Under independence, joint probability is the product of marginals: (${p.pAPercent} / 100) × (${p.pBPercent} / 100) × 100 = ${((p.pAPercent * p.pBPercent) / 100).toFixed(2)}%.`,
      },
    ],
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the probability (as a percentage) that NEITHER Event A nor Event B occurs?',
      },
    ],
    answer: (p) => ((100 - p.pAPercent) * (100 - p.pBPercent)) / 100,
    tolerance: { abs: 0.05 },
    explain: (p) => {
      const neither = ((100 - p.pAPercent) * (100 - p.pBPercent)) / 100
      return [
        {
          t: 'p',
          text: `P(neither) = (1 − P(A)) × (1 − P(B)) = (${100 - p.pAPercent}% × ${100 - p.pBPercent}%) = ${neither.toFixed(2)}%.`,
        },
      ]
    },
  },
  {
    prompt: () => [
      {
        t: 'p',
        text: 'What is the final requested compound probability percentage?',
      },
    ],
    answer: (p) => {
      const pa = p.pAPercent / 100
      const pb = p.pBPercent / 100
      if (p.level === 1) {
        // Union P(A or B) = pa + pb - pa*pb
        return (pa + pb - pa * pb) * 100
      } else if (p.level === 2) {
        // All three independent events occur: pa * pb * pc
        const pc = (p.pCPercent ?? 40) / 100
        return pa * pb * pc * 100
      } else if (p.level === 3) {
        // Observed joint minus expected independent joint: pJoint - (pa * pb * 100)
        const expJoint = (p.pAPercent * p.pBPercent) / 100
        return (p.pJointPercent ?? expJoint + 5) - expJoint
      } else {
        // Level 4: Redundant parallel system failure probability
        // Independent failure: pa * pb. Plus common cause failure rate.
        const cc = (p.commonCausePercent ?? 2) / 100
        const totalFail = cc + (1 - cc) * (pa * pb)
        return totalFail * 100
      }
    },
    tolerance: { abs: 0.1 },
    explain: (p) => {
      const pa = p.pAPercent / 100
      const pb = p.pBPercent / 100
      let ans = (pa + pb - pa * pb) * 100
      if (p.level === 2) {
        const pc = (p.pCPercent ?? 40) / 100
        ans = pa * pb * pc * 100
      } else if (p.level === 3) {
        const expJoint = (p.pAPercent * p.pBPercent) / 100
        ans = (p.pJointPercent ?? expJoint + 5) - expJoint
      } else if (p.level === 4) {
        const cc = (p.commonCausePercent ?? 2) / 100
        ans = (cc + (1 - cc) * (pa * pb)) * 100
      }
      return [
        {
          t: 'p',
          text: `Final calculated probability = ${ans.toFixed(2)}%.`,
        },
      ]
    },
  },
]

export const independenceCompoundEventsTemplate: Template<IndependenceCompoundParams> = {
  id: 'judgment.independence.compound-events',
  version: 1,
  track: 'judgment',
  concept: 'judgment.independence',
  family: 'independence-compound',
  status: 'draft',
  review: {
    author: 'Eleanor Team',
    reviewer: null,
    reviewedAt: null,
    notes: 'Compound probability under independence: product rule, inclusion-exclusion, and common-cause coupling',
  },
  levels: [
    { level: 1, initialRating: 1100 },
    { level: 2, initialRating: 1300 },
    { level: 3, initialRating: 1500 },
    { level: 4, initialRating: 1700 },
  ],
  skins: ['microservice', 'aerospace', 'logistics'],
  dailyLevels: [2, 3, 4],

  sample(rng: Rng, level: number): IndependenceCompoundParams {
    const pAPercent = rng.int(15, 60)
    const pBPercent = rng.int(10, 50)

    if (level === 1) {
      return { level, pAPercent, pBPercent }
    } else if (level === 2) {
      const pCPercent = rng.int(20, 50)
      return { level, pAPercent, pBPercent, pCPercent }
    } else if (level === 3) {
      const indepJoint = (pAPercent * pBPercent) / 100
      // An observed intersection cannot exceed either marginal probability.
      const delta = rng.int(1, Math.min(8, Math.floor(Math.min(pAPercent, pBPercent) - indepJoint)))
      const pJointPercent = indepJoint + delta
      return { level, pAPercent, pBPercent, pJointPercent }
    } else {
      const paSmall = rng.int(4, 12)
      const pbSmall = rng.int(4, 12)
      const commonCausePercent = rng.int(1, 6)
      return {
        level,
        pAPercent: paSmall,
        pBPercent: pbSmall,
        commonCausePercent,
      }
    }
  },

  solve(p: IndependenceCompoundParams): Answer {
    const pa = p.pAPercent / 100
    const pb = p.pBPercent / 100
    if (p.level === 1) {
      return (pa + pb - pa * pb) * 100
    } else if (p.level === 2) {
      const pc = (p.pCPercent ?? 40) / 100
      return pa * pb * pc * 100
    } else if (p.level === 3) {
      const expJoint = (p.pAPercent * p.pBPercent) / 100
      return (p.pJointPercent ?? expJoint + 5) - expJoint
    } else {
      const cc = (p.commonCausePercent ?? 2) / 100
      const totalFail = cc + (1 - cc) * (pa * pb)
      return totalFail * 100
    }
  },

  verify(p: IndependenceCompoundParams): Answer {
    const pa = p.pAPercent / 100
    const pb = p.pBPercent / 100
    if (p.level === 1) {
      // Independent complement derivation: 1 - P(neither)
      const neither = (1 - pa) * (1 - pb)
      return (1 - neither) * 100
    } else if (p.level === 2) {
      const pc = (p.pCPercent ?? 40) / 100
      // Successive conditional product
      const ab = (p.pAPercent * p.pBPercent) / 10000
      return ab * pc * 100
    } else if (p.level === 3) {
      const expJoint = (p.pAPercent / 100) * (p.pBPercent / 100) * 100
      return (p.pJointPercent ?? expJoint + 5) - expJoint
    } else {
      const cc = (p.commonCausePercent ?? 2) / 100
      // Independent component survival = 1 - failure
      const compSurv = 1 - pa * pb
      const systemSurv = (1 - cc) * compSurv
      return (1 - systemSurv) * 100
    }
  },

  render(p: IndependenceCompoundParams, skin: string): Block[] {
    if (skin === 'microservice') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `An API gateway handles user requests by dispatching two independent asynchronous downstream sub-requests: Service A has a ${p.pAPercent}% latency breach probability, and Service B has a ${p.pBPercent}% latency breach probability.`,
          },
          {
            t: 'p',
            text: 'Assuming failures are statistically independent, what is the probability (as a percentage) that AT LEAST ONE of the two services experiences a latency breach (P(A or B))?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `A distributed transaction coordinates across three independent database shards. Shard A has an uptime failure rate of ${p.pAPercent}%, Shard B has ${p.pBPercent}%, and Shard C has ${p.pCPercent}%.`,
          },
          {
            t: 'p',
            text: 'Assuming failures occur independently, what is the probability (as a percentage) that ALL THREE shards fail simultaneously?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `Telemetry monitors two authentication microservices. Service A fails on ${p.pAPercent}% of requests, and Service B fails on ${p.pBPercent}% of requests. However, network logs show that BOTH services fail concurrently on ${p.pJointPercent?.toFixed(2)}% of requests.`,
          },
          {
            t: 'p',
            text: 'What is the excess joint failure probability (observed joint rate minus the expected joint rate assuming independence, in percentage points)?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `An infrastructure cluster uses redundant standby servers. The following hardware failure rates apply when there is no common-cause event. Server 1 has an independent hardware failure rate of ${p.pAPercent}%, and Server 2 has an independent failure rate of ${p.pBPercent}%. In addition, both servers share a common power grid switchboard that has a ${p.commonCausePercent}% catastrophic common-cause failure rate.`,
          },
          {
            t: 'p',
            text: 'What is the total system failure probability (in percent) that both servers fail?',
          },
        ]
      }
    } else if (skin === 'aerospace') {
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `A communications satellite is equipped with two solar array tracking actuators. Over a ten-year operational lifetime, Actuator 1 has a ${p.pAPercent}% probability of mechanical jamming, and Actuator 2 has a ${p.pBPercent}% probability of mechanical jamming.`,
          },
          {
            t: 'p',
            text: 'Assuming jamming occurrences are independent, what is the probability (as a percentage) that at least one actuator experiences mechanical jamming?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `A launch vehicle guidance system has three independent gyroscopic sensors: Gyro 1 has an anomaly probability of ${p.pAPercent}%, Gyro 2 has ${p.pBPercent}%, and Gyro 3 has ${p.pCPercent}%.`,
          },
          {
            t: 'p',
            text: 'Assuming independent sensor behavior, what is the probability (as a percentage) that all three gyros experience concurrent anomalies?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `Telemetry monitors two satellite communication transponders: Transponder 1 exhibits signal dropouts ${p.pAPercent}% of the time, and Transponder 2 exhibits dropouts ${p.pBPercent}% of the time. Telemetry records both transponders experiencing simultaneous dropouts on ${p.pJointPercent?.toFixed(2)}% of orbits.`,
          },
          {
            t: 'p',
            text: 'What is the correlation excess (observed joint rate minus expected independent joint rate, in percentage points)?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A space probe guidance module utilizes dual redundant star trackers. The tracker failure rates below apply when no solar flare occurs. Tracker 1 has an independent failure rate of ${p.pAPercent}%, Tracker 2 has an independent failure rate of ${p.pBPercent}%, and a solar flare radiation event causes a common-cause simultaneous blackout with ${p.commonCausePercent}% probability.`,
          },
          {
            t: 'p',
            text: 'What is the overall probability (as a percentage) that orientation telemetry is completely lost?',
          },
        ]
      }
    } else {
      // Default: logistics
      if (p.level === 1) {
        return [
          {
            t: 'p',
            text: `An international freight shipment involves two transit legs: Rail Freight has a ${p.pAPercent}% probability of a customs delay, and Marine Shipping has a ${p.pBPercent}% probability of a port congestion delay.`,
          },
          {
            t: 'p',
            text: 'Assuming transit delays are independent, what is the probability (as a percentage) that the shipment experiences a delay on AT LEAST ONE of the two legs?',
          },
        ]
      } else if (p.level === 2) {
        return [
          {
            t: 'p',
            text: `A cross-continental transport link passes through three independent regional checkpoints: Checkpoint 1 imposes quarantine holds with ${p.pAPercent}% probability, Checkpoint 2 with ${p.pBPercent}%, and Checkpoint 3 with ${p.pCPercent}%.`,
          },
          {
            t: 'p',
            text: 'What is the probability (as a percentage) that a shipment is held at all three checkpoints?',
          },
        ]
      } else if (p.level === 3) {
        return [
          {
            t: 'p',
            text: `An intermodal carrier monitors two regional freight hubs: Hub North experiences winter ground stops on ${p.pAPercent}% of days, and Hub South on ${p.pBPercent}% of days. Historical logs show that both hubs face simultaneous ground stops on ${p.pJointPercent?.toFixed(2)}% of days.`,
          },
          {
            t: 'p',
            text: 'What is the excess joint occurrence rate above the independent expectation (in percentage points)?',
          },
        ]
      } else {
        return [
          {
            t: 'p',
            text: `A refrigerated cargo supply chain uses two parallel compressor cooling engines. The engine failure rates below apply when there is no electrical surge. Engine A has an independent failure rate of ${p.pAPercent}%, Engine B has an independent failure rate of ${p.pBPercent}%, and electrical alternator line surges produce an unmitigated common-cause double failure with ${p.commonCausePercent}% probability.`,
          },
          {
            t: 'p',
            text: 'What is the total probability (as a percentage) that both cooling engines fail?',
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
      id: 'naive-addition-union',
      value: (p) => {
        // Adding probabilities directly without subtracting intersection
        if (p.level === 1) return p.pAPercent + p.pBPercent
        if (p.level === 2) return p.pAPercent + p.pBPercent + (p.pCPercent ?? 40)
        return (p.pAPercent * p.pBPercent) / 100
      },
      feedback: () =>
        'You added the individual probabilities directly. For compound events (union), you must subtract the overlapping intersection: P(A or B) = P(A) + P(B) − P(A and B).',
    },
    {
      id: 'confusing-union-and-intersection',
      value: (p) => {
        // Reporting intersection when union is asked (or vice versa)
        if (p.level === 1) return (p.pAPercent * p.pBPercent) / 100
        const pa = p.pAPercent / 100
        const pb = p.pBPercent / 100
        return (pa + pb - pa * pb) * 100
      },
      feedback: () =>
        'You confused joint intersection (P(A and B)) with inclusive union (P(A or B)). Check whether the problem asks for both events or at least one.',
    },
  ],

  steps,

  solution(p: IndependenceCompoundParams): Block[] {
    const pa = p.pAPercent / 100
    const pb = p.pBPercent / 100
    const joint = (p.pAPercent * p.pBPercent) / 100
    const union = (pa + pb - pa * pb) * 100
    const items = [
      `Under independence: P(A ∩ B) = (${p.pAPercent} / 100) × (${p.pBPercent} / 100) × 100 = ${joint.toFixed(2)}%`,
    ]
    if (p.level === 1) {
      items.push(`P(A ∪ B) = P(A) + P(B) − P(A ∩ B) = ${p.pAPercent}% + ${p.pBPercent}% − ${joint.toFixed(2)}% = ${union.toFixed(2)}%`)
    } else if (p.level === 2) {
      items.push(`P(A ∩ B ∩ C) = (${joint} / 100) × (${p.pCPercent} / 100) × 100 = ${(joint * ((p.pCPercent ?? 40) / 100)).toFixed(2)}%`)
    } else if (p.level === 3) {
      items.push(`Observed minus independent joint probability = ${p.pJointPercent}% − ${joint.toFixed(2)}% = ${((p.pJointPercent ?? joint + 5) - joint).toFixed(2)}% (percentage points).`)
    } else {
      const cc = (p.commonCausePercent ?? 2) / 100
      items.push(`Condition on the common cause: P(system failure) = ${cc} + (1 − ${cc}) × (${joint} / 100) = ${((cc + (1 - cc) * pa * pb) * 100).toFixed(2)}%`)
    }

    return [
      {
        t: 'p',
        text: p.level === 3 ? 'Compare the observed joint rate with the independence benchmark:' : 'Use the probability model stated in the question:',
      },
      {
        t: 'list',
        items,
      },
    ]
  },
}
