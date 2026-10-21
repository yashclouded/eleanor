import { useState } from 'react'

export interface ReliabilityBin {
  lo: number
  hi: number
  n: number
  meanP: number
  meanY: number
}

export interface ReliabilityChartProps {
  learnerBins: ReliabilityBin[]
  modelBins?: ReliabilityBin[] | null
  initialShowTable?: boolean
}

export function ReliabilityChart({
  learnerBins,
  modelBins,
  initialShowTable = false,
}: ReliabilityChartProps) {
  const [showTable, setShowTable] = useState(initialShowTable)

  // Omit empty bins (n === 0)
  const activeLearnerBins = learnerBins.filter((b) => b.n > 0)
  const activeModelBins = modelBins ? modelBins.filter((b) => b.n > 0) : []

  // SVG dimensions (square plot for 1:1 probability calibration)
  const width = 420
  const height = 340
  const padLeft = 45
  const padRight = 30
  const padTop = 25
  const padBottom = 45
  const plotWidth = width - padLeft - padRight
  const plotHeight = height - padTop - padBottom

  const getX = (p: number) => padLeft + p * plotWidth
  const getY = (y: number) => padTop + (1 - y) * plotHeight

  // Construct lines connecting points for learner and model if multiple non-empty bins
  const learnerLine =
    activeLearnerBins.length > 1
      ? activeLearnerBins.reduce((acc, b, i) => {
          const x = getX(b.meanP)
          const y = getY(b.meanY)
          return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`
        }, '')
      : ''

  const modelLine =
    activeModelBins.length > 1
      ? activeModelBins.reduce((acc, b, i) => {
          const x = getX(b.meanP)
          const y = getY(b.meanY)
          return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`
        }, '')
      : ''

  const ariaLabel = `Reliability diagram: predicted probability vs observed accuracy across ${activeLearnerBins.length} populated confidence bins`

  return (
    <div className="chart-card" data-testid="reliability-chart-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
          Reliability Diagram
        </h3>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setShowTable(!showTable)}
          data-testid="toggle-reliability-table"
        >
          {showTable ? 'Hide data table' : 'Show as table'}
        </button>
      </div>

      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }} data-testid="reliability-diagram">
        <svg
          role="img"
          aria-label={ariaLabel}
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', maxWidth: '420px', height: 'auto', display: 'block', margin: '0 auto' }}
        >
          <title>{ariaLabel}</title>

          {/* Grid lines and ticks */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((val) => {
            const x = getX(val)
            const y = getY(val)
            return (
              <g key={val}>
                {/* Horizontal line */}
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
                  x={padLeft - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                  fontFamily="var(--font-mono)"
                >
                  {Math.round(val * 100)}%
                </text>

                {/* Vertical line */}
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={height - padBottom}
                  stroke="var(--border)"
                  strokeDasharray="2 2"
                  opacity={0.6}
                />
                <text
                  x={x}
                  y={height - padBottom + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--text-muted)"
                  fontFamily="var(--font-mono)"
                >
                  {Math.round(val * 100)}%
                </text>
              </g>
            )
          })}

          {/* Axis Labels */}
          <text
            x={padLeft + plotWidth / 2}
            y={height - 8}
            textAnchor="middle"
            fontSize="11"
            fontWeight="500"
            fill="var(--text-muted)"
          >
            Stated Confidence / Forecast (p)
          </text>
          <text
            transform={`rotate(-90 ${padLeft - 30} ${padTop + plotHeight / 2})`}
            x={padLeft - 30}
            y={padTop + plotHeight / 2}
            textAnchor="middle"
            fontSize="11"
            fontWeight="500"
            fill="var(--text-muted)"
          >
            Observed Accuracy (y)
          </text>

          {/* Perfect calibration diagonal */}
          <line
            x1={getX(0)}
            y1={getY(0)}
            x2={getX(1)}
            y2={getY(1)}
            stroke="var(--text-dim)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Model Line & Points */}
          {modelLine && (
            <path
              d={modelLine}
              fill="none"
              stroke="var(--title-strategist)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}
          {activeModelBins.map((b, idx) => {
            const x = getX(b.meanP)
            const y = getY(b.meanY)
            return (
              <g key={`model-${idx}`} data-testid="model-reliability-point">
                <rect
                  x={x - 4}
                  y={y - 4}
                  width={8}
                  height={8}
                  fill="var(--title-strategist)"
                  stroke="var(--surface)"
                  strokeWidth="1"
                />
                <title>{`Model: Forecast ${Math.round(b.meanP * 100)}%, Accuracy ${Math.round(b.meanY * 100)}% (n=${b.n})`}</title>
              </g>
            )
          })}

          {/* Learner Line & Points */}
          {learnerLine && (
            <path
              d={learnerLine}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
          {activeLearnerBins.map((b, idx) => {
            const x = getX(b.meanP)
            const y = getY(b.meanY)
            return (
              <g key={`learner-${idx}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={5}
                  fill="var(--accent)"
                  stroke="var(--surface)"
                  strokeWidth="1.5"
                  data-testid="reliability-point"
                />
                {/* Print n per bin */}
                <text
                  x={x}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="var(--text)"
                  fontFamily="var(--font-mono)"
                >
                  n={b.n}
                </text>
                <title>{`You: Confidence ${Math.round(b.meanP * 100)}%, Accuracy ${Math.round(b.meanY * 100)}% (n=${b.n})`}</title>
              </g>
            )
          })}
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
            You
          </span>
          {activeModelBins.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <span style={{ width: 8, height: 8, background: 'var(--title-strategist)', display: 'inline-block' }} />
              Eleanor Model
            </span>
          )}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span style={{ width: 16, height: 0, borderTop: '2px dashed var(--text-dim)', display: 'inline-block' }} />
            Ideal Calibration
          </span>
        </div>
      </div>

      {/* Accessible Table */}
      {showTable && (
        <div style={{ marginTop: 'var(--space-4)', overflowX: 'auto' }}>
          <table
            className="top-answers-table"
            data-testid="reliability-table"
            aria-label="Reliability diagram data table"
          >
            <caption>Reliability Bins Data</caption>
            <thead>
              <tr>
                <th scope="col">Bin</th>
                <th scope="col">Learner (n)</th>
                <th scope="col">Mean Confidence</th>
                <th scope="col">Accuracy</th>
                {activeModelBins.length > 0 && (
                  <>
                    <th scope="col">Model (n)</th>
                    <th scope="col">Model Forecast</th>
                    <th scope="col">Model Accuracy</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activeLearnerBins.map((b, idx) => {
                const mb = activeModelBins[idx]
                return (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {`${b.lo.toFixed(1)}–${b.hi.toFixed(1)}`}
                    </td>
                    <td>{`n=${b.n}`}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {`${Math.round(b.meanP * 100)}%`}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {`${Math.round(b.meanY * 100)}%`}
                    </td>
                    {activeModelBins.length > 0 && (
                      <>
                        <td>{mb ? `n=${mb.n}` : '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {mb ? `${Math.round(mb.meanP * 100)}%` : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {mb ? `${Math.round(mb.meanY * 100)}%` : '—'}
                        </td>
                      </>
                    )}
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
