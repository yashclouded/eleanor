export type ConceptState = 'new' | 'learning' | 'practiced' | 'proven' | 'needs_review'

export interface ConceptTileData {
  id: string
  name: string
  track: string
  entryRating: number
  prereqs: string[]
  prereqNames?: string[]
  state: ConceptState
  rating: number | null
  trackRating: number
  isLocked: boolean
  unlockReason?: string
}

export interface ConceptMapProps {
  concepts: ConceptTileData[]
  onSelectConcept?: (conceptId: string) => void
}

const STATE_LABELS: Record<ConceptState, { label: string; className: string }> = {
  new: { label: 'New', className: 'status-badge unsolved' },
  learning: { label: 'Learning', className: 'status-badge' },
  practiced: { label: 'Practiced', className: 'status-badge' },
  proven: { label: 'Proven', className: 'status-badge solved' },
  needs_review: { label: 'Needs Review', className: 'status-badge' },
}

export function ConceptMap({ concepts, onSelectConcept }: ConceptMapProps) {
  // Group concepts by track
  const byTrack = new Map<string, ConceptTileData[]>()
  for (const c of concepts) {
    const list = byTrack.get(c.track) ?? []
    list.push(c)
    byTrack.set(c.track, list)
  }

  // Sort each track's concepts by entry rating ascending
  for (const [track, list] of byTrack.entries()) {
    list.sort((a, b) => a.entryRating - b.entryRating)
    byTrack.set(track, list)
  }

  return (
    <div className="concept-map-container" data-testid="concept-map">
      {Array.from(byTrack.entries()).map(([track, trackConcepts]) => (
        <div key={track} style={{ marginBottom: 'var(--space-6)' }}>
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              textTransform: 'capitalize',
              marginBottom: 'var(--space-3)',
              color: 'var(--text)',
            }}
          >
            {track} Concepts
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            {trackConcepts.map((concept) => {
              const stateInfo = STATE_LABELS[concept.state] ?? STATE_LABELS.new
              const ratingBasis = concept.rating ?? concept.trackRating
              const diff = Math.round(ratingBasis - concept.trackRating)

              let diffLabel = 'Equal to track'
              if (diff > 0) {
                diffLabel = `+${diff} vs track`
              } else if (diff < 0) {
                diffLabel = `${diff} vs track`
              }

              // Compute shade based on diff (clamped)
              let backgroundColor = 'var(--surface)'
              if (!concept.isLocked) {
                if (diff > 0) {
                  const alpha = Math.min(0.2, (diff / 300) * 0.2)
                  backgroundColor = `rgba(21, 128, 61, ${alpha.toFixed(3)})`
                } else if (diff < 0) {
                  const alpha = Math.min(0.2, (Math.abs(diff) / 300) * 0.2)
                  backgroundColor = `rgba(185, 28, 28, ${alpha.toFixed(3)})`
                }
              } else {
                backgroundColor = 'var(--surface-hover)'
              }

              return (
                <div
                  key={concept.id}
                  data-testid={`concept-tile-${concept.id}`}
                  className="concept-tile"
                  style={{
                    background: backgroundColor,
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-4)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    opacity: concept.isLocked ? 0.75 : 1,
                  }}
                >
                  <div>
                    {/* Header: Title and State Badge */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-2)',
                      }}
                    >
                      <h4
                        style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          margin: 0,
                          color: 'var(--text)',
                        }}
                      >
                        {concept.name}
                      </h4>
                      <span className={stateInfo.className} data-testid="concept-state-badge">
                        {concept.isLocked ? 'Locked' : stateInfo.label}
                      </span>
                    </div>

                    {/* Entry Rating and Diff Label */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        fontSize: '0.8125rem',
                        color: 'var(--text-muted)',
                        marginBottom: 'var(--space-3)',
                      }}
                    >
                      <span>Entry: {concept.entryRating}</span>
                      {!concept.isLocked && (
                        <span
                          data-testid="concept-diff-label"
                          style={{
                            fontWeight: 600,
                            fontFamily: 'var(--font-mono)',
                            color: diff >= 0 ? 'var(--success)' : 'var(--error)',
                          }}
                        >
                          {diffLabel}
                        </span>
                      )}
                    </div>

                    {/* Prerequisites in text */}
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-muted)',
                        marginBottom: 'var(--space-2)',
                      }}
                    >
                      <strong>Prerequisites: </strong>
                      {concept.prereqNames && concept.prereqNames.length > 0
                        ? concept.prereqNames.join(', ')
                        : 'None'}
                    </div>

                    {/* If locked, describe what unlocks it */}
                    {concept.isLocked && (
                      <div
                        data-testid="locked-reason"
                        style={{
                          marginTop: 'var(--space-2)',
                          padding: 'var(--space-2)',
                          background: 'rgba(0,0,0,0.04)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8125rem',
                          color: 'var(--text-dim)',
                          lineHeight: 1.4,
                        }}
                      >
                        {concept.unlockReason ??
                          `Locked. Requires all prerequisites at Practiced, or track rating ${concept.entryRating + 100}.`}
                      </div>
                    )}
                  </div>

                  {onSelectConcept && !concept.isLocked && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSelectConcept(concept.id)}
                      style={{ marginTop: 'var(--space-3)', width: 'fit-content' }}
                    >
                      View concept
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
