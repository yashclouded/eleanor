import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { AnswerSpec, RawAnswer } from '../../supabase/functions/_shared/content/types.ts'
import { parseAnswer, isCorrect } from '../../supabase/functions/_shared/grading.ts'
import { AnswerInput } from '../components/AnswerInput.tsx'
import { ConfidenceInput } from '../components/ConfidenceInput.tsx'
import { Icon } from '../components/Icon.tsx'
import { ReasoningArt } from '../components/ReasoningArt.tsx'
import { playOutcomeSound } from '../lib/feedback.ts'

const SAMPLE_SPEC: AnswerSpec = {
  type: 'number',
  unit: '%',
  tolerance: { abs: 0.1 },
}

const SAMPLE_ANSWER = 8.333333333333334
const SAMPLE_FORECAST = 0.62 // Model forecast 62%

export function Landing() {
  // Sample problem local state (strictly client-side, zero network calls)
  const [answer, setAnswer] = useState<RawAnswer>('')
  const [confidence, setConfidence] = useState<number | null>(null)
  const [resolved, setResolved] = useState<{
    outcome: 'correct' | 'incorrect' | 'gave_up'
    statedConfidence: number | null
    misconceptionFeedback?: string
  } | null>(null)

  const handleCommit = () => {
    if (confidence === null) return
    const parsed = parseAnswer(SAMPLE_SPEC, answer)
    if (!parsed.ok) return

    const correct = isCorrect(SAMPLE_SPEC, SAMPLE_ANSWER, parsed.value)
    void playOutcomeSound(correct ? 'correct' : 'incorrect')
    let misconceptionFeedback: string | undefined

    if (!correct && typeof parsed.value === 'number') {
      if (Math.abs(parsed.value - 90) <= 0.1) {
        misconceptionFeedback =
          'You answered 90%, which is the test sensitivity P(positive | condition). To find P(condition | positive), you must take the base rate and false alarms into account.'
      } else if (Math.abs(parsed.value - 100) <= 0.1) {
        misconceptionFeedback = 'You answered 100%, ignoring false alarms.'
      }
    }

    setResolved({
      outcome: correct ? 'correct' : 'incorrect',
      statedConfidence: confidence,
      misconceptionFeedback,
    })
  }

  const handleGiveUp = () => {
    void playOutcomeSound('gave_up')
    setResolved({
      outcome: 'gave_up',
      statedConfidence: confidence,
    })
  }

  const handleReset = () => {
    setAnswer('')
    setConfidence(null)
    setResolved(null)
  }

  const parsedForValidation = parseAnswer(SAMPLE_SPEC, answer)
  const canCommit = parsedForValidation.ok && confidence !== null

  return (
    <div className="landing-page">
      {/* Hero section with one-line promise from doc.md */}
      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-rule" /> A PRACTICE OF PRECISION</p>
          <h1>Make room for<br /><em>clear thinking.</em></h1>
          <p className="hero-description">The rated gym for your own thinking. A quiet space to work through hard problems, question your confidence, and revisit what you’ve learned.</p>
          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary">Start Practising <Icon name="arrow" size={18} /></Link>
            <a href="#sample" className="text-link">Try a problem <Icon name="arrow" size={16} /></a>
          </div>
          <p className="hero-note"><Icon name="shield" size={15} /> Your pace. Your perspective. No AI in the product.</p>
        </div>
        <ReasoningArt />
      </section>

      {/* Three short explanations: Rating, Calibration, Echoes */}
      <section className="practice-method" id="how-it-works">
        <div className="method-intro"><p className="eyebrow">THE METHOD</p><h2>Think. Reflect.<br />Come back to it.</h2>
          <p>Think first. Commit an answer and how sure you are. Get rated like a chess player. Prove it a week later on a problem you have never seen.</p>
        </div>
        <div className="method-steps">
          <div className="feature-row">
            <span className="feature-number">01</span><Icon name="chart" size={24} />
            <div><h3>Rating</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Chess-style Glicko rating across Judgment, Logic, Math, and Code. Every problem is calibrated to match your current ability at an adaptive ~70% target success rate.
            </p>
            </div></div>

          <div className="feature-row">
            <span className="feature-number">02</span><Icon name="judgment" size={24} />
            <div><h3>Calibration</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              A two-number identity: how hard a problem you can solve, and whether you know when you are right. Stated confidence is tracked against reality with Brier scores and reliability curves.
            </p>
            </div></div>

          <div className="feature-row">
            <span className="feature-number">03</span><Icon name="echo" size={24} />
            <div><h3>Echoes</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Mastery means retention and transfer. Proving a concept requires solving fresh variants spaced 1, 3, 7, and 21 days later, never from a single lucky attempt.
            </p>
            </div></div>
        </div>
      </section>

      {/* Playable static sample problem (The factory example; unrated, client-side only) */}
      <section
        className="sample-section"
        id="sample"
      >
        <div className="sample-meta">
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--accent)',
              background: 'var(--accent-soft)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Playable sample problem · Unrated · Nothing stored
          </span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
            Track: Judgment
          </span>
        </div>
        <h2 className="sample-heading">A small test of perspective.</h2>

        <div style={{ fontSize: '1.0625rem', lineHeight: 1.6, marginBottom: 'var(--space-6)' }}>
          <p style={{ marginBottom: 'var(--space-3)' }}>
            In a factory assembly line, 1% of manufactured components are defective. A quality scanner has a sensitivity of 90% and a false positive rate of 10%.
          </p>
          <p style={{ fontWeight: 600 }}>
            If a component is flagged as defective by the scanner, what is the probability (as a percentage) that it is actually defective?
          </p>
        </div>

        {!resolved ? (
          <div>
            <AnswerInput
              spec={SAMPLE_SPEC}
              value={answer}
              onChange={setAnswer}
              id="landing-sample-answer"
            />

            <ConfidenceInput
              value={confidence}
              onChange={setConfidence}
            />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCommit}
                disabled={!canCommit}
              >
                Commit answer <Icon name="arrow" size={17} />
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleGiveUp}
              >
                I'm stuck
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 'var(--space-4)' }}>
            {/* Result banner */}
            <div
              className="result-reveal"
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background:
                  resolved.outcome === 'correct'
                    ? 'var(--success-bg)'
                    : 'var(--error-bg)',
                border: `1px solid ${
                  resolved.outcome === 'correct' ? 'var(--success)' : 'var(--error-border)'
                }`,
                color:
                  resolved.outcome === 'correct' ? 'var(--success)' : 'var(--error)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div className="outcome-heading" style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: 'var(--space-1)' }}>
                <Icon name={resolved.outcome === 'correct' ? 'check' : resolved.outcome === 'gave_up' ? 'flag' : 'cross'} />
                {resolved.outcome === 'correct'
                  ? 'Correct'
                  : resolved.outcome === 'gave_up'
                  ? "Given up (I'm stuck)"
                  : 'Incorrect'}
              </div>
              <div style={{ fontSize: '0.875rem' }}>
                {resolved.statedConfidence !== null && (
                  <span>You said {resolved.statedConfidence}%. </span>
                )}
                <span>Eleanor forecast {Math.round(SAMPLE_FORECAST * 100)}%.</span>
              </div>
            </div>

            {/* Misconception feedback if caught */}
            {resolved.misconceptionFeedback && (
              <div
                style={{
                  background: 'var(--surface-hover)',
                  borderLeft: '4px solid var(--accent)',
                  padding: 'var(--space-3) var(--space-4)',
                  fontSize: '0.875rem',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <strong>Mistake fingerprint:</strong> {resolved.misconceptionFeedback}
              </div>
            )}

            {/* Worked solution reveal */}
            <div
              style={{
                background: 'var(--surface-hover)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9375rem',
                lineHeight: 1.6,
                marginBottom: 'var(--space-4)',
              }}
            >
              <h4 style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>Worked Solution</h4>
              <p style={{ marginBottom: 'var(--space-2)' }}>
                Imagine a production run of 1,000 components:
              </p>
              <ul style={{ paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-2)' }}>
                <li><strong>10 defective components (1%):</strong> The scanner detects 90% of them = <strong>9</strong> flagged defective.</li>
                <li><strong>990 functional components (99%):</strong> The scanner mistakenly flags 10% = <strong>99</strong> false alarms.</li>
                <li><strong>Total components flagged:</strong> 9 + 99 = 108.</li>
              </ul>
              <p>
                Probability a flagged component is truly defective: <strong>9 / 108 = 1/12 ≈ 8.33%</strong>.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleReset}
            >
              Try again
            </button>
          </div>
        )}
      </section>

      {/* Honest-claims paragraph from doc.md §1 */}
      <section
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4) var(--space-5)',
          background: 'var(--surface)',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          color: 'var(--text-muted)',
          marginBottom: 'var(--space-8)',
        }}
      >
        <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 'var(--space-1)' }}>
          Claims Policy
        </strong>
        Eleanor trains and measures named skills on its own problems. It never claims to raise IQ, prevent cognitive decline, or make anyone smarter in general. A higher rating means you solve harder problems of this kind; echo results show retention and near transfer. Nothing more is claimed without evidence.
      </section>

      {/* Footer links */}
      <footer className="landing-footer"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8125rem',
          color: 'var(--text-dim)',
          borderTop: '1px solid var(--border)',
          paddingTop: 'var(--space-4)',
        }}
      >
        <div>
          Eleanor · No AI in the product
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <Link to="/terms" style={{ color: 'var(--text-dim)' }}>
            Terms of Service
          </Link>
          <Link to="/privacy" style={{ color: 'var(--text-dim)' }}>
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  )
}
