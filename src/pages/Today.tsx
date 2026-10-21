import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.tsx'
import { supabase } from '../lib/supabase.ts'
import { api, type AttemptView } from '../lib/api.ts'
import { TitleBadge } from '../components/TitleBadge.tsx'
import {
  inflate,
  isProvisional,
  title as getTitle,
} from '../../supabase/functions/_shared/model.ts'

interface TrackRatingRow {
  track_id: string
  rating: number
  rd: number
  n: number
  peak: number
  last_at: string | null
}

function computeWeeklyActiveDays(
  resolvedAtList: string[],
  now: Date = new Date()
): { distinctDays: number } {
  const currentDayOfWeek = (now.getDay() + 6) % 7 // Monday = 0, Sunday = 6
  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - currentDayOfWeek,
    0,
    0,
    0,
    0
  )
  const endOfWeek = new Date(
    startOfWeek.getFullYear(),
    startOfWeek.getMonth(),
    startOfWeek.getDate() + 7,
    0,
    0,
    0,
    0
  )

  const distinctLocalDates = new Set<string>()

  for (const dateStr of resolvedAtList) {
    if (!dateStr) continue
    const d = new Date(dateStr)
    if (d >= startOfWeek && d < endOfWeek) {
      const localYear = d.getFullYear()
      const localMonth = String(d.getMonth() + 1).padStart(2, '0')
      const localDate = String(d.getDate()).padStart(2, '0')
      distinctLocalDates.add(`${localYear}-${localMonth}-${localDate}`)
    }
  }

  return { distinctDays: distinctLocalDates.size }
}

