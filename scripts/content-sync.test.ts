import { describe, expect, it } from 'vitest'
import {
  isLocalDatabaseUrl,
  assertAllowedDatabaseUrl,
  planSync,
  type ExistingItemRow,
  type SyncRegistry,
} from './content-sync.ts'
import type { Template } from '../supabase/functions/_shared/content/types.ts'

function createMockTemplate(overrides?: Partial<Template<unknown>>): Template<unknown> {
  return {
    id: 'test.template',
    version: 1,
    track: 'judgment',
    concept: 'judgment.frequencies',
    family: 'test-family',
    status: 'published',
    review: {
      author: 'Author',
      reviewer: 'Reviewer',
      reviewedAt: '2026-01-01',
    },
    levels: [
      { level: 1, initialRating: 900 },
      { level: 2, initialRating: 1100 },
    ],
    skins: ['default'],
    sample: () => ({}),
    solve: () => 42,
    verify: () => 42,
    render: () => [],
    answer: () => ({ type: 'integer' }),
    misconceptions: [],
    steps: [],
    solution: () => [],
    dailyLevels: [1],
    ...overrides,
  }
}

describe('content-sync: planSync', () => {
  it('inserts a new item at its initialRating with rd 250, n=0, anchor=false, status=published', () => {
    const template = createMockTemplate()
    const registry: SyncRegistry = { templates: [template] }
    const existingRows: ExistingItemRow[] = []

    const plan = planSync(registry, existingRows)

    expect(plan.toInsert).toHaveLength(2)
    expect(plan.toUpdate).toHaveLength(0)
    expect(plan.toRetire).toHaveLength(0)

    const item1 = plan.toInsert.find((i) => i.id === 'test.template@1#1')!
    expect(item1).toBeDefined()
    expect(item1.rating).toBe(900)
    expect(item1.rd).toBe(250)
    expect(item1.n).toBe(0)
    expect(item1.anchor).toBe(false)
    expect(item1.status).toBe('published')
    expect(item1.daily_eligible).toBe(true)

    const item2 = plan.toInsert.find((i) => i.id === 'test.template@1#2')!
    expect(item2).toBeDefined()
    expect(item2.rating).toBe(1100)
    expect(item2.rd).toBe(250)
    expect(item2.n).toBe(0)
    expect(item2.anchor).toBe(false)
    expect(item2.status).toBe('published')
    expect(item2.daily_eligible).toBe(false)
  })

  it('keeps learned rating, rd, n, and anchor for existing items, syncing only status and daily_eligible', () => {
    const template = createMockTemplate({ dailyLevels: [1, 2] })
    const registry: SyncRegistry = { templates: [template] }
    const existingRows: ExistingItemRow[] = [
      {
        id: 'test.template@1#1',
        kind: 'generated',
        source_id: 'test.template',
        source_version: 1,
        level: 1,
        track_id: 'judgment',
        concept_id: 'judgment.frequencies',
        family_id: 'test-family',
        rating: 1350.5,
        rd: 62.4,
        n: 120,
        anchor: true,
        status: 'published',
        daily_eligible: false, // Changed in template to true
      },
      {
        id: 'test.template@1#2',
        kind: 'generated',
        source_id: 'test.template',
        source_version: 1,
        level: 2,
        track_id: 'judgment',
        concept_id: 'judgment.frequencies',
        family_id: 'test-family',
        rating: 1400.0,
        rd: 75.0,
        n: 80,
        anchor: false,
        status: 'published',
        daily_eligible: true, // Matches template
      },
    ]

    const plan = planSync(registry, existingRows)

    expect(plan.toInsert).toHaveLength(0)
    expect(plan.toRetire).toHaveLength(0)
    // Only item 1 needed an update because daily_eligible changed from false to true
    expect(plan.toUpdate).toHaveLength(1)
    expect(plan.toUpdate[0]).toEqual({
      id: 'test.template@1#1',
      track_id: 'judgment',
      status: 'published',
      daily_eligible: true,
    })
  })

  it('retires existing items whose template version is missing from registry or whose template is retired', () => {
    // Template version 2 is now in registry; version 1 is missing
    const templateV2 = createMockTemplate({
      version: 2,
      levels: [{ level: 1, initialRating: 950 }],
    })
    const retiredTemplate = createMockTemplate({
      id: 'old.retired',
      version: 1,
      status: 'retired',
      levels: [{ level: 1, initialRating: 1000 }],
    })
    const registry: SyncRegistry = { templates: [templateV2, retiredTemplate] }

    const existingRows: ExistingItemRow[] = [
      {
        id: 'test.template@1#1', // Old version 1 no longer in registry
        kind: 'generated',
        source_id: 'test.template',
        source_version: 1,
        level: 1,
        track_id: 'judgment',
        concept_id: 'judgment.frequencies',
        family_id: 'test-family',
        rating: 1200,
        rd: 80,
        n: 25,
        anchor: false,
        status: 'published',
        daily_eligible: false,
      },
      {
        id: 'old.retired@1#1', // Template is marked retired
        kind: 'generated',
        source_id: 'old.retired',
        source_version: 1,
        level: 1,
        track_id: 'judgment',
        concept_id: 'judgment.frequencies',
        family_id: 'test-family',
        rating: 1000,
        rd: 250,
        n: 0,
        anchor: false,
        status: 'published',
        daily_eligible: false,
      },
      {
        id: 'already.retired@1#1', // Already retired
        kind: 'generated',
        source_id: 'already.retired',
        source_version: 1,
        level: 1,
        track_id: 'judgment',
        concept_id: 'judgment.frequencies',
        family_id: 'test-family',
        rating: 1000,
        rd: 250,
        n: 0,
        anchor: false,
        status: 'retired',
        daily_eligible: false,
      },
    ]

    const plan = planSync(registry, existingRows)

    expect(plan.toInsert).toHaveLength(1) // test.template@2#1
    expect(plan.toRetire).toHaveLength(2)
    expect(plan.toRetire.map((r) => r.id)).toEqual(
      expect.arrayContaining(['test.template@1#1', 'old.retired@1#1']),
    )
    // already.retired@1#1 is not re-retired
    expect(plan.toRetire.some((r) => r.id === 'already.retired@1#1')).toBe(false)
  })

  it('never deletes items (plan only contains inserts, updates, and retires)', () => {
    const registry: SyncRegistry = { templates: [] }
    const existingRows: ExistingItemRow[] = [
      {
        id: 'orphan@1#1',
        kind: 'generated',
        source_id: 'orphan',
        source_version: 1,
        level: 1,
        track_id: 'logic',
        concept_id: 'logic.deduction',
        family_id: 'orphan-family',
        rating: 1100,
        rd: 150,
        n: 10,
        anchor: false,
        status: 'published',
        daily_eligible: false,
      },
    ]

    const plan = planSync(registry, existingRows)

    // SyncPlan has no deletion mechanism: orphan becomes retired, not deleted
    expect(plan.toRetire).toHaveLength(1)
    expect(plan.toRetire[0].id).toBe('orphan@1#1')
    expect(plan.toRetire[0].status).toBe('retired')
  })

  it('respects includeDrafts flag: draft templates are ignored unless includeDrafts is true', () => {
    const draftTemplate = createMockTemplate({ status: 'draft' })
    const registry: SyncRegistry = { templates: [draftTemplate] }

    const planWithoutDrafts = planSync(registry, [], { includeDrafts: false })
    expect(planWithoutDrafts.toInsert).toHaveLength(0)

    const planWithDrafts = planSync(registry, [], { includeDrafts: true })
    expect(planWithDrafts.toInsert).toHaveLength(2)
    expect(planWithDrafts.toInsert.every((i) => i.status === 'published')).toBe(true)
  })
})

