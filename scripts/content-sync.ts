import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { TRACKS, CONCEPTS } from '../supabase/functions/_shared/catalog.ts'
import { TEMPLATES, CARDS } from '../supabase/functions/_shared/registry.ts'
import type { ConceptCard, Template } from '../supabase/functions/_shared/content/types.ts'

export type ExistingItemRow = {
  id: string
  kind: 'generated' | 'code'
  source_id: string
  source_version: number
  level: number
  track_id: string
  concept_id: string
  family_id: string
  rating: number
  rd: number
  n: number
  anchor: boolean
  status: 'published' | 'retired'
  daily_eligible: boolean
}

export type PlannedItemInsert = {
  id: string
  kind: 'generated' | 'code'
  source_id: string
  source_version: number
  level: number
  track_id: string
  concept_id: string
  family_id: string
  rating: number
  rd: number
  n: number
  anchor: boolean
  status: 'published'
  daily_eligible: boolean
}

export type PlannedItemUpdate = {
  id: string
  track_id: string
  status: 'published' | 'retired'
  daily_eligible: boolean
}

export type SyncPlan = {
  toInsert: PlannedItemInsert[]
  toUpdate: PlannedItemUpdate[]
  toRetire: PlannedItemUpdate[]
}

export type SyncRegistry = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templates: Template<any>[]
  cards?: ConceptCard[]
}

/**
 * Validates whether a database URL points to a local host.
 */
export function isLocalDatabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]'
    )
  } catch {
    return url.includes('127.0.0.1') || url.includes('localhost')
  }
}

/**
 * Enforces security constraints on the database URL.
 */
export function assertAllowedDatabaseUrl(url: string, includeDrafts: boolean): void {
  if (includeDrafts && !isLocalDatabaseUrl(url)) {
    throw new Error(
      '--include-drafts is only allowed for local databases (127.0.0.1 or localhost)',
    )
  }
}

/**
 * Pure function to compute the synchronization plan between registry templates and existing items in the database.
 */
export function planSync(
  registry: SyncRegistry,
  existingRows: ExistingItemRow[],
  options?: { includeDrafts?: boolean },
): SyncPlan {
  const includeDrafts = options?.includeDrafts ?? false

  const existingMap = new Map<string, ExistingItemRow>()
  for (const row of existingRows) {
    existingMap.set(row.id, row)
  }

  const toInsert: PlannedItemInsert[] = []
  const toUpdate: PlannedItemUpdate[] = []
  const toRetire: PlannedItemUpdate[] = []

  // Track target active items
  const activeItemIds = new Set<string>()

  for (const template of registry.templates) {
    const isPublished = template.status === 'published'
    const isEligibleDraft = includeDrafts && template.status === 'draft'

    if (isPublished || isEligibleDraft) {
      for (const level of template.levels) {
        const itemId = `${template.id}@${template.version}#${level.level}`
        activeItemIds.add(itemId)

        const dailyEligible = Boolean(template.dailyLevels?.includes(level.level))
        const existing = existingMap.get(itemId)

        if (!existing) {
          toInsert.push({
            id: itemId,
            kind: 'generated',
            source_id: template.id,
            source_version: template.version,
            level: level.level,
            track_id: template.track,
            concept_id: template.concept,
            family_id: template.family,
            rating: level.initialRating,
            rd: 250,
            n: 0,
            anchor: false,
            status: 'published',
            daily_eligible: dailyEligible,
          })
        } else {
          // Existing item: only status and daily_eligible are updated
          const statusNeedsUpdate = existing.status !== 'published'
          const dailyNeedsUpdate = existing.daily_eligible !== dailyEligible

          if (statusNeedsUpdate || dailyNeedsUpdate) {
            toUpdate.push({
              id: existing.id,
              track_id: existing.track_id,
              status: 'published',
              daily_eligible: dailyEligible,
            })
          }
        }
      }
    }
  }

  // Find existing items that should be retired
  for (const existing of existingRows) {
    if (!activeItemIds.has(existing.id)) {
      if (existing.status !== 'retired') {
        toRetire.push({
          id: existing.id,
          track_id: existing.track_id,
          status: 'retired',
          daily_eligible: existing.daily_eligible,
        })
      }
    }
  }

  return { toInsert, toUpdate, toRetire }
}

/**
 * Synchronizes catalog, templates, concept cards, families, and items into the database.
 */
