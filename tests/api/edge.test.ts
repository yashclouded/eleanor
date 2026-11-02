import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startTestApi } from './runtime.ts'
import { adminClient, call, createTestUser, SUPABASE_PUBLISHABLE_KEY } from './helpers.ts'

describe('real Edge HTTP boundary', () => {
  let runtime: Awaited<ReturnType<typeof startTestApi>>
  const previousUrl = process.env.API_TEST_URL
  let user: Awaited<ReturnType<typeof createTestUser>>
  beforeAll(async () => {
    runtime = await startTestApi('http://localhost:5173')
    process.env.API_TEST_URL = runtime.url
    user = await createTestUser('edge')
    const response = await call('/onboarding', {
      handle: `edge_${user.user.id.slice(0, 8)}`, ageConfirmed: true, termsAccepted: true,
      pledgeAccepted: true, leaderboardVisible: false, tracks: ['judgment'], intensity: 'balanced',
    }, user.token)
    expect(response.status).toBe(201)
  })
  afterAll(async () => {
    if (user) await adminClient.auth.admin.deleteUser(user.user.id)
    if (runtime) await runtime.close()
    if (previousUrl === undefined) delete process.env.API_TEST_URL
    else process.env.API_TEST_URL = previousUrl
  })

  it('enforces the configured origin on authenticated requests and preflights', async () => {
    const base = process.env.API_TEST_URL!
    const headers = { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${user.token}` }
    for (const method of ['GET', 'OPTIONS']) {
      const denied = await fetch(`${base}/me`, { method, headers: { ...headers, origin: 'https://attacker.invalid' } })
      expect(denied.status).toBe(403)
      expect(denied.headers.has('access-control-allow-origin')).toBe(false)
      const allowed = await fetch(`${base}/me`, { method, headers: { ...headers, origin: 'http://localhost:5173' } })
      expect(allowed.status).toBe(method === 'OPTIONS' ? 204 : 200)
      expect(allowed.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
    }
    const response = await call('/me', undefined, user.token)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect((await call('/me')).status).toBe(401)
  })

  it('returns 413 at both body limits before handler validation or database writes', async () => {
    for (const [path, bytes] of [['/reports', 8193], ['/code/run', 65537]] as const) {
      const response = await call(path, { value: 'a'.repeat(bytes) }, user.token)
      expect(response.status).toBe(413)
      expect(response.data.error.code).toBe('payload_too_large')
    }
  })
})
