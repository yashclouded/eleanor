import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.tsx'
import { api, ApiError } from '../lib/api.ts'
import { useAction } from '../lib/useAction.ts'
import { parseAnswer, isCorrect } from '../../supabase/functions/_shared/grading.ts'
import type { AnswerSpec } from '../../supabase/functions/_shared/content/types.ts'

interface OnboardingData {
  ageConfirmed: boolean
  termsAccepted: boolean
  pledgeAccepted: boolean
  handle: string
  leaderboardVisible: boolean | null
  tracks: string[]
  intensity: 'steady' | 'balanced' | 'stretch'
}

const STORAGE_KEY = 'eleanor_onboarding_draft'

export function Onboarding() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  const [step, setStep] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.step === 'number' && parsed.step >= 1 && parsed.step <= 6) {
          return parsed.step
        }
      }
    } catch {
      // Ignore storage errors
    }
    return 1
  })

  const [data, setData] = useState<OnboardingData>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.data) {
          return parsed.data
        }
      }
    } catch {
      // Ignore storage errors
    }
    return {
      ageConfirmed: false,
      termsAccepted: false,
      pledgeAccepted: false,
      handle: '',
      leaderboardVisible: null,
      tracks: ['judgment'],
      intensity: 'balanced',
    }
  })

  // Confidence tutorial state
  const [tut1Answer, setTut1Answer] = useState('')
  const [tut1Confidence, setTut1Confidence] = useState<number | null>(null)
  const [tut1Feedback, setTut1Feedback] = useState<string | null>(null)

  const [tut2Answer, setTut2Answer] = useState('')
  const [tut2Confidence, setTut2Confidence] = useState<number | null>(null)
  const [tut2Feedback, setTut2Feedback] = useState<string | null>(null)

  // Save to sessionStorage whenever step or data changes
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }))
    } catch {
      // Ignore
    }
  }, [step, data])

  // useAction for idempotent submit
  const { run: submitOnboarding, pending, error } = useAction(
    async (payload: OnboardingData & { transitionId: string }) => {
      const res = await api<{ profile: unknown }>('/onboarding', {
        method: 'POST',
        body: {
          transitionId: payload.transitionId,
          handle: payload.handle,
          ageConfirmed: payload.ageConfirmed,
          termsAccepted: payload.termsAccepted,
          pledgeAccepted: payload.pledgeAccepted,
          leaderboardVisible: payload.leaderboardVisible,
          tracks: payload.tracks,
          intensity: payload.intensity,
        },
      })
      sessionStorage.removeItem(STORAGE_KEY)
      await refreshProfile()
      navigate('/today')
      return res
    }
  )

  const isHandleValid = /^[a-z0-9_]{3,20}$/.test(data.handle)

  const handleNext = () => {
    setStep((s) => Math.min(6, s + 1))
  }

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1))
  }

  // Tutorial grading
  const handleCheckTut1 = (e: React.FormEvent) => {
    e.preventDefault()
    const spec: AnswerSpec = { type: 'number', tolerance: { abs: 0 } }
    const parsed = parseAnswer(spec, tut1Answer)
    if (!parsed.ok) {
      setTut1Feedback(`Format error: ${parsed.error}`)
      return
    }
    const correct = isCorrect(spec, 60, parsed.value)
    if (correct) {
      setTut1Feedback(
        `Correct! Notice that if you knew 15 × 4 is 60, your confidence should be high (90%–100%), even though 60 is just a number.`
      )
    } else {
      setTut1Feedback(`Not quite: 15 × 4 = 60. Try adjusting your answer or your confidence.`)
    }
  }

  const handleCheckTut2 = (e: React.FormEvent) => {
    e.preventDefault()
    const spec: AnswerSpec = {
      type: 'choice',
      options: [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' },
      ],
    }
    const parsed = parseAnswer(spec, tut2Answer.trim().toLowerCase())
    if (!parsed.ok) {
      setTut2Feedback(`Format error: ${parsed.error}`)
      return
    }
    const correct = isCorrect(spec, 'no', parsed.value)
    if (correct) {
      setTut2Feedback(
        `Exactly! The probability of rolling 11 is 0%. But your confidence that the answer is "no" should be 100%! Confidence measures your certainty in your own answer, NOT the event probability.`
      )
    } else {
      setTut2Feedback(`A standard 10-sided die only has numbers 1 through 10, so it can never be 11. The answer is "no".`)
    }
  }

  return (
    <div className="container-problem" style={{ marginTop: 'var(--space-8)' }}>
      <div className="form-card" data-testid={`onboarding-step-${step}`}>
        {/* Step indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-6)',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          <span>Step {step} of 6</span>
          <span className="tabular-nums">{Math.round((step / 6) * 100)}% complete</span>
        </div>

        {/* Global Error Banner if API call failed */}
        {error && (
          <div className="alert alert-error" role="alert" data-testid="onboarding-error">
            {error instanceof ApiError && error.code === 'conflict'
              ? 'This handle is already taken. Please go back and choose another.'
              : error.message || 'An error occurred during onboarding.'}
          </div>
        )}

        {/* STEP 1: Age, Terms & Honour Pledge */}
        {step === 1 && (
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>
              Welcome to Eleanor
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
              Before we begin, please confirm the following requirements and commitments:
            </p>

            <div className="form-group">
              <label className="choice-card" htmlFor="age-confirmed">
                <input
                  id="age-confirmed"
                  type="checkbox"
                  checked={data.ageConfirmed}
                  onChange={(e) => setData({ ...data, ageConfirmed: e.target.checked })}
                />
                <div>
                  <div className="choice-title">I am 16 years of age or older</div>
                  <div className="choice-description">
                    Eleanor is designed for independent learners aged 16 and older.
                  </div>
                </div>
              </label>
            </div>

            <div className="form-group">
              <label className="choice-card" htmlFor="terms-accepted">
                <input
                  id="terms-accepted"
                  type="checkbox"
                  checked={data.termsAccepted}
                  onChange={(e) => setData({ ...data, termsAccepted: e.target.checked })}
                />
                <div>
                  <div className="choice-title">Terms of Service and Privacy Policy</div>
                  <div className="choice-description">
                    I accept the terms and agree that my learning attempts, ratings, and insights are private by default.
                  </div>
                </div>
              </label>
            </div>

            <div className="form-group">
              <label className="choice-card" htmlFor="pledge-accepted">
                <input
                  id="pledge-accepted"
                  type="checkbox"
                  checked={data.pledgeAccepted}
                  onChange={(e) => setData({ ...data, pledgeAccepted: e.target.checked })}
                />
                <div>
                  <div className="choice-title">The Honour Pledge</div>
                  <div className="choice-description">
                    I pledge to solve rated problems using only my own mind, without artificial intelligence, search engines, or outside assistance.
                  </div>
                </div>
              </label>
            </div>

            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
                disabled={!data.ageConfirmed || !data.termsAccepted || !data.pledgeAccepted}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Handle */}
        {step === 2 && (
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>
              Choose your handle
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
              Your handle is your unique learner identifier on Eleanor.
            </p>

            <div className="form-group">
              <label htmlFor="handle" className="form-label">
                Handle
              </label>
              <div className="form-hint">
                3–20 characters, lowercase letters, numbers, and underscores only.
              </div>
              <input
                id="handle"
                name="handle"
                type="text"
                autoComplete="username"
                className={`form-input ${data.handle.length > 0 && !isHandleValid ? 'is-error' : ''}`}
                value={data.handle}
                onChange={(e) => setData({ ...data, handle: e.target.value.toLowerCase().trim() })}
                placeholder="e.g. ada_lovelace"
              />
              {data.handle.length > 0 && !isHandleValid && (
                <div className="form-error" role="alert" data-testid="handle-format-error">
                  Handle must be 3–20 characters using only lowercase letters, numbers, and underscores.
                </div>
              )}
            </div>

            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
                disabled={!isHandleValid}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Leaderboard Visibility (NO preselected option!) */}
        {step === 3 && (
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>
              Leaderboard visibility
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
              Choose whether your handle and ratings appear on public leaderboards.
            </p>

            <fieldset style={{ border: 'none', padding: 0 }}>
              <legend className="form-label" style={{ marginBottom: 'var(--space-3)' }}>
                Select your preference:
              </legend>

              <label
                className={`choice-card ${data.leaderboardVisible === true ? 'is-selected' : ''}`}
                htmlFor="lb-public"
              >
                <input
                  id="lb-public"
                  type="radio"
                  name="leaderboardVisible"
                  value="public"
                  checked={data.leaderboardVisible === true}
                  onChange={() => setData({ ...data, leaderboardVisible: true })}
                />
                <div>
                  <div className="choice-title">Show me on public leaderboards</div>
                  <div className="choice-description">
                    Your handle, rating, and title will be visible on the public leaderboard.
                  </div>
                </div>
              </label>

              <label
                className={`choice-card ${data.leaderboardVisible === false ? 'is-selected' : ''}`}
                htmlFor="lb-private"
              >
                <input
                  id="lb-private"
                  type="radio"
                  name="leaderboardVisible"
                  value="private"
                  checked={data.leaderboardVisible === false}
                  onChange={() => setData({ ...data, leaderboardVisible: false })}
                />
                <div>
                  <div className="choice-title">Keep my ratings private</div>
                  <div className="choice-description">
                    You will not appear on public rankings. Your ratings are visible only to you.
                  </div>
                </div>
              </label>
            </fieldset>

            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
                disabled={data.leaderboardVisible === null}
                data-testid="step3-next"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Tracks & Intensity */}
        {step === 4 && (
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>
              Tracks and Intensity
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
              Select the tracks you want to practise and your preferred learning intensity.
            </p>

            <div className="form-group">
              <div className="form-label">Practise Tracks (choose at least one)</div>
              {[
                { id: 'judgment', name: 'Judgment', desc: 'Base rates, calibration, evidence, decision making' },
                { id: 'logic', name: 'Logic', desc: 'Knights & knaves, deduction, invariants, truth values' },
                { id: 'math', name: 'Math', desc: 'Ratios, percent change, sequences, algebra, combinatorics' },
                { id: 'code', name: 'Code', desc: 'Algorithms, implementation, invariants, correctness' },
              ].map((t) => {
                const checked = data.tracks.includes(t.id)
                return (
                  <label
                    key={t.id}
                    className={`choice-card ${checked ? 'is-selected' : ''}`}
                    htmlFor={`track-${t.id}`}
                  >
                    <input
                      id={`track-${t.id}`}
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const newTracks = e.target.checked
                          ? [...data.tracks, t.id]
                          : data.tracks.filter((x) => x !== t.id)
                        setData({ ...data, tracks: newTracks })
                      }}
                    />
                    <div>
                      <div className="choice-title">{t.name}</div>
                      <div className="choice-description">{t.desc}</div>
                    </div>
                  </label>
                )
              })}
            </div>

            <div className="form-group" style={{ marginTop: 'var(--space-6)' }}>
              <fieldset style={{ border: 'none', padding: 0 }}>
                <legend className="form-label" style={{ marginBottom: 'var(--space-2)' }}>
                  Learning Intensity
                </legend>
                {[
                  {
                    id: 'steady',
                    name: 'Steady',
                    desc: '65% target accuracy (more reinforcement, gradual difficulty curve)',
                  },
                  {
                    id: 'balanced',
                    name: 'Balanced',
                    desc: '50% target accuracy (optimal learning rate, standard challenge)',
                  },
                  {
                    id: 'stretch',
                    name: 'Stretch',
                    desc: '35% target accuracy (steep difficulty, high challenge)',
                  },
                ].map((i) => {
                  const checked = data.intensity === i.id
                  return (
                    <label
                      key={i.id}
                      className={`choice-card ${checked ? 'is-selected' : ''}`}
                      htmlFor={`intensity-${i.id}`}
                    >
                      <input
                        id={`intensity-${i.id}`}
                        type="radio"
                        name="intensity"
                        value={i.id}
                        checked={checked}
                        onChange={() => setData({ ...data, intensity: i.id as OnboardingData['intensity'] })}
                      />
                      <div>
                        <div className="choice-title">{i.name}</div>
                        <div className="choice-description">{i.desc}</div>
                      </div>
                    </label>
                  )
                })}
              </fieldset>
            </div>

            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
                disabled={data.tracks.length === 0}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Confidence Tutorial */}
        {step === 5 && (
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>
              Understanding Confidence
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              On every problem in Eleanor, you will state how sure you are that your answer is right.
            </p>
            <div
              style={{
                background: 'var(--accent-soft)',
                borderLeft: '4px solid var(--accent)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 'var(--space-6)',
                fontSize: '0.9375rem',
              }}
            >
              <strong>Key Principle:</strong> Confidence is how likely you believe <em>your answer is correct</em>, <strong>NOT</strong> the probability of the event described in the question.
            </div>

            {/* Example 1 */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-6)',
              }}
            >
              <h2 style={{ fontSize: '1.0625rem', marginBottom: 'var(--space-2)' }}>
                Example 1: Arithmetic Certainty
              </h2>
              <p style={{ fontSize: '0.9375rem', marginBottom: 'var(--space-3)' }}>
                Calculate: <strong>15 × 4</strong>
              </p>
              <form onSubmit={handleCheckTut1}>
                <div className="form-group">
                  <label htmlFor="tut1-answer" className="form-label">
                    Your answer
                  </label>
                  <input
                    id="tut1-answer"
                    type="text"
                    inputMode="decimal"
                    className="form-input"
                    value={tut1Answer}
                    onChange={(e) => setTut1Answer(e.target.value)}
                    placeholder="Enter number"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="tut1-confidence" className="form-label">
                    How likely is it that your answer is correct? (0%–100%)
                  </label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {[50, 70, 80, 90, 99].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`btn btn-sm ${tut1Confidence === val ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setTut1Confidence(val)}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-secondary btn-sm"
                  disabled={!tut1Answer || tut1Confidence === null}
                >
                  Check Example 1
                </button>
              </form>
              {tut1Feedback && (
                <div
                  style={{
                    marginTop: 'var(--space-3)',
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--surface-hover)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                  }}
                  role="status"
                >
                  {tut1Feedback}
                </div>
              )}
            </div>

            {/* Example 2 */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-6)',
              }}
            >
              <h2 style={{ fontSize: '1.0625rem', marginBottom: 'var(--space-2)' }}>
                Example 2: Event Probability vs. Answer Certainty
              </h2>
              <p style={{ fontSize: '0.9375rem', marginBottom: 'var(--space-3)' }}>
                A standard 10-sided die is rolled once. Will the number rolled be 11? Answer <strong>yes</strong> or <strong>no</strong>.
              </p>
              <form onSubmit={handleCheckTut2}>
                <div className="form-group">
                  <label htmlFor="tut2-answer" className="form-label">
                    Your answer
                  </label>
                  <input
                    id="tut2-answer"
                    type="text"
                    className="form-input"
                    value={tut2Answer}
                    onChange={(e) => setTut2Answer(e.target.value)}
                    placeholder="yes or no"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="tut2-confidence" className="form-label">
                    How likely is it that your answer is correct? (0%–100%)
                  </label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {[50, 70, 80, 90, 99].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`btn btn-sm ${tut2Confidence === val ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setTut2Confidence(val)}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-secondary btn-sm"
                  disabled={!tut2Answer || tut2Confidence === null}
                >
                  Check Example 2
                </button>
              </form>
              {tut2Feedback && (
                <div
                  style={{
                    marginTop: 'var(--space-3)',
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--surface-hover)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                  }}
                  role="status"
                >
                  {tut2Feedback}
                </div>
              )}
            </div>

            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={handleNext}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Review & Submit */}
        {step === 6 && (
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>
              Ready to begin
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
              Review your setup before entering the gym:
            </p>

            <div
              style={{
                background: 'var(--surface-hover)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-6)',
              }}
            >
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Handle:</strong> {data.handle}
              </div>
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Leaderboard:</strong> {data.leaderboardVisible ? 'Public' : 'Private'}
              </div>
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Tracks:</strong> {data.tracks.join(', ')}
              </div>
              <div>
                <strong>Intensity:</strong> {data.intensity}
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleBack}
                disabled={pending}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => submitOnboarding(data)}
                disabled={pending}
                data-testid="submit-onboarding"
              >
                {pending ? 'Setting up...' : 'Start Practising'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
