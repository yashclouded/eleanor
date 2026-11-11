import { lazy, useEffect, useState, useCallback } from 'react'
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
import { LoadPanel } from '../components/LoadPanel.tsx'
import type { RunResult } from '../components/CodeEditor.tsx'
import { CodeVerdict } from '../components/CodeVerdict.tsx'
import { useAnswerFeedback } from '../components/Experience.tsx'

const CodeEditor = lazy(() =>
  import('../components/CodeEditor.tsx').then((module) => ({ default: module.CodeEditor }))
)

export function SetPlayer() {
  const { setId } = useParams<{ setId: string }>()
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const feedback = useAnswerFeedback()

  const [loading, setLoading] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

  // Current Attempt state
  const [attempt, setAttempt] = useState<AttemptView | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [summary, setSummary] = useState<SetSummaryData | null>(null)

  // Draft inputs for presented state (standard problem)
  const [draftAnswer, setDraftAnswer] = useState<RawAnswer>('')
  const [draftConfidence, setDraftConfidence] = useState<number | null>(null)
  const [declaredHelp, setDeclaredHelp] = useState(false)

  // Code track state
  const [codeSource, setCodeSource] = useState<string>('')
  const [codeLanguage, setCodeLanguage] = useState<'python' | 'cpp' | 'javascript'>(() => {
    try {
      const saved = localStorage.getItem('eleanor_code_lang')
      if (saved === 'python' || saved === 'cpp' || saved === 'javascript') {
        return saved
      }
    } catch {
      // Ignore
    }
    return 'python'
  })
  const [isJudging, setIsJudging] = useState(false)
  const [codeCompileError, setCodeCompileError] = useState<string | null>(null)
  const [codeSubmitError, setCodeSubmitError] = useState<string | null>(null)
  const [codeVerdictInfo, setCodeVerdictInfo] = useState<{
    verdict: string
    failedGroupLabel?: string | null
    failedGroupFingerprint?: string | null
    compileOutput?: string | null
    isRated?: boolean
  } | null>(null)

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
            setCodeCompileError(null)
            setCodeSubmitError(null)
            setCodeVerdictInfo(null)
          } else if (att.repair) {
            setCurrentRepairStep(att.repair)
          }

          // Restore saved code draft if code track problem
          if (att.track === 'code' || att.answerSpec.type === 'code') {
            try {
              const saved = localStorage.getItem(`eleanor_code_draft_${att.id}`)
              if (saved !== null) {
                setCodeSource(saved)
              } else if (att.result?.answer && typeof att.result.answer === 'string') {
                setCodeSource(att.result.answer)
              }
            } catch {
              // Ignore
            }
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

  // Sync draft code and verdicts whenever attempt changes
  useEffect(() => {
    if (!attempt) return
    if (attempt.answerSpec.type === 'code') {
      try {
        const savedDraft = localStorage.getItem(`eleanor_code_draft_${attempt.id}`)
        if (savedDraft !== null) {
          setCodeSource(savedDraft)
        } else if (attempt.result?.answer && typeof attempt.result.answer === 'string') {
          setCodeSource(attempt.result.answer)
        }
      } catch {
        // Ignore
      }

      if (attempt.result?.verdict) {
        setCodeVerdictInfo({
          verdict: attempt.result.verdict,
          failedGroupLabel: attempt.result.failedGroupLabel,
          failedGroupFingerprint: attempt.result.failedGroupFingerprint,
          compileOutput: attempt.result.compileOutput,
          isRated: attempt.result.isRated !== undefined ? attempt.result.isRated : attempt.rated,
        })
      } else if (attempt.lastCodeSubmission?.verdict) {
        setCodeVerdictInfo({
          verdict: attempt.lastCodeSubmission.verdict,
          failedGroupLabel: attempt.lastCodeSubmission.failedGroupLabel,
          failedGroupFingerprint: attempt.lastCodeSubmission.failedGroupFingerprint,
          compileOutput: attempt.lastCodeSubmission.compileOutput,
          isRated: attempt.lastCodeSubmission.isRated !== undefined ? attempt.lastCodeSubmission.isRated : false,
        })
      }
    }
  }, [attempt])

  // Standard Commit action
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

  // Handle standard Commit button click
  const handleCommit = async () => {
    if (!attempt || draftConfidence === null) return
    const parsed = parseAnswer(attempt.answerSpec, draftAnswer)
    if (!parsed.ok) return

    feedback.prepare()

    try {
      const res = await commitAction.run({
        answer: draftAnswer,
        confidence: draftConfidence / 100,
        declaredHelp,
      })

      feedback.celebrate(attempt.id, res.outcome === 'correct')
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
      // Handled by commitAction.error
    }
  }

  // Handle Code Run
  const handleRunCode = async (stdin: string): Promise<RunResult> => {
    if (!attempt) throw new Error('No active attempt')
    const res = await api<RunResult>('/code/run', {
      method: 'POST',
      body: {
        attemptId: attempt.id,
        language: codeLanguage,
        source: codeSource,
        input: stdin,
      },
    })
    return res
  }

  // Handle Code Submit
  const handleSubmitCode = async () => {
    if (!attempt || !codeSource.trim() || isJudging) return
    if (attempt.state === 'presented' && draftConfidence === null) return
    feedback.prepare()
    setIsJudging(true)
    setCodeSubmitError(null)
    setCodeCompileError(null)

    const effectiveConfidence =
      (draftConfidence ??
        (attempt.result?.confidence
          ? Math.round(attempt.result.confidence * 100)
          : 80)) / 100

    try {
      const transitionId = crypto.randomUUID()
      const submitRes = await api<{ submissionId: string }>('/code/submit', {
        method: 'POST',
        body: {
          transitionId,
          attemptId: attempt.id,
          language: codeLanguage,
          source: codeSource,
          confidence: effectiveConfidence,
          declaredHelp,
        },
      })

      // Polling loop for submission resolution
      const startTime = Date.now()
      let finished = false
      while (!finished && Date.now() - startTime < 90_000) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        const sub = await api<{
          status: 'queued' | 'done' | 'error'
          verdict?: string
          failedGroup?: number | null
          compileOutput?: string | null
          rated?: boolean
        }>(`/code/submissions/${submitRes.submissionId}`)

        if (sub.status === 'done') {
          finished = true
          setIsJudging(false)

          if (sub.verdict === 'compile_error') {
            setCodeCompileError(sub.compileOutput || 'Compilation error')
            setCodeVerdictInfo({
              verdict: 'compile_error',
              compileOutput: sub.compileOutput || null,
              isRated: false,
            })
            // Fetch fresh attempt (remains in presented state)
            const fresh = await api<AttemptView>(`/attempts/${attempt.id}`)
            setAttempt(fresh)
            return
          } else {
            // Evaluated verdict (accepted, wrong_answer, time_limit, runtime_error)
            const fresh = await api<AttemptView>(`/attempts/${attempt.id}`)
            setAttempt(fresh)
            feedback.celebrate(submitRes.submissionId, sub.verdict === 'accepted')
            setCodeVerdictInfo({
              verdict: sub.verdict || fresh.result?.verdict || 'accepted',
              failedGroupLabel: fresh.result?.failedGroupLabel,
              failedGroupFingerprint: fresh.result?.failedGroupFingerprint,
              compileOutput: sub.compileOutput || null,
              isRated:
                sub.rated !== undefined
                  ? sub.rated
                  : fresh.result?.isRated !== undefined
                    ? fresh.result.isRated
                    : fresh.rated,
            })
            return
          }
        } else if (sub.status === 'error') {
          finished = true
          setIsJudging(false)
          setCodeVerdictInfo({
            verdict: 'judge_error',
            isRated: false,
          })
          const fresh = await api<AttemptView>(`/attempts/${attempt.id}`)
          setAttempt(fresh)
          return
        }
      }

      if (!finished) {
        setIsJudging(false)
        setCodeSubmitError('Judging timed out. Please retry submission.')
      }
    } catch (err: unknown) {
      setIsJudging(false)
      const msg = err instanceof Error ? err.message : 'Submission failed'
      setCodeSubmitError(msg)
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

  const isCodeProblem = attempt.track === 'code' || attempt.answerSpec.type === 'code'
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

      {/* CODE PROBLEM VIEW */}
      {isCodeProblem ? (
        <>
          {/* Code Editor component handles problem statement, input/output formats, constraints, samples, and code editing */}
          <LoadPanel label="code editor">
            <CodeEditor
              attemptId={attempt.id}
              statementBlocks={
                attempt.answerSpec.type === 'code' && attempt.answerSpec.statement
                  ? attempt.answerSpec.statement
                  : attempt.prompt
              }
              inputFormatBlocks={
                attempt.answerSpec.type === 'code' ? attempt.answerSpec.inputFormat : undefined
              }
              outputFormatBlocks={
                attempt.answerSpec.type === 'code' ? attempt.answerSpec.outputFormat : undefined
              }
              constraintsBlocks={
                attempt.answerSpec.type === 'code' ? attempt.answerSpec.constraints : undefined
              }
              samples={
                attempt.answerSpec.type === 'code' ? attempt.answerSpec.samples : undefined
              }
              source={codeSource}
              onChange={setCodeSource}
              language={codeLanguage}
              onLanguageChange={setCodeLanguage}
              onRun={handleRunCode}
              disabled={isJudging}
            />
          </LoadPanel>

          {/* Compilation error verdict shown in presented state */}
          {isPresented && (codeCompileError || (codeVerdictInfo && codeVerdictInfo.verdict === 'compile_error')) && (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <CodeVerdict
                verdict="compile_error"
                compileOutput={codeCompileError || codeVerdictInfo?.compileOutput}
                isRated={false}
              />
            </div>
          )}

          {/* 1. PRESENTED STATE: Confidence input, Judging indicator, Submit, Stuck */}
          {isPresented && (
            <div data-testid="presented-state" className="form-card" style={{ padding: 'var(--space-5)' }}>
              <ConfidenceInput
                value={draftConfidence}
                onChange={setDraftConfidence}
                isCode={true}
                disabled={isJudging}
                declaredHelp={declaredHelp}
                onDeclaredHelpChange={setDeclaredHelp}
              />

              {/* Polite live region for Judging state */}
              {isJudging && (
                <div
                  role="status"
                  aria-live="polite"
                  data-testid="judging-indicator"
                  className="judging-indicator"
                  style={{
                    marginTop: 'var(--space-4)',
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--surface-hover)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                >
                  <span className="spinner" aria-hidden="true" /> Judging…
                </div>
              )}

              {codeSubmitError && (
                <div data-testid="code-submit-error" className="alert alert-error" role="alert" style={{ marginTop: 'var(--space-4)' }}>
                  {codeSubmitError}
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
                  data-testid="code-submit-button"
                  onClick={handleSubmitCode}
                  disabled={isJudging || draftConfidence === null || !codeSource.trim()}
                >
                  {isJudging ? 'Judging…' : 'Submit'}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowGiveUpConfirm(true)}
                  disabled={isJudging}
                >
                  I'm stuck
                </button>
              </div>
            </div>
          )}

          {/* 2. RESOLVED STATE: Verdict, repair resubmits, reveal button */}
          {isResolved && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              {/* Verdict Panel */}
              <CodeVerdict
                verdict={codeVerdictInfo?.verdict || attempt.result?.verdict || 'wrong_answer'}
                failedGroupLabel={codeVerdictInfo?.failedGroupLabel || attempt.result?.failedGroupLabel}
                failedGroupFingerprint={codeVerdictInfo?.failedGroupFingerprint || attempt.result?.failedGroupFingerprint}
                isRated={
                  codeVerdictInfo?.isRated !== undefined
                    ? codeVerdictInfo.isRated
                    : attempt.result?.isRated !== undefined
                      ? attempt.result.isRated
                      : attempt.rated
                }
                compileOutput={codeVerdictInfo?.compileOutput || attempt.result?.compileOutput}
                isRevealed={false}
              />

              {/* Live region if resubmitting during repair */}
              {isJudging && (
                <div
                  role="status"
                  aria-live="polite"
                  data-testid="judging-indicator"
                  className="judging-indicator"
                  style={{
                    marginTop: 'var(--space-4)',
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--surface-hover)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    color: 'var(--accent)',
                  }}
                >
                  Judging…
                </div>
              )}

              {/* Actions in resolved state */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--space-3)',
                  marginTop: 'var(--space-5)',
                  alignItems: 'center',
                }}
              >
                {attempt.result?.outcome !== 'correct' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    data-testid="code-submit-button"
                    onClick={handleSubmitCode}
                    disabled={isJudging || !codeSource.trim()}
                  >
                    {isJudging ? 'Judging…' : 'Submit repair'}
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-secondary"
                  data-testid="reveal-button"
                  onClick={handleReveal}
                  disabled={revealAction.pending || isJudging}
                >
                  {revealAction.pending ? 'Revealing...' : 'Reveal solution'}
                </button>

                {attempt.result?.outcome === 'correct' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleNextProblem}
                  >
                    Next problem
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 3. REVEALED STATE: Verdict with editorial and reference solution tabs */}
          {isRevealed && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <CodeVerdict
                verdict={codeVerdictInfo?.verdict || attempt.result?.verdict || 'accepted'}
                failedGroupLabel={codeVerdictInfo?.failedGroupLabel || attempt.result?.failedGroupLabel}
                failedGroupFingerprint={codeVerdictInfo?.failedGroupFingerprint || attempt.result?.failedGroupFingerprint}
                isRated={codeVerdictInfo?.isRated !== undefined ? codeVerdictInfo.isRated : attempt.rated}
                isRevealed={true}
                editorial={attempt.reveal?.editorial}
                referenceSolutions={attempt.reveal?.referenceSolutions}
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
            </div>
          )}
        </>
      ) : (
        /* STANDARD (NON-CODE) PROBLEM VIEW */
        <>
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
                isCode={false}
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
        </>
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
    </div>
  )
}
