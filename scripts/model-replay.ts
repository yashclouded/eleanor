import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { TEMPLATES, CODE_PROBLEMS } from '../supabase/functions/_shared/registry.ts'
import { applyResponse, masteryAfter, MODEL_VERSION, PARAMS, type MasteryState, type Rating } from '../supabase/functions/_shared/model.ts'

export type ReplayAttempt = {
  id: string
  userId: string
  trackId: string
  conceptId: string
  itemId: string
  resolvedAt: Date
  outcome: 'correct' | 'incorrect' | 'gave_up'
  kind: string
}
export type ReplayItem = {
  id: string
  initialRating: number
  anchor: boolean
  anchoredAt: Date | null
  rating: number
  rd: number
}
type Track = Rating & { userId: string; trackId: string; n: number; peak: number }
type Concept = Rating & {
  userId: string; conceptId: string; n: number; state: MasteryState
  firstCorrectAt: Date | null; echoSuccesses: number; lastEchoSuccessAt: Date | null
}
type Item = Rating & { n: number }
type Event = {
  attempt_id: string; user_id: string; subject_type: 'track' | 'concept' | 'item'; subject_id: string
  r_before: number; rd_before: number; r_after: number; rd_after: number
  expected: number; score: 0 | 1; created_at: Date
}
export type ReplayResult = {
  tracks: Map<string, Track>
  concepts: Map<string, Concept>
  items: Map<string, Item>
  events: Event[]
}

export function replay(attempts: ReplayAttempt[], items: ReplayItem[], entryRatings = new Map<string, number>()): ReplayResult {
  const result: ReplayResult = { tracks: new Map(), concepts: new Map(), items: new Map(), events: [] }
  const metadata = new Map(items.map((i) => [i.id, i]))
  for (const item of items) {
    if (item.anchor && !item.anchoredAt) throw new Error(`Missing anchor timestamp: ${item.id}`)
    result.items.set(item.id, { r: item.initialRating, rd: PARAMS.rd0Item, lastAt: null, n: 0 })
  }
  const ordered = [...attempts].sort((a, b) => a.resolvedAt.getTime() - b.resolvedAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  for (const a of ordered) {
    const item = metadata.get(a.itemId)
    if (!item) throw new Error(`Replay item missing: ${a.itemId}`)
    const trackKey = `${a.userId}:${a.trackId}`
    const conceptKey = `${a.userId}:${a.conceptId}`
    const track: Track = result.tracks.get(trackKey) ?? {
      userId: a.userId, trackId: a.trackId, r: PARAMS.r0, rd: PARAMS.rd0Learner, lastAt: null, n: 0, peak: PARAMS.r0,
    }
    const concept = result.concepts.get(conceptKey)
    const currentItem = result.items.get(a.itemId)!
    const frozen = item.anchor && a.resolvedAt >= item.anchoredAt!
    if (frozen) Object.assign(currentItem, { r: item.rating, rd: item.rd })
    const applied = applyResponse({
      track, concept: concept ?? null, item: { ...currentItem, anchor: frozen },
      s: a.outcome === 'correct' ? 1 : 0, now: a.resolvedAt,
    })
    result.tracks.set(trackKey, { ...track, ...applied.track, n: track.n + 1, peak: Math.max(track.peak, applied.track.r) })
    const entryRating = entryRatings.get(a.conceptId) ?? 1000
    const mastery = masteryAfter(concept ?? { state: 'new', firstCorrectAt: null, echoSuccesses: 0 }, {
      correct: a.outcome === 'correct', rated: true, isEcho: a.kind === 'echo',
      itemRating: currentItem.r, entryRating, now: a.resolvedAt,
    })
    result.concepts.set(conceptKey, {
      ...applied.concept, ...mastery, userId: a.userId, conceptId: a.conceptId, n: (concept?.n ?? 0) + 1,
      lastEchoSuccessAt: a.kind === 'echo' && a.outcome === 'correct' && currentItem.r >= entryRating
        ? a.resolvedAt : concept?.lastEchoSuccessAt ?? null,
    })
    result.items.set(a.itemId, { ...applied.item, n: currentItem.n + Number(applied.itemUpdated) })
    for (const ev of applied.events) {
      result.events.push({
        attempt_id: a.id, user_id: a.userId, subject_type: ev.subject,
        subject_id: ev.subject === 'track' ? a.trackId : ev.subject === 'concept' ? a.conceptId : a.itemId,
        r_before: ev.before.r, rd_before: ev.before.rd, r_after: ev.after.r, rd_after: ev.after.rd,
        expected: ev.expected, score: ev.score, created_at: a.resolvedAt,
      })
    }
  }
  for (const item of items) {
    if (item.anchor) Object.assign(result.items.get(item.id)!, { r: item.rating, rd: item.rd })
  }
  return result
}

export function assertReplayTarget(databaseUrl: string, apply: boolean, confirmProduction: boolean): void {
  let url: URL
  try { url = new URL(databaseUrl) } catch { throw new Error('Invalid database URL') }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Invalid database URL protocol')
  const local = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname.toLowerCase())
  if (apply && !local && !confirmProduction) {
    throw new Error('Remote replay --apply requires --confirm-production; the owner must run it')
  }
}

