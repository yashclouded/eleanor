import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.tsx'
import { supabase } from '../lib/supabase.ts'
import { api } from '../lib/api.ts'
import { calibration, type CalPoint, PARAMS } from '../../supabase/functions/_shared/model.ts'
import { RatingChart, type RatingEventPoint } from '../components/RatingChart.tsx'
import { ReliabilityChart, type ReliabilityBin } from '../components/ReliabilityChart.tsx'
import { ConceptMap, type ConceptTileData, type ConceptState } from '../components/ConceptMap.tsx'

interface TrackEventsMap {
  [trackId: string]: RatingEventPoint[]
}

interface MisconceptionItem {
  misconceptionId: string
  conceptId: string
  conceptName: string
  trackId: string
  weight: number
  feedback: string
}

interface EchoSummary {
  passed: number
  total: number
  upcoming: {
    id: string
    conceptName: string
    trackId: string
    intervalDays: number
    dueAt: string
  }[]
}

export function Progress() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track rating events & peak ratings
  const [trackEvents, setTrackEvents] = useState<TrackEventsMap>({})
  const [trackPeaks, setTrackPeaks] = useState<Record<string, number>>({})

  // Concepts data for ConceptMap
  const [conceptTiles, setConceptTiles] = useState<ConceptTileData[]>([])

  // Calibration data
  const [attemptCount, setAttemptCount] = useState<number>(0)
  const [calStats, setCalStats] = useState<{
    brier: number
    calError: number
    overconfidence: number
    n: number
    learnerBins: ReliabilityBin[]
    modelBins: ReliabilityBin[]
  } | null>(null)

  // Echo record
  const [echoRecord, setEchoRecord] = useState<EchoSummary>({ passed: 0, total: 0, upcoming: [] })

  // Active misconceptions
  const [activeMisconceptions, setActiveMisconceptions] = useState<MisconceptionItem[]>([])

  const loadProgressData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      // 1. Fetch rating events for tracks
      const { data: eventsData, error: eventsErr } = await supabase
        .from('rating_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('subject_type', 'track')
        .order('created_at', { ascending: true })

      if (eventsErr) {
        console.error('Error loading rating events:', eventsErr)
      } else if (eventsData) {
        const eventsMap: TrackEventsMap = {}
        for (const ev of eventsData) {
          const t = ev.subject_id
          const list = eventsMap[t] ?? []
          list.push({
            id: ev.id,
            createdAt: ev.created_at,
            rAfter: ev.r_after,
            rdAfter: ev.rd_after,
            rBefore: ev.r_before,
            rdBefore: ev.rd_before,
          })
          eventsMap[t] = list
        }
        setTrackEvents(eventsMap)
      }

      // Fetch track ratings for peaks and current ratings
      const { data: trackRows } = await supabase
        .from('track_ratings')
        .select('track_id, rating, peak')
        .eq('user_id', user.id)

      const peakMap: Record<string, number> = {}
      const trackRatingMap: Record<string, number> = {}
      if (trackRows) {
        for (const tr of trackRows) {
          peakMap[tr.track_id] = tr.peak
          trackRatingMap[tr.track_id] = tr.rating
        }
        setTrackPeaks(peakMap)
      }

      // 2. Fetch concepts, concept ratings, and prereqs for ConceptMap
      const { data: conceptsData } = await supabase
        .from('concepts')
        .select('id, name, track_id, entry_rating, prereqs')
        .order('sort', { ascending: true })

      const { data: conceptRatingRows } = await supabase
        .from('concept_ratings')
        .select('concept_id, rating, state')
        .eq('user_id', user.id)

      const conceptRatingMap = new Map<string, { rating: number | null; state: ConceptState }>()
      if (conceptRatingRows) {
        for (const cr of conceptRatingRows) {
          conceptRatingMap.set(cr.concept_id, {
            rating: cr.rating,
            state: cr.state as ConceptState,
          })
        }
      }

      const conceptNameMap = new Map<string, string>()
      if (conceptsData) {
        for (const c of conceptsData) {
          conceptNameMap.set(c.id, c.name)
        }
      }

      if (conceptsData) {
        const tiles: ConceptTileData[] = conceptsData.map((c) => {
          const cr = conceptRatingMap.get(c.id)
          const state = cr?.state ?? 'new'
          const rating = cr?.rating ?? null
          const trackRating = trackRatingMap[c.track_id] ?? 1200
          const prereqs = c.prereqs ?? []
          const prereqNames = prereqs.map((pid: string) => conceptNameMap.get(pid) ?? pid)

          // Unlocking rule: all prereqs at least 'practiced', OR track rating >= entry + 100
          const prereqsSatisfied =
            prereqs.length === 0 ||
            prereqs.every((pid: string) => {
              const pState = conceptRatingMap.get(pid)?.state
              return pState === 'practiced' || pState === 'proven'
            })
          const ratingSkipSatisfied = trackRating >= Number(c.entry_rating) + 100
          const isUnlocked = prereqsSatisfied || ratingSkipSatisfied

          let unlockReason: string | undefined
          if (!isUnlocked) {
            const reqList = prereqNames.length > 0 ? prereqNames.join(', ') : 'Prerequisites'
            unlockReason = `Locked. Requires ${reqList} at Practiced, or ${c.track_id} rating ${Number(c.entry_rating) + 100}.`
          }

          return {
            id: c.id,
            name: c.name,
            track: c.track_id,
            entryRating: Number(c.entry_rating),
            prereqs,
            prereqNames,
            state,
            rating,
            trackRating,
            isLocked: !isUnlocked,
            unlockReason,
          }
        })
        setConceptTiles(tiles)
      }

      // 3. Calibration: last 100 rated resolved attempts with confidence
      const { data: attemptsData } = await supabase
        .from('attempts')
        .select('outcome, confidence, forecast')
        .eq('user_id', user.id)
        .eq('rated', true)
        .in('state', ['resolved', 'revealed'])
        .not('confidence', 'is', null)
        .order('resolved_at', { ascending: false })
        .limit(100)

      const count = attemptsData?.length ?? 0
      setAttemptCount(count)

      if (attemptsData && count >= 30) {
        const learnerPoints: CalPoint[] = attemptsData.map((a) => ({
          p: a.confidence as number,
          y: a.outcome === 'correct' ? 1 : 0,
        }))
        const modelPoints: CalPoint[] = attemptsData.map((a) => ({
          p: typeof a.forecast === 'number' ? a.forecast : 0.5,
          y: a.outcome === 'correct' ? 1 : 0,
        }))

        const learnerCal = calibration(learnerPoints)
        const modelCal = calibration(modelPoints)

        if (learnerCal) {
          setCalStats({
            brier: learnerCal.brier,
            calError: learnerCal.calError,
            overconfidence: learnerCal.overconfidence,
            n: learnerCal.n,
            learnerBins: learnerCal.bins,
            modelBins: modelCal?.bins ?? [],
          })
        }
      } else {
        setCalStats(null)
      }

      // 4. Echo record
      const { data: echoesData } = await supabase
        .from('echoes')
        .select('id, concept_id, track_id, interval_days, due_at, status, done_attempt_id')
        .eq('user_id', user.id)
        .order('due_at', { ascending: true })

      if (echoesData) {
        const total = echoesData.length
        const passed = echoesData.filter((e) => e.status === 'done').length
        const upcoming = echoesData
          .filter((e) => e.status === 'due')
          .slice(0, 5)
          .map((e) => ({
            id: e.id,
            conceptName: conceptNameMap.get(e.concept_id) ?? e.concept_id,
            trackId: e.track_id,
            intervalDays: e.interval_days,
            dueAt: e.due_at,
          }))
        setEchoRecord({ passed, total, upcoming })
      }

      // 5. Active misconceptions (decayed weight >= 1.5)
      const { data: miscStats } = await supabase
        .from('misconception_stats')
        .select('*')
        .eq('user_id', user.id)

      if (miscStats) {
        const nowMs = Date.now()
        const activeList: MisconceptionItem[] = []

        for (const ms of miscStats) {
          if (!ms.last_at) continue
          const elapsedDays =
            Math.max(0, nowMs - new Date(ms.last_at).getTime()) / (1000 * 60 * 60 * 24)
          const currentWeight =
            Number(ms.weight) * Math.pow(0.5, elapsedDays / PARAMS.misconceptionHalfLifeDays)

          if (currentWeight >= PARAMS.misconceptionActive) {
            // Find track for concept
            const cObj = conceptsData?.find((c) => c.id === ms.concept_id)
            activeList.push({
              misconceptionId: ms.misconception_id,
              conceptId: ms.concept_id,
              conceptName: cObj?.name ?? ms.concept_id,
              trackId: cObj?.track_id ?? 'judgment',
              weight: Math.round(currentWeight * 10) / 10,
              feedback: `Misconception profile: ${ms.misconception_id}`,
            })
          }
        }
        setActiveMisconceptions(activeList)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load progress'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadProgressData()
  }, [loadProgressData])

  const handleStartSet = async (track: string) => {
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
      console.error('Failed to start set:', err)
    }
  }

  const chosenTracks = profile?.tracks && profile.tracks.length > 0
    ? profile.tracks
    : ['judgment', 'logic', 'math']

  return (
    <div className="container-dashboard" data-testid="progress-container">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-1)' }}>
            Progress & Model Calibration
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Transparent tracking of your growth, concept mastery, echoes, and probability calibration.
          </p>
        </div>
        <Link to="/playbook" className="btn btn-secondary btn-sm">
          Playbook
        </Link>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading progress analytics...</p>
      ) : (
        <>
          {/* SECTION 1: Rating Charts Per Track */}
          <section aria-labelledby="ratings-heading" style={{ marginBottom: 'var(--space-8)' }}>
            <h2 id="ratings-heading" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              Rating History
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {chosenTracks.map((track) => {
                const events = trackEvents[track] ?? []
                const peak = trackPeaks[track] ?? null

                return (
                  <RatingChart
                    key={track}
                    track={track}
                    events={events}
                    peak={peak}
                  />
                )
              })}
            </div>
          </section>

          {/* SECTION 2: Calibration Panel */}
          <section aria-labelledby="calibration-heading" style={{ marginBottom: 'var(--space-8)' }}>
            <h2 id="calibration-heading" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              Calibration (You vs. Eleanor)
            </h2>

            {attemptCount < 30 ? (
              <div
                className="form-card"
                style={{ textAlign: 'center', padding: 'var(--space-6)' }}
                data-testid="calibration-gate"
              >
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', margin: 0 }}>
                  Calibration appears after 30 rated answers (you have {attemptCount})
                </p>
              </div>
            ) : calStats ? (
              <div className="form-card" data-testid="calibration-panel" style={{ padding: 'var(--space-6)' }}>
                {/* 4 Metrics ALWAYS Shown Together */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-6)',
                  }}
                >
                  <div className="crowd-stat-tile">
                    <div className="crowd-stat-val" data-testid="brier-score">
                      {calStats.brier.toFixed(3)}
                    </div>
                    <div className="crowd-stat-lbl">Brier Score</div>
                  </div>

                  <div className="crowd-stat-tile">
                    <div className="crowd-stat-val" data-testid="cal-error">
                      {calStats.calError.toFixed(3)}
                    </div>
                    <div className="crowd-stat-lbl">Calibration Error</div>
                  </div>

                  <div className="crowd-stat-tile">
                    <div className="crowd-stat-val" data-testid="overconfidence-gap">
                      {(calStats.overconfidence >= 0 ? '+' : '') + calStats.overconfidence.toFixed(3)}
                    </div>
                    <div className="crowd-stat-lbl">Overconfidence Gap</div>
                  </div>

                  <div className="crowd-stat-tile">
                    <div className="crowd-stat-val" data-testid="cal-n">
                      {calStats.n}
                    </div>
                    <div className="crowd-stat-lbl">Answers Analyzed (N)</div>
                  </div>
                </div>

                {/* Reliability Diagram */}
                <ReliabilityChart
                  learnerBins={calStats.learnerBins}
                  modelBins={calStats.modelBins}
                />
              </div>
            ) : null}
          </section>

          {/* SECTION 3: Concept Map */}
          <section aria-labelledby="concepts-heading" style={{ marginBottom: 'var(--space-8)' }}>
            <h2 id="concepts-heading" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              Concept Map
            </h2>
            <ConceptMap concepts={conceptTiles} />
          </section>

          {/* SECTION 4: Echo Record & Active Misconceptions */}
          <section
            aria-labelledby="retention-heading"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
              gap: 'var(--space-6)',
              marginBottom: 'var(--space-8)',
            }}
          >
            {/* Echo Record */}
            <div className="form-card" data-testid="echo-record-card">
              <h2 id="retention-heading" style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
                Echo Record
              </h2>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)', marginBottom: 'var(--space-2)' }}>
                {echoRecord.passed} / {echoRecord.total} passed
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                Unaided successes on spaced echoes prove concept mastery over time.
              </p>

              {echoRecord.upcoming.length > 0 ? (
                <div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                    Next Due Echoes
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8125rem' }}>
                    {echoRecord.upcoming.map((u) => (
                      <li
                        key={u.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: 'var(--space-1) 0',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{u.conceptName}</span>
                        <span style={{ color: 'var(--text-dim)' }}>
                          {new Date(u.dueAt).toLocaleDateString()} ({u.intervalDays}d)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', margin: 0 }}>
                  No upcoming echoes scheduled right now.
                </p>
              )}
            </div>

            {/* Active Misconceptions */}
            <div className="form-card" data-testid="active-misconceptions-card">
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
                Active Misconceptions
              </h2>
              {activeMisconceptions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No persistent misconceptions detected. The selection engine automatically surfaces variations when reasoning patterns need reinforcement.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {activeMisconceptions.map((m) => (
                    <div
                      key={m.misconceptionId}
                      style={{
                        padding: 'var(--space-3)',
                        background: 'var(--surface-hover)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{m.conceptName}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--error)', fontWeight: 600 }}>
                          Weight {m.weight}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 var(--space-2) 0' }}>
                        {m.feedback}
                      </p>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleStartSet(m.trackId)}
                      >
                        Practise this
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
