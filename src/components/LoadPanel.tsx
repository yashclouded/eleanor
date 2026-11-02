import { Component, Suspense } from 'react'
import type { ReactNode } from 'react'

export class LoadPanel extends Component<{ children: ReactNode; label: string }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <div className="form-card" role="alert">
      <p>Could not load the {this.props.label}.</p>
      <button className="btn btn-secondary" onClick={() => window.location.reload()}>Reload to retry</button>
    </div>
    return <Suspense fallback={<p role="status">Loading {this.props.label}…</p>}>{this.props.children}</Suspense>
  }
}
