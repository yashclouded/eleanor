export type ErrorCode =
  | 'invalid'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'internal'

const STATUS_CODES: Record<ErrorCode, number> = {
  invalid: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
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
    headers: { 'content-type': 'application/json' },
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
      headers: { 'content-type': 'application/json' },
    }
  )
}

export async function body<T>(req: Request, validate: (x: unknown) => x is T, maxBytes = 8192): Promise<T> {
  const tooLarge = () => new HttpError('invalid', `Request body exceeds ${maxBytes / 1024} KB limit`)
  if (Number(req.headers.get('content-length')) > maxBytes) throw tooLarge()
  const reader = req.body?.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        length += value.byteLength
        if (length > maxBytes) {
          await reader.cancel()
          throw tooLarge()
        }
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    throw new HttpError('invalid', 'Malformed JSON body')
  }
  if (!validate(parsed)) {
    throw new HttpError('invalid', 'Request validation failed')
  }
  return parsed
}

export function isUuid(x: unknown): x is string {
  return (
    typeof x === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x)
  )
}
