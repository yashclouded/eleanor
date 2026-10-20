import React, { useState } from 'react'
import { supabase } from '../lib/supabase.ts'

export function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isGoogleEnabled = import.meta.env.VITE_GOOGLE_ENABLED === '1'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const redirectTo = `${window.location.origin}/today`
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      })

      if (otpError) {
        setError(otpError.message)
      } else {
        setSent(true)
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/today`,
        },
      })
      if (oauthError) {
        setError(oauthError.message)
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to initiate Google sign in')
    }
  }

  return (
    <div className="container-problem" style={{ marginTop: 'var(--space-8)' }}>
      <div className="form-card">
        {sent ? (
          <div data-testid="check-email-state">
            <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>
              Check your email
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
              We sent a sign-in link to <strong>{email}</strong>. Click the link in your email to sign in to Eleanor.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSent(false)
                setEmail('')
              }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>
              Sign in to Eleanor
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
              Enter your email to receive a passwordless sign-in link.
            </p>

            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`form-input ${error ? 'is-error' : ''}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading || !email}
              >
                {loading ? 'Sending link...' : 'Send magic link'}
              </button>
            </form>

            {isGoogleEnabled && (
              <div style={{ marginTop: 'var(--space-6)' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: 'var(--space-4) 0',
                    color: 'var(--text-muted)',
                    fontSize: '0.875rem',
                  }}
                >
                  <hr style={{ flex: 1, borderColor: 'var(--border)' }} />
                  <span style={{ padding: '0 var(--space-3)' }}>or</span>
                  <hr style={{ flex: 1, borderColor: 'var(--border)' }} />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={handleGoogleSignIn}
                >
                  Continue with Google
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