type Db = postgres.Sql | postgres.TransactionSql
type Snapshot = {
  attempts: ReplayAttempt[]
  items: ReplayItem[]
  entryRatings: Map<string, number>
  tracks: { user_id: string; track_id: string; rating: number }[]
}

export async function readReplayInput(db: Db): Promise<Snapshot> {
  const initialRatings = new Map<string, number>()
  for (const template of TEMPLATES) {
    for (const level of template.levels) initialRatings.set(`${template.id}@${template.version}#${level.level}`, level.initialRating)
  }
  for (const problem of CODE_PROBLEMS) initialRatings.set(`${problem.id}@${problem.version}#1`, problem.initialRating)
  const itemRows = await db`select id, source_id, source_version, level, anchor, anchored_at, rating, rd from public.items where status <> 'retired' order by id`
  const items = itemRows.map((i): ReplayItem => {
    const initialRating = initialRatings.get(`${i.source_id}@${i.source_version}#${i.level}`)
    if (initialRating === undefined) throw new Error(`No authored initialRating for active item ${i.id}; restore its source before replay`)
    return { id: i.id, initialRating, anchor: i.anchor, anchoredAt: i.anchored_at ? new Date(i.anchored_at) : null, rating: Number(i.rating), rd: Number(i.rd) }
  })
  const attemptRows = await db`
    select a.id, a.user_id, a.track_id, a.concept_id, a.item_id, a.resolved_at, a.outcome, a.kind
    from public.attempts a join public.items i on i.id = a.item_id
    where a.rated and i.status <> 'retired' and not a.declared_help
      and a.kind in ('placement', 'selected', 'echo') and a.state in ('resolved', 'revealed')
      and a.outcome in ('correct', 'incorrect', 'gave_up') and a.resolved_at is not null
    order by a.resolved_at, a.id
  `
  const concepts = await db`select id, entry_rating from public.concepts`
  const tracks = await db<{ user_id: string; track_id: string; rating: number }[]>`select user_id, track_id, rating from public.track_ratings order by user_id, track_id`
  return {
    items, tracks, entryRatings: new Map(concepts.map((c) => [c.id, Number(c.entry_rating)])),
    attempts: attemptRows.map((a) => ({ id: a.id, userId: a.user_id, trackId: a.track_id, conceptId: a.concept_id, itemId: a.item_id, resolvedAt: new Date(a.resolved_at), outcome: a.outcome, kind: a.kind })),
  }
}

