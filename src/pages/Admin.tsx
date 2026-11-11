import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ReliabilityChart } from '../components/ReliabilityChart.tsx'
import type { ReliabilityBin } from '../components/ReliabilityChart.tsx'
import { RatingChart } from '../components/RatingChart.tsx'
import { api } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'
import { useAction } from '../lib/useAction.ts'

interface ModelHealth {
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
interface Item { id: string; track: string; n: number; residual: number; anchor: boolean }
interface Flag { id: string; userId: string; handle: string; track: string; kind: string; statistics: Record<string, number> }
interface Report { id: string; userId: string; handle: string; reporterHandle: string | null; reason: string }
type Target = 'users' | 'items' | 'flags'

async function applyModeration(args: { path: string; body: Record<string, unknown>; transitionId: string }) {
  await api(args.path, { body: { ...args.body, transitionId: args.transitionId } })
}

export function Admin() {
  const { user } = useAuth()
  const isAdmin = user?.app_metadata.role === 'admin'
  const [health, setHealth] = useState<ModelHealth | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [flags, setFlags] = useState<Flag[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [target, setTarget] = useState<Target>('users')
  const [targetId, setTargetId] = useState('')
  const [operation, setOperation] = useState('ban')
  const [reason, setReason] = useState('')
  const [from, setFrom] = useState('')
  const reasonInput = useRef<HTMLTextAreaElement>(null)
  const moderation = useAction<{ path: string; body: Record<string, unknown> }, void>(applyModeration)

  const load = useCallback(async () => {
    if (!isAdmin) return
    setError(null)
    try {
      const [model, itemQueue, flagQueue, reportQueue] = await Promise.all([
        api<ModelHealth>('/admin/model-health?days=30'),
        api<{ items: Item[] }>('/admin/items?flagged=1'),
        api<{ flags: Flag[] }>('/admin/flags'),
        api<{ reports: Report[] }>('/admin/reports'),
      ])
      setHealth(model)
      setItems(itemQueue.items)
      setFlags(flagQueue.flags)
      setReports(reportQueue.reports)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load admin data')
    }
  }, [isAdmin])

  useEffect(() => { void load() }, [load])

  function review(kind: Target, id: string, action: string) {
    moderation.reset()
    setNotice(null)
    setTarget(kind)
    setTargetId(id)
    setOperation(action)
    reasonInput.current?.focus()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    const path = `/admin/${target}/${encodeURIComponent(targetId.trim())}/${target === 'users' ? 'action' : operation}`
    try {
      await moderation.run({ path, body: {
        reason: reason.trim(),
        ...(target === 'users' ? { action: operation } : {}),
        ...(operation === 'unrate' && from ? { from: new Date(from).toISOString() } : {}),
      } })
      setNotice(`Action recorded.${operation === 'unrate' || operation === 'retire' ? ' Replay is pending.' : ''}`)
      await load()
    } catch {
      // useAction retains the transition ID for a safe retry after network failure.
    }
  }

  if (!isAdmin) return <div className="container-dashboard"><h1>Admin access required</h1></div>

  const operations = target === 'users' ? ['ban', 'unban', 'unrate'] : target === 'items' ? ['retire', 'anchor'] : ['resolve']
  const tracks = [...new Set(health?.learnerDrift.map((point) => point.track))]
  const value = (number: number | null) => number === null ? '—' : number.toFixed(3)

  return <div className="container-dashboard" style={{ display: 'grid', gap: 'var(--space-6)' }}>
    <h1>Admin console</h1>
    {error && <div role="alert">{error} <button className="btn btn-secondary" onClick={() => void load()}>Retry loading</button></div>}
    {!health && !error && <p>Loading model diagnostics…</p>}
    {health && <>
      <section className="form-card" aria-labelledby="model-health-heading">
        <h2 id="model-health-heading">Model health</h2>
        <p>Rated forecasts over the last 30 days. Lower Brier score and log loss indicate better forecasts.</p>
        <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 'var(--space-4)' }}>
          {[
            ['Brier score', value(health.brier)], ['Log loss', value(health.logLoss)],
            ['Calibration error', value(health.calError)], ['Overconfidence gap', value(health.overconfidence)],
            ['Rated attempts (N)', health.n],
          ].map(([label, metric]) => <div key={label}><dt>{label}</dt><dd>{metric}</dd></div>)}
        </dl>
        <p>{health.perTrack.map((track) => `${track.track}: ${track.n}`).join(' · ')}</p>
        {health.n === 0 ? <p>No rated forecasts in this window.</p> : <ReliabilityChart learnerBins={[]} modelBins={health.bins} />}
      </section>
      <section className="form-card" aria-labelledby="drift-heading">
        <h2 id="drift-heading">Rating drift</h2>
        <p>Weekly mean of each learner’s last track rating, after more than 100 rated attempts in that track. Weeks use UTC.</p>
        {tracks.length === 0 && <p>No stable learner history yet.</p>}
        {tracks.map((track) => <RatingChart key={track} track={`Stable learners: ${track}`} events={health.learnerDrift
          .filter((point) => point.track === track)
          .map((point) => ({ createdAt: `${point.week}T00:00:00Z`, rAfter: point.meanRating, rdAfter: 0 }))} />)}
        <div style={{ overflowX: 'auto' }}><table className="top-answers-table">
          <caption>Weekly anchor performance (UTC)</caption>
          <thead><tr><th scope="col">Week</th><th scope="col">Track</th><th scope="col">Mean outcome − forecast</th><th scope="col">N</th></tr></thead>
          <tbody>{health.anchorDrift.map((point) => <tr key={`${point.week}-${point.track}`}><td>{point.week}</td><td>{point.track}</td><td>{value(point.residual)}</td><td>{point.n}</td></tr>)}</tbody>
        </table></div>
        {health.anchorDrift.length === 0 && <p>No anchor responses in this window.</p>}
      </section>
    </>}
    <section className="form-card" aria-labelledby="items-heading">
      <h2 id="items-heading">Flagged items</h2>
      <p>At least 50 item rating events and an absolute mean residual above 0.15. Review the content before retiring or freezing an item.</p>
      <div style={{ overflowX: 'auto' }}><table className="top-answers-table">
        <caption>Items needing review</caption>
        <thead><tr><th scope="col">Item</th><th scope="col">Track</th><th scope="col">N</th><th scope="col">Residual</th><th scope="col">Review</th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id}>
          <td>{item.id}</td><td>{item.track}</td><td>{item.n}</td><td>{value(item.residual)}</td>
          <td><button className="btn btn-secondary btn-sm" disabled={moderation.pending} onClick={() => review('items', item.id, 'retire')} aria-label={`Retire ${item.id}`}>Retire</button>
            {!item.anchor && item.n >= 200 && <button className="btn btn-secondary btn-sm" disabled={moderation.pending} onClick={() => review('items', item.id, 'anchor')} aria-label={`Anchor ${item.id}`}>Anchor</button>}</td>
        </tr>)}</tbody>
      </table></div>
      {health && items.length === 0 && <p>No flagged items.</p>}
    </section>
    <section className="form-card" aria-labelledby="flags-heading">
      <h2 id="flags-heading">Integrity review</h2>
      <p>Outcome statistics prompt human review. A flag applies no penalty.</p>
      <ul>{flags.map((flag) => <li key={flag.id}>
        @{flag.handle} · {flag.track} · {flag.kind} · {Object.entries(flag.statistics).map(([name, n]) => `${name}: ${n}`).join(', ')}{' '}
        <button className="btn btn-secondary btn-sm" disabled={moderation.pending} onClick={() => review('flags', flag.id, 'resolve')}>Resolve flag for @{flag.handle}</button>{' '}
        <button className="btn btn-secondary btn-sm" disabled={moderation.pending} onClick={() => review('users', flag.userId, 'ban')}>Review @{flag.handle}</button>
      </li>)}</ul>
      {health && flags.length === 0 && <p>No unresolved flags.</p>}
    </section>
    <section className="form-card" aria-labelledby="reports-heading">
      <h2 id="reports-heading">Reports</h2>
      <ul>{reports.map((report) => <li key={report.id}>@{report.handle} · {report.reason} · Reported by {report.reporterHandle ? `@${report.reporterHandle}` : 'a deleted account'}{' '}
        <button className="btn btn-secondary btn-sm" disabled={moderation.pending} onClick={() => review('users', report.userId, 'ban')}>Review reported user @{report.handle}</button>
      </li>)}</ul>
      {health && reports.length === 0 && <p>No unresolved reports.</p>}
    </section>
    <section className="form-card" aria-labelledby="moderation-heading">
      <h2 id="moderation-heading">Moderation action</h2>
      <p>Bans affect leaderboard eligibility on its next refresh. Unrating preserves history and queues a rating replay.</p>
      <form onSubmit={submit} onChange={() => { moderation.reset(); setNotice(null) }}>
        <fieldset disabled={moderation.pending} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="sr-only">Action and reason</legend>
          <div className="form-group"><label className="form-label" htmlFor="admin-target">Target type</label>
            <select className="form-input" id="admin-target" value={target} onChange={(event) => { const kind = event.target.value as Target; setTarget(kind); setOperation(kind === 'users' ? 'ban' : kind === 'items' ? 'retire' : 'resolve') }}>
              <option value="users">User</option><option value="items">Item</option><option value="flags">Flag</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label" htmlFor="admin-target-id">Target ID</label>
            <input className="form-input" id="admin-target-id" value={targetId} onChange={(event) => setTargetId(event.target.value)} required />
          </div>
          <div className="form-group"><label className="form-label" htmlFor="admin-operation">Action</label>
            <select className="form-input" id="admin-operation" value={operation} onChange={(event) => setOperation(event.target.value)}>{operations.map((option) => <option key={option}>{option}</option>)}</select>
          </div>
          {operation === 'unrate' && <div className="form-group"><label className="form-label" htmlFor="admin-from">Resolved at or after (optional, local time)</label>
            <input className="form-input" id="admin-from" type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>}
          <div className="form-group"><label className="form-label" htmlFor="admin-reason">Reason</label>
            <textarea className="form-input" id="admin-reason" ref={reasonInput} value={reason} onChange={(event) => setReason(event.target.value)} required minLength={5} maxLength={1000} />
          </div>
          <button className="btn btn-primary" type="submit">{moderation.pending ? 'Recording…' : `Apply ${operation}`}</button>
        </fieldset>
      </form>
      {moderation.error && <p role="alert">{moderation.error.message}</p>}
      {notice && <p role="status">{notice}</p>}
    </section>
  </div>
}
