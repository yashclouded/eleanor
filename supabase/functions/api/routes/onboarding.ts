import { sql } from '../db.ts'
import { ok, body, HttpError } from '../http.ts'
import { inflate, isProvisional } from '../../_shared/model.ts'
import type { TrackId } from '../../_shared/content/types.ts'
import type { Ctx } from '../router.ts'

const VALID_TRACKS: TrackId[] = ['judgment', 'logic', 'math', 'code']
const VALID_INTENSITIES = ['steady', 'balanced', 'stretch'] as const

interface OnboardingBody {
  handle: string
  ageConfirmed: true
  termsAccepted: true
  pledgeAccepted: true
  leaderboardVisible: boolean
  tracks: TrackId[]
  intensity?: 'steady' | 'balanced' | 'stretch'
}

function isOnboardingBody(x: unknown): x is OnboardingBody {
  if (!x || typeof x !== 'object') return false
  const b = x as Record<string, unknown>

  if (typeof b.handle !== 'string' || !/^[a-z0-9_]{3,20}$/.test(b.handle)) {
    return false
  }
  if (b.ageConfirmed !== true) return false
  if (b.termsAccepted !== true) return false
  if (b.pledgeAccepted !== true) return false
  if (typeof b.leaderboardVisible !== 'boolean') return false

  if (!Array.isArray(b.tracks) || b.tracks.length < 1) return false
  const seenTracks = new Set<string>()
  for (const t of b.tracks) {
    if (typeof t !== 'string' || !VALID_TRACKS.includes(t as TrackId) || seenTracks.has(t)) {
      return false
    }
    seenTracks.add(t)
  }

  if (
    b.intensity !== undefined &&
    (typeof b.intensity !== 'string' || !VALID_INTENSITIES.includes(b.intensity as any))
  ) {
    return false
  }

  return true
}

interface HandleBody {
  handle: string
}

function isHandleBody(x: unknown): x is HandleBody {
  if (!x || typeof x !== 'object') return false
  const b = x as Record<string, unknown>
  return typeof b.handle === 'string' && /^[a-z0-9_]{3,20}$/.test(b.handle)
}

export async function handleOnboarding(ctx: Ctx): Promise<Response> {
  const b = await body(ctx.req, isOnboardingBody)

  try {
    return await sql.begin(async (tx) => {
      const existingUser = await tx`
        select id from profiles where id = ${ctx.userId}
      `
      if (existingUser.length > 0) {
        throw new HttpError('conflict', 'Profile already exists')
      }

      const existingHandle = await tx`
        select id from profiles where handle = ${b.handle}
      `
      if (existingHandle.length > 0) {
        throw new HttpError('conflict', 'Handle is already taken')
      }

      const intensity = b.intensity ?? 'balanced'

      const [profile] = await tx`
        insert into profiles (
          id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at,
          leaderboard_visible, intensity, tracks, created_at
        ) values (
          ${ctx.userId}, ${b.handle}, now(), now(), now(),
          ${b.leaderboardVisible}, ${intensity}, ${b.tracks}, now()
        )
        returning *
      `

      const trackRatings = []
      for (const track of b.tracks) {
        const [tr] = await tx`
          insert into track_ratings (
            user_id, track_id, rating, rd, n, peak
          ) values (
            ${ctx.userId}, ${track}, 1200, 350, 0, 1200
          )
          returning *
        `
        trackRatings.push(tr)
      }

      return ok({ profile, trackRatings }, 201)
    })
  } catch (err: unknown) {
    if ((err as any)?.code === '23505') {
      throw new HttpError('conflict', 'Profile or handle conflict')
    }
    throw err
  }
}

export async function handleGetMe(ctx: Ctx): Promise<Response> {
  const profiles = await sql`
    select * from profiles where id = ${ctx.userId}
  `
  if (profiles.length === 0) {
    return ok({ profile: null })
  }

  const profile = profiles[0]
  const trackRatings = await sql`
    select * from track_ratings where user_id = ${ctx.userId} order by track_id
  `

  const now = new Date()
  const enrichedRatings = trackRatings.map((tr) => {
    const inflated = inflate(
      {
        r: tr.rating,
        rd: tr.rd,
        lastAt: tr.last_at ? new Date(tr.last_at) : null,
      },
      now
    )
    return {
      ...tr,
      effectiveRd: inflated.rd,
      provisional: isProvisional(inflated.rd),
    }
  })

  return ok({
    profile,
    trackRatings: enrichedRatings,
  })
}

export async function handleUpdateHandle(ctx: Ctx): Promise<Response> {
  const b = await body(ctx.req, isHandleBody)

  try {
    return await sql.begin(async (tx) => {
      const profiles = await tx`
        select * from profiles where id = ${ctx.userId}
      `
      if (profiles.length === 0) {
        throw new HttpError('not_found', 'Profile not found')
      }
      const profile = profiles[0]

      if (profile.handle_changed_at) {
        const now = Date.now()
        const lastChanged = new Date(profile.handle_changed_at).getTime()
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
        if (now - lastChanged < thirtyDaysMs) {
          throw new HttpError('conflict', 'Handle can only be changed once every 30 days')
        }
      }

      const taken = await tx`
        select id from profiles where handle = ${b.handle} and id != ${ctx.userId}
      `
      if (taken.length > 0) {
        throw new HttpError('conflict', 'Handle is already taken')
      }

      const [updated] = await tx`
        update profiles
        set handle = ${b.handle}, handle_changed_at = now()
        where id = ${ctx.userId}
        returning *
      `

      return ok({ profile: updated })
    })
  } catch (err: unknown) {
    if ((err as any)?.code === '23505') {
      throw new HttpError('conflict', 'Handle is already taken')
    }
    throw err
  }
}
