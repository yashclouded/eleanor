import { useParams } from 'react-router-dom'

export function Leaderboard() {
  const { track } = useParams<{ track?: string }>()
  return (
    <div className="container-dashboard">
      <div className="form-card">
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>
          {track ? `${track.toUpperCase()} Leaderboard` : 'Overall Leaderboard'}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Top calibrated thinkers.</p>
      </div>
    </div>
  )
}
