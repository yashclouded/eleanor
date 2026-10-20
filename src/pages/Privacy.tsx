export function Privacy() {
  return (
    <div className="container-problem">
      <div className="form-card">
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-4)' }}>Privacy Policy</h1>
        <p style={{ marginBottom: 'var(--space-3)', color: 'var(--text-muted)' }}>
          Your learning attempts, answers, confidence scores, playbook notes, and code submissions are private by default.
        </p>
        <p style={{ marginBottom: 'var(--space-3)', color: 'var(--text-muted)' }}>
          Eleanor contains no third-party tracking scripts, analytics libraries, session recorders, or advertising cookies.
        </p>
        <p style={{ color: 'var(--text-muted)' }}>
          You have the right to export your full data anytime in standard JSON format or delete your account completely.
        </p>
      </div>
    </div>
  )
}
