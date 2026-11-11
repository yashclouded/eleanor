import { describe, expect, it } from 'vitest'
import type { Template } from '../types.ts'
import type { TEMPLATES } from '../../registry.ts'
import { parseAnswer, isCorrect } from '../../grading.ts'
import { makeRng, hashSeed } from '../../rng.ts'
import { checkTemplate } from '../../../../../scripts/content-check.ts'
import { VARIETY_DECISIONS, minimaxRegretTemplate, stoppingTemplate, dominanceTemplate, riskReportTemplate, provenanceTemplate, coherenceTemplate } from './variety-decisions.ts'

describe('Judgment decision and evidence variety', () => {
  it('places plausible incorrect risk estimates on either side of the correct estimate', () => {
    for (const level of [1, 2, 3]) {
      const ranks = new Set<number>()
      for (let seed = 0; seed < 100; seed++) {
        const p = riskReportTemplate.sample(makeRng(seed), level)
        const includesNull = p.low <= 0 && p.high >= 0
        const plausible = p.claims.filter(claim => !claim.guaranteed && claim.years === p.years && claim.absolute <= claim.relative && (level < 3 || claim.acknowledgesNull === includesNull)).sort((a, b) => a.absolute - b.absolute)
        ranks.add(plausible.findIndex(claim => claim.id === riskReportTemplate.solve(p)))
      }
      expect(ranks.size).toBeGreaterThanOrEqual(2)
    }
  })

  it('requires risk calculations even after eliminating implausible caution and horizon choices', () => {
    for (const level of [1, 2, 3]) for (let seed = 0; seed < 100; seed++) {
      const p = riskReportTemplate.sample(makeRng(seed), level)
      const includesNull = p.low <= 0 && p.high >= 0
      const plausible = p.claims.filter(claim => !claim.guaranteed && claim.years === p.years && claim.absolute <= claim.relative && (level < 3 || claim.acknowledgesNull === includesNull))
      expect(plausible.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('varies whether a supplied risk interval includes no difference', () => {
    const cases = new Set(Array.from({ length: 100 }, (_, seed) => {
      const p = riskReportTemplate.sample(makeRng(seed), 3)
      return p.low <= 0 && p.high >= 0
    }))
    expect(cases.size).toBe(2)
  })

  it('does not reveal the coherent book as a central modal quote vector', () => {
    for (const level of [1, 2, 3]) {
      let revealed = 0
      for (let seed = 0; seed < 100; seed++) {
        const p = coherenceTemplate.sample(makeRng(seed), level)
        const modes = p.books.filter(book => book.quotes.every((quote, field) => {
          const counts = p.books.map(candidate => p.books.filter(other => other.quotes[field] === candidate.quotes[field]).length)
          return p.books.filter(candidate => candidate.quotes[field] === quote).length === Math.max(...counts)
        }))
        if (modes.length === 1 && modes[0].id === coherenceTemplate.solve(p)) revealed++
      }
      expect(revealed).toBeLessThan(25)
    }
  })

  it('does not reveal the risk report as the unique combination of modal option fields', () => {
    for (const level of [1, 2, 3]) {
      let revealed = 0
      for (let seed = 0; seed < 100; seed++) {
        const p = riskReportTemplate.sample(makeRng(seed), level)
        const fields: (keyof typeof p.claims[number])[] = ['absolute', 'relative', 'years', 'guaranteed', ...(level === 3 ? ['acknowledgesNull' as const] : [])]
        const modes = p.claims.filter(claim => fields.every(field => {
          const frequencies = p.claims.map(other => p.claims.filter(candidate => candidate[field] === other[field]).length)
          return p.claims.filter(other => other[field] === claim[field]).length === Math.max(...frequencies)
        }))
        if (modes.length === 1 && modes[0].id === riskReportTemplate.solve(p)) revealed++
      }
      expect(revealed).toBe(0)
    }
  })

  it('does not reveal the coherent book by always giving it the smallest quote total', () => {
    for (const level of [1, 2, 3]) {
      const ranks = new Set<number>()
      for (let seed = 0; seed < 100; seed++) {
        const p = coherenceTemplate.sample(makeRng(seed), level)
        const winner = coherenceTemplate.solve(p)
        const total = p.books.find(book => book.id === winner)!.quotes.reduce((a, b) => a + b, 0)
        ranks.add(p.books.filter(book => book.quotes.reduce((a, b) => a + b, 0) < total).length)
      }
      expect(ranks.size).toBeGreaterThanOrEqual(3)
    }
  })

  it('makes each supplied regret column attainable at zero regret', () => {
    for (let seed = 0; seed < 100; seed++) {
      const p = minimaxRegretTemplate.sample(makeRng(seed), 1)
      for (let state = 0; state < p.values[0].length; state++) expect(Math.min(...p.values.map(row => row[state]))).toBe(0)
    }
  })

  it('adds two distinct families per target concept and mixed response mechanisms', () => {
    expect(VARIETY_DECISIONS).toHaveLength(6)
    expect(new Set(VARIETY_DECISIONS.map(t => t.family)).size).toBe(6)
    for (const concept of ['expected-value', 'risk-framing', 'odds']) expect(VARIETY_DECISIONS.filter(t => t.concept === `judgment.${concept}`)).toHaveLength(2)
    const templates: typeof TEMPLATES = [...VARIETY_DECISIONS]
    const formats = templates.map(t => t.answer(t.sample(makeRng(1), 1)).type)
    expect(formats.filter(f => f === 'choice').length).toBeGreaterThanOrEqual(2)
    expect(formats).toContain('multi')
    expect(formats).toContain('sequence')
  })

  function exercise<P>(t: Template<P>) {
    it(`${t.id}: verifies constrained levels across 250 seeds`, () => {
      expect(checkTemplate(t, 250)).toEqual([])
      expect(t.status).toBe('draft')
      expect(t.review.reviewer).toBeNull()
      expect(t.review.reviewedAt).toBeNull()
    })
    it(`${t.id}: canonical answers are valid and seed/order/selection varies`, () => {
      for (const { level } of t.levels) {
        const answers = new Set<string>(), prompts = new Set<string>()
        for (let i = 0; i < 100; i++) {
          const seed = hashSeed(t.id, level, i)
          const p = t.sample(makeRng(seed), level)
          expect(p).toEqual(t.sample(makeRng(seed), level))
          const answer = t.solve(p), spec = t.answer(p)
          const parsed = parseAnswer(spec, typeof answer === 'number' ? String(answer) : answer)
          expect(parsed.ok).toBe(true)
          if (parsed.ok) expect(isCorrect(spec, answer, parsed.value)).toBe(true)
          if (spec.type === 'choice' || spec.type === 'multi') {
            expect(spec.options).toHaveLength(6)
            expect(new Set(spec.options.map(o => o.id)).size).toBe(6)
            expect(new Set(spec.options.map(o => o.label)).size).toBe(6)
          }
          if (spec.type === 'sequence') expect(spec.items).toHaveLength(6)
          answers.add(JSON.stringify(answer))
          prompts.add(JSON.stringify(t.render(p, t.skins[0])))
          const solution = JSON.stringify(t.solution(p))
          if (typeof answer === 'string') expect(solution).toContain(answer.toUpperCase())
        }
        expect(answers.size).toBeGreaterThanOrEqual(4)
        expect(prompts.size).toBeGreaterThanOrEqual(50)
      }
    })
  }
  exercise(minimaxRegretTemplate)
  exercise(stoppingTemplate)
  exercise(dominanceTemplate)
  exercise(riskReportTemplate)
  exercise(provenanceTemplate)
  exercise(coherenceTemplate)

  it('chooses minimax regret rather than the largest possible payoff', () => {
    const p = { level: 2, values: [[100, 0], [80, 20], [60, 30], [50, 40], [40, 50], [0, 55]], fees: [0, 0, 0, 0, 0, 0], budget: 0, order: ['f', 'a', 'd', 'b', 'e', 'c'] }
    expect(minimaxRegretTemplate.solve(p)).toBe('b')
  })

  it('values adapting a finite stopping policy and retaining recalled offers', () => {
    expect(stoppingTemplate.solve({ level: 2, current: 5, offers: [[0, 10], [0, 10]], chance: [50, 50], fees: [1, 1] })).toBe(6)
    expect(stoppingTemplate.solve({ level: 3, current: 5, offers: [[0, 10], [0, 20], [0, 30]], chance: [50, 50, 50], fees: [1, 1, 1] })).toBe(18.875)
  })

  it('retains the Pareto frontier without inventing utility weights', () => {
    const p = { level: 1, cost: [10, 20, 15, 30, 25, 40], risk: [50, 30, 40, 45, 35, 60], upper: [50, 30, 40, 45, 35, 60], time: [1, 1, 1, 1, 1, 1], order: ['f', 'e', 'd', 'c', 'b', 'a'] }
    expect(dominanceTemplate.solve(p)).toEqual(['a', 'b', 'c'])
  })

  it('repairs a report while keeping the denominator, unit and time horizon', () => {
    const base = { absolute: 5, relative: 50, years: 2, guaranteed: false, acknowledgesNull: false }
    const p = { level: 1, nControl: 1000, nProtected: 1000, casesControl: 100, casesProtected: 50, years: 2, low: 0, high: 10, claims: [
      { ...base, id: 'a', absolute: 50 }, { ...base, id: 'b', relative: 0.5 }, { ...base, id: 'c' }, { ...base, id: 'd', years: 1 }, { ...base, id: 'e', guaranteed: true }, { ...base, id: 'f', absolute: 10 },
    ] }
    expect(riskReportTemplate.solve(p)).toBe('c')
  })

  it('counts independent evidence origins once and preserves strength order', () => {
    const p = { level: 1, priorA: 1, priorB: 9, packets: [1, 2, 3, 4, 5, 6].map((factor, i) => ({ id: 'abcdef'[i], signals: [{ factor: [factor, 1], copies: i === 0 ? 10 : 0, parent: null }] })) }
    expect(provenanceTemplate.solve(p)).toEqual(['f', 'e', 'd', 'c', 'b', 'a'])
    const expected = provenanceTemplate.solve(p)
    expect(isCorrect(provenanceTemplate.answer(p), expected, [...expected as string[]].reverse())).toBe(false)
  })

  it('finds a coherent partition and an overlapping-event probability book', () => {
    const books = [[40, 30, 31], [40, 30, 30], [40, 30, 29], [40, 30, 25], [40, 30, 35], [40, 30, 33]].map((quotes, i) => ({ id: 'abcdef'[i], quotes }))
    expect(coherenceTemplate.solve({ level: 1, books })).toBe('b')
    const overlaps = [71, 69, 70, 72, 68, 74].map((union, i) => ({ id: 'abcdef'[i], quotes: [50, 40, 20, union] }))
    expect(coherenceTemplate.solve({ level: 2, books: overlaps })).toBe('c')
  })
})