export function Today() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startingTrack, setStartingTrack] = useState<string | null>(null)

  // Track ratings
  const [trackRatings, setTrackRatings] = useState<Map<string, TrackRatingRow>>(new Map())
  // Open sets per track (track_id -> set_id)
  const [openSets, setOpenSets] = useState<Map<string, string>>(new Map())
  // Due echoes
  const [dueEchoCount, setDueEchoCount] = useState<number>(0)
  // Daily Crux state
  const [dailyNumber, setDailyNumber] = useState<number | null>(null)
  const [dailySolved, setDailySolved] = useState<boolean>(false)
  // Weekly active days
  const [distinctActiveDays, setDistinctActiveDays] = useState<number>(0)

  const tracks = profile?.tracks && profile.tracks.length > 0
    ? profile.tracks
    : ['judgment', 'logic', 'math']

  const weeklyGoal = profile?.weekly_goal ?? 3

  const loadDashboardData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      // 1. Fetch user's track ratings via supabase-js (RLS)
      const { data: ratingRows, error: ratingErr } = await supabase
        .from('track_ratings')
        .select('*')
        .eq('user_id', user.id)

      if (ratingErr) {
        console.error('Error loading track ratings:', ratingErr)
      } else if (ratingRows) {
        const map = new Map<string, TrackRatingRow>()
        for (const row of ratingRows as TrackRatingRow[]) {
          map.set(row.track_id, row)
        }
        setTrackRatings(map)
      }

      // 2. Fetch open rated sets for user
      const { data: setRows, error: setErr } = await supabase
        .from('sets')
        .select('id, track_id')
        .eq('user_id', user.id)
        .eq('mode', 'rated')
        .is('closed_at', null)

      if (setErr) {
        console.error('Error loading sets:', setErr)
      } else if (setRows) {
        const setMap = new Map<string, string>()
        for (const s of setRows) {
          setMap.set(s.track_id, s.id)
        }
        setOpenSets(setMap)
      }

      // 3. Fetch due echoes count
      const { count: echoCount, error: echoErr } = await supabase
        .from('echoes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'due')
        .lte('due_at', new Date().toISOString())

      if (echoErr) {
        console.error('Error loading echoes:', echoErr)
      } else {
        setDueEchoCount(echoCount ?? 0)
      }

      // 4. Fetch daily challenge status
      try {
        const dailyRes = await api<{ number: number; day: string; attempt: AttemptView }>('/daily')
        setDailyNumber(dailyRes.number)
        const isSolved = dailyRes.attempt.state === 'resolved' || dailyRes.attempt.state === 'revealed'
        setDailySolved(isSolved)
      } catch (dErr) {
        console.warn('Could not load daily status:', dErr)
      }

      // 5. Fetch resolved attempts for distinct local days this local week
      const { data: attemptRows, error: attemptErr } = await supabase
        .from('attempts')
        .select('resolved_at')
        .eq('user_id', user.id)
        .in('state', ['resolved', 'revealed'])
        .not('resolved_at', 'is', null)

      if (attemptErr) {
        console.error('Error loading attempts for weekly dots:', attemptErr)
      } else if (attemptRows) {
        const resolvedList = attemptRows
          .map((a) => a.resolved_at)
          .filter((t): t is string => typeof t === 'string')
        const { distinctDays } = computeWeeklyActiveDays(resolvedList, new Date())
        setDistinctActiveDays(distinctDays)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard data'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const handleStartSet = async (track: string) => {
    setStartingTrack(track)
    setError(null)
    try {
      const res = await api<{ set: { id: string } }>('/sets', {
        method: 'POST',
        body: {
          transitionId: crypto.randomUUID(),
          track,
          mode: 'rated',
        },
      })
      navigate(`/train/${res.set.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to start ${track} set`
      setError(msg)
      setStartingTrack(null)
    }
  }

  const handleResumeSet = (setId: string) => {
    navigate(`/train/${setId}`)
  }

  return (
    <div className="container-dashboard" data-testid="today-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-1)' }}>
            Welcome back, {profile?.handle ?? 'Learner'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Your daily training session, active tracks, and retention reviews.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      {/* Top 3 Summary Cards: Weekly Goal, Daily Crux, Due Echoes */}
      <section className="dashboard-grid" aria-label="Daily summary">
        {/* 1. Weekly Goal Dots Card */}
        <div className="dashboard-card" data-testid="weekly-goal-card">
          <div>
            <h2 className="dashboard-card-title">Weekly Goal</h2>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
              {distinctActiveDays} / {weeklyGoal} days
            </div>
            <div
              className="weekly-dots"
              data-testid="weekly-dots"
              aria-label={`Weekly goal: ${distinctActiveDays} of ${weeklyGoal} days completed`}
            >
              {Array.from({ length: Math.max(weeklyGoal, distinctActiveDays) }).map((_, i) => {
                const isFilled = i < distinctActiveDays
                return (
                  <span
                    key={i}
                    data-testid={isFilled ? 'weekly-dot-filled' : 'weekly-dot'}
                    className={`weekly-dot ${isFilled ? 'filled' : 'empty'}`}
                    aria-label={`Day ${i + 1}: ${isFilled ? 'completed' : 'not completed'}`}
                  />
                )
              })}
            </div>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Training days completed this local week.
          </p>
        </div>

        {/* 2. Daily Crux Card */}
        <div className="dashboard-card" data-testid="daily-crux-card">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
              <h2 className="dashboard-card-title">Daily Crux</h2>
              <span
                data-testid="daily-status"
                className={`status-badge ${dailySolved ? 'solved' : 'unsolved'}`}
              >
                {dailySolved ? 'Solved' : 'Unsolved'}
              </span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: 'var(--space-2)' }}>
              {dailyNumber !== null ? `Daily Crux #${dailyNumber}` : "Today's Crux"}
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              One global problem per day. Unrated reasoning puzzle with crowd statistics.
            </p>
          </div>
          <Link
            to="/daily"
            data-testid="daily-card-link"
            className="btn btn-secondary btn-sm"
            style={{ width: 'fit-content' }}
          >
            {dailySolved ? 'View results' : "Play today's Crux"}
          </Link>
        </div>

        {/* 3. Due Echoes Card */}
        <div className="dashboard-card" data-testid="due-echoes-card">
          <div>
            <h2 className="dashboard-card-title">Due Echoes</h2>
            <div
              data-testid="due-echoes-count"
              style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)', marginBottom: 'var(--space-2)' }}
            >
              {dueEchoCount} due
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Spaced retrieval reviews scheduled to verify retention and prove concepts.
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Included automatically in your training sets.
          </span>
        </div>
      </section>

      {/* Tracks Training Section */}
      <section aria-labelledby="tracks-heading" style={{ marginBottom: 'var(--space-8)' }}>
        <h2 id="tracks-heading" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          Your Tracks
        </h2>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading track details...</p>
        ) : (
          <div className="tracks-grid">
            {tracks.map((track) => {
              const tr = trackRatings.get(track)
              const rating = tr?.rating ?? 1200
              const rd = tr?.rd ?? 350
              const lastAt = tr?.last_at ? new Date(tr.last_at) : null
              const n = tr?.n ?? 0

              const effectiveRd = inflate({ r: rating, rd, lastAt }, new Date()).rd
              const provisional = isProvisional(effectiveRd)
              const titleName = getTitle(rating)
              const displayRating = provisional ? `${Math.round(rating)}?` : `${Math.round(rating)}`
              const isPlacement = n < 8

              const openSetId = openSets.get(track)

              return (
                <div key={track} className="track-card" data-testid={`track-card-${track}`}>
                  <div className="track-card-header">
                    <span className="track-card-title">{track}</span>
                    <TitleBadge title={titleName} />
                  </div>

                  <div className="track-card-body">
                    <div className="track-rating-row">
                      <span className="track-rating-value">{displayRating}</span>
                      {provisional && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          (provisional)
                        </span>
                      )}
                    </div>

                    {isPlacement ? (
                      <div style={{ marginTop: 'var(--space-2)' }}>
                        <span className="placement-badge">Placement {n}/8</span>
                      </div>
                    ) : (
                      <div style={{ marginTop: 'var(--space-2)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {n} rated {n === 1 ? 'attempt' : 'attempts'}
                      </div>
                    )}
                  </div>

                  <div className="track-card-actions">
                    {openSetId ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleResumeSet(openSetId)}
                        aria-label={`Resume ${track} set`}
                      >
                        Resume {track} set
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleStartSet(track)}
                        disabled={startingTrack !== null}
                        aria-label={`Start ${track} set`}
                      >
                        {startingTrack === track ? 'Starting...' : `Start ${track} set`}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
