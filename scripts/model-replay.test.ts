import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { applyResponse, PARAMS, type Rating } from '../supabase/functions/_shared/model.ts'
import { assertReplayTarget, loadReplay, replayRatings, runReplay, type ReplayAttempt, type ReplayItem } from './model-replay.ts'

const item: ReplayItem = {
  id: 'test-item', kind: 'generated', source_id: 'judgment.frequencies.counting-table',
  source_version: 1, level: 1, rating: 800, rd: 250, n: 0,
  anchor: false, anchored_at: null,
}
const attempt = (i: number, extra: Partial<ReplayAttempt> = {}): ReplayAttempt => ({
  id: String(i).padStart(5, '0'), user_id: 'alice', track_id: 'judgment',
  concept_id: 'counting', item_id: item.id, kind: 'selected',
  outcome: i % 3 ? 'correct' : 'incorrect',
  resolved_at: new Date(Date.UTC(2026, 0, 1, 0, i)), ...extra,
})
const tracks = [{ user_id: 'alice', track_id: 'judgment', rating: 1200 }]
const concepts = [{ id: 'counting', entry_rating: 800 }]
const replayApiDb = vi.hoisted(() => ({ sql: null as postgres.Sql | null }))
vi.mock('../supabase/functions/api/db.ts', () => ({ get sql() { return replayApiDb.sql } }))

describe('deterministic ERM-1 replay', () => {
  it('matches the live applyResponse fold to 1e-9, including item updates', () => {
    const attempts = Array.from({ length: 60 }, (_, i) => attempt(i))
    let track: Rating = { r: 1200, rd: PARAMS.rd0Learner, lastAt: null }
    let concept: Rating | null = null
    let liveItem: Rating = { r: 800, rd: 250, lastAt: null }
    for (const a of attempts) {
      const next = applyResponse({ track, concept, item: { ...liveItem, anchor: false },
        s: a.outcome === 'correct' ? 1 : 0, now: a.resolved_at })
      track = next.track
      concept = next.concept
      liveItem = next.item
    }
    const replay = replayRatings([item], attempts, tracks, concepts)
    expect(Math.abs(replay.tracks[0].rating - track.r)).toBeLessThan(1e-9)
    expect(Math.abs(replay.concepts[0].rating - concept!.r)).toBeLessThan(1e-9)
    expect(Math.abs(replay.items[0].rating - liveItem.r)).toBeLessThan(1e-9)
    expect(replay.items[0].n).toBeGreaterThan(0)
    expect(replay.events.some(e => e.subject_type === 'item')).toBe(true)
  })

  it('unrating removes a learner and affects others only through shared items', () => {
    const attempts = Array.from({ length: 140 }, (_, i) => attempt(i, {
      user_id: i < 60 ? 'alice' : i < 100 ? 'bob' : 'charlie', item_id: i >= 100 ? 'separate-item' : item.id,
    }))
    const allTracks = [...tracks, ...['bob', 'charlie'].map(user_id => ({ user_id, track_id: 'judgment', rating: 1200 }))]
    const separate = { ...item, id: 'separate-item' }
    const full = replayRatings([item, separate], attempts, allTracks, concepts)
    const removed = replayRatings([item, separate], attempts.filter(a => a.user_id !== 'alice'), allTracks, concepts)
    expect(removed.tracks.find(t => t.user_id === 'alice')).toMatchObject({ rating: 1200, rd: 350, n: 0 })
    expect(removed.items[0].rating).not.toBe(full.items[0].rating)
    expect(removed.tracks.find(t => t.user_id === 'bob')!.rating).not.toBe(full.tracks.find(t => t.user_id === 'bob')!.rating)
    expect(removed.tracks.find(t => t.user_id === 'charlie')).toEqual(full.tracks.find(t => t.user_id === 'charlie'))
    expect(removed.items[1]).toEqual(full.items[1])
  })

  it('re-freezes an anchor at its timestamp, including anchors with no later attempts', () => {
    const anchor = { ...item, anchor: true, rating: 975, rd: 35, anchored_at: new Date('2026-01-01T00:30:00Z') }
    const replay = replayRatings([anchor], [attempt(0), attempt(31)], tracks, concepts)
    expect(replay.items[0]).toMatchObject({ rating: 975, rd: 35 })
    expect(replay.events.filter(e => e.subject_type === 'item')).toHaveLength(0)
    const early = replayRatings([anchor], [attempt(0)], tracks, concepts)
    expect(early.items[0]).toMatchObject({ rating: 975, rd: 35 })
    expect(() => replayRatings([{ ...anchor, anchored_at: null }], [], tracks, concepts)).toThrow(/anchor timestamp/i)
  })

  it('orders simultaneous attempts by id and fails closed on missing content versions', () => {
    const a = attempt(1)
    const b = attempt(2, { resolved_at: a.resolved_at })
    expect(replayRatings([item], [b, a], tracks, concepts)).toEqual(replayRatings([item], [a, b], tracks, concepts))
    expect(() => replayRatings([{ ...item, source_version: 999 }], [], tracks, concepts)).toThrow(/initialRating/)
  })

  it('requires explicit owner confirmation for apply to every non-local target', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      expect(() => assertReplayTarget(`postgres://u:p@${host}:54322/postgres`, true, false)).not.toThrow()
    }
    expect(() => assertReplayTarget('postgres://u:p@db.example.com/db', false, false)).not.toThrow()
    expect(() => assertReplayTarget('postgres://u:p@db.example.com/db', true, false)).toThrow(/confirm-production/)
    expect(() => assertReplayTarget('postgres://u:p@localhost.example.com/db', true, false)).toThrow()
    expect(() => assertReplayTarget('postgres://u:p@db.example.com/db', true, true)).not.toThrow()
    expect(() => assertReplayTarget('not a URL', true, true)).toThrow()
    expect(() => assertReplayTarget('postgres://u:p@localhost/db?host=production.example.com', true, false)).toThrow()
  })
})

