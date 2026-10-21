import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.ts'
import { api } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'
import { TitleBadge } from '../components/TitleBadge.tsx'
import { RatingChart } from '../components/RatingChart.tsx'
import { ReliabilityChart } from '../components/ReliabilityChart.tsx'
import { calibration, type CalPoint } from '../../supabase/functions/_shared/model.ts'

interface TrackStat {
  rating: number
  rd_eff: number
  n: number
  peak: number
}

interface PublicProfileData {
  handle: string
  created_at: string
  proven_count: number
  tracks: Record<string, TrackStat>
  history: Record<string, Array<{ date: string; r: number }>>
  calibration: Array<[number, number]>
}

export function Profile() {
  const { handle } = useParams<{ handle: string }>()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<PublicProfileData | null>(null)
  const [activeHistoryTrack, setActiveHistoryTrack] = useState<string>('logic')

  // Report state
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchProfile() {
      if (!handle) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const { data, error } = await supabase.rpc('public_profile', { p_handle: handle })
        if (cancelled) return
        if (error || !data) {
          setProfileData(null)
        } else {
          const profile = data as PublicProfileData
          setProfileData(profile)
          // Default history track to first track with events, or 'logic'
          const tracksWithHistory = Object.keys(profile.history || {})
          if (tracksWithHistory.length > 0) {
            setActiveHistoryTrack(tracksWithHistory[0])
          } else {
            const tracksWithRatings = Object.keys(profile.tracks || {})
            if (tracksWithRatings.length > 0) {
              setActiveHistoryTrack(tracksWithRatings[0])
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch public profile:', err)
        if (!cancelled) setProfileData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchProfile()
    return () => {
      cancelled = true
    }
  }, [handle])

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profileData) return
    const trimmed = reportReason.trim()
    if (trimmed.length < 5 || trimmed.length > 1000) {
      setReportError('Reason must be between 5 and 1000 characters.')
      return
    }

    setReporting(true)
    setReportError(null)
    try {
      await api('/reports', {
        method: 'POST',
        body: { handle: profileData.handle, reason: trimmed },
      })
      setReportSuccess(true)
      setReportReason('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report'
      setReportError(msg)
    } finally {
      setReporting(false)
    }
  }

  if (loading) {
    return (
      <div className="container-dashboard" style={{ textAlign: 'center', padding: 'var(--space-8)' }} role="status">
        <span style={{ color: 'var(--text-muted)' }}>Loading profile...</span>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="container-dashboard">
        <div
          className="card"
          data-testid="profile-not-found"
          style={{ textAlign: 'center', padding: 'var(--space-8)' }}
        >
          <h1 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>Profile Unavailable</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            This profile is private or does not exist.
          </p>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Link to="/leaderboard" className="btn btn-secondary btn-sm">
              Back to Leaderboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Calculate highest rating for main title
  const trackEntries = Object.entries(profileData.tracks || {})
  const highestRating = trackEntries.length > 0
    ? Math.max(...trackEntries.map(([, t]) => t.rating))
    : 1200

  // Calibration statistics
  const calPoints: CalPoint[] = (profileData.calibration || []).map(([p, y]) => ({
    p,
    y: y === 1 ? 1 : 0,
  }))
  const calStats = calibration(calPoints)
  const isWellCalibrated = calPoints.length >= 50 && calStats && calStats.calError <= 0.05

  // History events for selected track
  const currentHistoryEvents = (profileData.history?.[activeHistoryTrack] || []).map((pt, idx) => ({
    id: idx,
    createdAt: pt.date,
    rAfter: pt.r,
    rdAfter: 0,
  }))

  const joinDate = new Date(profileData.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  })

  return (
    <div className="container-dashboard">
      {/* Profile Header */}
      <div
        className="card"
        data-testid="profile-header"
        style={{
          marginBottom: 'var(--space-6)',
          padding: 'var(--space-6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 700,
            }}
            aria-hidden="true"
          >
            {profileData.handle.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                @{profileData.handle}
              </h1>
              <TitleBadge rating={highestRating} />
              {isWellCalibrated && (
                <span
                  className="title-badge title-legend"
                  data-testid="well-calibrated-badge"
                  style={{ backgroundColor: 'var(--success, #10b981)', color: '#fff' }}
                >
                  Well-calibrated
                </span>
              )}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 'var(--space-1)' }}>
              Member since {joinDate} · {profileData.proven_count} Proven Concept{profileData.proven_count === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowReport(!showReport)}
          >
            {showReport ? 'Cancel Report' : 'Report'}
          </button>
        </div>
      </div>

      {/* Report Form (collapsible) */}
      {showReport && (
        <div
          className="card"
          data-testid="report-container"
          style={{
            marginBottom: 'var(--space-6)',
            borderLeft: '4px solid var(--danger, #ef4444)',
            backgroundColor: 'var(--surface-raised)',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: 0, marginBottom: 'var(--space-2)' }}>
            Report @{profileData.handle}
          </h2>
          {!user ? (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Please <Link to="/login" style={{ color: 'var(--primary)' }}>sign in</Link> to report an account.
            </p>
          ) : reportSuccess ? (
            <div
              className="alert alert-success"
              data-testid="report-success-msg"
              style={{ padding: 'var(--space-3)', color: 'var(--success, #10b981)' }}
            >
              Report submitted. Thank you for helping keep Eleanor fair.
            </div>
          ) : (
            <form onSubmit={handleReportSubmit}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                Please provide clear reasons for this report (5–1000 characters). Outcome reports are evaluated manually; automated cheating detection runs independently.
              </p>
              {reportError && (
                <div style={{ color: 'var(--danger, #ef4444)', fontSize: '0.875rem', marginBottom: 'var(--space-2)' }}>
                  {reportError}
                </div>
              )}
              <textarea
                data-testid="report-reason-input"
                className="input-field"
                rows={4}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Describe suspected cheating, abusive behaviour, or integrity violations..."
                required
                minLength={5}
                maxLength={1000}
                style={{ width: '100%', marginBottom: 'var(--space-3)' }}
              />
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={reporting || reportReason.trim().length < 5}
                >
                  {reporting ? 'Submitting...' : 'Submit Report'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowReport(false)}
                >
                  Cancel
                </button>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {reportReason.trim().length} / 1000
                </span>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Track Ratings Grid */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
          Track Ratings
        </h2>
        {trackEntries.length === 0 ? (
          <div className="card" style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>
            No rated attempts completed yet.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            {trackEntries.map(([trackId, stat]) => (
              <div
                key={trackId}
                className="card"
                style={{
                  padding: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                    {trackId}
                  </span>
                  <TitleBadge rating={stat.rating} />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: 'var(--space-1) 0' }}>
                  {Math.round(stat.rating)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <span>Peak: {Math.round(stat.peak)}</span>
                  <span>RD: ±{Math.round(stat.rd_eff)}</span>
                  <span>N: {stat.n}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calibration Section */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
          Calibration
        </h2>
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          {calStats && calPoints.length >= 30 ? (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 'var(--space-4)',
                  marginBottom: 'var(--space-5)',
                }}
              >
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {calStats.brier.toFixed(3)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Brier Score</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {calStats.calError.toFixed(3)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calibration Error</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {(calStats.overconfidence > 0 ? '+' : '') + calStats.overconfidence.toFixed(3)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overconfidence Gap</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {calStats.n}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sample Size (N)</div>
                </div>
              </div>

              <ReliabilityChart
                learnerBins={calStats.bins}
                modelBins={[]}
              />
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Calibration: Provisional ({calPoints.length}/30 rated attempts with confidence). At least 30 resolved problems are required to display calibration curves.
            </p>
          )}
        </div>
      </div>

      {/* Rating History Graph */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            Rating History
          </h2>
          {trackEntries.length > 1 && (
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              {trackEntries.map(([tId]) => (
                <button
                  key={tId}
                  type="button"
                  className={`btn btn-sm ${activeHistoryTrack === tId ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveHistoryTrack(tId)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {tId}
                </button>
              ))}
            </div>
          )}
        </div>

        <RatingChart
          track={activeHistoryTrack.charAt(0).toUpperCase() + activeHistoryTrack.slice(1)}
          events={currentHistoryEvents}
          peak={profileData.tracks?.[activeHistoryTrack]?.peak}
        />
      </div>
    </div>
  )
}

export default Profile
