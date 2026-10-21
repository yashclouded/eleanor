import { useState, type FormEvent } from 'react'
import type { Block, Tolerance } from '../../supabase/functions/_shared/content/types.ts'
import { PromptBlocks } from './PromptBlocks.tsx'
import { api } from '../lib/api.ts'
import { useAction } from '../lib/useAction.ts'

export interface RepairStepData {
  index: number
  prompt: Block[]
  tolerance: Tolerance
}

interface RepairLadderProps {
  attemptId: string
  currentStep: RepairStepData
  totalSteps: number
  onStepComplete: (nextStep: RepairStepData | null) => void
  onRevealClick: () => void
}

export function RepairLadder({
  attemptId,
  currentStep,
  totalSteps,
  onStepComplete,
  onRevealClick,
}: RepairLadderProps) {
  const [answer, setAnswer] = useState('')
  const [stepFeedback, setStepFeedback] = useState<{
    correct: boolean
    explain: Block[] | null
    next: RepairStepData | null
  } | null>(null)

  const repairAction = useAction<
    { stepIndex: number; answer: string },
    {
      correct: boolean
      explain: Block[] | null
      next: RepairStepData | null
    }
  >(async (args) => {
    return await api<{
      correct: boolean
      explain: Block[] | null
      next: RepairStepData | null
    }>(`/attempts/${attemptId}/repair`, {
      method: 'POST',
      body: args,
    })
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!answer.trim()) return

    try {
      const res = await repairAction.run({
        stepIndex: currentStep.index,
        answer: answer.trim(),
      })
      setStepFeedback(res)
    } catch {
      // Error handled by repairAction.error
    }
  }

  const handleAdvance = () => {
    if (stepFeedback?.next) {
      const next = stepFeedback.next
      setAnswer('')
      setStepFeedback(null)
      repairAction.reset()
      onStepComplete(next)
    } else {
      onRevealClick()
    }
  }

  return (
    <div
      data-testid="repair-ladder"
      className="repair-ladder-card"
      style={{
        marginTop: 'var(--space-6)',
        padding: 'var(--space-5)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
      role="region"
      aria-label="Repair ladder"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-4)',
          paddingBottom: 'var(--space-2)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            fontSize: '0.8125rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--accent)',
          }}
        >
          Repair Step {currentStep.index + 1} of {totalSteps}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onRevealClick}
        >
          Skip to reveal
        </button>
      </div>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <PromptBlocks blocks={currentStep.prompt} />
      </div>

      {!stepFeedback ? (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
              htmlFor="repair-answer-input"
              style={{ display: 'block', fontWeight: 600, fontSize: '0.9375rem', marginBottom: 'var(--space-2)' }}
            >
              Your intermediate answer
            </label>
            <input
              id="repair-answer-input"
              data-testid="repair-answer-input"
              type="text"
              inputMode="decimal"
              className="form-input"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={repairAction.pending}
              placeholder="Enter number"
              style={{ maxWidth: '280px', fontFamily: 'var(--font-mono)' }}
            />
          </div>

          {repairAction.error && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-3)' }}>
              {repairAction.error.message}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={repairAction.pending || !answer.trim()}
          >
            {repairAction.pending ? 'Checking...' : 'Submit step'}
          </button>
        </form>
      ) : (
        <div data-testid="step-feedback" style={{ marginTop: 'var(--space-4)' }}>
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: stepFeedback.correct ? 'var(--success-bg)' : 'var(--error-bg)',
              border: `1px solid ${stepFeedback.correct ? '#86efac' : 'var(--error-border)'}`,
              color: stepFeedback.correct ? 'var(--success)' : 'var(--error)',
              fontWeight: 600,
              marginBottom: 'var(--space-4)',
            }}
          >
            {stepFeedback.correct ? '✓ Correct intermediate step!' : '✗ Not quite.'}
          </div>

          {stepFeedback.explain && stepFeedback.explain.length > 0 && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <PromptBlocks blocks={stepFeedback.explain} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {stepFeedback.next ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAdvance}
                >
                  Next step
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onRevealClick}
                >
                  Reveal solution
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onRevealClick}
              >
                Reveal solution
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
