import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../../registry.ts'
import { CONCEPTS } from '../../catalog.ts'
import { checkBank, checkTemplate } from '../../../../../scripts/content-check.ts'

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
