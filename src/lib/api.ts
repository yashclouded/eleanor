import { supabase } from './supabase.ts'

export class ApiError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export async function api<T>(
  path: string,
  init?: { method?: 'GET' | 'POST'; body?: unknown }
): Promise<T> {
  const url = import.meta.env.VITE_SUPABASE_URL
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new ApiError('config_error', 'Missing Supabase environment variables', 500)
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    apikey: publishableKey,
    Authorization: `Bearer ${session?.access_token ?? publishableKey}`,
  }

  const method = init?.method ?? (init?.body !== undefined ? 'POST' : 'GET')

  if (init?.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const fullUrl = `${url.replace(/\/+$/, '')}/functions/v1/api${path}`

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })

  // Try parsing JSON response envelope
  let json: unknown
  const text = await res.text()
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    throw new ApiError('parse_error', `Invalid JSON response: ${text.slice(0, 100)}`, res.status)
  }

  if (!res.ok) {
    const errObj = (json && typeof json === 'object' && 'error' in json)
      ? (json as { error: { code?: string; message?: string } }).error
      : null

    const code = errObj?.code ?? `http_${res.status}`
    const message = errObj?.message ?? res.statusText ?? 'Request failed'
    throw new ApiError(code, message, res.status)
  }

  if (json && typeof json === 'object' && 'ok' in json) {
    const envelope = json as { ok: boolean; data?: T; error?: { code: string; message: string } }
    if (!envelope.ok) {
      throw new ApiError(
        envelope.error?.code ?? 'unknown_error',
        envelope.error?.message ?? 'Request failed',
        res.status
      )
    }
    return envelope.data as T
  }

  return json as T
}
