import { afterEach, describe, expect, it, vi } from 'vitest'
import { body, HttpError } from '../supabase/functions/api/http.ts'
import { getJudge0Client } from '../supabase/functions/api/judge0.ts'

declare global {
  const Deno: { env: { get(key: string): string | undefined } }
}

const valid = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object'

describe('request byte limits', () => {
  it('accepts JSON at the limit and rejects larger UTF-8 bodies', async () => {
    const request = (payload: string) => new Request('http://localhost/sets', { method: 'POST', body: payload })
    await expect(body(request(JSON.stringify({ x: 'a'.repeat(8184) })), valid)).resolves.toHaveProperty('x')
    await expect(body(request(JSON.stringify({ x: 'é'.repeat(4093) })), valid)).rejects.toThrow('8 KB')
  })

  it('enforces limits while streaming even without Content-Length', async () => {
    let cancelled = false
    let chunks = 0
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (chunks++ < 4) controller.enqueue(new Uint8Array(4096))
        else controller.close()
      },
      cancel() { cancelled = true },
    })
    const request = new Request('http://localhost/sets', { method: 'POST', body: stream, duplex: 'half' } as RequestInit)
    await expect(body(request, valid)).rejects.toThrow('8 KB')
    expect(cancelled).toBe(true)
  })

  it('caps code request envelopes at 64 KB', async () => {
    const request = new Request('http://localhost/code/run', { method: 'POST', body: JSON.stringify({ source: 'a'.repeat(65536) }) })
    await expect(body(request, valid, 65536)).rejects.toThrow('64 KB')
  })

  it('reports malformed and invalid JSON as client errors', async () => {
    const request = (payload: string) => new Request('http://localhost', { method: 'POST', body: payload })
    await expect(body(request('{'), valid)).rejects.toBeInstanceOf(HttpError)
    await expect(body(request('null'), valid)).rejects.toBeInstanceOf(HttpError)
  })
})

describe('Judge0 test fixture boundary', () => {
  afterEach(() => vi.unstubAllGlobals())
  function env(values: Record<string, string>) {
    vi.stubGlobal('Deno', { env: { get: (key: string) => values[key] } })
  }

  it('refuses client-selected judge endpoints unless test mode is explicitly enabled', () => {
    env({ JUDGE0_AUTH_TOKEN: 'private-token' })
    expect(() => getJudge0Client('https://attacker.example')).toThrow('Test judge override is disabled')
  })

  it('limits test judge endpoints to local HTTP fixtures and strips credentials', async () => {
    env({ ENABLE_TEST_JUDGE0: '1', JUDGE0_AUTH_HEADER: 'X-Auth-Token', JUDGE0_AUTH_TOKEN: 'private-token' })
    expect(() => getJudge0Client('https://attacker.example')).toThrow('local HTTP')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ token: 'fixture' }]), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    await getJudge0Client('http://host.docker.internal:8790').createBatchSubmissions([{ language_id: 71, source_code: 'pass' }])
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has('X-Auth-Token')).toBe(false)
  })
})
