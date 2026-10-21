import { Link } from 'react-router-dom'

export interface SetSummaryData {
  track: string
  ratingBefore: number
  ratingAfter: number
  attempts: Array<{
    concept: { id: string; name: string }
    outcome: 'correct' | 'incorrect' | 'gave_up' | 'abandoned'
    itemRating: number | null
    ratingDelta: number | null
    fingerprintId: string | null
  }>
  echoesPassed: number
  suggestedConcept: { id: string; name: string } | null
}

interface SetSummaryProps {
  summary: SetSummaryData
  onAnotherSet?: () => void
}

export function SetSummary({ summary, onAnotherSet }: SetSummaryProps) {
  const delta = Math.round(summary.ratingAfter - summary.ratingBefore)
  const trackName = summary.track.charAt(0).toUpperCase() + summary.track.slice(1)

  return (
    <div
      data-testid="set-summary"
      className="form-card"
      style={{
        maxWidth: 'var(--col-problem)',
        margin: '0 auto',
        padding: 'var(--space-6)',
      }}
      role="region"
      aria-label="Set summary"
    >
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
        <span
          style={{
            fontSize: '0.8125rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--accent)',
          }}
        >
          {trackName} Training Complete
        </span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 'var(--space-1) 0 var(--space-2)' }}>
          Set Summary
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Great effort! Here is your training breakdown for this set.
        </p>
      </div>

      {/* Rating Change Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)',
          background: 'var(--surface-hover)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {trackName} Rating
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            {Math.round(summary.ratingBefore)} → {Math.round(summary.ratingAfter)}
          </div>
        </div>

        <div
          data-testid="summary-rating-delta"
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: delta >= 0 ? 'var(--success)' : 'var(--error)',
          }}
        >
          {delta >= 0 ? `+${delta}` : delta} pts
        </div>
      </div>

      {/* Breakdown Table */}
      <div style={{ marginBottom: 'var(--space-6)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <caption style={{ textAlign: 'left', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
            Problems Completed
          </caption>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th scope="col" style={{ padding: 'var(--space-2) var(--space-3)' }}>#</th>
              <th scope="col" style={{ padding: 'var(--space-2) var(--space-3)' }}>Concept</th>
              <th scope="col" style={{ padding: 'var(--space-2) var(--space-3)' }}>Outcome</th>
              <th scope="col" style={{ padding: 'var(--space-2) var(--space-3)' }}>Item Rating</th>
              <th scope="col" style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>Change</th>
            </tr>
          </thead>
          <tbody>
            {summary.attempts.map((att, idx) => {
              const d = att.ratingDelta !== null ? Math.round(att.ratingDelta) : 0
              const isCorrect = att.outcome === 'correct'
              return (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: idx % 2 === 1 ? 'var(--surface-hover)' : 'transparent',
                  }}
                >
                  <th scope="row" style={{ padding: 'var(--space-2) var(--space-3)', fontWeight: 600 }}>
                    {idx + 1}
                  </th>
                  <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--text)' }}>
                    {att.concept.name}
                  </td>
                  <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                    <span
                      style={{
                        fontWeight: 600,
                        color: isCorrect ? 'var(--success)' : 'var(--error)',
                      }}
                    >
                      {isCorrect ? '✓ Correct' : att.outcome === 'gave_up' ? '⚐ Gave up' : '✗ Incorrect'}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-2) var(--space-3)', fontFamily: 'var(--font-mono)' }}>
                    {att.itemRating !== null ? Math.round(att.itemRating) : '—'}
                  </td>
                  <td
                    data-testid="summary-rating-delta"
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      textAlign: 'right',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      color: d >= 0 ? 'var(--success)' : 'var(--error)',
                    }}
                  >
                    {d >= 0 ? `+${d}` : d}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Suggested next concept */}
      {summary.suggestedConcept && (
        <div
          style={{
            padding: 'var(--space-4)',
            background: 'var(--accent-soft)',
            borderLeft: '4px solid var(--accent)',
            borderRadius: '0 var(--radius-md) var(--radius-md) 0',
            marginBottom: 'var(--space-6)',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
            Suggested Next Concept
          </span>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginTop: '2px' }}>
            {summary.suggestedConcept.name}
          </div>
        </div>
      )}

      {/* Spacing beats massing notice */}
      <div
        style={{
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          marginBottom: 'var(--space-6)',
          lineHeight: 1.5,
        }}
      >
        💡 <strong>Spacing beats massing:</strong> taking breaks between training sets consolidates learning faster than continuous drilling.
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
        <Link to="/today" className="btn btn-secondary">
          Back to Today
        </Link>
        {onAnotherSet && (
          <button type="button" className="btn btn-primary" onClick={onAnotherSet}>
            Another set
          </button>
        )}
      </div>
    </div>
  )
}
