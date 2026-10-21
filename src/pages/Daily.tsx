import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api, type AttemptView } from '../lib/api.ts'
import { useAction } from '../lib/useAction.ts'
import { parseAnswer } from '../../supabase/functions/_shared/grading.ts'
import type { RawAnswer } from '../../supabase/functions/_shared/content/types.ts'
import { PromptBlocks } from '../components/PromptBlocks.tsx'
import { AnswerInput } from '../components/AnswerInput.tsx'
import { ConfidenceInput } from '../components/ConfidenceInput.tsx'
import { ResultPanel } from '../components/ResultPanel.tsx'
import { RepairLadder, type RepairStepData } from '../components/RepairLadder.tsx'
import { Reveal } from '../components/Reveal.tsx'
import { InsightInput } from '../components/InsightInput.tsx'
import { useAuth } from '../lib/auth.tsx'

interface DailyStats {
  number: number
  day: string
  n: number
  pctCorrect: number
  meanConfidenceCorrect: number | null
  meanConfidenceIncorrect: number | null
  topAnswers: { answer: unknown; count: number }[]
  misconceptionShares: Record<string, number>
  callerPercentile: number | null
  callerOutcome: 'correct' | 'incorrect' | 'gave_up'
  callerConfidence: number
  shareText: string
}

