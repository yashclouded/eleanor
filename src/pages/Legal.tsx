import { useState } from 'react'
import { Link } from 'react-router-dom'

export function LegalDraftBanner() {
  return (
    <div
      data-testid="legal-draft-banner"
      style={{
        background: 'var(--title-legend-bg, #fef3c7)',
        color: 'var(--title-legend-text, #92400e)',
        border: '1px solid #f59e0b',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        marginBottom: 'var(--space-6)',
        fontWeight: 600,
        fontSize: '0.875rem',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
      }}
      role="alert"
    >
      <span>⚠️</span>
      <span>Draft, needs review by the owner before launch</span>
    </div>
  )
}

export function TermsContent() {
  return (
    <article className="legal-article" style={{ lineHeight: 1.6, fontSize: '0.9375rem', color: 'var(--text)' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
        Terms of Service
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 'var(--space-6)' }}>
        Effective date: October 2026 · Draft revision
      </p>

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          1. Age Requirement and Eligibility
        </h2>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          Eleanor is intended strictly for ambitious learners aged <strong>16 and older</strong>: students, graduates, and working professionals who seek deliberate, unassisted cognitive practice.
        </p>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          Individuals under 16 years of age may not create an account or use the service. If we learn or receive a report that an account belongs to someone under 16, that account and all associated personal data will be deleted immediately.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          2. The Honour Code and AI Ban
        </h2>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          Eleanor exists to cultivate your own independent thinking. When solving rated problems, you agree to rely solely on your own cognition, without:
        </p>
        <ul style={{ paddingLeft: 'var(--space-5)', marginBottom: 'var(--space-3)' }}>
          <li>Large language models or AI assistance (ChatGPT, Claude, Gemini, Copilot, etc.);</li>
          <li>Search engines or external reference materials during an active rated problem;</li>
          <li>Collaboration or consulting solutions from others.</li>
        </ul>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          If you use outside assistance for any reason, you must toggle <em>"I used outside help"</em> prior to committing. Doing so marks the attempt as unrated and preserves the statistical integrity of the rating system.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          3. Claims and Warranty Disclaimer
        </h2>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          Eleanor trains and measures named skills on its own problems. Eleanor makes no claim to raise general intelligence (IQ), prevent cognitive decline, or enhance transfer beyond the specific reasoning domains exercised.
        </p>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          Ratings measure performance relative to Eleanor's problem bank and other learners. Ratings are not measures of personal worth, general intelligence, or aptitude.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          4. Leaderboards, Public Profiles, and Integrity
        </h2>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          You may choose whether your handle and ratings appear on public leaderboards. By default or upon selection, your public profile displays your handle, title, ratings, rating chart, calibration badge, and proven concepts count.
        </p>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          We never track keystrokes, clipboard paste events, tab switches, or speed. Leaderboard integrity is audited solely through statistical outcome analysis. Accounts confirmed to engage in cheating or sockpuppetry will have their ratings wiped or accounts banned.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          5. Account Deletion and Termination
        </h2>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          You may terminate your account at any time from your Settings page. Deleting your account immediately removes your personal profile, auth credentials, attempt logs, and playbook entries. Aggregate item difficulty statistics are retained in anonymised form.
        </p>
      </section>
    </article>
  )
}

export function PrivacyContent() {
  return (
    <article className="legal-article" style={{ lineHeight: 1.6, fontSize: '0.9375rem', color: 'var(--text)' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
        Privacy Policy
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 'var(--space-6)' }}>
        Effective date: October 2026 · Draft revision
      </p>

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          1. Private by Default
        </h2>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          Your learning journey is private by default. Your problem attempts, raw answers, stated confidence, intermediate repair steps, personal Playbook notes, and code submissions are protected by database row-level security and are visible only to you.
        </p>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          Admins may access submissions only in response to integrity or moderation reports, and every admin moderation access is cryptographically audited and logged.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          2. No Third-Party Analytics or Trackers
        </h2>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          Eleanor deliberately excludes all third-party tracking scripts, analytics SDKs (such as Google Analytics or Segment), advertising cookies, and session replay recorders (such as FullStory or Hotjar).
        </p>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          Product metrics and learner model health calculations are derived exclusively from Eleanor's own database.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          3. Right to Data Export (GDPR / CCPA)
        </h2>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          You retain complete ownership of your cognitive data. At any time, you can visit Settings and click <strong>Export my data</strong> to receive a complete, portable JSON document containing your profile, ratings history, attempts, echoes, and playbook notes.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          4. Right to Deletion (Right to Be Forgotten)
        </h2>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          You have the right to permanently delete your account at any time. When requested with your handle confirmation, your auth record, user profile, attempts, rating events, and playbook notes are permanently deleted from our database.
        </p>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          <em>Disclosure:</em> Problem difficulties (item ratings) keep their aggregate statistical calibration updates to maintain model stability for remaining learners; these updates contain no personal identifiers.
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          5. Under-16 Policy
        </h2>
        <p style={{ marginBottom: 'var(--space-3)' }}>
          We do not knowingly collect personal data from anyone under the age of 16. If we become aware that an account belongs to a user under 16, we will promptly delete all data associated with that account.
        </p>
      </section>
    </article>
  )
}

export function Legal() {
  const [tab, setTab] = useState<'terms' | 'privacy'>('terms')

  return (
    <div className="container-problem" style={{ paddingBottom: 'var(--space-12)' }}>
      <LegalDraftBanner />

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        <button
          type="button"
          className={`btn ${tab === 'terms' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setTab('terms')}
        >
          Terms of Service
        </button>
        <button
          type="button"
          className={`btn ${tab === 'privacy' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setTab('privacy')}
        >
          Privacy Policy
        </button>
      </div>

      <div className="card" style={{ padding: 'var(--space-6)' }}>
        {tab === 'terms' ? <TermsContent /> : <PrivacyContent />}
      </div>
    </div>
  )
}

export function Terms() {
  return (
    <div className="container-problem" style={{ paddingBottom: 'var(--space-12)' }}>
      <LegalDraftBanner />
      <div className="card" style={{ padding: 'var(--space-6)' }}>
        <TermsContent />
        <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
          <Link to="/privacy" className="btn btn-secondary btn-sm">
            View Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  )
}

export function Privacy() {
  return (
    <div className="container-problem" style={{ paddingBottom: 'var(--space-12)' }}>
      <LegalDraftBanner />
      <div className="card" style={{ padding: 'var(--space-6)' }}>
        <PrivacyContent />
        <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
          <Link to="/terms" className="btn btn-secondary btn-sm">
            View Terms of Service
          </Link>
        </div>
      </div>
    </div>
  )
}
