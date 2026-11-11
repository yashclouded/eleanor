import { describe, expect, it } from 'vitest'
import { measureCapacity } from './judgment-capacity.ts'
import { TEMPLATES } from '../supabase/functions/_shared/registry.ts'
import { CONCEPTS } from '../supabase/functions/_shared/catalog.ts'

describe('Judgment depth and honest capacity', () => {
  it('covers each topic from foundations to advanced reasoning', () => {
    for (const concept of CONCEPTS.filter((c) => c.track === 'judgment')) {
      const templates = TEMPLATES.filter((t) => t.concept === concept.id)
      expect(templates.length, concept.id).toBeGreaterThanOrEqual(3)
      expect(Math.min(...templates.flatMap((t) => t.levels.map((l) => l.initialRating))), concept.id).toBeLessThanOrEqual(600)
      expect(Math.max(...templates.flatMap((t) => t.levels.map((l) => l.initialRating))), concept.id).toBeGreaterThanOrEqual(2600)
    }
  })

  it('counts visible prompts globally, excluding unused parameters, skins and item IDs', () => {
    const onePrompt: typeof TEMPLATES[number] = {
      ...TEMPLATES[0], id: 'capacity.fixture', skins: ['first', 'second'],
      sample: (rng) => ({ unused: rng.next() }),
      render: () => [{ t: 'p', text: 'An identical visible question.' }],
    }
    expect(measureCapacity([onePrompt, { ...onePrompt, id: 'capacity.duplicate' }], 10).uniquePrompts).toBe(1)
    expect(measureCapacity([onePrompt], 10)).toEqual(measureCapacity([onePrompt], 10))
    expect(() => measureCapacity([onePrompt], 0)).toThrow('positive integer')
  })
})
