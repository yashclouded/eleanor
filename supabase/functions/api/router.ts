import { fail } from './http.ts'
import {
  handleOnboarding,
  handleGetMe,
  handleUpdateHandle,
} from './routes/onboarding.ts'
import {
  handleCreateSet,
  handleNextProblem,
  handleGetAttempt,
} from './routes/sets.ts'
import {
  handleCommitAttempt,
  handleGiveUpAttempt,
} from './routes/attempts.ts'

export type Ctx = {
  userId: string
  isAdmin: boolean
  req: Request
  params: Record<string, string>
}

type RouteHandler = (ctx: Ctx) => Promise<Response>

interface RouteEntry {
  method: string
  pattern: string
  regex: RegExp
  paramNames: string[]
  handler: RouteHandler
}

function compilePattern(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = []
  const segments = pattern.split('/').filter(Boolean)
  const regexParts = segments.map((seg) => {
    if (seg.startsWith(':')) {
      paramNames.push(seg.slice(1))
      return '([^/]+)'
    }
    return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  })
  const regex = new RegExp(`^/${regexParts.join('/')}/?$`)
  return { regex, paramNames }
}

function createRoute(method: string, pattern: string, handler: RouteHandler): RouteEntry {
  const { regex, paramNames } = compilePattern(pattern)
  return { method, pattern, regex, paramNames, handler }
}

const routes: RouteEntry[] = [
  createRoute('POST', '/onboarding', handleOnboarding),
  createRoute('GET', '/me', handleGetMe),
  createRoute('POST', '/handle', handleUpdateHandle),
  createRoute('POST', '/sets', handleCreateSet),
  createRoute('POST', '/sets/:id/next', handleNextProblem),
  createRoute('GET', '/attempts/:id', handleGetAttempt),
  createRoute('POST', '/attempts/:id/commit', handleCommitAttempt),
  createRoute('POST', '/attempts/:id/give-up', handleGiveUpAttempt),
]

export async function route(req: Request, ctx: Omit<Ctx, 'params'>): Promise<Response> {
  const url = new URL(req.url)
  let pathname = url.pathname

  if (pathname.startsWith('/functions/v1/api')) {
    pathname = pathname.slice('/functions/v1/api'.length) || '/'
  } else if (pathname.startsWith('/api')) {
    pathname = pathname.slice('/api'.length) || '/'
  }

  for (const r of routes) {
    if (r.method === req.method) {
      const match = pathname.match(r.regex)
      if (match) {
        const params: Record<string, string> = {}
        for (let i = 0; i < r.paramNames.length; i++) {
          params[r.paramNames[i]] = decodeURIComponent(match[i + 1])
        }
        return await r.handler({ ...ctx, params, req })
      }
    }
  }

  return fail('not_found', `Route not found: ${req.method} ${pathname}`)
}
