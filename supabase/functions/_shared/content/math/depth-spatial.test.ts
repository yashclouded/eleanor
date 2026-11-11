import { describe, expect, it } from 'vitest'
import type { Template } from '../types.ts'
import { makeRng, hashSeed } from '../../rng.ts'
import { isCorrect, parseAnswer } from '../../grading.ts'
import { checkBank, checkTemplate } from '../../../../../scripts/content-check.ts'
import { CONCEPTS } from '../../catalog.ts'
import { MATH_SPATIAL, measurementFoundation, circlePowerAdvanced, transformationAudit, reflectionRoute, extremaFoundation, constrainedExtrema, sharpBoundAudit, rearrangementAssignment } from './depth-spatial.ts'

function exercise<P>(t: Template<P>) {
  it(`${t.id}: independently verifies every difficulty and keeps canonical answers valid`, () => {
    expect(checkTemplate(t, 250)).toEqual([])
    expect(t.status).toBe('draft')
    expect(t.review.reviewer).toBeNull()
    expect(t.review.reviewedAt).toBeNull()
    for (const { level } of t.levels) {
      const prompts = new Set<string>(), answers = new Set<string>(), positions = new Set<number>()
      for (let i = 0; i < 100; i++) {
        const seed = hashSeed(t.id, level, i), p = t.sample(makeRng(seed), level)
        expect(p).toEqual(t.sample(makeRng(seed), level))
        const answer = t.solve(p), spec = t.answer(p)
        const parsed = parseAnswer(spec, typeof answer === 'number' ? String(answer) : answer)
        expect(parsed.ok).toBe(true)
        if (parsed.ok) expect(isCorrect(spec, answer, parsed.value)).toBe(true)
        if (spec.type === 'choice' || spec.type === 'multi') expect(spec.options).toHaveLength(6)
        if (spec.type === 'sequence') expect(spec.items).toHaveLength(6)
        if (spec.type === 'choice') positions.add(spec.options.findIndex(o => o.id === answer))
        prompts.add(JSON.stringify(t.render(p, t.skins[0])))
        answers.add(JSON.stringify(answer))
      }
      expect(prompts.size).toBeGreaterThanOrEqual(50)
      if (positions.size) expect(positions.size).toBeGreaterThanOrEqual(4)
      if (t.id.includes('.variety.')) expect(answers.size).toBeGreaterThanOrEqual(4)
    }
  })
}

