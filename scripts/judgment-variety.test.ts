import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../supabase/functions/_shared/registry.ts'
import { CONCEPTS } from '../supabase/functions/_shared/catalog.ts'
import { makeRng, hashSeed } from '../supabase/functions/_shared/rng.ts'
import { parseAnswer } from '../supabase/functions/_shared/grading.ts'

describe('Judgment structural variety', () => {
  const added = TEMPLATES.filter(t => t.id.startsWith('judgment.') && t.id.includes('.variety.'))

  it('adds eighteen distinct families, two per topic, without replacing the existing bank', () => {
    expect(added).toHaveLength(18)
    expect(TEMPLATES.filter(t => t.track === 'judgment')).toHaveLength(50)
    expect(new Set(added.map(t => t.family)).size).toBe(18)
    for (const concept of CONCEPTS.filter(c => c.track === 'judgment')) {
      expect(added.filter(t => t.concept === concept.id), concept.id).toHaveLength(2)
    }
    const existing = new Set(TEMPLATES.filter(t => !added.includes(t)).map(t => t.family))
    expect(added.some(t => existing.has(t.family))).toBe(false)
  })

  it('adds multiple decision, claim-audit and ordering tasks', () => {
    const types = added.map(t => t.answer(t.sample(makeRng(1), t.levels[0].level)).type)
    expect(types.filter(type => type === 'choice').length).toBeGreaterThanOrEqual(4)
    expect(types.filter(type => type === 'multi').length).toBeGreaterThanOrEqual(3)
    expect(types.filter(type => type === 'sequence').length).toBeGreaterThanOrEqual(2)
  })

  it('produces valid canonical selections and varies their positions or ordering', () => {
    for (const t of added) {
      const answers = new Set<string>()
      const positions = new Set<string>()
      let sequences = 0
      let alreadyOrdered = 0
      for (const { level } of t.levels) {
        for (let seed = 0; seed < 100; seed++) {
          const p = t.sample(makeRng(hashSeed(t.id, level, seed)), level)
          const spec = t.answer(p)
          const correct = t.solve(p)
          expect(parseAnswer(spec, typeof correct === 'number' ? String(correct) : correct).ok, `${t.id} level ${level}`).toBe(true)
          if (spec.type === 'choice' || spec.type === 'multi') expect(spec.options.length).toBeGreaterThanOrEqual(6)
          if (spec.type === 'sequence') expect(spec.items.length).toBeGreaterThanOrEqual(6)
          const options = spec.type === 'sequence' ? spec.items : spec.type === 'choice' || spec.type === 'multi' ? spec.options : []
          expect(new Set(options.map(option => option.id)).size).toBe(options.length)
          expect(new Set(options.map(option => option.label)).size).toBe(options.length)
          expect(options.some(option => /correct|wrong|solution|answer/i.test(option.id))).toBe(false)
          if (spec.type === 'choice' || spec.type === 'multi' || spec.type === 'sequence') answers.add(JSON.stringify(correct))
          if (spec.type === 'choice') positions.add(String(spec.options.findIndex(option => option.id === correct)))
          if (spec.type === 'multi' && Array.isArray(correct)) positions.add(JSON.stringify(spec.options.flatMap((option, index) => correct.includes(option.id) ? [index] : [])))
          if (spec.type === 'sequence' && Array.isArray(correct)) {
            positions.add(JSON.stringify(correct.map(id => spec.items.findIndex(item => item.id === id))))
            sequences++
            if (spec.items.every((item, index) => item.id === correct[index])) alreadyOrdered++
          }
        }
      }
      const firstSpec = t.answer(t.sample(makeRng(1), t.levels[0].level))
      if (['choice', 'multi', 'sequence'].includes(firstSpec.type)) {
        expect(answers.size, t.id).toBeGreaterThanOrEqual(4)
        expect(positions.size, `${t.id} answer positions`).toBeGreaterThanOrEqual(4)
      }
      if (sequences) expect(alreadyOrdered / sequences, `${t.id} default order`).toBeLessThan(0.2)
    }
  })
})
