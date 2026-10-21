import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.tsx'
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
import { SetSummary, type SetSummaryData } from '../components/SetSummary.tsx'

export function SetPlayer() {
  const { setId } = useParams<{ setId: string }>()
  const navigate = useNavigate()
  const { profile, user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

  // Current Attempt state
  const [attempt, setAttempt] = useState<AttemptView | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [summary, setSummary] = useState<SetSummaryData | null>(null)

  // Draft inputs for presented state
  const [draftAnswer, setDraftAnswer] = useState<RawAnswer>('')
  const [draftConfidence, setDraftConfidence] = useState<number | null>(null)
  const [declaredHelp, setDeclaredHelp] = useState(false)

  // Repair & Reveal state
  const [repairActive, setRepairActive] = useState(false)
  const [currentRepairStep, setCurrentRepairStep] = useState<RepairStepData | null>(null)

  // "I'm stuck" confirmation dialog
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false)

  // Initialize or resume set
  const loadSet = useCallback(
    async (advance = false) => {
      if (!setId) return
      setLoading(true)
      setInitError(null)

      try {
        const res = await api<AttemptView | { done: boolean; summary: SetSummaryData }>(
          `/sets/${setId}/next`,
          {
            method: 'POST',
            body: {
              transitionId: crypto.randomUUID(),
              resume: !advance,
            },
          }
        )

        if ('done' in res && res.done) {
          setIsDone(true)
          setSummary(res.summary)
          setAttempt(null)
        } else {
          const att = res as AttemptView
          setAttempt(att)
          setIsDone(false)
          setSummary(null)

          // Reset inputs for a new presented attempt
          if (att.state === 'presented') {
            setDraftAnswer('')
            setDraftConfidence(null)
            setDeclaredHelp(false)
            setRepairActive(false)
            setCurrentRepairStep(null)
          } else if (att.repair) {
            setCurrentRepairStep(att.repair)
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load set problem'
        setInitError(msg)
      } finally {
        setLoading(false)
      }
    },
    [setId]
  )

  useEffect(() => {
    loadSet(false)
  }, [loadSet])

  // Commit action
  const commitAction = useAction<
    {
      answer: RawAnswer
      confidence: number
      declaredHelp: boolean
    },
    NonNullable<AttemptView['result']>
  >(async (args) => {
    if (!attempt) throw new Error('No active attempt')
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
      if (!attempt) throw new Error('No active attempt')
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
    if (!attempt) throw new Error('No active attempt')
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
    } catch {
      // Error is stored in commitAction.error and retry stays enabled
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
    } catch {
      // Handled by giveUpAction.error
    }
  }

  // Handle Reveal button click
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

  // Handle moving to next problem in set
  const handleNextProblem = () => {
    commitAction.reset()
    giveUpAction.reset()
    revealAction.reset()
    loadSet(true)
  }

  // Validation: Commit is enabled only when both a parseable answer and a confidence exist
  const isAnswerValid =
    attempt && draftAnswer !== ''
      ? parseAnswer(attempt.answerSpec, draftAnswer).ok
      : false
  const isConfidenceValid = draftConfidence !== null && draftConfidence >= 0 && draftConfidence <= 100
  const canCommit = isAnswerValid && isConfidenceValid && !commitAction.pending

  if (loading) {
    return (
      <div className="container-problem" style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
        <p style={{ color: 'var(--text-muted)' }} role="status" aria-live="polite">
          Loading problem...
        </p>
      </div>
    )
  }

  if (initError) {
    return (
      <div className="container-problem">
        <div className="alert alert-error" role="alert">
          {initError}
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => loadSet(false)}>
          Retry loading
        </button>
      </div>
    )
  }

  if (isDone && summary) {
    return (
      <div className="container-dashboard" style={{ padding: 'var(--space-6) var(--space-4)' }}>
        <SetSummary summary={summary} onAnotherSet={() => navigate('/today')} />
      </div>
    )
  }

  if (!attempt) {
    return null
  }

  const isPresented = attempt.state === 'presented'
  const isResolved = attempt.state === 'resolved'
  const isRevealed = attempt.state === 'revealed'
  const hasRepairSteps = (attempt.result?.repairTotal ?? 0) > 0
  const canRepair =
    (attempt.result?.outcome === 'incorrect' || attempt.result?.outcome === 'gave_up') &&
    hasRepairSteps

  return (
    <div className="container-problem" style={{ padding: 'var(--space-6) var(--space-4)', maxWidth: 'var(--col-problem)', margin: '0 auto' }}>
      {/* Set Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--accent)',
            }}
          >
            {attempt.track.toUpperCase()} TRACK · {attempt.concept.name}
          </span>
          {attempt.slot !== null && (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Problem {attempt.slot + 1}
            </div>
          )}
        </div>

        {attempt.kind === 'placement' && (
          <span className="title-badge title-thinker">Placement</span>
        )}
        {attempt.kind === 'echo' && (
          <span className="title-badge title-analyst">Echo Review</span>
        )}
      </div>

      {/* Problem Prompt */}
      <div
        className="form-card"
        style={{
          marginBottom: 'var(--space-6)',
          padding: 'var(--space-5)',
        }}
      >
        <PromptBlocks blocks={attempt.prompt} />
      </div>

      {/* 1. PRESENTED STATE: Answer input, Confidence input, Commit, Give up */}
      {isPresented && (
        <div data-testid="presented-state" className="form-card" style={{ padding: 'var(--space-5)' }}>
          <AnswerInput
            spec={attempt.answerSpec}
            value={draftAnswer}
            onChange={setDraftAnswer}
            disabled={commitAction.pending || giveUpAction.pending}
            id="answer-input"
          />

          <ConfidenceInput
            value={draftConfidence}
            onChange={setDraftConfidence}
            isCode={attempt.track === 'code'}
            disabled={commitAction.pending || giveUpAction.pending}
            declaredHelp={declaredHelp}
            onDeclaredHelpChange={setDeclaredHelp}
          />

          {commitAction.error && (
            <div data-testid="commit-error" className="alert alert-error" role="alert" style={{ marginTop: 'var(--space-4)' }}>
              <div style={{ marginBottom: 'var(--space-2)' }}>
                {commitAction.error.message || 'Submission failed. Please retry.'}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCommit}
              >
                Retry
              </button>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 'var(--space-6)',
              paddingTop: 'var(--space-4)',
              borderTop: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCommit}
              disabled={!canCommit}
            >
              {commitAction.pending ? 'Committing...' : 'Commit'}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowGiveUpConfirm(true)}
              disabled={commitAction.pending || giveUpAction.pending}
            >
              I'm stuck
            </button>
          </div>
        </div>
      )}

      {/* "I'm stuck" confirmation modal */}
      {showGiveUpConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="giveup-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'var(--space-4)',
          }}
        >
          <div
            className="form-card"
            style={{
              maxWidth: '440px',
              width: '100%',
              padding: 'var(--space-5)',
            }}
          >
            <h2 id="giveup-title" style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>
              Give up on this problem?
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 'var(--space-5)', lineHeight: 1.5 }}>
              Giving up counts as a rated loss (like resigning in chess). You will be able to repair the problem and see the worked solution.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowGiveUpConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmGiveUp}
                disabled={giveUpAction.pending}
              >
                {giveUpAction.pending ? 'Giving up...' : 'Confirm give up'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. RESOLVED & REVEALED STATE: Result Panel */}
      {(isResolved || isRevealed) && attempt.result && (
        <>
          <ResultPanel
            result={attempt.result}
            ratingReveal={profile?.rating_reveal as 'each' | 'end_of_set' | undefined}
          />

          {/* Repair ladder trigger or active repair ladder */}
          {canRepair && !isRevealed && (
            <>
              {!repairActive ? (
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={async () => {
                      setRepairActive(true)
                      const initialStep = currentRepairStep || attempt.repair || attempt.result?.repair
                      if (initialStep) {
                        setCurrentRepairStep(initialStep)
                      } else {
                        try {
                          const att = await api<AttemptView>(`/attempts/${attempt.id}`)
                          if (att.repair) {
                            setCurrentRepairStep(att.repair)
                            setAttempt(att)
                          }
                        } catch (err: unknown) {
                          setInitError(err instanceof Error ? err.message : 'Failed to load repair step')
                        }
                      }
                    }}
                  >
                    Start repair ladder
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleReveal}
                    disabled={revealAction.pending}
                  >
                    {revealAction.pending ? 'Revealing...' : 'Reveal solution'}
                  </button>
                </div>
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
            </>
          )}

          {/* If outcome is correct and not yet revealed, show button to reveal solution */}
          {!canRepair && !isRevealed && (
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleReveal}
                disabled={revealAction.pending}
              >
                {revealAction.pending ? 'Revealing...' : 'Reveal solution'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleNextProblem}
              >
                Next problem
              </button>
            </div>
          )}

          {/* Solution Reveal */}
          {isRevealed && attempt.reveal && (
            <>
              <Reveal
                solution={attempt.reveal.solution}
                earlierNote={attempt.reveal.earlierNote}
              />

              {user && (
                <InsightInput
                  userId={user.id}
                  attemptId={attempt.id}
                  conceptId={attempt.concept.id}
                />
              )}

              <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNextProblem}
                >
                  Next problem
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
