import { describe, expect, it } from 'vitest'
import type { Template } from '../types.ts'
import { checkBank, checkTemplate } from '../../../../../scripts/content-check.ts'
import { CONCEPTS } from '../../catalog.ts'
import { makeRng, hashSeed } from '../../rng.ts'
import { parseAnswer, isCorrect } from '../../grading.ts'
import { MATH_DISCRETE, sequenceFoundation, sequenceAdvanced, recurrenceAudit, termOrder, divisorFoundation, divisorAdvanced, residueAudit, modularStrategy, functionFoundation, functionAdvanced, domainAudit, compositionOrder } from './depth-discrete.ts'

function exercise<P>(template: Template<P>) {
  it(`${template.id} is deterministic, valid and independently checked`, () => {
    expect(template.status).toBe('draft')
    expect(template.review.reviewer).toBeNull()
    expect(template.review.reviewedAt).toBeNull()
    expect(checkTemplate(template, 220)).toEqual([])
    for (const { level } of template.levels) {
      const answers = new Set<string>()
      let initialOrderCorrect = 0
      for (let i = 0; i < 100; i++) {
        const seed = hashSeed(template.id, level, i)
        const p = template.sample(makeRng(seed), level)
        expect(p).toEqual(template.sample(makeRng(seed), level))
        const spec = template.answer(p), solved = template.solve(p), verified = template.verify(p, makeRng(seed))
        expect(isCorrect(spec, solved, verified)).toBe(true)
        const parsed = parseAnswer(spec, typeof solved === 'number' ? String(solved) : solved)
        expect(parsed.ok).toBe(true)
        if (parsed.ok) expect(isCorrect(spec, solved, parsed.value)).toBe(true)
        if (spec.type === 'choice' || spec.type === 'multi') {
          expect(spec.options).toHaveLength(6)
          expect(new Set(spec.options.map(option => option.label)).size).toBe(6)
          answers.add(JSON.stringify(solved))
        }
        if (spec.type === 'sequence') {
          expect(spec.items).toHaveLength(6)
          expect(solved).toEqual(verified)
          if (isCorrect(spec, solved, spec.items.map(option => option.id))) initialOrderCorrect++
          answers.add(JSON.stringify(solved))
        }
      }
      if (answers.size) expect(answers.size).toBeGreaterThanOrEqual(4)
      expect(initialOrderCorrect).toBeLessThan(20)
    }
  })
}

