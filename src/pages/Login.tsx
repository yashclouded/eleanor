import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark, Icon } from '../components/Icon.tsx'
import { TrackArt } from '../components/TrackArt.tsx'
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
    <div className="login-layout">
      <aside className="login-story" aria-label="The Eleanor practice"><span className="eyebrow">A LITTLE FURTHER, EVERY DAY</span><h2>Good things<br />take a little<br />thinking.</h2><TrackArt track="judgment" /><p>A daily practice in judgment, logic, math, and code. Your own thinking comes first.</p></aside>
      <div className="login-form">
        {sent ? (
          <div data-testid="check-email-state" role="status">
            <div className="email-sent-icon"><Icon name="mail" /></div>
            <h1>Check your email</h1>
            <p className="login-description">We sent a sign-in link to <strong>{email}</strong>. Click the link in your email to sign in to Eleanor.</p>
            <button type="button" className="btn btn-secondary" onClick={() => { setSent(false); setEmail('') }}>Use a different email</button>
          </div>
        ) : (
          <>
            <BrandMark /><h1>Make space to think.</h1>
            <p className="login-description">Welcome to Eleanor. Enter your email to sign in or begin your practice. No password to remember.</p>
            {error && <div className="alert alert-error" role="alert" id="login-error">{error}</div>}
            <form onSubmit={handleSubmit} noValidate aria-label="Sign in to Eleanor">
              <div className="form-group"><label htmlFor="email" className="form-label">Email address</label><input id="email" name="email" type="email" autoComplete="email" required className={`form-input ${error ? 'is-error' : ''}`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" disabled={loading} aria-invalid={!!error} aria-describedby={error ? 'login-error' : undefined} /></div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading || !email}>{loading ? 'Sending link...' : 'Send magic link'}<Icon name="arrow" /></button>
            </form>
            {isGoogleEnabled && <div className="google-sign-in"><span>or</span><button type="button" className="btn btn-secondary btn-full" onClick={handleGoogleSignIn}>Continue with Google</button></div>}
            <p className="login-privacy"><Icon name="check" />Private by choice. Always your own thinking.</p>
          </>
        )}
        <Link to="/" className="text-link login-back">Back to Eleanor</Link>
      </div>
    </div>
  )
}
