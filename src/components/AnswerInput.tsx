import { useId } from 'react'
import type { AnswerSpec, RawAnswer } from '../../supabase/functions/_shared/content/types.ts'
import { parseAnswer, formatWarning } from '../../supabase/functions/_shared/grading.ts'

interface AnswerInputProps {
  spec: AnswerSpec
  value: RawAnswer
  onChange: (value: RawAnswer) => void
  disabled?: boolean
  id?: string
}

export function AnswerInput({
  spec,
  value,
  onChange,
  disabled = false,
  id: propId,
}: AnswerInputProps) {
  const autoId = useId()
  const inputId = propId ?? `answer-input-${autoId}`

  switch (spec.type) {
    case 'number':
    case 'integer':
    case 'estimate': {
      const rawString = typeof value === 'string' ? value : ''
      const unit = 'unit' in spec ? spec.unit : undefined

      const parsed = rawString.trim() !== '' ? parseAnswer(spec, rawString) : null
      const warning = parsed && parsed.ok ? formatWarning(spec, parsed.value) : null

      let previewText: string | null = null
      if (parsed && parsed.ok) {
        if (typeof parsed.value === 'number') {
          if (unit === '%') {
            previewText = `Read as ${parsed.value}%`
          } else if (unit) {
            previewText = `Read as ${parsed.value} ${unit}`
          } else {
            previewText = `Read as ${parsed.value}`
          }
        }
      }

      return (
        <div className="answer-input-container">
          <label
            htmlFor={inputId}
            style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--space-2)' }}
          >
            Your answer
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              id={inputId}
              data-testid="answer-input"
              type="text"
              inputMode="decimal"
              className={`form-input ${parsed && !parsed.ok ? 'is-error' : ''}`}
              value={rawString}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              placeholder={unit ? `e.g. 42 ${unit}` : 'Enter your answer'}
              aria-describedby={
                parsed && !parsed.ok
                  ? `${inputId}-error`
                  : previewText
                    ? `${inputId}-preview`
                    : undefined
              }
              style={{
                paddingRight: unit ? 'var(--space-10)' : 'var(--space-3)',
                fontFamily: 'var(--font-mono)',
              }}
            />
            {unit && (
              <span
                style={{
                  position: 'absolute',
                  right: 'var(--space-3)',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  pointerEvents: 'none',
                }}
              >
                {unit}
              </span>
            )}
          </div>

          {parsed && !parsed.ok && (
            <div
              id={`${inputId}-error`}
              data-testid="answer-preview-error"
              className="form-error"
              role="alert"
            >
              {parsed.error}
            </div>
          )}

          {parsed && parsed.ok && previewText && (
            <div
              id={`${inputId}-preview`}
              data-testid="answer-preview"
              style={{
                marginTop: 'var(--space-1)',
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                fontWeight: 500,
              }}
            >
              {previewText}
            </div>
          )}

          {warning && (
            <div
              data-testid="format-warning"
              style={{
                marginTop: 'var(--space-1)',
                fontSize: '0.8125rem',
                color: 'var(--accent)',
                fontWeight: 500,
              }}
            >
              {warning}
            </div>
          )}
        </div>
      )
    }

    case 'choice': {
      const selectedId = typeof value === 'string' ? value : ''
      return (
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            Select one option
          </legend>
          <div role="radiogroup" aria-label="Choices">
            {spec.options.map((opt) => (
              <label
                key={opt.id}
                className={`choice-card ${selectedId === opt.id ? 'is-selected' : ''}`}
                style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
              >
                <input
                  type="radio"
                  name={inputId}
                  value={opt.id}
                  checked={selectedId === opt.id}
                  onChange={() => onChange(opt.id)}
                  disabled={disabled}
                />
                <span className="choice-title">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )
    }

    case 'multi': {
      const selected = Array.isArray(value) ? value : []
      const toggle = (optId: string) => {
        if (selected.includes(optId)) {
          onChange(selected.filter((x) => x !== optId))
        } else {
          onChange([...selected, optId])
        }
      }

      return (
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            Select all that apply
          </legend>
          <div>
            {spec.options.map((opt) => (
              <label
                key={opt.id}
                className={`choice-card ${selected.includes(opt.id) ? 'is-selected' : ''}`}
                style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.id)}
                  onChange={() => toggle(opt.id)}
                  disabled={disabled}
                />
                <span className="choice-title">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )
    }

    case 'sequence': {
      const currentOrder =
        Array.isArray(value) && value.length === spec.items.length
          ? value
          : spec.items.map((i) => i.id)

      const move = (fromIdx: number, toIdx: number) => {
        if (toIdx < 0 || toIdx >= currentOrder.length) return
        const next = [...currentOrder]
        const temp = next[fromIdx]
        next[fromIdx] = next[toIdx]
        next[toIdx] = temp
        onChange(next)
      }

      return (
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            Arrange in the correct order
          </label>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {currentOrder.map((itemId, idx) => {
              const itemOpt = spec.items.find((i) => i.id === itemId)
              return (
                <li
                  key={itemId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>
                    <span style={{ color: 'var(--text-muted)', marginRight: 'var(--space-2)' }}>
                      {idx + 1}.
                    </span>
                    {itemOpt?.label ?? itemId}
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => move(idx, idx - 1)}
                      disabled={disabled || idx === 0}
                      aria-label={`Move ${itemOpt?.label ?? itemId} up`}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => move(idx, idx + 1)}
                      disabled={disabled || idx === currentOrder.length - 1}
                      aria-label={`Move ${itemOpt?.label ?? itemId} down`}
                    >
                      Move down
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )
    }

    default:
      return null
  }
}