// Opt in: npm run test:replay
describe.runIf(process.env.REPLAY_DB_TESTS === '1')('replay against live API resolutions in a disposable database', () => {
  const parentUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  const dbName = `eleanor_replay_${crypto.randomUUID().replaceAll('-', '')}`
  let admin: postgres.Sql
  let sql: postgres.Sql
  let replayUrl: string
  let created = false
  const users = Array.from({ length: 3 }, () => crypto.randomUUID())
  const itemIds = ['shared', 'independent']

  beforeAll(async () => {
    assertReplayTarget(parentUrl, true, false)
    admin = postgres(parentUrl, { max: 1 })
    await admin`create database ${admin(dbName)}`
    created = true
    const url = new URL(parentUrl)
    url.pathname = `/${dbName}`
    replayUrl = url.href
    sql = postgres(replayUrl, { max: 1 })
    replayApiDb.sql = sql
    await sql`create schema auth`
    await sql`create table auth.users (id uuid primary key)`
    await sql.unsafe(await readFile(new URL('../supabase/migrations/0001_schema.sql', import.meta.url), 'utf8'))
    await sql.unsafe(await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8'))
    const functions = await readFile(new URL('../supabase/migrations/0003_functions_cron.sql', import.meta.url), 'utf8')
    await sql.unsafe(functions.split('-- 3. Materialized View: public.leaderboard')[1].split('-- 4. Function')[0])
    // pg_cron lives only in the parent database; integrity.test.ts verifies the actual schedule.
    const migration = await readFile(new URL('../supabase/migrations/0006_integrity.sql', import.meta.url), 'utf8')
    await sql.unsafe(migration.slice(0, migration.lastIndexOf('select cron.schedule(')))
    await sql`insert into concepts (id, track_id, name, summary, entry_rating, sort)
      values ('counting', 'judgment', 'Fixture', 'Fixture', 800, 1)`
    await sql`insert into families (id, concept_id) values ('fixture', 'counting')`
    for (const id of itemIds) await sql`insert into items
      (id, kind, source_id, source_version, level, track_id, concept_id, family_id, rating, rd, status)
      values (${id}, 'generated', ${item.source_id}, 1, 1, 'judgment', 'counting', 'fixture', 800, 250, 'published')`
    const { resolveAttempt } = await import(new URL('../supabase/functions/api/resolve.ts', import.meta.url).href)
    for (const [userIndex, userId] of users.entries()) {
      await sql`insert into auth.users (id) values (${userId})`
      await sql`insert into profiles (id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at, leaderboard_visible)
        values (${userId}, ${`fixture_${userIndex}`}, now(), now(), now(), true)`
      await sql`insert into track_ratings (user_id, track_id, rating, rd, peak) values (${userId}, 'judgment', 1200, 350, 1200)`
      for (let i = 0; i < 60; i++) {
        const itemId = itemIds[userIndex === 2 ? 1 : 0]
        const [instance] = await sql`insert into instances (item_id, seed, prompt, answer_spec)
          values (${itemId}, ${i}, '[]', '{"type":"integer"}') returning id`
        await sql`insert into instance_secrets (instance_id, answer, misconceptions, steps, solution)
          values (${instance.id}, '1', '[]', '[]', '[]')`
        const attemptId = i === 56 || i === 57
          ? `10000000-0000-4000-8000-${String(userIndex * 10 + 58 - i).padStart(12, '0')}`
          : crypto.randomUUID()
        const [a] = await sql`insert into attempts (id, user_id, instance_id, item_id, track_id, concept_id, family_id, kind, rated)
          values (${attemptId}, ${userId}, ${instance.id}, ${itemId}, 'judgment', 'counting', 'fixture', ${i % 9 === 0 ? 'echo' : 'selected'}, true) returning id`
        await sql.begin(tx => resolveAttempt(tx, { attemptId: a.id, userId,
          now: new Date(Date.UTC(2026, 0, 1 + userIndex, 0, i === 57 ? 56 : i)),
          outcome: i % 3 ? 'correct' : 'gave_up', answer: i % 3 ? 1 : null,
          confidence: i % 3 ? 0.7 : null, declaredHelp: i === 59, misconceptionId: null }))
      }
    }
  }, 30000)

  afterAll(async () => {
    if (sql) await sql.end()
    if (created) await admin`drop database ${admin(dbName)}`
    if (admin) await admin.end()
  })

  async function snapshot() {
    return sql`select jsonb_build_object(
      'tracks', (select jsonb_agg(t order by user_id, track_id) from track_ratings t),
      'concepts', (select jsonb_agg(c order by user_id, concept_id) from concept_ratings c),
      'items', (select jsonb_agg(i order by id) from items i),
      'events', (select jsonb_agg(e order by id) from rating_events e),
      'attempts', (select jsonb_agg(a order by id) from attempts a)
    ) as data`
  }

  it('reproduces live ratings, RD, counts, mastery, and events within 1e-9; dry run changes nothing', async () => {
    const before = await snapshot()
    expect((await sql`select count(*)::int as n from attempts where declared_help and rated`)[0].n).toBe(0)
    const { replay } = await sql.begin(tx => loadReplay(tx))
    for (const table of ['tracks', 'concepts', 'items'] as const) {
      const live = before[0].data[table] as Record<string, unknown>[]
      for (const r of replay[table]) {
        const row = live.find(l => table === 'items' ? l.id === (r as ReplayItem).id
          : l.user_id === ('user_id' in r ? r.user_id : '') && (table === 'tracks'
            ? l.track_id === ('track_id' in r ? r.track_id : '') : l.concept_id === ('concept_id' in r ? r.concept_id : '')))
        expect(row).toBeDefined()
        expect(Math.abs(Number(row!.rating) - r.rating)).toBeLessThan(1e-9)
        expect(Math.abs(Number(row!.rd) - r.rd)).toBeLessThan(1e-9)
        expect(row!.n).toBe(r.n)
        if ('state' in r) expect(row!.state).toBe(r.state)
      }
    }
    const liveEvents = await sql`select * from rating_events order by created_at, attempt_id, subject_type`
    expect(replay.events).toHaveLength(liveEvents.length)
    for (const ev of replay.events) {
      const live = liveEvents.find(l => l.attempt_id === ev.attempt_id && l.subject_type === ev.subject_type)!
      for (const key of ['r_before', 'rd_before', 'r_after', 'rd_after', 'expected'] as const)
        expect(Math.abs(live[key] - ev[key])).toBeLessThan(1e-9)
    }
    const report = await runReplay(sql)
    expect(report.learners).toEqual([])
    expect(Math.abs(report.overallMeanShift)).toBeLessThan(1e-9)
    const { stdout } = await promisify(execFile)('npm', ['run', 'model:replay'], {
      cwd: fileURLToPath(new URL('..', import.meta.url)), env: { ...process.env, DATABASE_URL: replayUrl },
    })
    const cliReport = JSON.parse(stdout.slice(stdout.indexOf('{')))
    expect(cliReport.learners).toEqual([])
    expect(Math.abs(cliReport.overallMeanShift)).toBeLessThan(1e-9)
    expect(await snapshot()).toEqual(before)
  })

  it('unrates one learner, propagates only item effects, and atomically applies a stable replay', async () => {
    const before = (await snapshot())[0].data
    await sql`update attempts set rated = false where user_id = ${users[0]}`
    const { replay } = await sql.begin(tx => loadReplay(tx))
    const track = (user: string) => replay.tracks.find(t => t.user_id === user)!
    expect(track(users[0])).toMatchObject({ rating: 1200, rd: 350, n: 0 })
    expect(track(users[1]).rating).not.toBe(before.tracks.find((t: { user_id: string }) => t.user_id === users[1]).rating)
    expect(Math.abs(track(users[2]).rating - before.tracks.find((t: { user_id: string }) => t.user_id === users[2]).rating)).toBeLessThan(1e-9)
    expect(Math.abs(replay.items.find(i => i.id === 'independent')!.rating - before.items.find((i: { id: string }) => i.id === 'independent').rating)).toBeLessThan(1e-9)
    await runReplay(sql, { apply: true, date: new Date('2026-11-01') })
    expect((await sql`select distinct model_version from rating_events`).map(e => e.model_version)).toEqual(['erm-1+replay-2026-11-01'])
    expect((await sql`select count(*)::int as n from attempts`)[0].n).toBe(180)
    expect((await sql`select count(*)::int as n from rating_events where user_id = ${users[0]}`)[0].n).toBe(0)
    const applied = await snapshot()
    expect(Math.abs((await runReplay(sql)).overallMeanShift)).toBeLessThan(1e-9)
    expect(await snapshot()).toEqual(applied)
    await sql`update items set status = 'retired' where id = 'shared'`
    const retired = await sql.begin(tx => loadReplay(tx))
    expect(retired.replay.events.some(e => e.subject_id === 'shared')).toBe(false)
    expect(retired.replay.tracks.find(t => t.user_id === users[1])!.n).toBe(0)
  })

  it('rolls back every rewritten table if apply fails partway through', async () => {
    await sql.unsafe(`create function public.reject_replay_fixture() returns trigger language plpgsql as $$
      begin raise exception 'TEST_REPLAY_ABORT'; end; $$;
      create trigger reject_replay_fixture before insert on public.rating_events
      for each row execute function public.reject_replay_fixture();`)
    const before = await snapshot()
    await expect(runReplay(sql, { apply: true })).rejects.toThrow('TEST_REPLAY_ABORT')
    expect(await snapshot()).toEqual(before)
    await sql`drop trigger reject_replay_fixture on public.rating_events`
    await sql`drop function public.reject_replay_fixture()`
  })

  it('captures the first anchor timestamp and keeps it on repeated admin updates', async () => {
    const [first] = await sql`update items set anchor = true where id = 'independent' returning anchored_at`
    expect(first.anchored_at).toBeInstanceOf(Date)
    const [again] = await sql`update items set anchor = true, anchored_at = now() + interval '1 day'
      where id = 'independent' returning anchored_at`
    expect(again.anchored_at).toEqual(first.anchored_at)
  })

  it('replays a commit through the live HTTP handler with the real database transaction', async () => {
    const userId = crypto.randomUUID()
    await sql`insert into auth.users (id) values (${userId})`
    await sql`insert into profiles (id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at, leaderboard_visible)
      values (${userId}, 'http_fixture', now(), now(), now(), true)`
    await sql`insert into track_ratings (user_id, track_id, rating, rd, peak) values (${userId}, 'judgment', 1200, 350, 1200)`
    const [instance] = await sql`insert into instances (item_id, seed, prompt, answer_spec)
      values ('independent', 999, '[]', '{"type":"integer"}') returning id`
    await sql`insert into instance_secrets (instance_id, answer, misconceptions, steps, solution)
      values (${instance.id}, '1', '[]', '[]', '[]')`
    const [a] = await sql`insert into attempts (user_id, instance_id, item_id, track_id, concept_id, family_id, kind, rated)
      values (${userId}, ${instance.id}, 'independent', 'judgment', 'counting', 'fixture', 'selected', true) returning id`
    const { handleCommitAttempt } = await import(new URL('../supabase/functions/api/routes/attempts.ts', import.meta.url).href)
    const response = await handleCommitAttempt({ userId, isAdmin: false, params: { id: a.id },
      req: new Request('http://localhost/attempts/commit', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transitionId: crypto.randomUUID(), answer: '1', confidence: 0.7 }) }) })
    expect(response.status).toBe(200)
    const { replay } = await sql.begin(tx => loadReplay(tx))
    const [live] = await sql`select rating from track_ratings where user_id = ${userId}`
    expect(Math.abs(replay.tracks.find(t => t.user_id === userId)!.rating - live.rating)).toBeLessThan(1e-9)
  })
})
