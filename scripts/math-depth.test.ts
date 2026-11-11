import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../supabase/functions/_shared/registry.ts'
import { CONCEPTS } from '../supabase/functions/_shared/catalog.ts'
import { hashSeed, makeRng } from '../supabase/functions/_shared/rng.ts'
import { isCorrect, parseAnswer } from '../supabase/functions/_shared/grading.ts'

const bank = TEMPLATES.filter(t => t.track === 'math')
const added = bank.filter(t => /\.(foundation|advanced|variety)\./.test(t.id))

describe('Math depth and structural variety', () => {
  it('preserves the twelve originals and adds four mechanisms to each topic', () => {
    expect(bank).toHaveLength(44)
    expect(added).toHaveLength(32)
    expect(new Set(added.map(t => t.family)).size).toBe(32)
    const oldFamilies = new Set(bank.filter(t => !added.includes(t)).map(t => t.family))
    expect(added.some(t => oldFamilies.has(t.family))).toBe(false)
    for (const concept of CONCEPTS.filter(c => c.track === 'math')) {
      const topic = added.filter(t => t.concept === concept.id)
      expect(topic.filter(t => t.id.includes('.foundation.')), concept.id).toHaveLength(1)
      expect(topic.filter(t => t.id.includes('.advanced.')), concept.id).toHaveLength(1)
      expect(topic.filter(t => t.id.includes('.variety.')), concept.id).toHaveLength(2)
      expect(Math.min(...topic.flatMap(t => t.levels.map(l => l.initialRating)))).toBeLessThanOrEqual(400)
      expect(Math.max(...topic.flatMap(t => t.levels.map(l => l.initialRating)))).toBeGreaterThanOrEqual(2700)
    }
  })

  it('adds selection, claim audits, ordering and visual reasoning', () => {
    const types = added.map(t => t.answer(t.sample(makeRng(42), t.levels[0].level)).type)
    expect(types.filter(type => type === 'choice').length).toBeGreaterThanOrEqual(3)
    expect(types.filter(type => type === 'multi').length).toBeGreaterThanOrEqual(3)
    expect(types.filter(type => type === 'sequence').length).toBeGreaterThanOrEqual(2)
    const visual = added.filter(t => t.render(t.sample(makeRng(42), t.levels[0].level), t.skins[0]).some(b => b.t === 'chart' || b.t === 'diagram'))
    expect(visual.length).toBeGreaterThanOrEqual(3)
  })

  it('keeps valid answers, independent verification and changing answer positions', () => {
    for (const t of added) {
      expect(t.status, t.id).toBe('draft')
      expect(t.review.reviewer).toBeNull()
      expect(t.review.reviewedAt).toBeNull()
      const ids = new Set<string>(), positions = new Set<number>()
      let sequences = 0, alreadyOrdered = 0
      for (const { level } of t.levels) {
        for (let seed = 0; seed < 100; seed++) {
          const p = t.sample(makeRng(hashSeed(t.id, level, seed)), level)
          const spec = t.answer(p), answer = t.solve(p)
          expect(parseAnswer(spec, typeof answer === 'number' ? String(answer) : answer).ok, t.id).toBe(true)
          expect(isCorrect(spec, answer, t.verify(p, makeRng(seed))), `${t.id} L${level}`).toBe(true)
          if (spec.type === 'choice' || spec.type === 'multi' || spec.type === 'sequence') {
            const options = spec.type === 'sequence' ? spec.items : spec.options
            expect(options.length, t.id).toBeGreaterThanOrEqual(6)
            expect(new Set(options.map(o => o.label)).size, t.id).toBe(options.length)
            expect(options.some(o => /correct|wrong|answer|solution/i.test(o.id)), t.id).toBe(false)
            ids.add(JSON.stringify(answer))
            if (spec.type === 'choice') positions.add(options.findIndex(o => o.id === answer))
            if (spec.type === 'sequence') {
              sequences++
              if (JSON.stringify(options.map(o => o.id)) === JSON.stringify(answer)) alreadyOrdered++
            }
          }
        }
      }
      if (ids.size) expect(ids.size, t.id).toBeGreaterThanOrEqual(4)
      if (positions.size) expect(positions.size, t.id).toBeGreaterThanOrEqual(4)
      if (sequences) expect(alreadyOrdered / sequences, t.id).toBeLessThan(0.2)
    }
  })

  it('keeps unknown geometry out of the schematic drawing coordinates', () => {
    let diagrams = 0
    for (const t of added.filter(t => t.concept === 'math.geometry')) {
      for (const { level } of t.levels) {
        const layouts = new Set<string>()
        for (let seed = 1; seed <= 30; seed++) {
          const p = t.sample(makeRng(hashSeed(t.id, level, seed)), level)
          const blocks = t.render(p, t.skins[0]).filter(b => b.t === 'diagram')
          if (!blocks.length) continue
          diagrams++
          expect(blocks.every(b => /schematic|not to scale/i.test(b.description)), t.id).toBe(true)
          layouts.add(JSON.stringify(blocks.map(b => ({
            points: b.points.map(point => [point.x, point.y]),
            segments: b.segments.map(s => [s.from, s.to]),
            circles: b.circles?.map(c => [c.x, c.y, c.r]),
          }))))
        }
        if (layouts.size) expect(layouts.size, `${t.id} L${level}: layout must not encode unknown measurements`).toBe(1)
      }
    }
    expect(diagrams).toBeGreaterThan(0)
  })

  it('prevents a modal numeric guess from bypassing advanced or varied reasoning', () => {
    for (const t of added.filter(t => /\.(advanced|variety)\./.test(t.id))) {
      for (const { level } of t.levels) {
        const counts = new Map<number, number>()
        for (let seed = 0; seed < 1000; seed++) {
          const p = t.sample(makeRng(hashSeed('math-modal-audit', t.id, level, seed)), level)
          const answer = t.solve(p)
          if (typeof answer !== 'number') break
          counts.set(answer, (counts.get(answer) ?? 0) + 1)
        }
        if (!counts.size) continue
        expect(Math.max(...counts.values()) / 1000, `${t.id} L${level}: one answer dominates the sampler`).toBeLessThan(0.75)
        expect(((counts.get(0) ?? 0) + (counts.get(-1) ?? 0)) / 1000, `${t.id} L${level}: too many empty/no-solution cases`).toBeLessThan(0.4)
      }
    }
  })
})
