import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, Compartment } from '@codemirror/state'
import { python } from '@codemirror/lang-python'
import { cpp } from '@codemirror/lang-cpp'
import { javascript } from '@codemirror/lang-javascript'
import type { Block } from '../../supabase/functions/_shared/content/types.ts'
import { PromptBlocks } from './PromptBlocks.tsx'

export interface RunResult {
  status: { id: number; description: string }
  stdout?: string | null
  stderr?: string | null
  compile_output?: string | null
  time?: string | null
  memory?: number | null
}

export interface CodeEditorProps {
  attemptId: string
  statementBlocks?: Block[]
  inputFormatBlocks?: Block[]
  outputFormatBlocks?: Block[]
  constraintsBlocks?: Block[]
  samples?: { input: string; output: string; explain?: Block[] }[]
  source: string
  onChange: (source: string) => void
  language: 'python' | 'cpp' | 'javascript'
  onLanguageChange: (language: 'python' | 'cpp' | 'javascript') => void
  onRun?: (input: string) => Promise<RunResult>
  disabled?: boolean
}

export function CodeEditor({
  attemptId,
  statementBlocks,
  inputFormatBlocks,
  outputFormatBlocks,
  constraintsBlocks,
  samples,
  source,
  onChange,
  language,
  onLanguageChange,
  onRun,
  disabled = false,
}: CodeEditorProps) {
  // Plain text toggle preference
  const [usePlainText, setUsePlainText] = useState<boolean>(() => {
    try {
      return localStorage.getItem('eleanor_code_plain_text') === 'true'
    } catch {
      return false
    }
  })

  // Clipboard copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Run state
  const [selectedInputMode, setSelectedInputMode] = useState<'sample' | 'custom'>('sample')
  const [selectedSampleIdx, setSelectedSampleIdx] = useState<number>(0)
  const [customStdin, setCustomStdin] = useState<string>('')
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  // CodeMirror refs
  const editorParentRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const langCompartment = useMemo(() => new Compartment(), [])
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Restore draft on mount or when attemptId changes if local draft exists
  useEffect(() => {
    if (!attemptId) return
    try {
      const savedDraft = localStorage.getItem(`eleanor_code_draft_${attemptId}`)
      if (savedDraft !== null && savedDraft !== source) {
        onChangeRef.current(savedDraft)
      }
    } catch {
      // Ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId])

  // Autosave draft per attempt
  useEffect(() => {
    if (!attemptId) return
    try {
      if (!source) {
        const existing = localStorage.getItem(`eleanor_code_draft_${attemptId}`)
        if (existing) return
      }
      localStorage.setItem(`eleanor_code_draft_${attemptId}`, source)
    } catch {
      // Ignore
    }
  }, [attemptId, source])

  // Language extension helper
  const getLangExtension = useCallback((lang: 'python' | 'cpp' | 'javascript') => {
    switch (lang) {
      case 'python':
        return python()
      case 'cpp':
        return cpp()
      case 'javascript':
        return javascript()
    }
  }, [])

  // Mount CodeMirror
  useEffect(() => {
    if (usePlainText || !editorParentRef.current) return

    const state = EditorState.create({
      doc: source,
      extensions: [
        basicSetup,
        EditorView.contentAttributes.of({ 'aria-label': 'Code editor' }),
        langCompartment.of(getLangExtension(language)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newDoc = update.state.doc.toString()
            onChangeRef.current(newDoc)
          }
        }),
        EditorView.theme({
          '&': {
            fontSize: '14px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
          },
          '.cm-scroller': {
            fontFamily: 'var(--font-mono)',
            minHeight: '260px',
            maxHeight: '480px',
            overflow: 'auto',
            lineHeight: '1.5',
          },
          '.cm-gutters': {
            backgroundColor: 'var(--surface-hover)',
            color: 'var(--text-muted)',
            borderRight: '1px solid var(--border)',
          },
          '&.cm-focused': {
            outline: '2px solid var(--border-focus)',
          },
        }),
      ],
    })

    const view = new EditorView({
      state,
      parent: editorParentRef.current,
    })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usePlainText])

  // Reconfigure language
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: langCompartment.reconfigure(getLangExtension(language)),
      })
    }
  }, [language, langCompartment, getLangExtension])

  // Sync external changes to CodeMirror
  useEffect(() => {
    if (viewRef.current) {
      const currentDoc = viewRef.current.state.doc.toString()
      if (currentDoc !== source) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: source },
        })
      }
    }
  }, [source])

  // Copy helper
  const handleCopy = async (text: string, key: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const el = document.createElement('textarea')
        el.value = text
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopiedKey(key)
      setTimeout(() => {
        setCopiedKey((k) => (k === key ? null : k))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard', err)
    }
  }

  // Handle plain text toggle
  const handleTogglePlainText = (checked: boolean) => {
    setUsePlainText(checked)
    try {
      localStorage.setItem('eleanor_code_plain_text', String(checked))
    } catch {
      // Ignore
    }
  }

  // Handle language change
  const handleLanguageChange = (newLang: 'python' | 'cpp' | 'javascript') => {
    onLanguageChange(newLang)
    try {
      localStorage.setItem('eleanor_code_lang', newLang)
    } catch {
      // Ignore
    }
  }

  // Handle Run
  const handleRun = async () => {
    if (!onRun || isRunning || !source.trim()) return
    setIsRunning(true)
    setRunError(null)
    setRunResult(null)

    const stdinToUse =
      selectedInputMode === 'sample' && samples && samples[selectedSampleIdx]
        ? samples[selectedSampleIdx].input
        : customStdin

    try {
      const res = await onRun(stdinToUse)
      setRunResult(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Run execution failed'
      setRunError(msg)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="code-editor-root" data-testid="code-editor-component">
      {/* 1. Problem Presentation: Statement, Input Format, Output Format, Constraints, Samples */}
      <div className="form-card code-problem-card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
        {/* Statement blocks */}
        {statementBlocks && statementBlocks.length > 0 && (
          <div className="code-problem-section" data-testid="problem-statement">
            <PromptBlocks blocks={statementBlocks} />
          </div>
        )}

        {/* Input format */}
        {inputFormatBlocks && inputFormatBlocks.length > 0 && (
          <div className="code-problem-section" data-testid="problem-input-format" style={{ marginTop: 'var(--space-4)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Input Format</h3>
            <PromptBlocks blocks={inputFormatBlocks} />
          </div>
        )}

        {/* Output format */}
        {outputFormatBlocks && outputFormatBlocks.length > 0 && (
          <div className="code-problem-section" data-testid="problem-output-format" style={{ marginTop: 'var(--space-4)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Output Format</h3>
            <PromptBlocks blocks={outputFormatBlocks} />
          </div>
        )}

        {/* Constraints */}
        {constraintsBlocks && constraintsBlocks.length > 0 && (
          <div className="code-problem-section" data-testid="problem-constraints" style={{ marginTop: 'var(--space-4)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Constraints</h3>
            <PromptBlocks blocks={constraintsBlocks} />
          </div>
        )}

        {/* Samples with Copy buttons */}
        {samples && samples.length > 0 && (
          <div className="code-problem-section" data-testid="problem-samples" style={{ marginTop: 'var(--space-5)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Samples</h3>
            {samples.map((sample, idx) => (
              <div
                key={idx}
                className="sample-card"
                data-testid={`sample-${idx}`}
                style={{
                  marginBottom: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
                  {/* Sample Input */}
                  <div className="sample-block">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 'var(--space-1)',
                      }}
                    >
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Sample Input {samples.length > 1 ? idx + 1 : ''}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm copy-btn"
                        data-testid={`copy-sample-${idx}-input`}
                        aria-label={`Copy sample ${idx + 1} input`}
                        onClick={() => handleCopy(sample.input, `s-${idx}-in`)}
                      >
                        {copiedKey === `s-${idx}-in` ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: 'var(--space-2) var(--space-3)',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.875rem',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {sample.input}
                    </pre>
                  </div>

                  {/* Sample Output */}
                  <div className="sample-block">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 'var(--space-1)',
                      }}
                    >
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Sample Output {samples.length > 1 ? idx + 1 : ''}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm copy-btn"
                        data-testid={`copy-sample-${idx}-output`}
                        aria-label={`Copy sample ${idx + 1} output`}
                        onClick={() => handleCopy(sample.output, `s-${idx}-out`)}
                      >
                        {copiedKey === `s-${idx}-out` ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: 'var(--space-2) var(--space-3)',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.875rem',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {sample.output}
                    </pre>
                  </div>
                </div>

                {/* Explanation */}
                {sample.explain && sample.explain.length > 0 && (
                  <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Explanation:</span>
                    <PromptBlocks blocks={sample.explain} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Editor Toolbar: Language Selector & Plain text toggle */}
      <div
        className="form-card editor-card"
        style={{
          padding: 'var(--space-5)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {/* Language selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <label htmlFor="language-select" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              Language:
            </label>
            <select
              id="language-select"
              data-testid="language-select"
              className="select-input"
              value={language}
              disabled={disabled}
              onChange={(e) => handleLanguageChange(e.target.value as 'python' | 'cpp' | 'javascript')}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.875rem',
              }}
            >
              <option value="python">Python 3</option>
              <option value="cpp">C++17</option>
              <option value="javascript">JavaScript (Node)</option>
            </select>
          </div>

          {/* Plain text editor toggle */}
          <div>
            <label
              htmlFor="plain-text-toggle"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                id="plain-text-toggle"
                data-testid="plain-text-toggle"
                checked={usePlainText}
                disabled={disabled}
                onChange={(e) => handleTogglePlainText(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <span>Use plain text editor</span>
            </label>
          </div>
        </div>

        {/* 3. Editor View (CodeMirror 6 or fallback Textarea) */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          {usePlainText ? (
            <div>
              <label htmlFor="plain-text-source" className="sr-only">
                Source code
              </label>
              <textarea
                id="plain-text-source"
                data-testid="plain-text-source"
                value={source}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                spellCheck={false}
                rows={14}
                style={{
                  width: '100%',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  padding: 'var(--space-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  resize: 'vertical',
                }}
              />
            </div>
          ) : (
            <div
              ref={editorParentRef}
              data-testid="codemirror-editor"
              style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            />
          )}
        </div>

        {/* 4. Run Section: Sample or Custom Input, Run Button, Run Output */}
        <div
          className="run-section"
          style={{
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Run your code</h4>
            <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: '0.875rem' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="input-mode"
                  checked={selectedInputMode === 'sample'}
                  onChange={() => setSelectedInputMode('sample')}
                />
                <span>Sample input</span>
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="input-mode"
                  data-testid="custom-input-radio"
                  checked={selectedInputMode === 'custom'}
                  onChange={() => setSelectedInputMode('custom')}
                />
                <span>Custom input</span>
              </label>
            </div>
          </div>

          {/* Sample input selector or Custom input textarea */}
          {selectedInputMode === 'sample' && samples && samples.length > 1 && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label htmlFor="sample-selector" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginRight: 'var(--space-2)' }}>
                Select sample:
              </label>
              <select
                id="sample-selector"
                value={selectedSampleIdx}
                onChange={(e) => setSelectedSampleIdx(Number(e.target.value))}
                style={{
                  padding: 'var(--space-1) var(--space-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
              >
                {samples.map((_, i) => (
                  <option key={i} value={i}>
                    Sample {i + 1}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedInputMode === 'custom' && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label htmlFor="custom-stdin" className="sr-only">
                Custom input
              </label>
              <textarea
                id="custom-stdin"
                data-testid="custom-stdin"
                placeholder="Enter custom standard input..."
                rows={3}
                value={customStdin}
                onChange={(e) => setCustomStdin(e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
              />
            </div>
          )}

          {/* Run button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              data-testid="run-button"
              disabled={disabled || isRunning || !source.trim()}
              onClick={handleRun}
            >
              {isRunning ? 'Running…' : 'Run code'}
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Runs against sample or custom input (unrated, max 20 runs per 10m).
            </span>
          </div>

          {/* Run Error */}
          {runError && (
            <div
              className="alert alert-error"
              data-testid="run-error"
              role="alert"
              style={{ marginTop: 'var(--space-3)' }}
            >
              {runError}
            </div>
          )}

          {/* Run Output Panel */}
          {runResult && (
            <div
              className="run-output-panel"
              data-testid="run-output-panel"
              style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-4)',
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-3)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: runResult.status.id === 3 ? 'var(--success)' : 'var(--error)',
                  }}
                >
                  Status: {runResult.status.description}
                </span>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {runResult.time && <span>Time: {runResult.time}s </span>}
                  {runResult.memory && <span>· Memory: {runResult.memory} KB</span>}
                </div>
              </div>

              {/* Standard Output */}
              {runResult.stdout !== null && runResult.stdout !== undefined && (
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Standard Output:
                  </span>
                  <pre
                    data-testid="run-stdout"
                    style={{
                      margin: 'var(--space-1) 0 0 0',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.875rem',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {runResult.stdout || '(no output)'}
                  </pre>
                </div>
              )}

              {/* Standard Error */}
              {runResult.stderr && (
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--error)', textTransform: 'uppercase' }}>
                    Standard Error:
                  </span>
                  <pre
                    data-testid="run-stderr"
                    style={{
                      margin: 'var(--space-1) 0 0 0',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--error-bg)',
                      border: '1px solid var(--error-border)',
                      color: 'var(--error)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.875rem',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {runResult.stderr}
                  </pre>
                </div>
              )}

              {/* Compile Output */}
              {runResult.compile_output && (
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--error)', textTransform: 'uppercase' }}>
                    Compiler Output:
                  </span>
                  <pre
                    data-testid="run-compile-output"
                    style={{
                      margin: 'var(--space-1) 0 0 0',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--error-bg)',
                      border: '1px solid var(--error-border)',
                      color: 'var(--error)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.875rem',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {runResult.compile_output}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