export async function syncContent(options?: {
  databaseUrl?: string
  includeDrafts?: boolean
}): Promise<SyncPlan> {
  const databaseUrl =
    options?.databaseUrl ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  const includeDrafts = options?.includeDrafts ?? false

  assertAllowedDatabaseUrl(databaseUrl, includeDrafts)

  const sql = postgres(databaseUrl, { max: 1 })

  try {
    // 1. Fetch existing items
    const existingRows = await sql<ExistingItemRow[]>`
      select
        id, kind, source_id, source_version, level,
        track_id, concept_id, family_id, rating, rd, n,
        anchor, status, daily_eligible
      from public.items
    `

    // 2. Compute plan
    const plan = planSync({ templates: TEMPLATES, cards: CARDS }, existingRows, {
      includeDrafts,
    })

    // 3. Collect families from active templates
    const activeFamilies = new Map<string, string>() // family_id -> concept_id
    for (const template of TEMPLATES) {
      if (template.status === 'published' || (includeDrafts && template.status === 'draft')) {
        activeFamilies.set(template.family, template.concept)
      }
    }

    // Filter concept cards
    const cardsToSync = CARDS.filter(
      (c) => c.status === 'published' || (includeDrafts && c.status === 'draft'),
    )

    // 4. Execute all writes in a single transaction
    await sql.begin(async (tx) => {
      // Upsert tracks
      for (const track of TRACKS) {
        await tx`
          insert into public.tracks (id, name, sort)
          values (${track.id}, ${track.name}, ${track.sort})
          on conflict (id) do update set
            name = excluded.name,
            sort = excluded.sort
        `
      }

      // Upsert concepts
      for (const concept of CONCEPTS) {
        await tx`
          insert into public.concepts (id, track_id, name, summary, prereqs, entry_rating, sort)
          values (
            ${concept.id},
            ${concept.track},
            ${concept.name},
            ${concept.summary},
            ${concept.prereqs},
            ${concept.entryRating},
            ${concept.sort}
          )
          on conflict (id) do update set
            track_id = excluded.track_id,
            name = excluded.name,
            summary = excluded.summary,
            prereqs = excluded.prereqs,
            entry_rating = excluded.entry_rating,
            sort = excluded.sort
        `
      }

      // Upsert families
      for (const [familyId, conceptId] of activeFamilies.entries()) {
        await tx`
          insert into public.families (id, concept_id)
          values (${familyId}, ${conceptId})
          on conflict (id) do update set
            concept_id = excluded.concept_id
        `
      }

      // Upsert concept cards
      for (const card of cardsToSync) {
        const reviewer =
          card.review.reviewer || (includeDrafts ? card.review.author || 'draft' : 'reviewer')
        const reviewedAt =
          card.review.reviewedAt ||
          (includeDrafts ? new Date().toISOString().slice(0, 10) : '2026-01-01')

        await tx`
          insert into public.concept_cards (concept_id, version, body, reviewer, reviewed_at)
          values (
            ${card.conceptId},
            ${card.version},
            ${JSON.stringify(card.body)},
            ${reviewer},
            ${reviewedAt}
          )
          on conflict (concept_id) do update set
            version = excluded.version,
            body = excluded.body,
            reviewer = excluded.reviewer,
            reviewed_at = excluded.reviewed_at
        `
      }

      // Insert new items
      for (const item of plan.toInsert) {
        await tx`
          insert into public.items (
            id, kind, source_id, source_version, level,
            track_id, concept_id, family_id, rating, rd, n,
            anchor, status, daily_eligible
          ) values (
            ${item.id},
            ${item.kind},
            ${item.source_id},
            ${item.source_version},
            ${item.level},
            ${item.track_id},
            ${item.concept_id},
            ${item.family_id},
            ${item.rating},
            ${item.rd},
            ${item.n},
            ${item.anchor},
            ${item.status},
            ${item.daily_eligible}
          )
        `
      }

      // Update existing items (status and daily_eligible only)
      for (const item of plan.toUpdate) {
        await tx`
          update public.items
          set
            status = ${item.status},
            daily_eligible = ${item.daily_eligible},
            updated_at = now()
          where id = ${item.id}
        `
      }

      // Retire removed or obsolete items
      for (const item of plan.toRetire) {
        await tx`
          update public.items
          set
            status = 'retired',
            updated_at = now()
          where id = ${item.id}
        `
      }
    })

    // 5. Print counts by track
    const tracks = ['judgment', 'logic', 'math', 'code'] as const
    for (const track of tracks) {
      const inserted = plan.toInsert.filter((i) => i.track_id === track).length
      const updated = plan.toUpdate.filter((i) => i.track_id === track).length
      const retired = plan.toRetire.filter((i) => i.track_id === track).length
      if (inserted > 0 || updated > 0 || retired > 0 || track === 'judgment' || track === 'logic') {
        console.log(`Track ${track}: ${inserted} inserted, ${updated} updated, ${retired} retired`)
      }
    }
    console.log(
      `Total: ${plan.toInsert.length} inserted, ${plan.toUpdate.length} updated, ${plan.toRetire.length} retired`,
    )

    return plan
  } finally {
    await sql.end()
  }
}

// Run as script
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const includeDrafts = process.argv.includes('--include-drafts')
  syncContent({ includeDrafts })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Content sync failed:', err)
      process.exit(1)
    })
}
