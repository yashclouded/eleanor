import type { HttpError as ApiHttpError } from '../../supabase/functions/api/http.ts'
import { adminClient } from './helpers.ts'

// Exercise isolated route code without restarting the other agents' Edge server.
export async function localCall(path: string, payload?: unknown, token?: string, method?: string, extraHeaders?: Record<string, string>) {
  const routerPath = '../../supabase/functions/api/router.ts'
  const httpPath = '../../supabase/functions/api/http.ts'
  const { route } = await import(routerPath)
  const { HttpError, fail } = await import(httpPath)
  const { data, error } = await adminClient.auth.getUser(token)
  const req = new Request(`http://localhost/api${path}`, {
    method: method ?? (payload === undefined ? 'GET' : 'POST'),
    headers: { ...extraHeaders, ...(payload === undefined ? {} : { 'content-type': 'application/json' }) },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })
  let res: Response
  try {
    res = error || !data.user ? fail('unauthenticated', 'Unauthenticated') : await route(req, { req, userId: data.user.id, isAdmin: data.user.app_metadata.role === 'admin' })
  } catch (err) {
    if (!(err instanceof HttpError)) throw err
    const httpError = err as ApiHttpError
    res = fail(httpError.code, httpError.message)
  }
  const text = await res.text()
  const parsed = JSON.parse(text)
  return { status: res.status, ok: res.ok, headers: res.headers, data: parsed, json: async () => parsed, text: async () => text }
}