describe('Math discrete depth', () => {
  it('adds four different families per owned concept', () => {
    expect(MATH_DISCRETE).toHaveLength(12)
    expect(checkBank([...MATH_DISCRETE], CONCEPTS)).toEqual([])
    for (const concept of ['sequences', 'divisibility', 'functions']) {
      const templates = MATH_DISCRETE.filter(t => t.concept === `math.${concept}`)
      expect(templates).toHaveLength(4)
      expect(new Set(templates.map(t => t.family)).size).toBe(4)
      expect(templates.find(t => t.id.includes('.foundation.'))?.levels.map(l => l.initialRating)).toEqual([400, 600, 800, 1000, 1200, 1400])
      expect(templates.find(t => t.id.includes('.advanced.'))?.levels.map(l => l.initialRating)).toEqual([1800, 2100, 2400, 2700])
    }
  })

  it('checks arithmetic, periodic blocks and finite differences by hand', () => {
    const p = { level: 2, first: 3, step: 4, curvature: 0, ratio: 1, count: 9, block: [2, 5, 7] }
    expect(sequenceFoundation.solve(p)).toBe(35)
    expect(sequenceFoundation.solve({ ...p, level: 6, count: 8 })).toBe(35)
  })

  it('checks telescoping, alternating weights and lagged boundary cancellation', () => {
    const p = { level: 1, initial: 2, step: 3, alternate: 3, shift: 0, start: 0, count: 4, lag: 1 }
    expect(sequenceAdvanced.solve(p)).toBeCloseTo((1 / 2 - 1 / 14) / 3, 12)
    expect(sequenceAdvanced.solve({ ...p, level: 3, alternate: 5 })).toBeCloseTo(1 / 2 - 1 / 18, 12)
    expect(sequenceAdvanced.solve({ ...p, level: 4, lag: 2 })).toBeCloseTo((1 / 2 + 1 / 5 - 1 / 14 - 1 / 17) / 6, 12)
    expect(sequenceAdvanced.solve({ ...p, level: 2, shift: 7, count: 2 })).toBeCloseTo(5.025, 12)
  })

  it('checks noncoprime CRT, modular powers and binomial valuations', () => {
    const p = { level: 1, firstMod: 6, secondMod: 8, firstResidue: 1, secondResidue: 3, lower: 20, upper: 120, base: 6, exponent: 3, coefficient: 2, prime: 2, n: 10, k: 3, start: 3, count: 3, scale: 2, offset: 1 }
    expect(divisorAdvanced.solve(p)).toBe(43)
    expect(divisorAdvanced.solve({ ...p, level: 2, firstMod: 3, secondMod: 5 })).toBe(3)
    expect(divisorAdvanced.solve({ ...p, level: 3 })).toBe(8)
    expect(divisorAdvanced.solve({ ...p, level: 4, lower: 0, upper: 200, exponent: 2 })).toBe(8)
  })

  it('checks function inverses, identities and involution branches', () => {
    expect(functionFoundation.solve({ level: 2, a: 3, b: 5, c: 2, d: 4, x: 7, cut: 0, pole: 0 })).toBe(7)
    const p = { level: 1, a: 2, b: 3, first: 4, second: 2, weight: 5, shift: 0, point: 2, image: 7, secondImage: 0, argument: 10, otherArgument: 12, iterations: 3, otherIterations: 2 }
    expect(functionAdvanced.solve(p)).toBe(114)
    expect(functionAdvanced.solve({ ...p, level: 3 })).toBe(-1)
    expect(functionAdvanced.solve({ ...p, level: 4, shift: 1, point: 3, image: 5, secondImage: 7, argument: 9, otherArgument: 5, iterations: 3, otherIterations: 2 })).toBeCloseTo(79 / 3, 10)
  })

  it('retains the cancelled hole through reciprocal and square-root compositions', () => {
    const p = { level: 1, hole: 3, shift: 1, reciprocal: 4, cutoff: 1, probe: 7, order: [0, 1, 2, 3, 4, 5], asserted: [true, true, true, true, true, true] }
    expect(domainAudit.solve(p)).toEqual(['claim-2', 'claim-4', 'claim-6'])
    expect(domainAudit.solve({ ...p, level: 2 })).toEqual(['claim-3', 'claim-4', 'claim-6'])
    expect(domainAudit.solve({ ...p, level: 3, hole: 1 })).toEqual(['claim-2', 'claim-3', 'claim-4', 'claim-5', 'claim-6'])
    expect(domainAudit.solve({ ...p, level: 3, hole: 2 })).toEqual(['claim-5', 'claim-6'])
  })

  it('keeps six distinct modular proposals when the correct residue is minus one', () => {
    const p = modularStrategy.sample(makeRng(hashSeed(modularStrategy.id, 2, 2)), 2)
    const spec = modularStrategy.answer(p)
    expect(spec.type).toBe('choice')
    if (spec.type === 'choice') expect(new Set(spec.options.map(option => option.label)).size).toBe(6)
  })

  it('does not make the modal proposal coordinates a reliable answer shortcut', () => {
    for (const { level } of modularStrategy.levels) {
      let uniqueGuesses = 0, correctGuesses = 0
      for (let seed = 0; seed < 300; seed++) {
        const p = modularStrategy.sample(makeRng(hashSeed('modal-strategy', level, seed)), level), spec = modularStrategy.answer(p)
        if (spec.type !== 'choice') throw new Error('Expected a choice')
        const coordinates = spec.options.map(option => { const match = option.label.match(/^(\d*)x≡(\d+) \(mod (\d+)\)/)!; return [Number(match[1] || 1), Number(match[2]), Number(match[3])] })
        const scores = coordinates.map(row => row.reduce((score, value, index) => score + coordinates.filter(other => other[index] === value).length, 0))
        const best = scores.flatMap((score, i) => score === Math.max(...scores) ? [i] : [])
        if (best.length === 1) { uniqueGuesses++; if (spec.options[best[0]].id === modularStrategy.solve(p)) correctGuesses++ }
      }
      expect(uniqueGuesses).toBeGreaterThan(20)
      expect(correctGuesses / uniqueGuesses).toBeLessThan(0.5)
    }
  })
})

exercise(sequenceFoundation); exercise(sequenceAdvanced); exercise(recurrenceAudit); exercise(termOrder)
exercise(divisorFoundation); exercise(divisorAdvanced); exercise(residueAudit); exercise(modularStrategy)
exercise(functionFoundation); exercise(functionAdvanced); exercise(domainAudit); exercise(compositionOrder)
