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

export async function body<T>(req: Request, validate: (x: unknown) => x is T): Promise<T> {
  let parsed: unknown
  try {
    parsed = await req.json()
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
