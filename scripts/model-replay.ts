import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { CODE_PROBLEMS, TEMPLATES } from '../supabase/functions/_shared/registry.ts'
import { applyResponse, masteryAfter, MODEL_VERSION, PARAMS, type MasteryState, type Rating } from '../supabase/functions/_shared/model.ts'

export type ReplayItem = {
  id: string; kind: 'generated' | 'code'; source_id: string; source_version: number; level: number
  rating: number; rd: number; n: number; anchor: boolean; anchored_at: Date | null
  anchor_rating?: number | null; anchor_rd?: number | null
}
export type ReplayAttempt = {
  id: string; user_id: string; track_id: string; concept_id: string; item_id: string
  kind: string; outcome: 'correct' | 'incorrect' | 'gave_up'; resolved_at: Date
}
type TrackInput = { user_id: string; track_id: string; rating: number }
type ConceptInput = { id: string; entry_rating: number }
type Track = TrackInput & { rd: number; n: number; peak: number; last_at: Date | null }
type Concept = {
  user_id: string; concept_id: string; rating: number; rd: number; n: number; last_at: Date | null
  state: MasteryState; first_correct_at: Date | null; echo_successes: number; last_echo_success_at: Date | null
}
type Event = {
  attempt_id: string; user_id: string; subject_type: 'track' | 'concept' | 'item'; subject_id: string
  r_before: number; rd_before: number; r_after: number; rd_after: number
  expected: number; score: 0 | 1; created_at: Date
}
const rating = (row: { rating: number; rd: number; last_at: Date | null }): Rating =>
  ({ r: row.rating, rd: row.rd, lastAt: row.last_at })

function initialRating(item: ReplayItem): number {
  const initial = item.kind === 'code'
    ? CODE_PROBLEMS.find(p => p.id === item.source_id && p.version === item.source_version)?.initialRating
    : TEMPLATES.find(t => t.id === item.source_id && t.version === item.source_version)?.levels.find(l => l.level === item.level)?.initialRating
  if (initial === undefined) throw new Error(`Missing initialRating for ${item.id}; restore its version to the registry before replay`)
  return initial
}

export function replayRatings(items: ReplayItem[], attempts: ReplayAttempt[], tracks: TrackInput[], concepts: ConceptInput[]) {
  const trackMap = new Map<string, Track>()
  const conceptMap = new Map<string, Concept>()
  const itemMap = new Map(items.map(i => {
    if (i.anchor && !i.anchored_at) throw new Error(`Missing anchor timestamp for ${i.id}; the owner must recover its historical timestamp before replay`)
    return [i.id, { ...i, rating: initialRating(i), rd: PARAMS.rd0Item as number, n: 0 }]
  }))
  const entryRatings = new Map(concepts.map(c => [c.id, c.entry_rating]))
  const frozen = new Map(items.filter(i => i.anchor).map(i => [i.id,
    { ...i, rating: i.anchor_rating ?? i.rating, rd: i.anchor_rd ?? i.rd }]))
  for (const t of tracks) trackMap.set(`${t.user_id}/${t.track_id}`, {
    ...t, rating: PARAMS.r0, rd: PARAMS.rd0Learner, n: 0, peak: PARAMS.r0, last_at: null,
  })
  const events: Event[] = []
  for (const a of [...attempts].sort((a, b) => a.resolved_at.getTime() - b.resolved_at.getTime() || a.id.localeCompare(b.id))) {
    const item = itemMap.get(a.item_id)
    if (!item) throw new Error(`Missing replay item ${a.item_id}`)
    const trackKey = `${a.user_id}/${a.track_id}`
    const track = trackMap.get(trackKey)
    if (!track) throw new Error(`Missing track ${trackKey}`)
    const conceptKey = `${a.user_id}/${a.concept_id}`
    const concept = conceptMap.get(conceptKey)
    const anchor = frozen.get(item.id)
    const anchored = anchor !== undefined && a.resolved_at >= anchor.anchored_at!
    if (anchored) { item.rating = anchor.rating; item.rd = anchor.rd }
    const itemBefore = item.rating
    const response = applyResponse({ track: rating(track), concept: concept ? rating(concept) : null,
      item: { r: item.rating, rd: item.rd, lastAt: null, anchor: anchored },
      s: a.outcome === 'correct' ? 1 : 0, now: a.resolved_at })
    Object.assign(track, { rating: response.track.r, rd: response.track.rd,
      n: track.n + 1, peak: Math.max(track.peak, response.track.r), last_at: a.resolved_at })
    if (response.itemUpdated) Object.assign(item, { rating: response.item.r, rd: response.item.rd, n: item.n + 1 })
    const entryRating = entryRatings.get(a.concept_id)
    if (entryRating === undefined) throw new Error(`Missing concept ${a.concept_id}`)
    const mastery = masteryAfter({ state: concept?.state ?? 'new', firstCorrectAt: concept?.first_correct_at ?? null,
      echoSuccesses: concept?.echo_successes ?? 0 }, {
      correct: a.outcome === 'correct', rated: true, isEcho: a.kind === 'echo',
      itemRating: itemBefore,
      entryRating, now: a.resolved_at,
    })
    conceptMap.set(conceptKey, {
      user_id: a.user_id, concept_id: a.concept_id, rating: response.concept.r, rd: response.concept.rd,
      n: (concept?.n ?? 0) + 1, last_at: a.resolved_at, state: mastery.state,
      first_correct_at: mastery.firstCorrectAt, echo_successes: mastery.echoSuccesses,
      last_echo_success_at: a.kind === 'echo' && a.outcome === 'correct' && itemBefore >= entryRating
        ? a.resolved_at : concept?.last_echo_success_at ?? null,
    })
    for (const ev of response.events) events.push({
      attempt_id: a.id, user_id: a.user_id, subject_type: ev.subject,
      subject_id: ev.subject === 'track' ? a.track_id : ev.subject === 'concept' ? a.concept_id : a.item_id,
      r_before: ev.before.r, rd_before: ev.before.rd, r_after: ev.after.r, rd_after: ev.after.rd,
      expected: ev.expected, score: ev.score, created_at: a.resolved_at,
    })
  }
  for (const anchor of frozen.values()) Object.assign(itemMap.get(anchor.id)!, { rating: anchor.rating, rd: anchor.rd })
  return { tracks: [...trackMap.values()], concepts: [...conceptMap.values()], items: [...itemMap.values()], events }
}

