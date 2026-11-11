import { useState, useRef } from 'react'
import { BrandMark, Icon } from '../components/Icon.tsx'
import { TrackArt } from '../components/TrackArt.tsx'
import { Link } from 'react-router-dom'
import type { AnswerSpec, RawAnswer } from '../../supabase/functions/_shared/content/types.ts'
import { parseAnswer, isCorrect } from '../../supabase/functions/_shared/grading.ts'
import { AnswerInput } from '../components/AnswerInput.tsx'
import { ConfidenceInput } from '../components/ConfidenceInput.tsx'
import { useAnswerFeedback } from '../components/Experience.tsx'

const SAMPLE_SPEC: AnswerSpec = {
  type: 'number',
  unit: '%',
  tolerance: { abs: 0.1 },
}

const SAMPLE_ANSWER = 8.333333333333334
const SAMPLE_FORECAST = 0.62 // Model forecast 62%

export function Landing() {
  const feedback = useAnswerFeedback()
  const sampleId = useRef(crypto.randomUUID())
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
    feedback.prepare()
    feedback.celebrate(sampleId.current, correct)
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
    setResolved({
      outcome: 'gave_up',
      statedConfidence: confidence,
    })
  }

  const handleReset = () => {
    sampleId.current = crypto.randomUUID()
    setAnswer('')
    setConfidence(null)
    setResolved(null)
  }

  const parsedForValidation = parseAnswer(SAMPLE_SPEC, answer)
  const canCommit = parsedForValidation.ok && confidence !== null

  return (
    <div className="landing container-dashboard">
      <section className="landing-hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <span className="eyebrow"><span className="small-dot" /> A daily practice in thinking</span>
          <h1 id="hero-heading">A little practice.<br />A clearer mind.</h1>
          <p className="hero-description">The rated gym for your own thinking. Real problems. Honest confidence. The satisfaction of figuring it out yourself.</p>
          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary">Find your starting point <Icon name="arrow" /></Link>
            <a href="#sample" className="text-link" onClick={(event) => {
              event.preventDefault()
              document.getElementById('sample')?.scrollIntoView({ block: 'start' })
              document.getElementById('landing-sample-answer')?.focus({ preventScroll: true })
            }}>Try a problem <span aria-hidden="true">↗</span></a>
          </div>
          <p className="hero-footnote">Your pace. Your thinking. A little further each day.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-topline"><span>THE ELEANOR PRACTICE</span><span>FIG. 01</span></div>
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-sun" />
          <TrackArt track="judgment" className="hero-flower" />
          <div className="art-note"><span className="small-dot" /> Room to think.</div>
          <div className="art-baseline"><span>A different kind of daily ritual.</span><BrandMark /></div>
        </div>
      </section>

      <section className="disciplines" aria-label="Four ways to practise">
        <span className="eyebrow">One practice. Four perspectives.</span>
        <div className="discipline-list">
          {[
            ['judgment', 'Judgment', 'Make sense of uncertainty.'],
            ['logic', 'Logic', 'Find what follows.'],
            ['math', 'Math', 'See the underlying pattern.'],
            ['code', 'Code', 'Turn an idea into a solution.'],
          ].map(([track, name, description]) => (
            <Link to="/login" key={track} className={`discipline discipline-${track}`}>
              <TrackArt track={track} />
              <div><h2>{name}</h2><p>{description}</p></div>
              <Icon name="arrow" />
            </Link>
          ))}
        </div>
      </section>

      <section className="practice-intro" aria-labelledby="practice-heading">
        <div><span className="eyebrow">The practice, not the shortcut</span><h2 id="practice-heading">Make room for<br />your own reasoning.</h2></div>
        <p>Think first. Commit an answer and how sure you are. Get rated like a chess player. Prove it a week later on a problem you have never seen.</p>
      </section>
      <section className="method-grid" aria-label="How Eleanor works">
        <article><span className="method-number">01 / RATING</span><h3>A challenge that meets you.</h3><p>A chess-style rating in each track. Problems adapt to your level, so there’s always something worth working out.</p></article>
        <article><span className="method-number">02 / CALIBRATION</span><h3>Know what you know.</h3><p>Say how sure you are before you see the answer. Discover where your confidence and your results agree.</p></article>
        <article><span className="method-number">03 / ECHOES</span><h3>Make the insight stay.</h3><p>Return to the idea in a fresh problem, days later. Build a record of what you can actually use again.</p></article>
      </section>

      <section id="sample" className="sample-section" aria-labelledby="sample-heading">
        <div className="sample-intro"><span className="eyebrow">A small thought experiment</span><h2 id="sample-heading">Before you go,<br />give it a thought.</h2><p>No account. No rating.<br />Just you and the problem.</p><TrackArt track="math" /></div>
        <div className="sample-card form-card">
          <div className="sample-meta"><span className="status-badge">Judgment · Base rates</span><span className="text-muted">Unrated · Nothing stored</span></div>
          <h3>The scanner’s dilemma</h3>
          <div className="sample-prompt">
            <p>In a factory assembly line, 1% of manufactured components are defective. A quality scanner has a sensitivity of 90% and a false positive rate of 10%.</p>
            <p>If a component is flagged as defective by the scanner, what is the probability (as a percentage) that it is actually defective?</p>
          </div>
          {!resolved ? (
            <>
              <AnswerInput spec={SAMPLE_SPEC} value={answer} onChange={setAnswer} id="landing-sample-answer" />
              <ConfidenceInput value={confidence} onChange={setConfidence} />
              <div className="sample-actions"><button type="button" className="btn btn-primary" onClick={handleCommit} disabled={!canCommit}>Commit answer <Icon name="arrow" /></button><button type="button" className="btn btn-secondary" onClick={handleGiveUp}>I'm stuck</button></div>
            </>
          ) : (
            <div className="sample-result">
              <div className={`alert ${resolved.outcome === 'correct' ? 'alert-success' : 'alert-error'}`} role="status">
                <strong>{resolved.outcome === 'correct' ? 'Correct' : resolved.outcome === 'gave_up' ? "Given up (I'm stuck)" : 'Incorrect'}</strong>
                <p>{resolved.statedConfidence !== null && <span>You said {resolved.statedConfidence}%. </span>}Eleanor forecast {Math.round(SAMPLE_FORECAST * 100)}%.</p>
              </div>
              {resolved.misconceptionFeedback && <p className="sample-feedback"><strong>Mistake fingerprint:</strong> {resolved.misconceptionFeedback}</p>}
              <div className="worked-solution"><h4>Worked Solution</h4><p>Imagine a production run of 1,000 components:</p><ul><li><strong>10 defective components:</strong> 90% detected = <strong>9</strong> flagged.</li><li><strong>990 functional components:</strong> 10% falsely flagged = <strong>99</strong> false alarms.</li><li><strong>Total flagged:</strong> 9 + 99 = 108.</li></ul><p>Probability a flagged component is truly defective: <strong>9 / 108 = 1/12 ≈ 8.33%</strong>.</p></div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset}>Try again</button>
            </div>
          )}
        </div>
      </section>
      <section className="honest-note"><BrandMark /><div><h2>Real practice. Honest measures.</h2><p>Eleanor trains and measures named skills on its own problems. A higher rating means you solve harder problems of this kind; echoes show retention and near transfer. We make no claim of broader cognitive gains.</p></div></section>
      <footer className="site-footer"><Link to="/" className="logo-text"><BrandMark /><span>eleanor<span className="brand-period">.</span></span></Link><span>A little further, every day.</span><div><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><Link to="/login">Sign in <Icon name="arrow" /></Link></div></footer>
    </div>
  )
}