describe('Math geometry and optimization depth', () => {
  it('uses only visible triangle measurements in a wrong-method diagnostic', () => {
    const p = { level: 2, a: 6, b: 8, c: 1, scale: 2 }
    const misconception = measurementFoundation.misconceptions[1]
    expect(misconception.value(p)).toBe(14)
    expect(misconception.value({ ...p, c: 99 })).toBe(misconception.value(p))
  })
  it('adds four distinct draft families per concept with easy and advanced ladders', () => {
    expect(MATH_SPATIAL).toHaveLength(8)
    expect(new Set(MATH_SPATIAL.map(t => t.family)).size).toBe(8)
    expect(checkBank([...MATH_SPATIAL], CONCEPTS)).toEqual([])
    for (const concept of ['geometry', 'optimization']) expect(MATH_SPATIAL.filter(t => t.concept === `math.${concept}`)).toHaveLength(4)
    for (const t of [measurementFoundation, extremaFoundation]) expect(t.levels.map(l => l.initialRating)).toEqual([400, 600, 800, 1000, 1200, 1400])
    for (const t of [circlePowerAdvanced, constrainedExtrema]) expect(t.levels.map(l => l.initialRating)).toEqual([1800, 2100, 2400, 2700])
  })
  exercise(measurementFoundation)
  exercise(circlePowerAdvanced)
  exercise(transformationAudit)
  exercise(reflectionRoute)
  exercise(extremaFoundation)
  exercise(constrainedExtrema)
  exercise(sharpBoundAudit)
  exercise(rearrangementAssignment)

  it('checks circle-power products, tangent lengths, quadratic whole lengths and sharp chord bounds', () => {
    expect(circlePowerAdvanced.solve({ level: 1, a: 6, b: 8, c: 3, d: 0 })).toBe(16)
    expect(circlePowerAdvanced.solve({ level: 2, a: 9, b: 7, c: 0, d: 0 })).toBe(12)
    expect(circlePowerAdvanced.solve({ level: 3, a: 2, b: 0, c: 3, d: 13 })).toBe(6)
    expect(circlePowerAdvanced.solve({ level: 4, a: 9, b: 16, c: 0, d: 0 })).toBe(24)
  })

  it('classifies transformations by the requested invariant rather than their names', () => {
    const p = { level: 1, matrices: [[1, 0, 0, 1], [0, -1, 1, 0], [1, 0, 0, -1], [2, 0, 0, 2], [1, 1, 0, 1], [1, 0, 0, 0]], order: ['a', 'b', 'c', 'd', 'e', 'f'] }
    expect(transformationAudit.solve(p)).toEqual(['a', 'b', 'c'])
    expect(transformationAudit.solve({ ...p, level: 2 })).toEqual(['a', 'b', 'c', 'e'])
    expect(transformationAudit.solve({ ...p, level: 3 })).toEqual(['a', 'b', 'd'])
  })

  it('uses reflection for a boundary route, then respects a restricted gate', () => {
    const p = { level: 2, ax: 0, ay: 3, bx: 10, by: 7, low: 0, high: 10, candidates: [0, 2, 3, 5, 8, 10].map((x, i) => ({ id: 'abcdef'[i], x })) }
    expect(reflectionRoute.solve(p)).toBe('c')
    expect(reflectionRoute.solve({ ...p, level: 3, low: 5, high: 12, candidates: [5, 6, 7, 8, 9, 10].map((x, i) => ({ id: 'abcdef'[i], x })) })).toBe('a')
  })

  it('solves four different constrained extrema with exact feasibility', () => {
    const base = { level: 1, a: 2, b: 3, budget: 17, capX: 5, capY: 5, sum: 10, lower: [1, 1, 1], lo: 1, hi: 9, modulus: 4, residue: 1 }
    expect(constrainedExtrema.solve(base)).toBe(12)
    expect(constrainedExtrema.solve({ ...base, level: 2 })).toBe(36)
    expect(constrainedExtrema.solve({ ...base, level: 3 })).toBe(2.5)
    expect(constrainedExtrema.solve({ ...base, level: 4, a: 3, b: 2, sum: 20, hi: 19 })).toBe(22)
  })

  it('distinguishes an upper bound from integer attainability and equality conditions', () => {
    expect(sharpBoundAudit.solve({ level: 1, sum: 5, lower: [1, 1], order: ['a', 'b', 'c', 'd', 'e', 'f'] })).toEqual(['b', 'd', 'e'])
    expect(sharpBoundAudit.solve({ level: 3, sum: 12, lower: [8, 1, 1], order: ['a', 'b', 'c', 'd', 'e', 'f'] })).toEqual(['c', 'f'])
  })

  it('handles opposite ordering and a compulsory assignment', () => {
    const p = { level: 1, weights: [1, 2, 3, 4, 5, 6], values: [10, 20, 30, 40, 50, 60], fixedId: 'a', fixedSlot: 5, maximize: true, order: ['f', 'a', 'c', 'e', 'b', 'd'] }
    expect(rearrangementAssignment.solve(p)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(rearrangementAssignment.solve({ ...p, level: 2, maximize: false })).toEqual(['f', 'e', 'd', 'c', 'b', 'a'])
    expect(rearrangementAssignment.solve({ ...p, level: 3 })).toEqual(['b', 'c', 'd', 'e', 'f', 'a'])
  })

  it('never encodes unknown lengths in diagram positions', () => {
    function layouts<P>(t: Template<P>) { for (const { level } of t.levels) {
      const layouts = new Set<string>()
      for (let i = 0; i < 30; i++) {
        const p = t.sample(makeRng(hashSeed(t.id, level, i)), level)
        const diagrams = t.render(p, t.skins[0]).filter(b => b.t === 'diagram')
        layouts.add(JSON.stringify(diagrams.map(d => ({ points: d.points.map(({ x, y }) => ({ x, y })), segments: d.segments.map(({ from, to }) => ({ from, to })), circles: d.circles?.map(({ x, y, r }) => ({ x, y, r })) }))))
      }
      expect(layouts.size).toBe(1)
    } }
    layouts(measurementFoundation)
    layouts(circlePowerAdvanced)
    layouts(reflectionRoute)
  })
})
