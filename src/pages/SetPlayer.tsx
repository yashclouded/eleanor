import { useParams } from 'react-router-dom'

export function SetPlayer() {
  const { setId } = useParams<{ setId: string }>()
  return (
    <div className="container-problem">
      <div className="form-card">
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>Training Set</h1>
        <p style={{ color: 'var(--text-muted)' }}>Set ID: {setId}</p>
      </div>
    </div>
  )
}