export function Daily() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

  const [dailyNumber, setDailyNumber] = useState<number | null>(null)
  const [attempt, setAttempt] = useState<AttemptView | null>(null)
  const [stats, setStats] = useState<DailyStats | null>(null)

  // Draft inputs
  const [draftAnswer, setDraftAnswer] = useState<RawAnswer>('')
  const [draftConfidence, setDraftConfidence] = useState<number | null>(null)
  const [declaredHelp, setDeclaredHelp] = useState(false)

  // Repair & Reveal state
  const [repairActive, setRepairActive] = useState(false)
  const [currentRepairStep, setCurrentRepairStep] = useState<RepairStepData | null>(null)
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false)

  // Share feedback
  const [copied, setCopied] = useState(false)

  // Load Daily Crux attempt and stats
  const loadDaily = useCallback(async () => {
    setLoading(true)
    setInitError(null)

    try {
      const res = await api<{
        number: number
        day: string
        instanceId: string
        attempt: AttemptView
      }>('/daily')

      setDailyNumber(res.number)
      setAttempt(res.attempt)

      if (res.attempt.repair) {
        setCurrentRepairStep(res.attempt.repair)
      }

      // If already resolved or revealed, fetch crowd stats
      if (res.attempt.state === 'resolved' || res.attempt.state === 'revealed') {
        try {
          const statsRes = await api<DailyStats>('/daily/stats')
          setStats(statsRes)
        } catch (sErr) {
          console.warn('Could not load daily stats:', sErr)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load Daily Crux'
      setInitError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDaily()
  }, [loadDaily])

  // Commit action
  const commitAction = useAction<
    {
      answer: RawAnswer
      confidence: number
      declaredHelp: boolean
    },
    NonNullable<AttemptView['result']>
  >(async (args) => {
    if (!attempt) throw new Error('No active daily attempt')
    return await api<NonNullable<AttemptView['result']>>(
      `/attempts/${attempt.id}/commit`,
      {
        method: 'POST',
        body: args,
      }
    )
  })

  // Give up action
  const giveUpAction = useAction<Record<string, never>, NonNullable<AttemptView['result']>>(
    async (args) => {
      if (!attempt) throw new Error('No active daily attempt')
      return await api<NonNullable<AttemptView['result']>>(
        `/attempts/${attempt.id}/give-up`,
        {
          method: 'POST',
          body: args,
        }
      )
    }
  )

  // Reveal action
  const revealAction = useAction<Record<string, never>, AttemptView>(async (args) => {
    if (!attempt) throw new Error('No active daily attempt')
    return await api<AttemptView>(`/attempts/${attempt.id}/reveal`, {
      method: 'POST',
      body: args,
    })
  })

  // Handle Commit button click
  const handleCommit = async () => {
    if (!attempt || draftConfidence === null) return
    const parsed = parseAnswer(attempt.answerSpec, draftAnswer)
    if (!parsed.ok) return

    try {
      const res = await commitAction.run({
        answer: draftAnswer,
        confidence: draftConfidence / 100,
        declaredHelp,
      })

      // Update attempt to resolved state
      setAttempt((prev) => {
        if (!prev) return null
        return {
          ...prev,
          state: 'resolved',
          result: res,
          repair: res.repair ?? prev.repair ?? null,
        }
      })

      // Fetch crowd stats immediately after resolution
      try {
        const statsRes = await api<DailyStats>('/daily/stats')
        setStats(statsRes)
      } catch (sErr) {
        console.warn('Could not load daily stats after commit:', sErr)
      }
    } catch {
      // Error handled by commitAction.error
    }
  }

  // Handle Give up confirm
  const handleConfirmGiveUp = async () => {
    setShowGiveUpConfirm(false)
    if (!attempt) return

    try {
      const res = await giveUpAction.run({})
      setAttempt((prev) => {
        if (!prev) return null
        return {
          ...prev,
          state: 'resolved',
          result: res,
          repair: res.repair ?? prev.repair ?? null,
        }
      })

      try {
        const statsRes = await api<DailyStats>('/daily/stats')
        setStats(statsRes)
      } catch (sErr) {
        console.warn('Could not load daily stats after give-up:', sErr)
      }
    } catch {
      // Handled by giveUpAction.error
    }
  }

  // Handle Reveal
  const handleReveal = async () => {
    if (!attempt) return
    if (attempt.state === 'revealed' && attempt.reveal) return

    try {
      const res = await revealAction.run({})
      setAttempt(res)
    } catch {
      // Handled by revealAction.error
    }
  }

  // Handle Share result
  const handleShare = async () => {
    if (!stats?.shareText) return

    // 1. Try Web Share API first
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: stats.shareText })
        return
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return
      }
    }

    // 2. Fall back to clipboard writeText (never reads clipboard)
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(stats.shareText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch (err) {
        console.error('Failed to copy to clipboard:', err)
      }
    }
  }

  if (loading) {
    return (
      <div className="container-problem" style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
        <p style={{ color: 'var(--text-muted)' }} role="status" aria-live="polite">
          Loading Daily Crux...
        </p>
      </div>
    )
  }

  if (initError || !attempt) {
    return (
      <div className="container-problem">
        <div className="alert alert-error" role="alert">
          {initError ?? 'Failed to load problem'}
        </div>
        <button type="button" className="btn btn-secondary" onClick={loadDaily}>
          Retry loading
        </button>
      </div>
    )
  }

  const isResolved = attempt.state === 'resolved' || attempt.state === 'revealed'
  const isAnswerValid =
    draftAnswer !== '' ? parseAnswer(attempt.answerSpec, draftAnswer).ok : false
  const isConfidenceValid =
    draftConfidence !== null && draftConfidence >= 0 && draftConfidence <= 100
  const canCommit = isAnswerValid && isConfidenceValid && !commitAction.pending

  return (
    <div className="container-problem">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase' }}>
              Daily Crux {dailyNumber !== null ? `#${dailyNumber}` : ''}
            </span>
            <span className="status-badge unsolved" style={{ fontSize: '0.75rem' }}>
              Unrated
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 'var(--space-1) 0 0 0' }}>
            {attempt.concept.name}
          </h1>
        </div>

        <Link to="/today" className="btn btn-secondary btn-sm">
          Today
        </Link>
      </div>

      {/* Main Problem Card */}
      <div className="form-card" style={{ marginBottom: 'var(--space-6)' }}>
        {/* Prompt */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <PromptBlocks blocks={attempt.prompt} />
        </div>

        {/* PRESENTED STATE */}
        {attempt.state === 'presented' && (
          <div data-testid="presented-state">
            {/* Answer Input */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <AnswerInput
                spec={attempt.answerSpec}
                value={draftAnswer}
                onChange={setDraftAnswer}
                disabled={commitAction.pending || giveUpAction.pending}
                id="answer-input"
              />
            </div>

            {/* Confidence Input */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <ConfidenceInput
                value={draftConfidence}
                onChange={setDraftConfidence}
                disabled={commitAction.pending || giveUpAction.pending}
                declaredHelp={declaredHelp}
                onDeclaredHelpChange={setDeclaredHelp}
              />
            </div>

            {/* Commit Error & Retry */}
            {commitAction.error && (
              <div
                className="alert alert-error"
                role="alert"
                style={{ marginBottom: 'var(--space-4)' }}
              >
                <p style={{ margin: '0 0 var(--space-2) 0' }}>{commitAction.error.message}</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCommit}
                  data-testid="commit-retry-btn"
                >
                  Retry commit
                </button>
              </div>
            )}

            {/* Action Buttons: Commit and I'm stuck */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 'var(--space-4)',
                borderTop: '1px solid var(--border)',
              }}
            >
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCommit}
                disabled={!canCommit}
                data-testid="commit-btn"
              >
                {commitAction.pending ? 'Committing...' : 'Commit'}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowGiveUpConfirm(true)}
                disabled={commitAction.pending || giveUpAction.pending}
                data-testid="give-up-btn"
              >
                I'm stuck
              </button>
            </div>
          </div>
        )}

        {/* RESOLVED / REVEALED STATE */}
        {isResolved && attempt.result && (
          <div data-testid="resolved-state">
            <ResultPanel result={attempt.result} ratingReveal="each" />

            {/* Crowd Stats Section */}
            {stats && (
              <div className="crowd-stats-card" data-testid="crowd-stats">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                    Crowd Results
                  </h2>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {copied && (
                      <span
                        data-testid="share-copied"
                        style={{ fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 600 }}
                        role="status"
                        aria-live="polite"
                      >
                        Copied to clipboard!
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleShare}
                      data-testid="share-btn"
                    >
                      {copied ? 'Copied!' : 'Share result'}
                    </button>
                  </div>
                </div>

                {/* Caller summary / percentile banner */}
                <div data-testid="crowd-percentile" className="crowd-percentile-banner">
                  {stats.callerOutcome === 'correct' && stats.callerPercentile !== null
                    ? `You were in the ${stats.pctCorrect}% who solved it, and more sure than ${stats.callerPercentile}% of them`
                    : stats.callerOutcome === 'correct'
                    ? "You solved today's Daily Crux!"
                    : `You were among the ${Math.round(100 - stats.pctCorrect)}% who missed today's Crux`}
                </div>

                {/* Crowd stats grid */}
                <div className="crowd-stats-grid">
                  <div className="crowd-stat-tile">
                    <div className="crowd-stat-val" data-testid="crowd-solvers">
                      {stats.n}
                    </div>
                    <div className="crowd-stat-lbl">Total Solvers</div>
                  </div>

                  <div className="crowd-stat-tile">
                    <div className="crowd-stat-val" data-testid="crowd-pct-correct">
                      {stats.pctCorrect}%
                    </div>
                    <div className="crowd-stat-lbl">Solved Correctly</div>
                  </div>

                  <div className="crowd-stat-tile">
                    <div className="crowd-stat-val">
                      {stats.meanConfidenceCorrect !== null
                        ? `${Math.round(stats.meanConfidenceCorrect * 100)}%`
                        : '—'}
                    </div>
                    <div className="crowd-stat-lbl">Mean Confidence (Correct)</div>
                  </div>

                  <div className="crowd-stat-tile">
                    <div className="crowd-stat-val">
                      {stats.meanConfidenceIncorrect !== null
                        ? `${Math.round(stats.meanConfidenceIncorrect * 100)}%`
                        : '—'}
                    </div>
                    <div className="crowd-stat-lbl">Mean Confidence (Incorrect)</div>
                  </div>
                </div>

                {/* Top 5 Submitted Answers */}
                {stats.topAnswers && stats.topAnswers.length > 0 && (
                  <div style={{ marginTop: 'var(--space-4)' }} data-testid="top-answers">
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', marginBottom: 'var(--space-2)' }}>
                      Top Submitted Answers
                    </h3>
                    <table className="top-answers-table" aria-label="Top submitted answers">
                      <thead>
                        <tr>
                          <th scope="col">Rank</th>
                          <th scope="col">Answer</th>
                          <th scope="col">Learners</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topAnswers.map((ans, idx) => (
                          <tr key={idx}>
                            <td style={{ color: 'var(--text-dim)', width: '40px' }}>#{idx + 1}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                              {typeof ans.answer === 'object' ? JSON.stringify(ans.answer) : String(ans.answer)}
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>
                              {ans.count} ({stats.n > 0 ? Math.round((ans.count / stats.n) * 100) : 0}%)
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Repair Ladder (if incorrect or gave up) */}
            {attempt.repair && attempt.result.outcome !== 'correct' && (
              <div style={{ marginTop: 'var(--space-6)' }}>
                {!repairActive ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setRepairActive(true)}
                    data-testid="start-repair-btn"
                  >
                    Start repair ladder
                  </button>
                ) : (
                  currentRepairStep && (
                    <RepairLadder
                      attemptId={attempt.id}
                      currentStep={currentRepairStep}
                      totalSteps={attempt.result.repairTotal}
                      onStepComplete={(next) => {
                        if (next) {
                          setCurrentRepairStep(next)
                        } else {
                          handleReveal()
                        }
                      }}
                      onRevealClick={handleReveal}
                    />
                  )
                )}
              </div>
            )}

            {/* Reveal worked solution */}
            <div style={{ marginTop: 'var(--space-6)' }}>
              {attempt.reveal ? (
                <Reveal
                  solution={attempt.reveal.solution}
                  earlierNote={attempt.reveal.earlierNote}
                />
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleReveal}
                  disabled={revealAction.pending}
                  data-testid="reveal-btn"
                >
                  {revealAction.pending ? 'Revealing...' : 'Reveal worked solution'}
                </button>
              )}
            </div>

            {/* Optional Insight for Playbook */}
            {attempt.reveal && user && (
              <div style={{ marginTop: 'var(--space-6)' }}>
                <InsightInput
                  userId={user.id}
                  attemptId={attempt.id}
                  conceptId={attempt.concept.id}
                />
              </div>
            )}

            {/* Return to Today */}
            <div
              style={{
                marginTop: 'var(--space-8)',
                paddingTop: 'var(--space-4)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Link to="/today" className="btn btn-primary" data-testid="back-to-today-btn">
                Back to Today
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* "I'm stuck" Confirmation Dialog */}
      {showGiveUpConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="giveup-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'var(--space-4)',
          }}
        >
          <div
            className="form-card"
            style={{ maxWidth: '440px', width: '100%' }}
            role="document"
          >
            <h2 id="giveup-title" style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>
              Give up on today's Crux?
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: 'var(--space-5)' }}>
              The Daily Crux is unrated, so your ratings will not be affected. You will immediately see the crowd statistics and can explore the worked solution.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowGiveUpConfirm(false)}
              >
                Keep trying
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={handleConfirmGiveUp}
                disabled={giveUpAction.pending}
                data-testid="confirm-give-up-btn"
              >
                {giveUpAction.pending ? 'Giving up...' : "Yes, I'm stuck"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
