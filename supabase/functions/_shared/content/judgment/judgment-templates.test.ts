import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../../registry.ts'
import { CONCEPTS } from '../../catalog.ts'
import { checkBank, checkTemplate } from '../../../../../scripts/content-check.ts'
import { hashSeed, makeRng } from '../../rng.ts'
import { baseRateScreeningTemplate } from './base-rate-screening.ts'
import { expectedValueBetsTemplate } from './expected-value-bets.ts'
import { fermiQuantityTemplate } from './fermi-quantity.ts'
import { independenceAtLeastOneTemplate } from './independence-at-least-one.ts'
import { independenceCompoundEventsTemplate } from './independence-compound-events.ts'
import { riskFramingNntTemplate } from './risk-framing-nnt.ts'
import { riskFramingRelativeAbsoluteTemplate } from './risk-framing-relative-absolute.ts'
import { regressionSelectionEffectTemplate } from './regression-selection-effect.ts'

const EXPECTED_JUDGMENT_TEMPLATE_IDS = [
  'judgment.frequencies.counting-table',
  'judgment.estimation.fermi-quantity',
  'judgment.conditional.two-way-table',
  'judgment.conditional.tree',
  'judgment.base-rate.screening',
  'judgment.base-rate.two-tests',
  'judgment.expected-value.bets',
  'judgment.expected-value.insurance',
  'judgment.risk-framing.relative-absolute',
  'judgment.risk-framing.nnt',
  'judgment.independence.compound-events',
  'judgment.independence.at-least-one',
  'judgment.regression.selection-effect',
  'judgment.odds.likelihood-ratio',
]

