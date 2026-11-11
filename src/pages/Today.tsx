import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.tsx'
import { supabase } from '../lib/supabase.ts'
import { api, type AttemptView } from '../lib/api.ts'
import { TitleBadge } from '../components/TitleBadge.tsx'
import { Icon } from '../components/Icon.tsx'
import { TrackArt } from '../components/TrackArt.tsx'
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
    <div className="container-dashboard today-page" data-testid="today-container">
      <header className="page-heading">
        <div><span className="eyebrow">YOUR DAILY PRACTICE</span><h1>A little further today.</h1><p>Welcome back, {profile?.handle ?? 'Learner'}. Make some room for a good problem.</p></div>
        <span className="today-date">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
      </header>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="today-layout">
        <div className="practice-column">
          <section className="practice-feature" aria-labelledby="practice-title">
            <div className="practice-feature-copy"><span className="eyebrow">A MOMENT OF FOCUS</span><h2 id="practice-title">Good thinking<br />is a practice.</h2><p>One problem at a time. No rush.<br />See where your curiosity takes you.</p><a href="#tracks-heading" className="btn btn-light">Choose your practice <Icon name="arrow" /></a></div>
            <TrackArt track="judgment" />
            <span className="feature-caption">THINK. COMMIT. DISCOVER.</span>
          </section>
          <section aria-labelledby="tracks-heading" className="tracks-section">
            <div className="section-heading"><div><span className="eyebrow">FOLLOW YOUR CURIOSITY</span><h2 id="tracks-heading" tabIndex={-1}>Your tracks</h2></div><Link to="/progress" className="text-link">View progress <Icon name="arrow" /></Link></div>
            {loading ? (
              <div className="tracks-grid" role="status" aria-label="Loading track details">{tracks.map((track) => <div key={track} className="track-skeleton skeleton"><span /><span /><span /></div>)}</div>
            ) : (
              <div className="tracks-grid">
                {tracks.map((track) => {
                  const tr = trackRatings.get(track)
                  const rating = tr?.rating ?? 1200
                  const rd = tr?.rd ?? 350
                  const lastAt = tr?.last_at ? new Date(tr.last_at) : null
                  const n = tr?.n ?? 0
                  const provisional = isProvisional(inflate({ r: rating, rd, lastAt }, new Date()).rd)
                  const displayRating = `${Math.round(rating)}${provisional ? '?' : ''}`
                  const openSetId = openSets.get(track)
                  return (
                    <article key={track} className={`track-card discipline-${track}`} data-testid={`track-card-${track}`}>
                      <div className="track-art-panel"><TrackArt track={track} /></div>
                      <div className="track-content"><div className="track-card-header"><h3 className="track-card-title">{track}</h3><TitleBadge title={getTitle(rating)} /></div>
                        <p className="track-description">{track === 'judgment' ? 'Make sense of uncertainty.' : track === 'logic' ? 'Find what follows.' : track === 'math' ? 'See the underlying pattern.' : 'Turn an idea into a solution.'}</p>
                        <div className="track-rating-row"><span className="track-rating-value">{displayRating}</span><span className="rating-caption">{provisional ? 'Provisional rating' : 'Track rating'}</span></div>
                        <div className="track-progress-row">{n < 8 ? <><span className="placement-badge">Placement {n}/8</span><div className="placement-dots" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={i} className={i < n ? 'complete' : ''} />)}</div></> : <span>{n} rated {n === 1 ? 'attempt' : 'attempts'}</span>}</div>
                        <button type="button" className="btn btn-secondary track-start" onClick={() => openSetId ? handleResumeSet(openSetId) : handleStartSet(track)} disabled={startingTrack !== null} aria-label={`${openSetId ? 'Resume' : 'Start'} ${track} set`}><span>{startingTrack === track ? 'Starting...' : openSetId ? 'Continue practice' : 'Start practice'}</span><Icon name="arrow" /></button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
        <aside className="today-sidebar" aria-label="Daily summary">
          <section className="weekly-card dashboard-card" data-testid="weekly-goal-card">
            <div className="section-heading"><h2 className="dashboard-card-title">Your weekly rhythm</h2><Icon name="today" /></div>
            <div className="weekly-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="51" className="ring-track" /><circle cx="60" cy="60" r="51" className="ring-value" pathLength="100" strokeDasharray={`${loading ? 0 : Math.min(100, distinctActiveDays / weeklyGoal * 100)} 100`} /></svg><div><strong>{loading ? '—' : distinctActiveDays}<span> / {weeklyGoal}</span></strong><span>practice days</span></div></div>
            <div className="weekly-dots" data-testid="weekly-dots" role="group" aria-label={`Weekly goal: ${distinctActiveDays} of ${weeklyGoal} days completed`}>{Array.from({ length: Math.max(weeklyGoal, distinctActiveDays) }, (_, i) => <span key={i} data-testid={i < distinctActiveDays ? 'weekly-dot-filled' : 'weekly-dot'} className={`weekly-dot ${i < distinctActiveDays ? 'filled' : 'empty'}`} role="img" aria-label={`Day ${i + 1}: ${i < distinctActiveDays ? 'completed' : 'not completed'}`}>{i < distinctActiveDays && <Icon name="check" />}</span>)}</div>
            <p>{distinctActiveDays >= weeklyGoal ? 'Your goal is complete. Enjoy the space you made.' : 'A little consistency goes a long way.'}</p><span className="sidebar-footnote">Your goal: {weeklyGoal} days this week</span>
          </section>
          <section className="daily-card dashboard-card" data-testid="daily-crux-card"><div className="section-heading"><span className="sidebar-icon"><Icon name="daily" /></span><span data-testid="daily-status" className={`status-badge ${dailySolved ? 'solved' : 'unsolved'}`}>{dailySolved ? 'Solved' : 'Unsolved'}</span></div><span className="eyebrow">ONE PROBLEM. EVERYONE.</span><h2>{dailyNumber !== null ? `Daily Crux #${dailyNumber}` : 'The Daily Crux'}</h2><p>A fresh perspective, shared with the world. Unrated and open to everyone.</p><Link to="/daily" data-testid="daily-card-link" className="text-link">{dailySolved ? 'View results' : "Play today's Crux"}<Icon name="arrow" /></Link></section>
          <section className="echo-card dashboard-card" data-testid="due-echoes-card"><span className="sidebar-icon"><Icon name="echo" /></span><h2 className="dashboard-card-title">Let the insight echo.</h2><strong className="echo-count" data-testid="due-echoes-count">{loading ? '—' : dueEchoCount} due</strong><p>{dueEchoCount > 0 ? 'A fresh problem, a familiar idea. Your reviews are included in your next set.' : 'All quiet for now. Fresh reviews will find their way into your practice.'}</p><span className="sidebar-footnote">Built into your training sets</span></section>
          <Link className="sidebar-playbook" to="/playbook"><Icon name="book" /><span>Your playbook<small>Keep the ideas that click.</small></span><Icon name="arrow" /></Link>
        </aside>
      </div>
      <div className="dashboard-footer"><span className="small-dot" /><p>Progress is what you can do again. Give it time.</p></div>
    </div>
  )
}
