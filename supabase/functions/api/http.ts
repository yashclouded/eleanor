export type ErrorCode =
  | 'invalid'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'payload_too_large'
  | 'internal'

const STATUS_CODES: Record<ErrorCode, number> = {
  invalid: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  payload_too_large: 413,
  internal: 500,
}

export class HttpError extends Error {
  constructor(public code: ErrorCode, message: string = code) {
    super(message)
    this.name = 'HttpError'
  }
}

export function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

export function fail(code: ErrorCode, message: string): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: { code, message },
    }),
    {
      status: STATUS_CODES[code] ?? 500,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    }
  )
}

export async function body<T>(req: Request, validate: (x: unknown) => x is T): Promise<T> {
  const limit = /\/code\/(run|submit)\/?$/.test(new URL(req.url).pathname) ? 65536 : 8192
  if (Number(req.headers.get('content-length')) > limit) {
    void req.body?.cancel().catch(() => {})
    throw new HttpError('payload_too_large', 'JSON request body exceeds its byte limit')
  }
  let parsed: unknown
  const reader = req.body?.getReader()
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    let text = ''
    let bytes = 0
    if (reader) {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        bytes += chunk.value.byteLength
        if (bytes > limit) {
          void reader.cancel().catch(() => {})
          throw new HttpError('payload_too_large', 'JSON request body exceeds its byte limit')
        }
        text += decoder.decode(chunk.value, { stream: true })
      }
    }
    parsed = JSON.parse(text + decoder.decode())
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError('invalid', 'Malformed JSON body')
  } finally {
    reader?.releaseLock()
  }
  if (!validate(parsed)) {
    throw new HttpError('invalid', 'Request validation failed')
  }
  return parsed
}

export function assertAllowedOrigin(req: Request, appOrigin: string): void {
  const origin = req.headers.get('origin')
  if (origin !== null && origin !== appOrigin) throw new HttpError('forbidden', 'CORS origin not allowed')
}

export function isUuid(x: unknown): x is string {
  return (
    typeof x === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x)
  )
}