describe('Task 6.2 - Judgment Templates', () => {
  it('explains both screening stages rather than the first-stage answer', () => {
    const params = { level: 4, population: 10000, baseRatePercent: 1, sensitivityPercent: 90,
      falsePositiveRatePercent: 10, stage2SensitivityPercent: 90, stage2FalsePositiveRatePercent: 10 }
    expect(baseRateScreeningTemplate.solve(params)).toBeCloseTo(45)
    expect(JSON.stringify(baseRateScreeningTemplate.solution(params))).toContain('45.00%')
  })

  it('uses each trial probability and the at-least-two threshold in worked solutions', () => {
    const varied = { level: 2, pSinglePercent: 10, numTrials: 4, probsArray: [10, 20, 30, 40] }
    const twice = { level: 3, pSinglePercent: 20, numTrials: 4 }
    expect(JSON.stringify(independenceAtLeastOneTemplate.solution(varied))).toContain('69.76%')
    expect(JSON.stringify(independenceAtLeastOneTemplate.solution(twice))).toContain('18.08%')
  })

  it('keeps the rounded-up NNT explanation consistent at exact reciprocals', () => {
    const params = { level: 1, baselinePercent: 6, treatedPercent: 5 }
    expect(riskFramingNntTemplate.solve(params)).toBe(100)
    expect(JSON.stringify(riskFramingNntTemplate.solution(params))).toContain('= 100"')
    expect(JSON.stringify(riskFramingNntTemplate.solution(params))).not.toContain('= 101"')
  })

  it('preserves the displayed risk precision used for grading', () => {
    const params = { level: 2, baselineRiskPercent: 2.5, treatedRiskPercent: 1.88 }
    for (const skin of riskFramingRelativeAbsoluteTemplate.skins) {
      expect(JSON.stringify(riskFramingRelativeAbsoluteTemplate.render(params, skin))).toContain('1.88%')
    }
  })

  it('uses the annual count of daily orders in the Fermi packaging prompt', () => {
    const params = { level: 3, factor1: 500000, factor2: 0.1, factor3: 4, factor4: 250 }
    expect(JSON.stringify(fermiQuantityTemplate.render(params, 'packaging'))).toContain('each operating day')
  })

  it('uses both success stages in the expected-upside repair step', () => {
    const params = { level: 4, pWinPercent: 50, winPayout: 300, lossCost: 100,
      stage2WinPercent: 40, stage2Payout: 1000 }
    expect(expectedValueBetsTemplate.steps[0].answer(params)).toBe(200)
    expect(expectedValueBetsTemplate.steps[1].answer(params)).toBe(80)
    expect(JSON.stringify(expectedValueBetsTemplate.solution(params))).toContain('= 200.00 pts')
  })

  it('samples feasible observed joint probabilities', () => {
    for (let seed = 0; seed < 2000; seed++) {
      const p = independenceCompoundEventsTemplate.sample(makeRng(seed), 3)
      expect(p.pJointPercent).toBeLessThanOrEqual(Math.min(p.pAPercent, p.pBPercent))
      expect(p.pJointPercent).toBeGreaterThanOrEqual(Math.max(0, p.pAPercent + p.pBPercent - 100))
    }
  })

  it('explains the requested compound event at each higher level', () => {
    const fixtures = [
      { level: 2, pAPercent: 30, pBPercent: 40, pCPercent: 50 },
      { level: 3, pAPercent: 30, pBPercent: 40, pJointPercent: 17 },
      { level: 4, pAPercent: 4, pBPercent: 5, commonCausePercent: 2 },
    ]
    for (const params of fixtures) {
      const answer = Number(independenceCompoundEventsTemplate.solve(params)).toFixed(2)
      expect(JSON.stringify(independenceCompoundEventsTemplate.solution(params))).toContain(`${answer}%`)
    }
  })

  it('states the conditioning assumption before combining likelihoods', () => {
    for (const id of ['judgment.base-rate.two-tests', 'judgment.odds.likelihood-ratio']) {
      const template = TEMPLATES.find((t) => t.id === id)!
      const params = template.sample(makeRng(1), 2)
      for (const skin of template.skins) {
        expect(JSON.stringify(template.render(params, skin))).toContain('conditionally independent')
      }
    }
  })

  it('separates the no-intervention prediction from a causal claim', () => {
    const params = { level: 3, popMean: 500, initialScore: 400, reliability: 0.6, observedRetest: 460 }
    expect(JSON.stringify(regressionSelectionEffectTemplate.solution(params))).toContain('Expected gain without intervention = 40.00 pts')
    for (const skin of regressionSelectionEffectTemplate.skins) {
      expect(JSON.stringify(regressionSelectionEffectTemplate.render(params, skin))).toContain('jointly normal')
    }
  })

  it('explains the difference between two absolute risk reductions', () => {
    const params = { level: 3, baselineRiskPercent: 4, treatedRiskPercent: 2,
      baselineRiskBPercent: 12, treatedRiskBPercent: 9 }
    expect(JSON.stringify(riskFramingRelativeAbsoluteTemplate.solution(params))).toContain('-1.00 percentage points')
  })

  it('registers all 14 judgment templates in TEMPLATES', () => {
    const registeredIds = TEMPLATES.map((t) => t.id)
    for (const expectedId of EXPECTED_JUDGMENT_TEMPLATE_IDS) {
      expect(registeredIds).toContain(expectedId)
    }
  })

  it('satisfies bank constraints for judgment templates', () => {
    const judgmentTemplates = TEMPLATES.filter((t) => t.track === 'judgment')
    expect(judgmentTemplates.length).toBeGreaterThanOrEqual(14)

    const bankErrors = checkBank(judgmentTemplates, CONCEPTS)
    expect(bankErrors).toEqual([])
  })

  for (const expectedId of EXPECTED_JUDGMENT_TEMPLATE_IDS) {
    it(`template ${expectedId} varies the visible question at every level`, () => {
      const template = TEMPLATES.find((t) => t.id === expectedId)!
      for (const { level } of template.levels) {
        const prompts = new Set<string>()
        for (let seed = 0; seed < 1000; seed++) {
          const params = template.sample(makeRng(hashSeed(expectedId, level, seed)), level)
          prompts.add(JSON.stringify(template.render(params, template.skins[0])))
        }
        expect(prompts.size, `${expectedId} level ${level}`).toBeGreaterThanOrEqual(150)
      }
    })

    it(`template ${expectedId} passes checkTemplate with 200 seeds`, () => {
      const template = TEMPLATES.find((t) => t.id === expectedId)
      expect(template).toBeDefined()
      if (!template) return

      // General structure constraints
      expect(template.status).toBe('draft')
      expect(template.review.reviewer).toBeNull()
      expect(template.review.reviewedAt).toBeNull()
      expect(template.levels.length).toBeGreaterThanOrEqual(3)
      expect(template.levels.length).toBeLessThanOrEqual(6)
      expect(template.skins.length).toBeGreaterThanOrEqual(2)
      expect(template.misconceptions.length).toBeGreaterThanOrEqual(2)
      expect(template.steps.length).toBeGreaterThanOrEqual(3)
      expect(template.steps.length).toBeLessThanOrEqual(5)

      // Daily levels marked for ratings 1300-1700
      const ratingsInRange = template.levels
        .filter((l) => l.initialRating >= 1300 && l.initialRating <= 1700)
        .map((l) => l.level)
      if (ratingsInRange.length > 0) {
        expect(template.dailyLevels).toBeDefined()
        expect(template.dailyLevels?.length).toBeGreaterThan(0)
      }

      // 200 seed deep check
      const errors = checkTemplate(template, 200)
      expect(errors).toEqual([])
    })
  }
})
