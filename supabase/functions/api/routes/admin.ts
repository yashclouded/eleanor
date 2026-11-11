import type postgres from 'npm:postgres@3.4.5'
import { sql } from '../db.ts'
import { body, HttpError, isUuid, ok } from '../http.ts'
import { withTransition } from '../transition.ts'
import type { Ctx } from '../router.ts'

interface ActionBody {
  transitionId: string
  reason: string
  action?: 'ban' | 'unban' | 'unrate'
  from?: string
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false
  return Number.isFinite(Date.parse(value)) &&
    new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) === value.slice(0, 10)
}

function isActionBody(value: unknown): value is ActionBody {
  if (!value || typeof value !== 'object') return false
  const b = value as Record<string, unknown>
  return isUuid(b.transitionId) && typeof b.reason === 'string' &&
    b.reason.trim().length >= 5 && b.reason.trim().length <= 1000 &&
    (b.from === undefined || isIsoDate(b.from))
}

type Change = {
  userId: string
  action: 'ban' | 'unban' | 'unrate' | 'note'
  params: Record<string, string | number | boolean | null>
}

async function moderate(ctx: Ctx, b: ActionBody, kind: string, change: (tx: postgres.TransactionSql) => Promise<Change>): Promise<Response> {
  return await sql.begin(async (tx) => {
    const result = await withTransition(tx, { id: b.transitionId, userId: ctx.userId, kind }, async () => {
      const changed = await change(tx)
      const [note] = await tx`
        insert into moderation_actions (admin_id, user_id, action, reason, params)
        values (${ctx.userId}, ${changed.userId}, ${changed.action}, ${b.reason.trim()}, ${tx.json(changed.params)})
        returning id
      `
      return { actionId: note.id }
    })
    return ok(result.response)
  })
}

export async function handleModelHealth(ctx: Ctx): Promise<Response> {
  const raw = new URL(ctx.req.url).searchParams.get('days') ?? '30'
  const days = Number(raw)
  if (!/^\d+$/.test(raw) || !Number.isInteger(days) || days < 1 || days > 365) {
    throw new HttpError('invalid', 'Days must be an integer between 1 and 365')
  }
  const [row] = await sql`select public.admin_model_health(${days}) as health`
  return ok(row.health)
}

export async function handleAdminItems(ctx: Ctx): Promise<Response> {
  const flagged = new URL(ctx.req.url).searchParams.get('flagged') === '1'
  const items = await sql`
    select id, track_id as track, rating, rd, anchor, status, n, residual
    from public.admin_item_residuals
    where not ${flagged} or (n >= 50 and abs(residual) > 0.15 and status = 'published')
    order by abs(residual) desc nulls last, id
  `
  return ok({ items })
}

export async function handleModerateItem(ctx: Ctx): Promise<Response> {
  const b = await body(ctx.req, isActionBody)
  const id = ctx.params.id
  const operation = /\/anchor\/?$/.test(new URL(ctx.req.url).pathname) ? 'anchor' : 'retire'
  return await moderate(ctx, b, `admin:${operation}:${id}`, async (tx): Promise<Change> => {
    const [item] = await tx`select id, status, anchor, n, rating, rd from items where id = ${id} for update`
    if (!item) throw new HttpError('not_found', 'Item not found')
    if (operation === 'anchor') {
      if (item.n < 200 || item.status !== 'published' || item.anchor) {
        throw new HttpError('conflict', 'Anchoring requires an active, unfrozen item with at least 200 responses')
      }
      const [frozen] = await tx`
        update items set anchor = true, anchored_at = now(), updated_at = now() where id = ${id}
        returning anchored_at
      `
      return {
        userId: ctx.userId, action: 'note',
        params: { itemId: id, operation, anchoredAt: frozen.anchored_at.toISOString(), rating: item.rating, rd: item.rd },
      }
    }
    await tx`update items set status = 'retired', updated_at = now() where id = ${id}`
    return { userId: ctx.userId, action: 'note', params: { itemId: id, operation, replayPending: true } }
  })
}

export async function handleAdminFlags(_ctx: Ctx): Promise<Response> {
  const flags = await sql`
    select f.id, f.user_id as "userId", p.handle, f.track_id as track, f.kind, f.created_at as "createdAt",
      coalesce((select jsonb_object_agg(key, value) from jsonb_each(f.detail)
        where key in ('gain', 'z', 'n', 'sumS', 'sumE', 'variance', 'rating', 'previousRating', 'rd')
          and jsonb_typeof(value) = 'number'), '{}'::jsonb) as statistics
    from integrity_flags f join profiles p on p.id = f.user_id
    where f.resolved_at is null order by f.created_at, f.id
  `
  return ok({ flags })
}

export async function handleResolveFlag(ctx: Ctx): Promise<Response> {
  if (!isUuid(ctx.params.id)) throw new HttpError('invalid', 'Invalid flag id')
  const b = await body(ctx.req, isActionBody)
  return await moderate(ctx, b, `admin:resolve-flag:${ctx.params.id}`, async (tx) => {
    const [flag] = await tx`
      update integrity_flags set resolved_at = now(), resolution = ${b.reason.trim()}
      where id = ${ctx.params.id} and resolved_at is null returning user_id
    `
    if (!flag) throw new HttpError('not_found', 'Unresolved flag not found')
    return { userId: flag.user_id, action: 'note', params: { flagId: ctx.params.id, operation: 'resolve_flag' } }
  })
}

export async function handleAdminReports(_ctx: Ctx): Promise<Response> {
  const reports = await sql`
    select r.id, r.target_id as "userId", target.handle, reporter.handle as "reporterHandle", r.reason, r.created_at as "createdAt"
    from reports r join profiles target on target.id = r.target_id
    left join profiles reporter on reporter.id = r.reporter_id
    where r.resolved_at is null order by r.created_at, r.id
  `
  return ok({ reports })
}

export async function handleModerateUser(ctx: Ctx): Promise<Response> {
  if (!isUuid(ctx.params.id)) throw new HttpError('invalid', 'Invalid user id')
  const b = await body(ctx.req, isActionBody)
  if (b.action !== 'ban' && b.action !== 'unban' && b.action !== 'unrate') {
    throw new HttpError('invalid', 'Action must be ban, unban, or unrate')
  }
  const action = b.action
  return await moderate(ctx, b, `admin:${action}:${ctx.params.id}`, async (tx): Promise<Change> => {
    const [user] = await tx`select id from profiles where id = ${ctx.params.id} for update`
    if (!user) throw new HttpError('not_found', 'User not found')
    if (action === 'unrate') {
      const changed = await tx`
        update attempts set rated = false where user_id = ${user.id} and rated
          and resolved_at is not null and (${b.from ?? null}::timestamptz is null or resolved_at >= ${b.from ?? null}::timestamptz)
        returning id
      `
      return { userId: user.id, action, params: { from: b.from ?? null, affected: changed.length, replayPending: true } }
    }
    await tx`update profiles set banned_at = ${action === 'ban' ? new Date() : null} where id = ${user.id}`
    return { userId: user.id, action, params: {} }
  })
}
