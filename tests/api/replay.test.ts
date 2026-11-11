import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TEMPLATES } from '../../supabase/functions/_shared/registry.ts'
import { applyReplay, readReplayInput, replay, runReplay } from '../../scripts/model-replay.ts'
import { call, createTestUser, testSql } from './helpers.ts'

describe('replay of live API resolutions', () => {
  const users: { user: { id: string }; token: string }[] = []
  const itemId = `replay.${crypto.randomUUID()}`
  const template = TEMPLATES.find((t) => t.track === 'judgment')!

  beforeAll(async () => {
    for (let i = 0; i < 2; i++) {
      const user = await createTestUser('replay')
      users.push(user)
      const response = await call('/onboarding', {
        handle: `r_${user.user.id.replaceAll('-', '').slice(0, 16)}`, ageConfirmed: true,
        termsAccepted: true, pledgeAccepted: true, leaderboardVisible: false, tracks: ['judgment'],
      }, user.token)
      expect(response.status).toBe(201)
    }
    await testSql`
      insert into public.items (id, kind, source_id, source_version, level, track_id, concept_id, family_id, rating, rd, status)
      values (${itemId}, 'generated', ${template.id}, ${template.version}, ${template.levels[0].level}, 'judgment', ${template.concept}, ${template.family}, ${template.levels[0].initialRating}, 250, 'published')
    `
    for (let n = 0; n < 40; n++) {
      const user = users[n < 24 ? 0 : 1]
      const instanceId = crypto.randomUUID()
      const attemptId = crypto.randomUUID()
      await testSql`insert into public.instances (id, item_id, seed, skin, prompt, answer_spec) values (${instanceId}, ${itemId}, ${n}, 'test', '[]', '{"type":"integer"}')`
      await testSql`insert into public.instance_secrets (instance_id, answer, misconceptions, steps, solution) values (${instanceId}, '42', '[]', '[]', '[]')`
      await testSql`
        insert into public.attempts (id, user_id, instance_id, item_id, track_id, concept_id, family_id, kind, rated)
        values (${attemptId}, ${user.user.id}, ${instanceId}, ${itemId}, 'judgment', ${template.concept}, ${template.family}, 'selected', true)
      `
      const response = await call(`/attempts/${attemptId}/commit`, {
        transitionId: crypto.randomUUID(), answer: n % 4 === 0 ? '41' : '42', confidence: 0.8, declaredHelp: false,
      }, user.token)
      expect(response.status, JSON.stringify(response.data)).toBe(200)
    }
  }, 120000)

  afterAll(async () => {
    for (const user of users) await testSql`delete from auth.users where id = ${user.user.id}`
    await testSql`delete from public.instances where item_id = ${itemId}`
    await testSql`delete from public.items where id = ${itemId}`
    await testSql.end()
  })

  it('reproduces live track/concept/item ratings and events to within 1e-9', async () => {
    const input = await readReplayInput(testSql)
    const local = replay(input.attempts.filter((a) => a.itemId === itemId), input.items.filter((i) => i.id === itemId), input.entryRatings)
    const trackRows = await testSql`select * from public.track_ratings where user_id in ${testSql(users.map((u) => u.user.id))}`
    for (const row of trackRows) {
      const expected = local.tracks.get(`${row.user_id}:${row.track_id}`)!
      expect(Math.abs(Number(row.rating) - expected.r)).toBeLessThan(1e-9)
      expect(Math.abs(Number(row.rd) - expected.rd)).toBeLessThan(1e-9)
      expect(Number(row.n)).toBe(expected.n)
    }
    const conceptRows = await testSql`select * from public.concept_ratings where user_id in ${testSql(users.map((u) => u.user.id))}`
    for (const row of conceptRows) {
      const expected = local.concepts.get(`${row.user_id}:${row.concept_id}`)!
      expect(Math.abs(Number(row.rating) - expected.r)).toBeLessThan(1e-9)
      expect(Math.abs(Number(row.rd) - expected.rd)).toBeLessThan(1e-9)
      expect(row.state).toBe(expected.state)
    }
    const [row] = await testSql`select * from public.items where id = ${itemId}`
    expect(Math.abs(Number(row.rating) - local.items.get(itemId)!.r)).toBeLessThan(1e-9)
    expect(Math.abs(Number(row.rd) - local.items.get(itemId)!.rd)).toBeLessThan(1e-9)
    expect(Number(row.n)).toBeGreaterThan(0)
    const events = await testSql`select * from public.rating_events where user_id in ${testSql(users.map((u) => u.user.id))} order by created_at, attempt_id, subject_type`
    expect(events).toHaveLength(local.events.length)
    for (const event of events) {
      const expected = local.events.find((e) => e.attempt_id === event.attempt_id && e.subject_type === event.subject_type)!
      for (const key of ['r_before', 'rd_before', 'r_after', 'rd_after', 'expected'] as const) {
        expect(Math.abs(Number(event[key]) - expected[key])).toBeLessThan(1e-9)
      }
    }
  })

  it('makes a dry run without changing database rows', async () => {
    await testSql.begin(async (tx) => {
      // Keep unrelated local test sessions from changing the comparison snapshot.
      await tx`lock table public.track_ratings, public.concept_ratings, public.items, public.rating_events in share mode`
      const digest = async () => (await tx`
        select (select md5(coalesce(jsonb_agg(to_jsonb(t) order by user_id, track_id)::text, '')) from public.track_ratings t) as tracks,
          (select md5(coalesce(jsonb_agg(to_jsonb(t) order by user_id, concept_id)::text, '')) from public.concept_ratings t) as concepts,
          (select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text, '')) from public.items t) as items,
          (select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text, '')) from public.rating_events t) as events
      `)[0]
      const before = await digest()
      const report = await runReplay({ databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' })
      expect(report.applied).toBe(false)
      expect(report.attempts).toBeGreaterThanOrEqual(40)
      expect(await digest()).toEqual(before)
    })
  })

  it('applies a recomputed model atomically, including resetting a fully unrated user (rollback fixture)', async () => {
    const rollback = new Error('rollback replay apply fixture')
    try {
      await testSql.begin(async (tx) => {
        await tx`update public.attempts set rated = false where user_id = ${users[0].user.id}`
        const input = await readReplayInput(tx)
        const result = replay(input.attempts, input.items, input.entryRatings)
        await applyReplay(tx, result, '2026-11-09')
        const [track] = await tx`select rating, rd, n from public.track_ratings where user_id = ${users[0].user.id} and track_id = 'judgment'`
        expect(track).toMatchObject({ rating: 1200, rd: 350, n: 0 })
        const [version] = await tx`select model_version from public.rating_events where user_id = ${users[1].user.id} limit 1`
        expect(version.model_version).toBe('erm-1+replay-2026-11-09')
        expect(await tx`select id from public.rating_events where user_id = ${users[0].user.id}`).toHaveLength(0)
        throw rollback
      })
    } catch (error) { if (error !== rollback) throw error }
    const [track] = await testSql`select n from public.track_ratings where user_id = ${users[0].user.id} and track_id = 'judgment'`
    expect(Number(track.n)).toBe(24)
  }, 120000)
})
