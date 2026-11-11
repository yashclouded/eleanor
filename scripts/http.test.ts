import { describe, expect, it } from 'vitest'
import { body, HttpError } from '../supabase/functions/api/http.ts'

declare global {
  const Deno: { env: { get(key: string): string | undefined } }
}

const valid = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object'

describe('request byte limits', () => {
  it('accepts JSON at the limit and rejects larger UTF-8 bodies', async () => {
    const request = (payload: string) => new Request('http://localhost/sets', { method: 'POST', body: payload })
    await expect(body(request(JSON.stringify({ x: 'a'.repeat(8184) })), valid)).resolves.toHaveProperty('x')
    await expect(body(request(JSON.stringify({ x: 'é'.repeat(4093) })), valid)).rejects.toThrow('byte limit')
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
    await expect(body(request, valid)).rejects.toThrow('byte limit')
    expect(cancelled).toBe(true)
  })

  it('caps code request envelopes at 64 KB', async () => {
    const request = new Request('http://localhost/code/run', { method: 'POST', body: JSON.stringify({ source: 'a'.repeat(65536) }) })
    await expect(body(request, valid)).rejects.toThrow('byte limit')
  })

  it('reports malformed and invalid JSON as client errors', async () => {
    const request = (payload: string) => new Request('http://localhost', { method: 'POST', body: payload })
    await expect(body(request('{'), valid)).rejects.toBeInstanceOf(HttpError)
    await expect(body(request('null'), valid)).rejects.toBeInstanceOf(HttpError)
  })
})
