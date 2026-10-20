import { useAuth } from '../lib/auth.tsx'
import { TitleBadge } from '../components/TitleBadge.tsx'

export function Today() {
  const { profile } = useAuth()

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

      <div className="form-card" data-testid="today-container">
        <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-3)' }}>Today's Training</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Select a track to start a training set or review echoes.
        </p>
      </div>
    </div>
  )
}
