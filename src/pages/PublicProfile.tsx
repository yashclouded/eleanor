import { useParams } from 'react-router-dom'

export function PublicProfile() {
  const { handle } = useParams<{ handle: string }>()
  return (
    <div className="container-dashboard">
      <div className="form-card">
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>Profile: @{handle}</h1>
        <p style={{ color: 'var(--text-muted)' }}>Public statistics and rating summary.</p>
      </div>
    </div>
  )
}
