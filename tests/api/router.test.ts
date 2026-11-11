import { afterAll, expect, it, vi } from 'vitest'

afterAll(() => vi.unstubAllGlobals())

it('classifies malformed percent escapes before invoking a route handler', async () => {
  vi.stubGlobal('Deno', { env: { get: () => undefined } })
  const { route } = await import('../../supabase/functions/api/router.ts')
  const req = new Request('http://localhost/api/attempts/%E0%A4%A')
  await expect(route(req, { req, userId: crypto.randomUUID(), isAdmin: false })).rejects.toMatchObject({
    name: 'HttpError', code: 'invalid', message: 'Invalid path identifier',
  })
})
