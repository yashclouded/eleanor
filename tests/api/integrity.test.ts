import { afterAll, describe, expect, it } from 'vitest'
import type postgres from 'postgres'
import { testSql } from './helpers.ts'

async function rollbackTest(check: (tx: postgres.TransactionSql) => Promise<void>) {
  const rollback = new Error('rollback integrity fixture')
  try {
    await testSql.begin(async (tx) => { await check(tx); throw rollback })
  } catch (error) { if (error !== rollback) throw error }
}

async function fixture(tx: postgres.TransactionSql) {
  const userId = crypto.randomUUID()
  const itemId = `integrity-${userId}`
  await tx`insert into auth.users (id, email) values (${userId}, ${`integrity_${userId}@example.com`})`
  await tx`
    insert into public.profiles (id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at, leaderboard_visible)
    values (${userId}, ${`i_${userId.replaceAll('-', '').slice(0, 16)}`}, now(), now(), now(), true)
  `
  await tx`insert into public.concepts (id, track_id, name, summary, entry_rating, sort) values (${itemId}, 'judgment', 'Fixture', 'Integrity fixture', 1000, 999)`
  await tx`insert into public.families (id, concept_id) values (${itemId}, ${itemId})`
  await tx`
    insert into public.items (id, kind, source_id, source_version, level, track_id, concept_id, family_id, rating, rd, status)
    values (${itemId}, 'generated', ${itemId}, 1, 1, 'judgment', ${itemId}, ${itemId}, 1200, 250, 'published')
  `
  await tx`insert into public.track_ratings (user_id, track_id, rating, rd, n, peak) values (${userId}, 'judgment', 1200, 100, 30, 1200)`
  return { userId, itemId }
}

async function attempt(tx: postgres.TransactionSql, userId: string, itemId: string, correct: boolean, forecast: number) {
  const instanceId = crypto.randomUUID()
  const attemptId = crypto.randomUUID()
  await tx`insert into public.instances (id, item_id, seed, skin, prompt, answer_spec) values (${instanceId}, ${itemId}, 1, 'test', '[]', '{"type":"integer"}')`
  await tx`
    insert into public.attempts (id, user_id, instance_id, item_id, track_id, concept_id, family_id, kind, state, outcome, rated, confidence, forecast, resolved_at)
    values (${attemptId}, ${userId}, ${instanceId}, ${itemId}, 'judgment', ${itemId}, ${itemId}, 'selected', 'resolved', ${correct ? 'correct' : 'incorrect'}, true, 0.8, ${forecast}, now())
  `
  return attemptId
}

describe('outcome-only integrity review flags', () => {
  afterAll(async () => { await testSql.end() })

  it('flags a +450 gain in five days once, without banning or unrating the learner', async () => rollbackTest(async (tx) => {
    const { userId, itemId } = await fixture(tx)
    const attemptId = await attempt(tx, userId, itemId, true, 0.5)
    await tx`update public.track_ratings set rating = 1650, peak = 1650 where user_id = ${userId}`
    await tx`
      insert into public.rating_events (attempt_id, user_id, subject_type, subject_id, r_before, rd_before, r_after, rd_after, expected, score, model_version, created_at)
      values (${attemptId}, ${userId}, 'track', 'judgment', 1200, 100, 1650, 100, 0.5, 1, 'erm-1', now() - interval '5 days')
    `
    await tx`select public.scan_integrity()`
    await tx`select public.scan_integrity()`
    const flags = await tx`select kind, detail from public.integrity_flags where user_id = ${userId}`
    expect(flags).toHaveLength(1)
    expect(flags[0].kind).toBe('rapid_gain')
    expect(flags[0].detail.gain).toBe(450)
    expect((await tx`select banned_at from public.profiles where id = ${userId}`)[0].banned_at).toBeNull()
    expect((await tx`select rated from public.attempts where id = ${attemptId}`)[0].rated).toBe(true)
    expect((await tx`select * from public.moderation_actions where user_id = ${userId}`)).toHaveLength(0)
  }))

  it('flags 30 wins against p=0.5 with z≈5.48 and deduplicates overlapping scans', async () => rollbackTest(async (tx) => {
    const { userId, itemId } = await fixture(tx)
    for (let i = 0; i < 30; i++) await attempt(tx, userId, itemId, true, 0.5)
    await tx`select public.scan_integrity()`
    await tx`select public.scan_integrity()`
    const flags = await tx`select kind, detail from public.integrity_flags where user_id = ${userId}`
    expect(flags).toHaveLength(1)
    expect(flags[0].kind).toBe('improbable_run')
    expect(flags[0].detail.z).toBeCloseTo(5.477225575, 8)
    expect(flags[0].detail).toMatchObject({ n: 30, sumS: 30, sumE: 15, approximation: 'normal' })
  }))

  it('does not flag a normal 70% run or consider declared-help attempts', async () => rollbackTest(async (tx) => {
    const { userId, itemId } = await fixture(tx)
    for (let i = 0; i < 30; i++) await attempt(tx, userId, itemId, i < 21, 0.7)
    await tx`select public.scan_integrity()`
    expect(await tx`select id from public.integrity_flags where user_id = ${userId}`).toHaveLength(0)
    await tx`update public.attempts set outcome = 'correct', declared_help = true where user_id = ${userId}`
    await tx`select public.scan_integrity()`
    expect(await tx`select id from public.integrity_flags where user_id = ${userId}`).toHaveLength(0)
  }))

  it('does not flag a rapid gain while RD is above 110', async () => rollbackTest(async (tx) => {
    const { userId, itemId } = await fixture(tx)
    const attemptId = await attempt(tx, userId, itemId, true, 0.5)
    await tx`update public.track_ratings set rating = 1650, rd = 111 where user_id = ${userId}`
    await tx`
      insert into public.rating_events (attempt_id, user_id, subject_type, subject_id, r_before, rd_before, r_after, rd_after, expected, score, model_version)
      values (${attemptId}, ${userId}, 'track', 'judgment', 1200, 111, 1650, 111, 0.5, 1, 'erm-1')
    `
    await tx`select public.scan_integrity()`
    expect(await tx`select id from public.integrity_flags where user_id = ${userId}`).toHaveLength(0)
  }))
})
