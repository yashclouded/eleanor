import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'
import { ReliabilityChart, type ReliabilityBin } from '../components/ReliabilityChart.tsx'
import { RatingChart } from '../components/RatingChart.tsx'

interface Health {
  n: number
  brier: number | null
  logLoss: number | null
  calError: number | null
  overconfidence: number | null
  bins: ReliabilityBin[]
  perTrack: { track: string; n: number }[]
  learnerDrift: { week: string; track: string; meanRating: number; n: number }[]
  anchorDrift: { week: string; track: string; residual: number; n: number }[]
}
interface Item { id: string; track: string; n: number; residual: number; status: string; anchor: boolean }
interface Flag {
  id: string; userId: string; handle: string; track: string | null; kind: string
  detail: Record<string, number | string>; createdAt: string; resolvedAt: string | null; resolution: string | null
}
interface Report { id: string; userId: string; handle: string; reporterHandle: string | null; reason: string; resolvedAt: string | null }

const number = (value: number | null) => value === null ? 'No data' : value.toFixed(4)

export function Admin() {
  const { user } = useAuth()
  const isAdmin = user?.app_metadata.role === 'admin'
  const [health, setHealth] = useState<Health | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [flags, setFlags] = useState<Flag[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [reason, setReason] = useState('')
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('ban')
  const [from, setFrom] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const [model, itemData, flagData, reportData] = await Promise.all([
      api<Health>('/admin/model-health?days=30'), api<{ items: Item[] }>('/admin/items'),
      api<{ flags: Flag[] }>('/admin/flags'), api<{ reports: Report[] }>('/admin/reports'),
    ])
    setHealth(model)
    setItems(itemData.items)
    setFlags(flagData.flags)
    setReports(reportData.reports)
  }, [])

  useEffect(() => {
    if (isAdmin) load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to load admin data'))
  }, [isAdmin, load])

  async function moderate(path: string, extra: Record<string, unknown> = {}) {
    if (pending || reason.trim().length < 5) return
    setPending(true)
    setError('')
    setMessage('')
    try {
      const result = await api<{ replayRequired?: boolean }>(path, { body: { reason, ...extra } })
      await load()
      setMessage(result.replayRequired
        ? 'Attempts unrated. A rating replay is required; review the dry run before applying it.'
        : 'Action recorded. Leaderboard changes appear on its next refresh.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setPending(false)
    }
  }

  if (!isAdmin) return <div className="container-dashboard"><h1>Admin</h1><p role="alert">Administrator access required. Sign in again after a role change.</p></div>

  const disabled = pending || reason.trim().length < 5
  const flaggedItems = items.filter((item) => item.n >= 50 && Math.abs(item.residual) > 0.15)
  return (
    <div className="container-dashboard" style={{ display: 'grid', gap: 'var(--space-6)', minWidth: 0 }}>
      <header><h1>Admin</h1><p>Model health and outcome-based review. Flags require human review and never impose a penalty.</p></header>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {!health && !error && <p role="status">Loading model health…</p>}
      {health && <>
        <section className="form-card" aria-labelledby="model-health-title">
          <h2 id="model-health-title">Model health · last 30 days</h2>
          <dl className="stats-grid">
            {[
              ['Brier score', number(health.brier)], ['Log loss', number(health.logLoss)],
              ['Calibration error', number(health.calError)], ['Overconfidence gap', number(health.overconfidence)], ['N', health.n],
            ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          <p>{health.perTrack.map((track) => `${track.track}: ${track.n}`).join(' · ')}</p>
          <ReliabilityChart learnerBins={[]} modelBins={health.bins} initialShowTable />
          <h3>Established learner rating drift</h3>
          <p>Weekly mean rating for learners with more than 100 rated responses.</p>
          {health.perTrack.map(({ track }) => <RatingChart key={track} track={track} events={health.learnerDrift.filter((row) => row.track === track).map((row) => ({ createdAt: row.week, rAfter: row.meanRating, rdAfter: 0 }))} />)}
          <div style={{ overflowX: 'auto' }}>
            <table className="top-answers-table">
              <caption>Weekly anchor residuals: observed score minus forecast</caption>
              <thead><tr><th scope="col">Week (UTC)</th><th scope="col">Track</th><th scope="col">Residual</th><th scope="col">N</th></tr></thead>
              <tbody>{health.anchorDrift.map((row) => <tr key={`${row.week}-${row.track}`}><td>{row.week}</td><td>{row.track}</td><td>{number(row.residual)}</td><td>{row.n}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </>}
      <section className="form-card" aria-labelledby="moderation-title">
        <h2 id="moderation-title">Moderation</h2>
        <label htmlFor="admin-reason">Reason for the next action (5–1000 characters)</label>
        <textarea id="admin-reason" value={reason} minLength={5} maxLength={1000} required onChange={(event) => setReason(event.target.value)} style={{ width: '100%' }} />
        <p>Review the evidence before acting. Every action records your identity and this reason.</p>
        <h3>Flagged items</h3>
        {flaggedItems.length === 0 && <p>No items meet the review threshold.</p>}
        <div style={{ overflowX: 'auto' }}><table className="top-answers-table">
          <caption>Items with at least 50 responses and absolute residual above 0.15</caption>
          <thead><tr><th scope="col">Item</th><th scope="col">N</th><th scope="col">Residual</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
          <tbody>{flaggedItems.map((item) => <tr key={item.id}>
            <td>{item.id}</td><td>{item.n}</td><td>{number(item.residual)}</td><td>{item.status}</td>
            <td><button className="btn btn-secondary btn-sm" disabled={disabled || item.status === 'retired'} onClick={() => moderate(`/admin/items/${encodeURIComponent(item.id)}/retire`)}>Retire {item.id}</button></td>
          </tr>)}</tbody>
        </table></div>
        <h3>Anchor candidates</h3>
        <p>Only published items with at least 200 calibrated item responses are eligible. Check stability before freezing an item.</p>
        <ul>{items.filter((item) => item.status === 'published' && !item.anchor && item.n >= 200).map((item) => <li key={item.id}>{item.id} · residual {number(item.residual)} · N {item.n}{' '}<button className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => moderate(`/admin/items/${encodeURIComponent(item.id)}/anchor`)}>Anchor {item.id}</button></li>)}</ul>
        <h3>Integrity review queue</h3>
        <ul>{flags.filter((flag) => !flag.resolvedAt).map((flag) => <li key={flag.id}>
          <p>@{flag.handle} · {flag.track} · {flag.kind}</p>
          <p>{Object.entries(flag.detail).map(([key, value]) => `${key}: ${value}`).join(' · ')}</p>
          <button className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => moderate(`/admin/flags/${flag.id}/resolve`)}>Resolve flag for @{flag.handle}</button>{' '}
          <button className="btn btn-secondary btn-sm" onClick={() => setUserId(flag.userId)}>Select @{flag.handle} for review</button>
        </li>)}</ul>
        <h3>Reports queue</h3>
        <ul>{reports.filter((report) => !report.resolvedAt).map((report) => <li key={report.id}><p>@{report.handle} · reported by {report.reporterHandle ? `@${report.reporterHandle}` : 'deleted account'}: {report.reason}</p><button className="btn btn-secondary btn-sm" onClick={() => setUserId(report.userId)}>Select @{report.handle} for review</button></li>)}</ul>
        <form onSubmit={(event) => {
          event.preventDefault()
          moderate(`/admin/users/${encodeURIComponent(userId)}/action`, { action, ...(action === 'unrate' && from ? { from } : {}) })
        }}>
          <h3>User action</h3>
          <label htmlFor="admin-user">User ID</label>
          <input id="admin-user" value={userId} required onChange={(event) => setUserId(event.target.value)} />
          <label htmlFor="admin-action">Action</label>
          <select id="admin-action" value={action} onChange={(event) => setAction(event.target.value)}>
            <option value="ban">Ban from leaderboard</option><option value="unban">Unban</option><option value="unrate">Unrate affected attempts and queue replay</option>
          </select>
          {action === 'unrate' && <><label htmlFor="admin-from">Resolved at or after (ISO timestamp, optional)</label><input id="admin-from" placeholder="2026-11-08T00:00:00Z" value={from} onChange={(event) => setFrom(event.target.value)} /><p>Leave empty to unrate all resolved rated attempts for this user. This keeps their attempts and requires replay to rebuild ratings.</p></>}
          <button type="submit" className="btn btn-primary" disabled={disabled || !userId}>Record user action</button>
        </form>
      </section>
    </div>
  )
}