export async function applyReplay(db: postgres.TransactionSql, result: ReplayResult, date: string): Promise<void> {
  const modelVersion = `${MODEL_VERSION}+replay-${date}`
  await db`update public.track_ratings set rating = ${PARAMS.r0}, rd = ${PARAMS.rd0Learner}, n = 0, peak = ${PARAMS.r0}, last_at = null`
  for (const t of result.tracks.values()) {
    await db`
      insert into public.track_ratings (user_id, track_id, rating, rd, n, peak, last_at)
      values (${t.userId}, ${t.trackId}, ${t.r}, ${t.rd}, ${t.n}, ${t.peak}, ${t.lastAt})
      on conflict (user_id, track_id) do update set rating = excluded.rating, rd = excluded.rd, n = excluded.n, peak = excluded.peak, last_at = excluded.last_at
    `
  }
  await db`delete from public.concept_ratings`
  for (const c of result.concepts.values()) {
    await db`
      insert into public.concept_ratings (user_id, concept_id, rating, rd, n, last_at, state, first_correct_at, echo_successes, last_echo_success_at)
      values (${c.userId}, ${c.conceptId}, ${c.r}, ${c.rd}, ${c.n}, ${c.lastAt}, ${c.state}, ${c.firstCorrectAt}, ${c.echoSuccesses}, ${c.lastEchoSuccessAt})
    `
  }
  for (const [id, i] of result.items) {
    await db`update public.items set rating = ${i.r}, rd = ${i.rd}, n = ${i.n} where id = ${id}`
  }
  await db`delete from public.rating_events`
  for (const event of result.events) {
    await db`
      insert into public.rating_events (attempt_id, user_id, subject_type, subject_id, r_before, rd_before, r_after, rd_after, expected, score, model_version, created_at)
      values (${event.attempt_id}, ${event.user_id}, ${event.subject_type}, ${event.subject_id}, ${event.r_before}, ${event.rd_before}, ${event.r_after}, ${event.rd_after}, ${event.expected}, ${event.score}, ${modelVersion}, ${event.created_at})
    `
  }
  await db`refresh materialized view private.leaderboard`
}

export function replayReport(snapshot: Snapshot, result: ReplayResult) {
  const learners = snapshot.tracks.map((t) => ({
    userId: t.user_id, track: t.track_id, before: Number(t.rating),
    after: result.tracks.get(`${t.user_id}:${t.track_id}`)?.r ?? PARAMS.r0,
  })).map((t) => ({ ...t, change: t.after - t.before }))
  const items = snapshot.items.map((i) => ({ id: i.id, before: i.rating, after: result.items.get(i.id)!.r, change: result.items.get(i.id)!.r - i.rating }))
  const shifts = [...learners, ...items]
  return {
    attempts: snapshot.attempts.length,
    learners: learners.filter((t) => Math.abs(t.change) > 25),
    items: items.sort((a, b) => Math.abs(b.change) - Math.abs(a.change) || a.id.localeCompare(b.id)).slice(0, 20),
    meanShift: shifts.length ? shifts.reduce((sum, i) => sum + i.change, 0) / shifts.length : 0,
  }
}

export async function runReplay(options: { databaseUrl: string; apply?: boolean; confirmProduction?: boolean }) {
  assertReplayTarget(options.databaseUrl, !!options.apply, !!options.confirmProduction)
  const db = postgres(options.databaseUrl, { prepare: false, max: 1 })
  try {
    return await db.begin(options.apply ? '' : 'isolation level repeatable read read only', async (tx) => {
      if (options.apply) {
        // Block live resolutions and moderation until the complete replacement commits.
        await tx`lock table public.attempts, public.items, public.track_ratings, public.concept_ratings, public.rating_events in share row exclusive mode`
      }
      const input = await readReplayInput(tx)
      const result = replay(input.attempts, input.items, input.entryRatings)
      const report = replayReport(input, result)
      if (options.apply) await applyReplay(tx, result, new Date().toISOString().slice(0, 10))
      return { ...report, applied: !!options.apply }
    })
  } finally { await db.end() }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2)
  if (args.some((a) => !['--apply', '--confirm-production'].includes(a))) {
    console.error('Usage: npm run model:replay -- [--apply] [--confirm-production]')
    process.exitCode = 1
  } else {
    runReplay({
      databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      apply: args.includes('--apply'), confirmProduction: args.includes('--confirm-production'),
    }).then((report) => console.log(JSON.stringify(report, null, 2))).catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : 'Replay failed')
      process.exitCode = 1
    })
  }
}
