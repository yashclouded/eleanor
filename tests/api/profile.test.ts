import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { adminClient, call, createTestUser, createUserClient, testSql, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './helpers.ts'

describe('editable profiles', () => {
  let learner: Awaited<ReturnType<typeof createTestUser>>
  let other: Awaited<ReturnType<typeof createTestUser>>
  const handle = `photo_${crypto.randomUUID().slice(0, 8)}`
  const photo = 'data:image/jpeg;base64,/9j/2Q=='
  const anonymous = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
  beforeAll(async () => {
    learner = await createTestUser('profile')
    other = await createTestUser('other_profile')
    expect((await call('/onboarding', {
      handle, ageConfirmed: true, termsAccepted: true, pledgeAccepted: true,
      leaderboardVisible: false, tracks: ['logic'],
    }, learner.token)).status).toBe(201)
  })
  afterAll(async () => {
    for (const user of [learner, other]) if (user) await adminClient.auth.admin.deleteUser(user.user.id)
    await testSql.end()
  })

  it('persists owner metadata and effects, protects other users, and exports the photo', async () => {
    const client = createUserClient(learner.token)
    const { data, error } = await client.from('profiles').update({
      display_name: 'Mira Sen', avatar_data_url: photo, sound_enabled: false, celebrations_enabled: false,
    }).eq('id', learner.user.id).select().single()
    expect(error).toBeNull()
    expect(data.display_name).toBe('Mira Sen')
    expect(data.sound_enabled).toBe(false)
    const { data: changed } = await createUserClient(other.token).from('profiles')
      .update({ display_name: 'Intruder' }).eq('id', learner.user.id).select()
    expect(changed).toEqual([])
    const exported = await call('/export', undefined, learner.token)
    expect(exported.data.profile.avatar_data_url).toBe(photo)
    expect(exported.data.profile.display_name).toBe('Mira Sen')
  })

  it('enforces name/photo bounds at the database boundary', async () => {
    const client = createUserClient(learner.token)
    for (const display_name of ['', '   ', ' name ', 'x'.repeat(61)]) {
      expect((await client.from('profiles').update({ display_name }).eq('id', learner.user.id)).error?.code).toBe('23514')
    }
    for (const avatar_data_url of ['https://external.invalid/photo.jpg', 'data:image/svg+xml;base64,PHN2Zz4=', `${photo}${'A'.repeat(90_000)}`]) {
      expect((await client.from('profiles').update({ avatar_data_url }).eq('id', learner.user.id)).error?.code).toBe('23514')
    }
  })

  it('keeps photos and names private until visibility is enabled, and supports removal', async () => {
    expect((await anonymous.rpc('public_profile', { p_handle: handle })).data).toBeNull()
    const client = createUserClient(learner.token)
    await client.from('profiles').update({ leaderboard_visible: true }).eq('id', learner.user.id)
    const { data } = await anonymous.rpc('public_profile', { p_handle: handle })
    expect(data.display_name).toBe('Mira Sen')
    expect(data.avatar_data_url).toBe(photo)
    expect(data).not.toHaveProperty('sound_enabled')
    expect(data).not.toHaveProperty('id')
    expect((await anonymous.rpc('public_profile_ratings', { p_handle: handle })).error?.code).toBe('42501')
    await client.from('profiles').update({ display_name: null, avatar_data_url: null }).eq('id', learner.user.id)
    const result = await client.from('profiles').select('display_name,avatar_data_url').eq('id', learner.user.id).single()
    expect(result.data).toEqual({ display_name: null, avatar_data_url: null })
  })
})
