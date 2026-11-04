import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.ts'
import { useAuth } from '../lib/auth.tsx'
import { TitleBadge } from '../components/TitleBadge.tsx'

interface LeaderboardEntry {
  track_id: string
  handle: string
  rating: number
  n: number
  rank: number
}

interface TrackRatingRow {
  track_id: string
  rating: number
  rd: number
  n: number
  last_at: string | null
}

const TRACK_TABS = [
  { id: 'overall', label: 'Overall' },
  { id: 'judgment', label: 'Judgment' },
  { id: 'logic', label: 'Logic' },
  { id: 'math', label: 'Math' },
  { id: 'code', label: 'Code' },
]

export function Leaderboard() {
  const { track: routeTrack } = useParams<{ track?: string }>()
  const { user, profile } = useAuth()

  const activeTrack = (routeTrack && TRACK_TABS.some((t) => t.id === routeTrack.toLowerCase()))
    ? routeTrack.toLowerCase()
    : 'overall'

  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [userRankEntry, setUserRankEntry] = useState<LeaderboardEntry | null>(null)
  const [unlistedReason, setUnlistedReason] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      setLoading(true)
      setUserRankEntry(null)
      setUnlistedReason(null)

      try {
        // 1. Fetch top 100 for current track from leaderboard view
        const { data: topData, error: topError } = await supabase
          .from('leaderboard')
          .select('*')
          .eq('track_id', activeTrack)
          .order('rank', { ascending: true })
          .limit(100)

        if (topError) {
          console.error('Failed to load leaderboard:', topError)
        }

        if (cancelled) return
        const loadedEntries = (topData as LeaderboardEntry[]) || []
        setEntries(loadedEntries)

        // 2. If signed in, check user's standing or determine why unlisted
        if (user && profile) {
          // Check if user is in top 100
          const inTop = loadedEntries.find((e) => e.handle === profile.handle)
          if (inTop) {
            setUserRankEntry(inTop)
            return
          }

          // Check if user is ranked beyond top 100 in the materialized view
          const { data: userRow } = await supabase
            .from('leaderboard')
            .select('*')
            .eq('track_id', activeTrack)
            .eq('handle', profile.handle)
            .maybeSingle()

          if (userRow) {
            setUserRankEntry(userRow as LeaderboardEntry)
            return
          }

          // Not in leaderboard view: determine why
          if (profile.leaderboard_visible === false) {
            setUnlistedReason('You are hidden from public leaderboards. You can enable visibility in Settings.')
            return
          }

          if (profile.banned_at) {
            setUnlistedReason('Your account is suspended.')
            return
          }

          // Fetch track ratings to check eligibility
          const { data: ratingsData } = await supabase
            .from('track_ratings')
            .select('track_id, rating, rd, n, last_at')
            .eq('user_id', user.id)

          const ratings = (ratingsData as TrackRatingRow[]) || []

          if (activeTrack === 'overall') {
            // Overall eligibility requires at least one track with n >= 20 and rd_eff <= 110
            const eligibleTracks = ratings.filter((tr) => {
              const daysInactive = tr.last_at ? (Date.now() - new Date(tr.last_at).getTime()) / 86400000 : 0
              const rdEff = Math.min(350, Math.sqrt(tr.rd * tr.rd + 225 * daysInactive))
              return tr.n >= 20 && rdEff <= 110
            })

            if (eligibleTracks.length === 0) {
              const maxN = Math.max(0, ...ratings.map((r) => r.n))
              if (maxN < 20) {
                setUnlistedReason(`provisional, ${20 - maxN} more rated problems needed`)
              } else {
                setUnlistedReason('inactive (effective RD > 110, solve more problems to regain active standing)')
              }
            }
          } else {
            const tr = ratings.find((r) => r.track_id === activeTrack)
            const n = tr?.n ?? 0
            if (n < 20) {
              setUnlistedReason(`provisional, ${20 - n} more rated problems needed`)
            } else {
              const daysInactive = tr?.last_at ? (Date.now() - new Date(tr.last_at).getTime()) / 86400000 : 0
              const rd = tr?.rd ?? 350
              const rdEff = Math.min(350, Math.sqrt(rd * rd + 225 * daysInactive))
              if (rdEff > 110) {
                setUnlistedReason(`inactive (effective RD is ${Math.round(rdEff)}, solve more problems to regain active standing)`)
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching leaderboard data:', err)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [activeTrack, user, profile])

  return (
    <div className="container-dashboard">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 var(--space-2)' }}>
          Leaderboard
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Top calibrated thinkers across tracks. Ranked by ERM-1 rating with active RD ≤ 110.
        </p>
      </div>

      {/* Track Selection Tabs */}
      <div
        role="tablist"
        aria-label="Leaderboard track selector"
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          borderBottom: '1px solid var(--border)',
          marginBottom: 'var(--space-6)',
          overflowX: 'auto',
        }}
      >
        {TRACK_TABS.map((t) => {
          const isActive = activeTrack === t.id
          return (
            <Link
              key={t.id}
              to={t.id === 'overall' ? '/leaderboard' : `/leaderboard/${t.id}`}
              role="tab"
              aria-selected={isActive}
              className={`nav-tab ${isActive ? 'active' : ''}`}
              style={{
                textDecoration: 'none',
                padding: 'var(--space-2) var(--space-4)',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </Link>
          )
        })}
      </div>

      {/* Your Rank Card (if signed in) */}
      {user && profile && (
        <div
          className="card"
          data-testid="your-rank-card"
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-4) var(--space-5)',
            borderLeft: '4px solid var(--primary)',
            backgroundColor: 'var(--surface-raised, var(--surface))',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Your Standing ({activeTrack.charAt(0).toUpperCase() + activeTrack.slice(1)})
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: 'var(--space-1)' }}>
                {userRankEntry ? (
                  <span>
                    Your rank: #{userRankEntry.rank} · Rating {Math.round(userRankEntry.rating)}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>
                    {unlistedReason || 'Not listed on this leaderboard'}
                  </span>
                )}
              </div>
            </div>
            {userRankEntry && (
              <TitleBadge rating={userRankEntry.rating} />
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }} role="status">
          <span style={{ color: 'var(--text-muted)' }}>Loading leaderboard...</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            No eligible learners found for this track yet. Solve 20 rated problems to appear here!
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table
              data-testid="leaderboard-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.9375rem',
              }}
            >
              <caption className="sr-only">
                {activeTrack.toUpperCase()} leaderboard ranking
              </caption>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-raised)' }}>
                  <th scope="col" style={{ padding: 'var(--space-3) var(--space-4)', width: '70px', fontWeight: 600 }}>
                    Rank
                  </th>
                  <th scope="col" style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>
                    Learner
                  </th>
                  <th scope="col" style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>
                    Title
                  </th>
                  <th scope="col" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontWeight: 600 }}>
                    Rating
                  </th>
                  <th scope="col" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontWeight: 600 }}>
                    Attempts
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isCurrentUser = profile?.handle === entry.handle
                  return (
                    <tr
                      key={entry.handle}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: isCurrentUser ? 'rgba(79, 70, 229, 0.08)' : undefined,
                        fontWeight: isCurrentUser ? 600 : 400,
                      }}
                    >
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        {entry.rank === 1 && '🥇 '}
                        {entry.rank === 2 && '🥈 '}
                        {entry.rank === 3 && '🥉 '}
                        #{entry.rank}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <Link
                          to={`/u/${entry.handle}`}
                          style={{
                            color: 'var(--primary)',
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          @{entry.handle}
                        </Link>
                        {isCurrentUser && (
                          <span
                            style={{
                              marginLeft: 'var(--space-2)',
                              fontSize: '0.75rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--primary)',
                              color: '#fff',
                            }}
                          >
                            You
                          </span>
                        )}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <TitleBadge rating={entry.rating} />
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {Math.round(entry.rating)}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
                        {entry.n}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Leaderboard
