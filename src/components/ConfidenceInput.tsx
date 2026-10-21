import React from 'react'

const QUICK_PICKS = [10, 30, 50, 70, 80, 90, 99]

interface ConfidenceInputProps {
  value: number | null
  onChange: (val: number | null) => void
  isCode?: boolean
  disabled?: boolean
  declaredHelp?: boolean
  onDeclaredHelpChange?: (val: boolean) => void
}

export function ConfidenceInput({
  value,
  onChange,
  isCode = false,
  disabled = false,
  declaredHelp = false,
  onDeclaredHelpChange,
}: ConfidenceInputProps) {
  const question = isCode
    ? 'How likely is it that this passes every hidden test?'
    : 'How likely is it that your answer is correct?'

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim()
    if (raw === '') {
      onChange(null)
      return
    }
    const num = parseInt(raw, 10)
    if (!Number.isNaN(num)) {
      const clamped = Math.max(0, Math.min(100, num))
      onChange(clamped)
    }
  }

  return (
    <div className="confidence-input-card" style={{ marginTop: 'var(--space-6)' }}>
      <label
        htmlFor="confidence-input"
        style={{
          display: 'block',
          fontWeight: 600,
          fontSize: '1rem',
          marginBottom: 'var(--space-2)',
          color: 'var(--text)',
        }}
      >
        {question}
      </label>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
        Calibrate your certainty. There is no penalty for honest uncertainty.
      </p>

      {/* Quick pick buttons */}
      <div
        role="group"
        aria-label="Confidence quick picks"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)',
        }}
      >
        {QUICK_PICKS.map((qp) => {
          const isSelected = value === qp
          return (
            <button
              key={qp}
              type="button"
              className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              style={{
                minWidth: '52px',
                fontFamily: 'var(--font-mono)',
                borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
              }}
              onClick={() => onChange(qp)}
              disabled={disabled}
              aria-pressed={isSelected}
            >
              {qp}%
            </button>
          )
        })}
      </div>

      {/* Numeric field */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', maxWidth: '240px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            id="confidence-input"
            data-testid="confidence-input"
            type="number"
            min={0}
            max={100}
            step={1}
            value={value !== null ? value : ''}
            onChange={handleNumericChange}
            disabled={disabled}
            placeholder="0–100"
            className="form-input"
            style={{
              fontFamily: 'var(--font-mono)',
              paddingRight: 'var(--space-8)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: 'var(--space-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              fontWeight: 600,
              pointerEvents: 'none',
            }}
          >
            %
          </span>
        </div>
      </div>

      {/* "I used outside help" toggle sits under the confidence input */}
      {onDeclaredHelpChange && (
        <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              id="declared-help-toggle"
              type="checkbox"
              checked={declaredHelp}
              onChange={(e) => onDeclaredHelpChange(e.target.checked)}
              disabled={disabled}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <span>I used outside help (makes this attempt unrated)</span>
          </label>
        </div>
      )}
    </div>
  )
}
