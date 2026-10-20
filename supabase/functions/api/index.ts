import { withSupabase } from 'npm:@supabase/server@1.9.0'
import { route } from './router.ts'
import { fail, HttpError } from './http.ts'

const appOrigin = Deno.env.get('APP_ORIGIN') ?? 'http://127.0.0.1:5173'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': appOrigin,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function addCorsHeaders(res: Response): Response {
  const headers = new Headers(res.headers)
  headers.set('Access-Control-Allow-Origin', appOrigin)
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  })
}

const handler = withSupabase(
  {
    auth: 'user',
    cors: { headers: corsHeaders },
  },
  async (req, ctx) => {
    try {
      const userId = ctx.userClaims?.id
      if (!userId) {
        return fail('unauthenticated', 'User identity missing')
      }
      const isAdmin = ctx.userClaims?.appMetadata?.role === 'admin'
      return await route(req, { userId, isAdmin, req })
    } catch (err: unknown) {
      if (err instanceof HttpError) {
        return fail(err.code, err.message)
      }
      console.error('Unhandled server error:', err)
      return fail('internal', 'An internal error occurred')
    }
  }
)

Deno.serve(async (req) => {
  // Handle CORS preflight for APP_ORIGIN only
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('Origin')
    if (origin && origin !== appOrigin) {
      return fail('forbidden', 'CORS origin not allowed')
    }
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  const res = await handler(req)
  if (res.status === 401) {
    return addCorsHeaders(fail('unauthenticated', 'Unauthenticated'))
  }
  return addCorsHeaders(res)
})
