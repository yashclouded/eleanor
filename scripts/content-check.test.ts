import { describe, expect, it } from 'vitest'
import { checkAll, checkBank, checkTemplate } from './content-check.ts'
import { CONCEPTS } from '../supabase/functions/_shared/catalog.ts'
import { TEMPLATES } from '../supabase/functions/_shared/registry.ts'
import type { Concept, Template } from '../supabase/functions/_shared/content/types.ts'

// Minimal valid fake template base
function createValidFakeTemplate(): Template<{ val: number }> {
  return {
    id: 'test.fake.template',
    version: 1,
    track: 'logic',
    concept: 'judgment.frequencies',
    family: 'test-fake',
    status: 'draft',
    review: {
      author: 'Test Author',
      reviewer: null,
      reviewedAt: null,
    },
    levels: [
      { level: 1, initialRating: 1000 },
      { level: 2, initialRating: 1200 },
      { level: 3, initialRating: 1400 },
    ],
    skins: ['default', 'alt'],
    sample(rng, level) {
      return { val: level * 100 + rng.int(1, 100) }
    },
    solve(p) {
      return p.val
    },
    verify(p) {
      return p.val
    },
    render(p) {
      return [{ t: 'p', text: `Sample prompt with value ${p.val}` }]
    },
    answer() {
      return { type: 'integer' }
    },
    misconceptions: [
      {
        id: 'wrong-offset',
        value: (p) => p.val + 50,
        feedback: () => 'Offset error',
      },
    ],
    steps: [
      {
        prompt: (p) => [{ t: 'p', text: `Step for ${p.val}` }],
        answer: (p) => p.val,
        tolerance: { abs: 0 },
        explain: (p) => [{ t: 'p', text: `Explain ${p.val}` }],
      },
    ],
    solution(p) {
      return [{ t: 'p', text: `Solution is ${p.val}` }]
    },
  }
}

describe('content-check suite', () => {
  it('detects when verify disagrees with solve', () => {
    const broken = createValidFakeTemplate()
    broken.verify = (p) => p.val + 999

    const errors = checkTemplate(broken, 50)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.includes('verify') && e.includes('disagree'))).toBe(true)
  })

  it('detects when a misconception equals the answer on every seed', () => {
    const broken = createValidFakeTemplate()
    // Misconception always returns the correct answer
    broken.misconceptions = [
      {
        id: 'identical-to-correct',
        value: (p) => p.val,
        feedback: () => 'Always wrong feedback',
      },
    ]

    const errors = checkTemplate(broken, 50)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.includes('dropped all misconceptions'))).toBe(true)
  })

  it('detects cyclic prerequisite chains in concepts', () => {
    const cyclicConcepts: Concept[] = [
      {
        id: 'cycle.a',
        track: 'logic',
        name: 'Concept A',
        summary: 'A',
        prereqs: ['cycle.b'],
        entryRating: 800,
        sort: 1,
      },
      {
        id: 'cycle.b',
        track: 'logic',
        name: 'Concept B',
        summary: 'B',
        prereqs: ['cycle.c'],
        entryRating: 900,
        sort: 2,
      },
      {
        id: 'cycle.c',
        track: 'logic',
        name: 'Concept C',
        summary: 'C',
        prereqs: ['cycle.a'],
        entryRating: 1000,
        sort: 3,
      },
    ]

    const errors = checkBank([], cyclicConcepts)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.includes('Cycle detected in concept prerequisites'))).toBe(true)
  })

  it('detects published templates without a reviewer or reviewedAt date', () => {
    const broken = createValidFakeTemplate()
    broken.status = 'published'
    broken.review = {
      author: 'Test Author',
      reviewer: null,
      reviewedAt: null,
    }

    const errors = checkBank([broken], CONCEPTS)
    expect(errors.length).toBeGreaterThan(0)
    expect(
      errors.some((e) => e.includes('marked \'published\' but missing reviewer or reviewedAt')),
    ).toBe(true)
  })

  it('passes on the real bank templates and catalog concepts', () => {
    const errors = checkAll(TEMPLATES, CONCEPTS, 200)
    expect(errors).toEqual([])
  })
})
