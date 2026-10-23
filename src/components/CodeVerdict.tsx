import { useState } from 'react'
import type { Block } from '../../supabase/functions/_shared/content/types.ts'
import { PromptBlocks } from './PromptBlocks.tsx'

export interface CodeVerdictProps {
  verdict:
    | 'accepted'
    | 'wrong_answer'
    | 'time_limit'
    | 'runtime_error'
    | 'compile_error'
    | 'judge_error'
    | string
  failedGroupLabel?: string | null
  failedGroupFingerprint?: string | null
  compileOutput?: string | null
  isRated?: boolean
  editorial?: Block[]
  referenceSolutions?: Record<string, string>
  isRevealed?: boolean
}

export function CodeVerdict({
  verdict,
  failedGroupLabel,
  failedGroupFingerprint,
  compileOutput,
  isRated = true,
  editorial,
  referenceSolutions,
  isRevealed = false,
}: CodeVerdictProps) {
  // Available reference solution tabs
  const availableLangs = referenceSolutions ? Object.keys(referenceSolutions) : []
  const [selectedLang, setSelectedLang] = useState<string>(() => {
    if (availableLangs.includes('cpp')) return 'cpp'
    if (availableLangs.includes('python')) return 'python'
    if (availableLangs.includes('javascript')) return 'javascript'
    return availableLangs[0] || 'cpp'
  })

  const [copiedSolution, setCopiedSolution] = useState(false)

  const handleCopySolution = async (code: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code)
      } else {
        const el = document.createElement('textarea')
        el.value = code
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopiedSolution(true)
      setTimeout(() => setCopiedSolution(false), 2000)
    } catch (err) {
      console.error('Failed to copy reference solution', err)
    }
  }

  const isAccepted = verdict === 'accepted'
  const isCompileError = verdict === 'compile_error'
  const isWrongAnswer = verdict === 'wrong_answer'
  const isTimeLimit = verdict === 'time_limit'
  const isRuntimeError = verdict === 'runtime_error'
  const isJudgeError = verdict === 'judge_error'

  const langLabels: Record<string, string> = {
    cpp: 'C++',
    python: 'Python',
    javascript: 'JavaScript',
  }

  return (
    <div className="code-verdict-root" data-testid="code-verdict-component" style={{ marginTop: 'var(--space-6)' }}>
      {/* 1. Verdict Banner */}
      <div
        className={`form-card verdict-card ${
          isAccepted
            ? 'verdict-accepted'
            : isCompileError
              ? 'verdict-compile-error'
              : 'verdict-failed'
        }`}
        data-testid={`verdict-${verdict.replace(/_/g, '-')}`}
        style={{
          padding: 'var(--space-5)',
          background: isAccepted
            ? 'var(--success-bg)'
            : isCompileError
              ? 'var(--surface-hover)'
              : 'var(--error-bg)',
          border: `1px solid ${
            isAccepted
              ? '#86efac'
              : isCompileError
                ? 'var(--border)'
                : 'var(--error-border)'
          }`,
          borderRadius: 'var(--radius-lg)',
        }}
        role="region"
        aria-label="Code verdict"
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            marginBottom: isCompileError || failedGroupLabel ? 'var(--space-3)' : 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span
              data-testid="verdict-title"
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                color: isAccepted
                  ? 'var(--success)'
                  : isCompileError
                    ? 'var(--text)'
                    : 'var(--error)',
              }}
            >
              {isAccepted && (
                <>
                  <span aria-hidden="true">✓</span> Accepted
                </>
              )}
              {isWrongAnswer && (
                <>
                  <span aria-hidden="true">✗</span> Wrong Answer
                </>
              )}
              {isTimeLimit && (
                <>
                  <span aria-hidden="true">⏱</span> Time Limit Exceeded
                </>
              )}
              {isRuntimeError && (
                <>
                  <span aria-hidden="true">⚠</span> Runtime Error
                </>
              )}
              {isCompileError && (
                <>
                  <span aria-hidden="true">⚙</span> Compilation Error
                </>
              )}
              {isJudgeError && (
                <>
                  <span aria-hidden="true">!</span> Judge Error
                </>
              )}
            </span>
          </div>

          {/* Unrated badge for repair resubmits */}
          {!isRated && !isCompileError && (
            <span
              data-testid="unrated-badge"
              className="badge-unrated"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: 'var(--surface)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              Unrated
            </span>
          )}
        </div>

        {/* Failing test group & fingerprint */}
        {(failedGroupLabel || failedGroupFingerprint) && (
          <div
            data-testid="verdict-fingerprint"
            className="verdict-fingerprint"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--surface)',
              borderLeft: '4px solid var(--error)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9375rem',
              color: 'var(--text)',
              lineHeight: 1.5,
              marginTop: 'var(--space-2)',
            }}
          >
            {failedGroupLabel && (
              <div>
                Failing test group: <strong data-testid="failed-group-label">{failedGroupLabel}</strong>
              </div>
            )}
            {failedGroupFingerprint && (
              <div
                data-testid="failed-group-fingerprint"
                style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}
              >
                Fingerprint: {failedGroupFingerprint}
              </div>
            )}
          </div>
        )}

        {/* Compiler output on compile error */}
        {isCompileError && compileOutput && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Compiler Output:
            </span>
            <pre
              data-testid="compile-output"
              tabIndex={0}
              aria-label="Compiler Output"
              style={{
                margin: 'var(--space-1) 0 0 0',
                padding: 'var(--space-3)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                color: 'var(--text)',
                whiteSpace: 'pre-wrap',
                maxHeight: '300px',
                overflow: 'auto',
              }}
            >
              {compileOutput}
            </pre>
          </div>
        )}

        {isJudgeError && (
          <p style={{ margin: 'var(--space-2) 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            The judging service encountered a transient failure. Your attempt remains unrated; please retry.
          </p>
        )}
      </div>

      {/* 2. Reveal Section: Editorial and Reference Solutions in Tabs */}
      {isRevealed && (
        <div
          data-testid="reveal-panel"
          className="form-card"
          style={{
            marginTop: 'var(--space-6)',
            padding: 'var(--space-5)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}
          role="region"
          aria-label="Solution editorial and reference solutions"
        >
          {/* Editorial */}
          {editorial && editorial.length > 0 && (
            <div data-testid="editorial-section" style={{ marginBottom: 'var(--space-6)' }}>
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  marginBottom: 'var(--space-3)',
                  color: 'var(--text)',
                }}
              >
                Editorial
              </h3>
              <PromptBlocks blocks={editorial} />
            </div>
          )}

          {/* Reference solutions in tabs */}
          {referenceSolutions && availableLangs.length > 0 && (
            <div data-testid="reference-solutions-section">
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  marginBottom: 'var(--space-3)',
                  color: 'var(--text)',
                }}
              >
                Reference Solutions
              </h3>

              {/* Tab Bar */}
              <div
                role="tablist"
                aria-label="Reference solution languages"
                style={{
                  display: 'flex',
                  gap: 'var(--space-2)',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                {availableLangs.map((lang) => {
                  const isActive = selectedLang === lang
                  return (
                    <button
                      key={lang}
                      type="button"
                      role="tab"
                      id={`tab-${lang}`}
                      aria-controls={`panel-${lang}`}
                      aria-selected={isActive}
                      data-testid={`tab-${lang}`}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setSelectedLang(lang)}
                      style={{
                        padding: 'var(--space-2) var(--space-4)',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                        color: isActive ? 'var(--text)' : 'var(--text-muted)',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        marginBottom: '-1px',
                      }}
                    >
                      {langLabels[lang] || lang}
                    </button>
                  )
                })}
              </div>

              {/* Tab Panel */}
              {availableLangs.map((lang) => {
                if (lang !== selectedLang) return null
                const solutionCode = referenceSolutions[lang]
                return (
                  <div
                    key={lang}
                    role="tabpanel"
                    id={`panel-${lang}`}
                    aria-labelledby={`tab-${lang}`}
                    data-testid={`panel-${lang}`}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: 'var(--space-2)',
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm copy-btn"
                        data-testid="copy-reference-solution"
                        aria-label={`Copy ${langLabels[lang] || lang} reference solution`}
                        onClick={() => handleCopySolution(solutionCode)}
                      >
                        {copiedSolution ? 'Copied!' : 'Copy solution'}
                      </button>
                    </div>

                    <pre
                      data-testid={`reference-code-${lang}`}
                      tabIndex={0}
                      aria-label={`${langLabels[lang] || lang} Reference Solution`}
                      style={{
                        margin: 0,
                        padding: 'var(--space-4)',
                        background: 'var(--surface-hover)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                        overflow: 'auto',
                        maxHeight: '450px',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {solutionCode}
                    </pre>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
