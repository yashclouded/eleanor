import { useState } from 'react'

export interface RatingEventPoint {
  id?: number | string
  createdAt: string | Date
  rAfter: number
  rdAfter: number
  rBefore?: number
  rdBefore?: number
}

export interface RatingChartProps {
  track: string
  events: RatingEventPoint[]
  peak?: number | null
  initialShowTable?: boolean
}

export function RatingChart({
  track,
  events,
  peak,
  initialShowTable = false,
}: RatingChartProps) {
  const [showTable, setShowTable] = useState(initialShowTable)

  // Empty state
  if (!events || events.length === 0) {
    return (
      <div className="chart-container" data-testid="rating-chart-empty">
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          No rating history for {track} yet. Complete a rated set to see your progress graph.
        </p>
      </div>
    )
  }

  // Dimensions
  const width = 600
  const height = 240
  const padLeft = 50
  const padRight = 30
  const padTop = 30
  const padBottom = 35
  const plotWidth = width - padLeft - padRight
  const plotHeight = height - padTop - padBottom

  // Value bounds
  let minVal = Infinity
  let maxVal = -Infinity

  for (const e of events) {
    const lo = e.rAfter - e.rdAfter
    const hi = e.rAfter + e.rdAfter
    if (lo < minVal) minVal = lo
    if (hi > maxVal) maxVal = hi
  }

  if (peak !== null && peak !== undefined) {
    if (peak > maxVal) maxVal = peak
    if (peak < minVal) minVal = peak
  }

  // Add margin around min/max
  const range = maxVal - minVal || 200
  minVal = Math.floor((minVal - range * 0.08) / 50) * 50
  maxVal = Math.ceil((maxVal + range * 0.08) / 50) * 50
  const totalRange = maxVal - minVal || 1

  const getY = (val: number) =>
    padTop + ((maxVal - val) / totalRange) * plotHeight

  const getX = (idx: number) =>
    events.length === 1
      ? padLeft + plotWidth / 2
      : padLeft + (idx / (events.length - 1)) * plotWidth

  // Upper/Lower coordinates for RD uncertainty band
  const upperPoints = events.map((e, idx) => ({
    x: getX(idx),
    y: getY(e.rAfter + e.rdAfter),
  }))

  const lowerPoints = events.map((e, idx) => ({
    x: getX(idx),
    y: getY(e.rAfter - e.rdAfter),
  }))

  // Construct band polygon path
  let bandPath = ''
  if (events.length > 1) {
    bandPath = `M ${upperPoints[0].x} ${upperPoints[0].y} `
    for (let i = 1; i < upperPoints.length; i++) {
      bandPath += `L ${upperPoints[i].x} ${upperPoints[i].y} `
    }
    for (let i = lowerPoints.length - 1; i >= 0; i--) {
      bandPath += `L ${lowerPoints[i].x} ${lowerPoints[i].y} `
    }
    bandPath += 'Z'
  }

  // Line path
  const linePath =
    events.length === 1
      ? ''
      : events.reduce((acc, e, idx) => {
          const x = getX(idx)
          const y = getY(e.rAfter)
          return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`
        }, '')

  // Peak marker Y coordinate
  const peakY = peak !== null && peak !== undefined ? getY(peak) : null

  // Current and initial rating
  const currentRating = Math.round(events[events.length - 1].rAfter)
  const startRating = Math.round(events[0].rAfter)
  const peakRating = peak ? Math.round(peak) : Math.max(...events.map((e) => Math.round(e.rAfter)))

  const ariaLabel = `Rating history for ${track}: starts at ${startRating}, current ${currentRating}, peak ${peakRating}`

  return (
    <div className="chart-card" data-testid="rating-chart-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
          {track} Rating History
        </h3>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setShowTable(!showTable)}
          data-testid="toggle-rating-table"
        >
          {showTable ? 'Hide data table' : 'Show as table'}
        </button>
      </div>

      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg
          role="img"
          aria-label={ariaLabel}
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block', minWidth: '400px' }}
        >
          <title>{ariaLabel}</title>

          {/* Grid lines and Y axis ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const val = minVal + pct * totalRange
            const y = getY(val)
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="2 2"
                  opacity={0.6}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--text-muted)"
                  fontFamily="var(--font-mono)"
                >
                  {Math.round(val)}
                </text>
              </g>
            )
          })}

          {/* Uncertainty Band (±RD) */}
          {bandPath && (
            <path
              d={bandPath}
              fill="var(--accent)"
              opacity="0.12"
              data-testid="uncertainty-band"
            />
          )}

          {/* Peak Marker Line */}
          {peakY !== null && (
            <g data-testid="peak-marker">
              <line
                x1={padLeft}
                y1={peakY}
                x2={width - padRight}
                y2={peakY}
                stroke="#d97706"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x={width - padRight}
                y={peakY - 5}
                textAnchor="end"
                fontSize="10"
                fontWeight="600"
                fill="#d97706"
                fontFamily="var(--font-mono)"
              >
                Peak: {Math.round(peak ?? 0)}
              </text>
            </g>
          )}

          {/* Rating Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points */}
          {events.map((e, idx) => {
            const x = getX(idx)
            const y = getY(e.rAfter)
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r={4}
                fill="var(--accent)"
                stroke="var(--surface)"
                strokeWidth="1.5"
                data-testid="rating-point"
              >
                <title>{`Event ${idx + 1}: Rating ${Math.round(e.rAfter)} (±${Math.round(e.rdAfter)})`}</title>
              </circle>
            )
          })}
        </svg>
      </div>

      {/* Accessible Alternative Table */}
      {showTable && (
        <div style={{ marginTop: 'var(--space-4)', overflowX: 'auto' }}>
          <table
            className="top-answers-table"
            data-testid="rating-table"
            aria-label={`Rating history data table for ${track}`}
          >
            <caption>Rating history for {track}</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Rating</th>
                <th scope="col">RD (±)</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, idx) => {
                const dateStr =
                  e.createdAt instanceof Date
                    ? e.createdAt.toLocaleDateString()
                    : new Date(e.createdAt).toLocaleDateString()
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {Math.round(e.rAfter)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      ±{Math.round(e.rdAfter)}
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
                      {dateStr}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
