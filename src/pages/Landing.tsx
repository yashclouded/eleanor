import { Link } from 'react-router-dom'

export function Landing() {
  return (
    <div className="container-problem" style={{ textAlign: 'center', marginTop: 'var(--space-12)' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
        Calibrated Thinking Gym
      </h1>
      <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-8)' }}>
        Four tracks. Honest metrics. No AI in the product.
      </p>
      <div>
        <Link to="/login" className="btn btn-primary" style={{ padding: 'var(--space-3) var(--space-6)' }}>
          Start Practising
        </Link>
      </div>
    </div>
  )
}
