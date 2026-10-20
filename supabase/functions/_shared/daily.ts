import type { TrackId } from './content/types.ts'

export const TRACK_ROTATION: TrackId[] = ['judgment', 'logic', 'math']
export const EPOCH_YEAR = 2026
export const EPOCH_MONTH = 10 // 0-indexed month for November (November 1, 2026)
export const EPOCH_DATE = 1

export function formatUtcDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const date = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${date}`
}

export function getEffectiveNow(req: Request, envFlag?: string): Date {
  if (envFlag === '1') {
    const clock = req.headers.get('x-test-clock')
    if (clock) {
      const parsed = new Date(clock)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }
  }
  return new Date()
}

export function computeDayDetails(now: Date): {
  dayStr: string
  diffDays: number
  dayNumber: number
  track: TrackId
} {
  const dayStr = formatUtcDate(now)
  const epochMs = Date.UTC(EPOCH_YEAR, EPOCH_MONTH, EPOCH_DATE)
  const currentMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const diffDays = Math.floor((currentMs - epochMs) / (86400 * 1000))
  const dayNumber = diffDays + 1
  const trackIndex = ((diffDays % 3) + 3) % 3
  const track = TRACK_ROTATION[trackIndex]

  return { dayStr, diffDays, dayNumber, track }
}