export function assertReplayTarget(databaseUrl: string, apply: boolean, confirmProduction: boolean): void {
  const url = new URL(databaseUrl)
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Expected a Postgres database URL')
  if (url.searchParams.has('host') || url.searchParams.has('hostaddr')) throw new Error('Specify the database host in the URL authority')
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (apply && !local && !confirmProduction) throw new Error('Production apply is an owner gate: pass --confirm-production after reviewing the dry run')
}

export async function loadReplay(tx: postgres.TransactionSql) {
  const items = await tx<ReplayItem[]>`
    select i.id, i.kind, i.source_id, i.source_version, i.level, i.rating, i.rd, i.n, i.anchor, i.anchored_at,
      (anchor_note.params->>'rating')::double precision as anchor_rating,
      (anchor_note.params->>'rd')::double precision as anchor_rd
    from public.items i
    left join lateral (
      select m.params from public.moderation_actions m
      where i.anchor and m.action = 'note' and m.params->>'operation' = 'anchor'
        and m.params->>'itemId' = i.id
        and (m.params->>'anchoredAt')::timestamptz = date_trunc('milliseconds', i.anchored_at)
      order by m.created_at desc, m.id desc limit 1
    ) anchor_note on true
    where i.status <> 'retired' order by i.id`
  const attempts = await tx<ReplayAttempt[]>`select a.id, a.user_id, a.track_id, a.concept_id, a.item_id, a.kind, a.outcome, a.resolved_at
    from public.attempts a join public.items i on i.id = a.item_id
    where a.rated and i.status <> 'retired' and a.state in ('resolved', 'revealed')
      and a.outcome in ('correct', 'incorrect', 'gave_up') and not a.declared_help
      and a.kind in ('placement', 'selected', 'echo')
    order by a.resolved_at, a.id`
  const tracks = await tx<TrackInput[]>`select user_id, track_id, rating from public.track_ratings order by user_id, track_id`
  const concepts = await tx<ConceptInput[]>`select id, entry_rating from public.concepts`
  const replay = replayRatings(items, attempts, tracks, concepts)
  const learnerChanges = replay.tracks.map((t, i) => ({ user_id: t.user_id, track_id: t.track_id,
    before: tracks[i].rating, after: t.rating, shift: t.rating - tracks[i].rating }))
  return { replay, report: {
    learners: learnerChanges.filter(t => Math.abs(t.shift) > 25),
    items: replay.items.map((item, i) => ({ id: item.id, before: items[i].rating, after: item.rating, shift: item.rating - items[i].rating }))
      .sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift) || a.id.localeCompare(b.id)).slice(0, 20),
    overallMeanShift: learnerChanges.length ? learnerChanges.reduce((sum, t) => sum + t.shift, 0) / learnerChanges.length : 0,
  } }
}

export async function applyReplay(tx: postgres.TransactionSql, replay: ReturnType<typeof replayRatings>, date: Date): Promise<void> {
  await tx`delete from public.rating_events`
  await tx`delete from public.track_ratings`
  await tx`delete from public.concept_ratings`
  for (const t of replay.tracks) await tx`insert into public.track_ratings ${tx(t)}`
  for (const c of replay.concepts) await tx`insert into public.concept_ratings ${tx(c)}`
  for (const i of replay.items) await tx`update public.items set rating = ${i.rating}, rd = ${i.rd}, n = ${i.n} where id = ${i.id}`
  const modelVersion = `${MODEL_VERSION}+replay-${date.toISOString().slice(0, 10)}`
  for (const event of replay.events) await tx`insert into public.rating_events ${tx({ ...event, model_version: modelVersion })}`
  await tx`refresh materialized view private.leaderboard`
  await tx`update public.moderation_actions
    set params = jsonb_set(params, '{replayPending}', 'false'::jsonb)
    where params->'replayPending' = 'true'::jsonb
      and (action = 'unrate' or (action = 'note' and params->>'operation' = 'retire'))`
}

export async function runReplay(sql: postgres.Sql, options: { apply?: boolean; date?: Date } = {}) {
  return sql.begin(options.apply ? '' : 'isolation level repeatable read read only', async tx => {
    if (options.apply) await tx`lock table public.profiles, public.attempts, public.track_ratings,
      public.concept_ratings, public.items, public.rating_events, public.moderation_actions in share row exclusive mode`
    const result = await loadReplay(tx)
    if (options.apply) await applyReplay(tx, result.replay, options.date ?? new Date())
    return result.report
  })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2)
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  const main = async () => {
    if (args.some(a => a !== '--apply' && a !== '--confirm-production')) throw new Error('Usage: model:replay -- [--apply] [--confirm-production]')
    assertReplayTarget(databaseUrl, args.includes('--apply'), args.includes('--confirm-production'))
    const sql = postgres(databaseUrl, { max: 1, prepare: false })
    try { console.log(JSON.stringify(await runReplay(sql, { apply: args.includes('--apply') }), null, 2)) }
    finally { await sql.end() }
  }
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
