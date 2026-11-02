import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.tsx'
import { supabase } from '../lib/supabase.ts'
import { api, ApiError } from '../lib/api.ts'

export function Settings() {
  const { session, profile, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()

  // Form states for direct RLS profile preferences
  const [intensity, setIntensity] = useState<'steady' | 'balanced' | 'stretch'>('balanced')
  const [setSize, setSetSize] = useState<number>(5)
  const [ratingReveal, setRatingReveal] = useState<'each' | 'end_of_set'>('end_of_set')
  const [leaderboardVisible, setLeaderboardVisible] = useState<boolean>(true)
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')
  const [reducedMotion, setReducedMotion] = useState<boolean>(false)
  const [weeklyGoal, setWeeklyGoal] = useState<number>(3)
  const [tracks, setTracks] = useState<string[]>(['judgment', 'logic'])

  // Status feedback
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsSuccess, setPrefsSuccess] = useState<string | null>(null)
  const [prefsError, setPrefsError] = useState<string | null>(null)

  // Handle change state
  const [newHandle, setNewHandle] = useState('')
  const [savingHandle, setSavingHandle] = useState(false)
  const [handleSuccess, setHandleSuccess] = useState<string | null>(null)
  const [handleError, setHandleError] = useState<string | null>(null)

  // Export state
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // Delete account state
  const [confirmHandle, setConfirmHandle] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Initialize from existing profile
  useEffect(() => {
    if (profile) {
      if (profile.intensity) setIntensity(profile.intensity)
      if (profile.set_size) setSetSize(profile.set_size)
      if (profile.rating_reveal) setRatingReveal(profile.rating_reveal)
      if (profile.leaderboard_visible !== undefined) setLeaderboardVisible(profile.leaderboard_visible)
      if (profile.theme) setTheme(profile.theme)
      if (profile.reduced_motion !== undefined) setReducedMotion(profile.reduced_motion)
      if (profile.weekly_goal) setWeeklyGoal(profile.weekly_goal)
      if (profile.tracks && profile.tracks.length > 0) setTracks(profile.tracks)
      setNewHandle(profile.handle)
    }
  }, [profile])

  const handleTrackToggle = (trackId: string) => {
    if (tracks.includes(trackId)) {
      if (tracks.length === 1) return // Keep at least one track
      setTracks(tracks.filter((t) => t !== trackId))
    } else {
      setTracks([...tracks, trackId])
    }
  }

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSavingPrefs(true)
    setPrefsSuccess(null)
    setPrefsError(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          intensity,
          set_size: setSize,
          rating_reveal: ratingReveal,
          leaderboard_visible: leaderboardVisible,
          theme,
          reduced_motion: reducedMotion,
          weekly_goal: weeklyGoal,
          tracks,
        })
        .eq('id', profile.id)

      if (error) {
        throw error
      }

      await refreshProfile()
      setPrefsSuccess('Settings saved successfully.')

      // Apply root attributes
      if (theme) {
        document.documentElement.setAttribute('data-theme', theme)
      }
      if (reducedMotion) {
        document.documentElement.setAttribute('data-reduced-motion', 'true')
      } else {
        document.documentElement.removeAttribute('data-reduced-motion')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings.'
      setPrefsError(msg)
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleUpdateHandle = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newHandle.trim()
    if (!trimmed || trimmed === profile?.handle) return

    setSavingHandle(true)
    setHandleSuccess(null)
    setHandleError(null)

    try {
      await api('/handle', {
        method: 'POST',
        body: { handle: trimmed },
      })
      await refreshProfile()
      setHandleSuccess(`Handle changed to @${trimmed}`)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setHandleError(err.message)
      } else {
        setHandleError('Failed to change handle.')
      }
    } finally {
      setSavingHandle(false)
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    setExportError(null)

    try {
      const url = import.meta.env.VITE_SUPABASE_URL
      const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

      const res = await fetch(`${url.replace(/\/+$/, '')}/functions/v1/api/export`, {
        method: 'GET',
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${session?.access_token ?? publishableKey}`,
        },
      })

      if (!res.ok) {
        throw new Error(`Export failed with HTTP ${res.status}`)
      }

      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl

      const disposition = res.headers.get('Content-Disposition')
      let filename = `eleanor-export-${profile?.handle ?? 'data'}.json`
      if (disposition && disposition.includes('filename=')) {
        const m = disposition.match(/filename="?([^"]+)"?/)
        if (m?.[1]) filename = m[1]
      }

      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export data'
      setExportError(msg)
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setDeleteError(null)

    if (confirmHandle.trim() !== profile.handle) {
      setDeleteError(`Handle does not match. Please enter "${profile.handle}" to confirm.`)
      return
    }

    setDeleting(true)

    try {
      await api('/account/delete', {
        method: 'POST',
        body: { confirmHandle: confirmHandle.trim() },
      })

      await signOut()
      navigate('/login')
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setDeleteError(err.message)
      } else {
        setDeleteError('Failed to delete account.')
      }
      setDeleting(false)
    }
  }

  if (!profile) {
    return (
      <div className="container-problem" style={{ padding: 'var(--space-8) 0' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading preferences...</p>
      </div>
    )
  }

  return (
    <div className="container-problem" style={{ paddingBottom: 'var(--space-12)' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Manage your practice flow, presentation, privacy, and account data.
        </p>
      </header>

      {/* Main preferences form (Direct RLS updates on profiles) */}
      <form onSubmit={handleSavePreferences} style={{ marginBottom: 'var(--space-8)' }}>
        {/* Practice Preferences */}
        <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            Practice Preferences
          </h2>

          {/* Intensity */}
          <fieldset style={{ border: 'none', padding: 0, margin: '0 0 var(--space-6) 0' }}>
            <legend style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 'var(--space-2)', color: 'var(--text)' }}>
              Target Intensity
            </legend>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
              Controls the target success rate used by the adaptive item selection model.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 'var(--space-3)' }}>
              <label className={`choice-card ${intensity === 'steady' ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="intensity"
                  value="steady"
                  checked={intensity === 'steady'}
                  onChange={() => setIntensity('steady')}
                />
                <div>
                  <div className="choice-title">Steady (80%)</div>
                  <div className="choice-description">Consolidate mastery with high success rate.</div>
                </div>
              </label>

              <label className={`choice-card ${intensity === 'balanced' ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="intensity"
                  value="balanced"
                  checked={intensity === 'balanced'}
                  onChange={() => setIntensity('balanced')}
                />
                <div>
                  <div className="choice-title">Balanced (70%)</div>
                  <div className="choice-description">Optimal challenge and learning efficiency.</div>
                </div>
              </label>

              <label className={`choice-card ${intensity === 'stretch' ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="intensity"
                  value="stretch"
                  checked={intensity === 'stretch'}
                  onChange={() => setIntensity('stretch')}
                />
                <div>
                  <div className="choice-title">Stretch (55%)</div>
                  <div className="choice-description">Push boundaries against harder problems.</div>
                </div>
              </label>
            </div>
          </fieldset>

          {/* Set Size */}
          <fieldset style={{ border: 'none', padding: 0, margin: '0 0 var(--space-6) 0' }}>
            <legend style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 'var(--space-2)', color: 'var(--text)' }}>
              Set Size
            </legend>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
              Number of problems per practice set.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              {[3, 5, 8].map((size) => (
                <label key={size} className={`choice-card ${setSize === size ? 'is-selected' : ''}`} style={{ flex: 1 }}>
                  <input
                    type="radio"
                    name="set_size"
                    value={size}
                    checked={setSize === size}
                    onChange={() => setSetSize(size)}
                  />
                  <div>
                    <div className="choice-title">{size} problems</div>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Rating Change Timing */}
          <fieldset style={{ border: 'none', padding: 0, margin: '0 0 var(--space-6) 0' }}>
            <legend style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 'var(--space-2)', color: 'var(--text)' }}>
              Rating Reveal Timing
            </legend>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
              Decide when rating updates are presented during a set.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 'var(--space-3)' }}>
              <label className={`choice-card ${ratingReveal === 'end_of_set' ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="rating_reveal"
                  value="end_of_set"
                  checked={ratingReveal === 'end_of_set'}
                  onChange={() => setRatingReveal('end_of_set')}
                />
                <div>
                  <div className="choice-title">End of set (Recommended)</div>
                  <div className="choice-description">Keeps your focus on the reasoning during the set.</div>
                </div>
              </label>

              <label className={`choice-card ${ratingReveal === 'each' ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="rating_reveal"
                  value="each"
                  checked={ratingReveal === 'each'}
                  onChange={() => setRatingReveal('each')}
                />
                <div>
                  <div className="choice-title">After each problem</div>
                  <div className="choice-description">Immediate feedback on every problem commit.</div>
                </div>
              </label>
            </div>
          </fieldset>

          {/* Weekly Goal */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <label
              htmlFor="weekly-goal-input"
              style={{ display: 'block', fontWeight: 600, fontSize: '0.9375rem', marginBottom: 'var(--space-2)', color: 'var(--text)' }}
            >
              Weekly Goal: Train on {weeklyGoal} {weeklyGoal === 1 ? 'day' : 'days'} per week
            </label>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
              Eleanor uses spacing without streak guilt or infinite feeds. Choose a sustainable weekly target.
            </p>
            <input
              id="weekly-goal-input"
              type="range"
              min="1"
              max="7"
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoal(parseInt(e.target.value, 10))}
              style={{ width: '100%', maxWidth: '320px' }}
            />
          </div>

          {/* Active Tracks */}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 'var(--space-2)', color: 'var(--text)' }}>
              Active Tracks
            </legend>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
              Select which thinking arenas appear on your Today dashboard.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 'var(--space-3)' }}>
              {[
                { id: 'judgment', name: 'Judgment', desc: 'Probability & decisions' },
                { id: 'logic', name: 'Logic', desc: 'Deduction & structure' },
                { id: 'math', name: 'Math', desc: 'Quantitative rigor' },
                { id: 'code', name: 'Code', desc: 'Algorithmic programming' },
              ].map((trk) => (
                <label key={trk.id} className={`choice-card ${tracks.includes(trk.id) ? 'is-selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={tracks.includes(trk.id)}
                    onChange={() => handleTrackToggle(trk.id)}
                  />
                  <div>
                    <div className="choice-title">{trk.name}</div>
                    <div className="choice-description">{trk.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Display & Accessibility */}
        <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            Display & Accessibility
          </h2>

          {/* Theme */}
          <fieldset style={{ border: 'none', padding: 0, margin: '0 0 var(--space-6) 0' }}>
            <legend style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 'var(--space-2)', color: 'var(--text)' }}>
              Theme
            </legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              {(['system', 'light', 'dark'] as const).map((t) => (
                <label key={t} className={`choice-card ${theme === t ? 'is-selected' : ''}`} style={{ flex: 1 }}>
                  <input
                    type="radio"
                    name="theme"
                    value={t}
                    checked={theme === t}
                    onChange={() => setTheme(t)}
                  />
                  <div>
                    <div className="choice-title" style={{ textTransform: 'capitalize' }}>{t}</div>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Reduced Motion */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <label className={`choice-card ${reducedMotion ? 'is-selected' : ''}`}>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
              />
              <div>
                <div className="choice-title">Reduced Motion</div>
                <div className="choice-description">Disable UI animations and smooth transitions across the app.</div>
              </div>
            </label>
          </div>

          {/* Leaderboard Visibility */}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 'var(--space-2)', color: 'var(--text)' }}>
              Leaderboard Visibility
            </legend>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
              Control whether your handle and ratings appear on public leaderboard rankings.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 'var(--space-3)' }}>
              <label className={`choice-card ${leaderboardVisible ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="leaderboard_visible"
                  value="true"
                  checked={leaderboardVisible}
                  onChange={() => setLeaderboardVisible(true)}
                />
                <div>
                  <div className="choice-title">Public on leaderboards</div>
                  <div className="choice-description">Your rank and rating are visible to other learners.</div>
                </div>
              </label>

              <label className={`choice-card ${!leaderboardVisible ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="leaderboard_visible"
                  value="false"
                  checked={!leaderboardVisible}
                  onChange={() => setLeaderboardVisible(false)}
                />
                <div>
                  <div className="choice-title">Hidden from leaderboards</div>
                  <div className="choice-description">Your profile remains private and excluded from rankings.</div>
                </div>
              </label>
            </div>
          </fieldset>
        </div>

        {/* Save button and status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={savingPrefs}
          >
            {savingPrefs ? 'Saving...' : 'Save preferences'}
          </button>
          {prefsSuccess && (
            <span style={{ color: 'var(--success)', fontSize: '0.875rem', fontWeight: 600 }} role="status">
              ✓ {prefsSuccess}
            </span>
          )}
          {prefsError && (
            <span style={{ color: 'var(--error)', fontSize: '0.875rem' }} role="alert">
              ✕ {prefsError}
            </span>
          )}
        </div>
      </form>

      {/* Handle Change Section */}
      <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          Change Handle
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
          Your handle is your unique identifier. Handles can be changed at most once every 30 days.
        </p>
        <form onSubmit={handleUpdateHandle} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, maxWidth: '100%' }}>
            <label htmlFor="settings-handle" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
              New handle
            </label>
            <input
              id="settings-handle"
              type="text"
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value)}
              className="form-input"
              style={{ width: '240px' }}
              minLength={3}
              maxLength={24}
              pattern="^[a-zA-Z0-9_]+$"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-secondary"
            style={{ marginTop: '22px' }}
            disabled={savingHandle || newHandle.trim() === profile.handle}
          >
            {savingHandle ? 'Updating...' : 'Update handle'}
          </button>
        </form>
        {handleSuccess && (
          <p style={{ color: 'var(--success)', fontSize: '0.875rem', fontWeight: 600, marginTop: 'var(--space-2)' }} role="status">
            ✓ {handleSuccess}
          </p>
        )}
        {handleError && (
          <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: 'var(--space-2)' }} role="alert">
            ✕ {handleError}
          </p>
        )}
      </div>

      {/* Export Data Section */}
      <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          Data Portability & Export
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
          Download a complete, machine-readable JSON archive of your personal learning history, including profile preferences, track and concept ratings, rating event curves, sets, attempt logs, playbook notes, and code submissions.
        </p>
        <button
          type="button"
          data-testid="export-btn"
          className="btn btn-secondary"
          onClick={handleExportData}
          disabled={exporting}
        >
          {exporting ? 'Preparing export...' : 'Export my data'}
        </button>
        {exportError && (
          <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: 'var(--space-2)' }} role="alert">
            ✕ {exportError}
          </p>
        )}
      </div>

      {/* Danger Zone: Delete Account */}
      <div
        data-testid="delete-account-section"
        className="card"
        style={{
          padding: 'var(--space-6)',
          border: '1px solid var(--error-border)',
          background: 'var(--surface)',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--error)', marginBottom: 'var(--space-2)' }}>
          Delete Account
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
          Permanently delete your profile and all personal rows (cascade) and your auth account.
        </p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 'var(--space-4)' }}>
          Disclosure: Item ratings keep their aggregate statistical updates to maintain model stability; no personal identifiers are retained.
        </p>

        <form onSubmit={handleDeleteAccount} style={{ maxWidth: '420px' }}>
          <label
            htmlFor="delete-confirm-handle"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--text)' }}
          >
            To confirm deletion, type your handle (<strong>{profile.handle}</strong>) below:
          </label>
          <input
            id="delete-confirm-handle"
            data-testid="delete-handle-confirm"
            type="text"
            className="form-input"
            value={confirmHandle}
            onChange={(e) => setConfirmHandle(e.target.value)}
            placeholder={profile.handle}
            style={{ marginBottom: 'var(--space-3)' }}
            required
          />

          {deleteError && (
            <div
              data-testid="delete-account-error"
              style={{
                color: 'var(--error)',
                background: 'var(--error-bg)',
                border: '1px solid var(--error-border)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                marginBottom: 'var(--space-3)',
              }}
              role="alert"
            >
              {deleteError}
            </div>
          )}

          <button
            type="submit"
            data-testid="delete-account-btn"
            className="btn btn-secondary"
            style={{
              borderColor: 'var(--error)',
              color: 'var(--error)',
            }}
            disabled={deleting}
          >
            {deleting ? 'Deleting account...' : 'Delete account'}
          </button>
        </form>
      </div>
    </div>
  )
}
