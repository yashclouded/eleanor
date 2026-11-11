import { sql } from '../db.ts'
import { body, HttpError, isUuid, ok } from '../http.ts'
import type { Ctx } from '../router.ts'

function requireAdmin(ctx: Ctx): void {
  if (!ctx.isAdmin) throw new HttpError('forbidden', 'Administrator access required')
}

interface ReasonBody { reason: string }

function hasReason(value: unknown): value is ReasonBody {
  if (!value || typeof value !== 'object') return false
  const reason = (value as Record<string, unknown>).reason
  return typeof reason === 'string' && reason.trim().length >= 5 && reason.trim().length <= 1000
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) === value.slice(0, 10)
}

interface UserActionBody extends ReasonBody {
  action: 'ban' | 'unban' | 'unrate'
  from?: string
}

function isUserAction(value: unknown): value is UserActionBody {
  if (!hasReason(value)) return false
  const data = value as unknown as Record<string, unknown>
  return typeof data.action === 'string' && ['ban', 'unban', 'unrate'].includes(data.action) &&
    (data.from === undefined || (data.action === 'unrate' && validDate(data.from)))
}

export async function handleModelHealth(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx)
  const value = new URL(ctx.req.url).searchParams.get('days') ?? '30'
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 365) {
    throw new HttpError('invalid', 'days must be an integer between 1 and 365')
  }
  const [row] = await sql`select public.admin_model_health(${Number(value)}) as health`
  return ok(row.health)
}

export async function handleAdminItems(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx)
  const flagged = new URL(ctx.req.url).searchParams.get('flagged')
  if (flagged !== null && flagged !== '0' && flagged !== '1') {
    throw new HttpError('invalid', 'flagged must be 0 or 1')
  }
  const items = await sql`
    select id, track_id as track, rating, rd, n, anchor, status, residual
    from public.admin_item_residuals
    where ${flagged === '1'} = false or (n >= 50 and abs(residual) > 0.15)
    order by abs(residual) desc nulls last, id
  `
  return ok({ items })
}

async function changeItem(ctx: Ctx, action: 'retire' | 'anchor'): Promise<Response> {
  requireAdmin(ctx)
  const id = ctx.params.id
  if (!/^[a-z0-9_.-]+@\d+#\d+$/.test(id) || id.length > 200) {
    throw new HttpError('invalid', 'Invalid item identifier')
  }
  const data = await body(ctx.req, hasReason)
  return await sql.begin(async (tx) => {
    const [item] = await tx`select id, status from public.items where id = ${id} for update`
    if (!item) throw new HttpError('not_found', 'Item not found')
    if (action === 'anchor') {
      if (item.status !== 'published') throw new HttpError('conflict', 'Only published items can be anchored')
      const [responses] = await tx`select n from public.admin_item_residuals where id = ${id}`
      if (responses.n < 200) throw new HttpError('conflict', 'Anchoring requires at least 200 calibrated item responses')
      await tx`update public.items set anchor = true, updated_at = now() where id = ${id}`
    } else {
      await tx`update public.items set status = 'retired', updated_at = now() where id = ${id}`
    }
    await tx`
      insert into public.moderation_actions (admin_id, user_id, action, reason, params)
      values (${ctx.userId}, ${ctx.userId}, 'note', ${data.reason.trim()},
        ${tx.json({ itemId: id, itemAction: action })})
    `
    return ok({ id, action })
  })
}

export function handleRetireItem(ctx: Ctx): Promise<Response> { return changeItem(ctx, 'retire') }
export function handleAnchorItem(ctx: Ctx): Promise<Response> { return changeItem(ctx, 'anchor') }

export async function handleAdminFlags(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx)
  const flags = await sql`
    select f.id, f.user_id as "userId", p.handle, f.track_id as track,
      f.kind, jsonb_strip_nulls(jsonb_build_object(
        'gain', f.detail->'gain', 'days', f.detail->'days', 'rd', f.detail->'rd',
        'n', f.detail->'n', 'sumS', f.detail->'sumS', 'sumE', f.detail->'sumE',
        'variance', f.detail->'variance', 'z', f.detail->'z', 'approximation', f.detail->'approximation'
      )) as detail, f.created_at as "createdAt", f.resolved_at as "resolvedAt", f.resolution
    from public.integrity_flags f join public.profiles p on p.id = f.user_id
    order by (f.resolved_at is null) desc, f.created_at desc, f.id
  `
  return ok({ flags })
}

export async function handleResolveFlag(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx)
  if (!isUuid(ctx.params.id)) throw new HttpError('invalid', 'Invalid flag identifier')
  const data = await body(ctx.req, hasReason)
  return await sql.begin(async (tx) => {
    const [flag] = await tx`select user_id, resolved_at from public.integrity_flags where id = ${ctx.params.id} for update`
    if (!flag) throw new HttpError('not_found', 'Flag not found')
    if (flag.resolved_at) throw new HttpError('conflict', 'Flag already resolved')
    await tx`
      update public.integrity_flags set resolved_at = now(), resolution = ${data.reason.trim()}
      where id = ${ctx.params.id}
    `
    await tx`
      insert into public.moderation_actions (admin_id, user_id, action, reason, params)
      values (${ctx.userId}, ${flag.user_id}, 'note', ${data.reason.trim()},
        ${tx.json({ flagId: ctx.params.id })})
    `
    return ok({ id: ctx.params.id })
  })
}

export async function handleAdminReports(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx)
  const reports = await sql`
    select r.id, r.target_id as "userId", target.handle,
      reporter.handle as "reporterHandle", r.reason,
      r.created_at as "createdAt", r.resolved_at as "resolvedAt", r.resolution
    from public.reports r join public.profiles target on target.id = r.target_id
    left join public.profiles reporter on reporter.id = r.reporter_id
    order by (r.resolved_at is null) desc, r.created_at desc, r.id
  `
  return ok({ reports })
}

export async function handleUserAction(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx)
  if (!isUuid(ctx.params.id)) throw new HttpError('invalid', 'Invalid user identifier')
  const data = await body(ctx.req, isUserAction)
  return await sql.begin(async (tx) => {
    const [profile] = await tx`select id from public.profiles where id = ${ctx.params.id} for update`
    if (!profile) throw new HttpError('not_found', 'User not found')
    const from = data.from ? new Date(data.from).toISOString() : '1970-01-01T00:00:00.000Z'
    let unrated = 0
    if (data.action === 'unrate') {
      const changed = await tx`
        update public.attempts set rated = false
        where user_id = ${ctx.params.id} and rated and resolved_at >= ${from}::timestamptz
        returning id
      `
      unrated = changed.length
    } else {
      await tx`
        update public.profiles set banned_at = ${data.action === 'ban' ? new Date() : null}
        where id = ${ctx.params.id}
      `
    }
    const params = data.action === 'unrate' ? { from, unrated, replayRequired: true } : {}
    await tx`
      insert into public.moderation_actions (admin_id, user_id, action, reason, params)
      values (${ctx.userId}, ${ctx.params.id}, ${data.action}, ${data.reason.trim()}, ${tx.json(params)})
    `
    return ok({ id: ctx.params.id, action: data.action, ...params })
  })
}
