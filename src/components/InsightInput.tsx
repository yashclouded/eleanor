import React, { useState } from 'react'
import { supabase } from '../lib/supabase.ts'

interface InsightInputProps {
  userId: string
  attemptId: string
  conceptId: string
  onSaved?: () => void
  onSkip?: () => void
  disabled?: boolean
}

export function InsightInput({
  userId,
  attemptId,
  conceptId,
  onSaved,
  onSkip,
  disabled = false,
}: InsightInputProps) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    setSaving(true)
    setError(null)

    try {
      const { error: insertErr } = await supabase.from('playbook').insert({
        user_id: userId,
        attempt_id: attemptId,
        concept_id: conceptId,
        text: trimmed,
      })

      if (insertErr) {
        setError(insertErr.message)
      } else {
        setSaved(true)
        if (onSaved) onSaved()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save insight'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div
        data-testid="insight-saved-notice"
        style={{
          marginTop: 'var(--space-4)',
          padding: 'var(--space-3)',
          background: 'var(--surface-hover)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem',
          color: 'var(--success)',
          fontWeight: 500,
        }}
      >
        ✓ Insight saved to your Playbook for future echoes.
      </div>
    )
  }

  return (
    <div
      data-testid="insight-input-card"
      style={{
        marginTop: 'var(--space-5)',
        padding: 'var(--space-4)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <label
        htmlFor="insight-input"
        style={{
          display: 'block',
          fontWeight: 600,
          fontSize: '0.9375rem',
          marginBottom: 'var(--space-1)',
          color: 'var(--text)',
        }}
      >
        One sentence for next time (optional)
      </label>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
        This will be saved to your Playbook and surfaced after you attempt this concept again.
      </p>

      <form onSubmit={handleSave}>
        <div style={{ position: 'relative', marginBottom: 'var(--space-2)' }}>
          <textarea
            id="insight-input"
            data-testid="insight-input"
            className="form-input"
            rows={2}
            maxLength={280}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled || saving}
            placeholder="e.g. Always check base rates before looking at test sensitivity."
            style={{ resize: 'vertical' }}
          />
          <div
            style={{
              textAlign: 'right',
              fontSize: '0.75rem',
              color: text.length > 250 ? 'var(--error)' : 'var(--text-dim)',
              marginTop: '2px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {text.length}/280
          </div>
        </div>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-2)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={disabled || saving || !text.trim()}
          >
            {saving ? 'Saving...' : 'Save insight'}
          </button>
          {onSkip && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onSkip}
              disabled={disabled || saving}
            >
              Skip
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
