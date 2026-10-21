import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.tsx'
import { TitleBadge } from '../components/TitleBadge.tsx'
import { api } from '../lib/api.ts'

export function Today() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [startingTrack, setStartingTrack] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleStartSet = async (track: 'judgment' | 'logic' | 'math' | 'code') => {
    setStartingTrack(track)
    setError(null)
    try {
      const res = await api<{ set: { id: string } }>('/sets', {
        method: 'POST',
        body: {
          transitionId: crypto.randomUUID(),
          track,
          mode: 'rated',
        },
      })
      navigate(`/train/${res.set.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to start ${track} set`
      setError(msg)
      setStartingTrack(null)
    }
  }

  return (
    <div className="container-dashboard">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-1)' }}>
            Welcome back, {profile?.handle ?? 'Learner'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Your daily training session and due echoes.
          </p>
        </div>
        <TitleBadge title="Novice" />
      </div>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      <div className="form-card" data-testid="today-container">
        <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-3)' }}>Today's Training</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
          Select a track to start a training set or review echoes.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleStartSet('judgment')}
            disabled={startingTrack !== null}
          >
            {startingTrack === 'judgment' ? 'Starting...' : 'Start Judgment set'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleStartSet('logic')}
            disabled={startingTrack !== null}
          >
            {startingTrack === 'logic' ? 'Starting...' : 'Start Logic set'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleStartSet('math')}
            disabled={startingTrack !== null}
          >
            {startingTrack === 'math' ? 'Starting...' : 'Start Math set'}
          </button>
        </div>
      </div>
    </div>
  )
}