describe('content-sync: database URL validation', () => {
  it('correctly identifies local database URLs', () => {
    expect(isLocalDatabaseUrl('postgresql://postgres:postgres@127.0.0.1:54322/postgres')).toBe(true)
    expect(isLocalDatabaseUrl('postgresql://postgres:postgres@localhost:5432/postgres')).toBe(true)
    expect(isLocalDatabaseUrl('postgresql://user:pass@[::1]:5432/postgres')).toBe(true)
  })

  it('correctly identifies remote database URLs', () => {
    expect(isLocalDatabaseUrl('postgresql://postgres:pass@db.xyz.supabase.co:5432/postgres')).toBe(
      false,
    )
    expect(isLocalDatabaseUrl('postgresql://user:pass@production-db.internal:5432/postgres')).toBe(
      false,
    )
  })

  it('refuses --include-drafts for non-local database URLs', () => {
    expect(() =>
      assertAllowedDatabaseUrl('postgresql://postgres:pass@db.xyz.supabase.co:5432/postgres', true),
    ).toThrow(/--include-drafts is only allowed for local databases/)

    expect(() =>
      assertAllowedDatabaseUrl(
        'postgresql://postgres:pass@db.xyz.supabase.co:5432/postgres',
        false,
      ),
    ).not.toThrow()

    expect(() =>
      assertAllowedDatabaseUrl(
        'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
        true,
      ),
    ).not.toThrow()
  })
})
