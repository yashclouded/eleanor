import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { body, assertAllowedOrigin, ok } from '../../supabase/functions/api/http.ts'

const acceptsObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object'

it('bounds JSON by actual UTF-8 bytes, including chunked bodies and dishonest lengths', async () => {
  for (const path of ['/api/onboarding', '/api/reports', '/api/attempts/id/commit', '/api/admin/users/id/action']) {
    const req = new Request(`http://localhost${path}`, { method: 'POST', body: JSON.stringify({ value: 'é'.repeat(4200) }), headers: { 'content-length': '1' } })
    await expect(body(req, acceptsObject)).rejects.toMatchObject({ code: 'payload_too_large' })
  }
  const huge = new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode('{"value":"'))
    controller.enqueue(new Uint8Array(8192).fill(97))
    controller.enqueue(new TextEncoder().encode('"}'))
    controller.close()
  } })
  const req = new Request('http://localhost/api/reports', { method: 'POST', body: huge, duplex: 'half' } as RequestInit)
  await expect(body(req, acceptsObject)).rejects.toMatchObject({ code: 'payload_too_large' })
})

it('allows code request bodies up to 64 KiB and other JSON up to 8 KiB', async () => {
  const small = JSON.stringify({ value: 'a'.repeat(8180) })
  expect(new TextEncoder().encode(small).length).toBe(8192)
  await expect(body(new Request('http://localhost/api/reports', { method: 'POST', body: small }), acceptsObject)).resolves.toHaveProperty('value')
  const code = JSON.stringify({ source: 'a'.repeat(65523) })
  expect(new TextEncoder().encode(code).length).toBe(65536)
  for (const path of ['/api/code/run', '/functions/v1/api/code/submit/']) {
    await expect(body(new Request(`http://localhost${path}`, { method: 'POST', body: code }), acceptsObject)).resolves.toHaveProperty('source')
    await expect(body(new Request(`http://localhost${path}`, { method: 'POST', body: code + ' ' }), acceptsObject)).rejects.toMatchObject({ code: 'payload_too_large' })
  }
})

it('rejects malformed JSON without converting parse errors into server errors', async () => {
  await expect(body(new Request('http://localhost/api/reports', { method: 'POST', body: '{bad' }), acceptsObject)).rejects.toMatchObject({ code: 'invalid' })
})

it('rejects foreign origins for real requests as well as preflight requests', () => {
  for (const method of ['GET', 'POST', 'OPTIONS']) {
    expect(() => assertAllowedOrigin(new Request('http://localhost/api/me', { method, headers: { origin: 'https://attacker.invalid' } }), 'https://eleanor.example')).toThrow()
    expect(() => assertAllowedOrigin(new Request('http://localhost/api/me', { method, headers: { origin: 'https://eleanor.example' } }), 'https://eleanor.example')).not.toThrow()
  }
  expect(() => assertAllowedOrigin(new Request('http://localhost/api/me'), 'https://eleanor.example')).not.toThrow()
  expect(ok({ private: true }).headers.get('cache-control')).toBe('no-store')
})

beforeEach(() => {
  const env: Record<string, string> = { JUDGE0_URL: 'https://trusted-judge.example', JUDGE0_AUTH_HEADER: 'X-Auth', JUDGE0_AUTH_TOKEN: 'test-only-token' }
  vi.stubGlobal('Deno', { env: { get: (name: string) => env[name] } })
})
afterEach(() => vi.unstubAllGlobals())

it('never sends Judge0 credentials or hidden inputs to a request-selected URL', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ token: 'one' }), { headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetcher)
  const modulePath = '../../supabase/functions/api/judge0.ts'
  const judge = await import(modulePath)
  await judge.getJudge0Client('https://attacker.invalid').createSubmission({ source_code: 'print(1)', language_id: 99, stdin: 'hidden input' })
  expect(fetcher.mock.calls[0]?.[0]).toBe('https://trusted-judge.example/submissions?base64_encoded=true')
})
