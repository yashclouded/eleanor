import type { AttemptView } from '../lib/api.ts'

interface ResultPanelProps {
  result: NonNullable<AttemptView['result']>
  ratingReveal?: 'each' | 'end_of_set'
}

export function ResultPanel({ result, ratingReveal = 'end_of_set' }: ResultPanelProps) {
  const isCorrect = result.outcome === 'correct'
  const isGaveUp = result.outcome === 'gave_up'

  const userConfPct =
    result.confidence !== null ? Math.round(result.confidence * 100) : null
  const forecastPct =
    result.forecast !== null ? Math.round(result.forecast * 100) : null
  const itemRating =
    result.itemRating !== null ? Math.round(result.itemRating) : null
  const ratingDelta = result.ratingDelta !== null ? Math.round(result.ratingDelta) : null

  return (
    <div
      data-testid="result-panel"
      className="result-panel-card"
      style={{
        marginTop: 'var(--space-6)',
        padding: 'var(--space-5)',
        background: isCorrect ? 'var(--success-bg)' : isGaveUp ? 'var(--surface-hover)' : 'var(--error-bg)',
        border: `1px solid ${isCorrect ? '#86efac' : isGaveUp ? 'var(--border)' : 'var(--error-border)'}`,
        borderRadius: 'var(--radius-lg)',
      }}
      role="region"
      aria-label="Attempt result"
    >
      {/* 1. Correct or incorrect word with icon, never color alone */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <span
          data-testid="result-outcome"
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: isCorrect ? 'var(--success)' : isGaveUp ? 'var(--text-muted)' : 'var(--error)',
          }}
        >
          {isCorrect && (
            <>
              <span aria-hidden="true">✓</span> Correct
            </>
          )}
          {!isCorrect && !isGaveUp && (
            <>
              <span aria-hidden="true">✗</span> Incorrect
            </>
          )}
          {isGaveUp && (
            <>
              <span aria-hidden="true">⚐</span> Gave up
            </>
          )}
        </span>
      </div>

      {/* 2. Fingerprint feedback */}
      {result.misconception && (
        <div
          data-testid="fingerprint-feedback"
          style={{
            marginBottom: 'var(--space-4)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--surface)',
            borderLeft: '4px solid var(--accent)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.9375rem',
            color: 'var(--text)',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>
            Insight on your answer
          </strong>
          {result.misconception.feedback}
        </div>
      )}

      {/* 3. Stats row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'var(--space-4)',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          paddingTop: 'var(--space-2)',
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        {userConfPct !== null && forecastPct !== null && (
          <span data-testid="confidence-comparison" style={{ fontWeight: 500 }}>
            You said {userConfPct}% · Eleanor forecast {forecastPct}%
          </span>
        )}

        {itemRating !== null && (
          <span data-testid="item-rating" style={{ fontFamily: 'var(--font-mono)' }}>
            Problem rated {itemRating}
          </span>
        )}

        {/* 4. Rating delta: shown now or at end of set per rating_reveal */}
        {ratingReveal === 'each' && ratingDelta !== null && (
          <span
            data-testid="rating-delta"
            style={{
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: ratingDelta >= 0 ? 'var(--success)' : 'var(--error)',
            }}
          >
            {ratingDelta >= 0 ? `+${ratingDelta}` : ratingDelta} pts
          </span>
        )}
      </div>
    </div>
  )
}
