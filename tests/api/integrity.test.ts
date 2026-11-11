import { readFile } from 'node:fs/promises'
import postgres from 'postgres'
import { afterAll, describe, expect, it } from 'vitest'

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres', { max: 1 })
const migration = await readFile(new URL('../../supabase/migrations/0006_integrity.sql', import.meta.url), 'utf8')

describe('integrity flags (transactional fixtures; no lasting database changes)', () => {
  afterAll(() => sql.end())

  it('flags +450 in 5 days and 30 improbable wins once, leaves a normal run alone, and never penalizes', async () => {
    await sql.begin(async tx => {
      const [installed] = await tx`select to_regprocedure('public.scan_integrity()') is not null as present`
      if (!installed.present) await tx.unsafe(migration)
      const ids = Array.from({ length: 4 }, () => crypto.randomUUID())
      for (const id of ids) {
        await tx`insert into auth.users (id) values (${id})`
        await tx`insert into profiles (id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at, leaderboard_visible)
          values (${id}, ${'i_' + id.replaceAll('-', '').slice(0, 16)}, now(), now(), now(), true)`
        await tx`insert into track_ratings (user_id, track_id, rating, rd, n, peak)
          values (${id}, 'judgment', 1200, 100, 30, 1200)`
      }
      const [item] = await tx`select * from items where track_id = 'judgment' limit 1`
      if (!item) throw new Error('Run local content:sync --include-drafts before API tests')
      for (const [index, id] of ids.entries()) {
        for (let i = 0; i < (index === 0 ? 1 : index === 3 ? 29 : 30); i++) {
          const [instance] = await tx`insert into instances (item_id, seed, prompt, answer_spec)
            values (${item.id}, ${i}, '[]', '{"type":"integer"}') returning id`
          const [attempt] = await tx`insert into attempts
            (user_id, instance_id, item_id, track_id, concept_id, family_id, kind, state, rated, outcome, confidence, forecast, resolved_at)
            values (${id}, ${instance.id}, ${item.id}, 'judgment', ${item.concept_id}, ${item.family_id},
              'selected', 'resolved', true, ${index === 2 && i >= 21 ? 'incorrect' : 'correct'}, 0.7,
              ${index === 2 ? 0.7 : 0.5}, now() - interval '5 days' + ${i} * interval '1 minute') returning id`
          if (index === 0) {
            await tx`insert into rating_events (attempt_id, user_id, subject_type, subject_id,
              r_before, rd_before, r_after, rd_after, expected, score, model_version, created_at)
              values (${attempt.id}, ${id}, 'track', 'judgment', 1200, 100, 1650, 100, 0.5, 1, 'erm-1', now() - interval '5 days')`
          }
        }
      }
      await tx`update track_ratings set rating = 1650 where user_id = ${ids[0]}`
      const before = await tx`select id, leaderboard_visible, banned_at from profiles where id in ${tx(ids)} order by id`
      await tx`select public.scan_integrity()`
      await tx`select public.scan_integrity()`
      const flags = await tx`select user_id, kind, detail from integrity_flags where user_id in ${tx(ids)} order by user_id, kind`
      expect(flags.filter(f => f.user_id === ids[0] && f.kind === 'rapid_gain')).toHaveLength(1)
      const improbable = flags.filter(f => f.user_id === ids[1] && f.kind === 'improbable_run')
      expect(improbable).toHaveLength(1)
      expect(improbable[0].detail.z).toBeCloseTo(Math.sqrt(30), 9)
      expect(improbable[0].detail).toMatchObject({ n: 30, sumS: 30, sumE: 15, variance: 7.5 })
      expect(flags.filter(f => f.user_id === ids[2] || f.user_id === ids[3])).toHaveLength(0)
      expect(await tx`select id, leaderboard_visible, banned_at from profiles where id in ${tx(ids)} order by id`).toEqual(before)
      expect((await tx`select count(*)::int as n from attempts where user_id in ${tx(ids)} and rated`)[0].n).toBe(90)
      expect((await tx`select count(*)::int as n from moderation_actions where user_id in ${tx(ids)}`)[0].n).toBe(0)
      const [job] = await tx`select schedule, command from cron.job where jobname = 'scan-integrity-daily'`
      expect(job).toMatchObject({ schedule: '0 4 * * *', command: 'select public.scan_integrity()' })
      await tx`update integrity_flags set created_at = now() - interval '8 days' where user_id in ${tx(ids)}`
      await tx`select public.scan_integrity()`
      expect((await tx`select count(*)::int as n from integrity_flags where user_id = ${ids[0]} and kind = 'rapid_gain'`)[0].n).toBe(2)
      expect((await tx`select count(*)::int as n from integrity_flags where user_id = ${ids[1]} and kind = 'improbable_run'`)[0].n).toBe(2)
      await tx`set local role authenticated`
      await expect(tx.savepoint(async sp => sp`select public.scan_integrity()`)).rejects.toThrow(/permission denied/)
      await tx`reset role`
      throw new Error('ROLLBACK_FIXTURE')
    }).catch(error => { if (error.message !== 'ROLLBACK_FIXTURE') throw error })
  })
})
