import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
export const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

export const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export const testSql = postgres(
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  { prepare: false, max: 3 }
)

export async function createTestUser(emailPrefix = 'user') {
  const email = `${emailPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`
  const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (createError || !createData.user) {
    throw new Error(`Failed to create test user: ${createError?.message}`)
  }

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkError || !linkData.properties?.hashed_token) {
    throw new Error(`Failed to generate magic link: ${linkError?.message}`)
  }

  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: sessionData, error: verifyError } = await client.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })
  if (verifyError || !sessionData.session) {
    throw new Error(`Failed to verify OTP: ${verifyError?.message}`)
  }

  return {
    user: createData.user,
    token: sessionData.session.access_token,
  }
}

export function createUserClient(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  status: number
  ok: boolean
  data: T
  json(): Promise<T>
  text(): Promise<string>
  headers: Headers
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function call<T = any>(
  path: string,
  body?: unknown,
  token?: string,
  method?: string,
  extraHeaders?: Record<string, string>
): Promise<ApiResponse<T>> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const url = `${SUPABASE_URL}/functions/v1/api${cleanPath}`

  const headers: Record<string, string> = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (extraHeaders) {
    Object.assign(headers, extraHeaders)
  }

  const httpMethod = method ?? (body !== undefined ? 'POST' : 'GET')

  const res = await fetch(url, {
    method: httpMethod,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data: unknown = null
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }

  return {
    status: res.status,
    ok: res.ok,
    data: data as T,
    json: async () => data as T,
    text: async () => text,
    headers: res.headers,
  }
}
