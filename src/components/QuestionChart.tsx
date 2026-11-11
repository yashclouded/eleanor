import { useId } from 'react'
import { chartError, type ChartBlock } from '../../supabase/functions/_shared/content/chart.ts'

export function QuestionChart({ chart }: { chart: ChartBlock }) {
  const titleId = useId()
  const descriptionId = useId()
  if (chartError(chart)) return <p>Chart data is unavailable.</p>

  const yLabel = chart.unit ? `${chart.yLabel} (${chart.unit})` : chart.yLabel
  const max = Math.max(1, ...chart.points.map((point) => point.value))
  const x = (index: number) => 100 + index * 440 / (chart.points.length - 1)
  const y = (value: number) => 232 - value / max * 180
  const labelLength = Math.min(22, Math.max(4, Math.floor(72 / chart.points.length)))

  return (
    <figure style={{ margin: '0 0 var(--space-4)' }}>
      <figcaption id={titleId} style={{ fontWeight: 600 }}>{chart.title}</figcaption>
      <p id={descriptionId}>The graph starts at zero. Exact values are in the table below.</p>
      <svg role="img" aria-labelledby={titleId} aria-describedby={descriptionId} viewBox="0 0 640 310" style={{ width: '100%', maxWidth: 720, height: 'auto', color: 'var(--text)' }}>
        {[0, 0.5, 1].map((fraction) => <g key={fraction}>
          <line x1="62" x2="570" y1={y(max * fraction)} y2={y(max * fraction)} stroke="currentColor" opacity="0.25" />
          <text x="57" y={y(max * fraction) + 4} textAnchor="end" fontSize="12" fill="currentColor">{Number((max * fraction).toPrecision(4))}</text>
        </g>)}
        <text x="62" y="24" fontSize="13" fill="currentColor">{yLabel}</text>
        {chart.kind === 'line' && <polyline points={chart.points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="3" />}
        {chart.points.map((point, index) => <g key={index}>
          {chart.kind === 'bar'
            ? <rect data-testid="question-bar" x={x(index) - Math.min(24, 160 / chart.points.length)} y={y(point.value)} width={Math.min(48, 320 / chart.points.length)} height={232 - y(point.value)} fill="currentColor" />
            : <circle data-testid="question-point" cx={x(index)} cy={y(point.value)} r="5" fill="currentColor" />}
          <text x={x(index)} y="253" textAnchor="middle" fontSize="12" fill="currentColor">{point.label.length > labelLength ? `${point.label.slice(0, labelLength - 1)}…` : point.label}</text>
        </g>)}
        <text x="320" y="302" textAnchor="middle" fontSize="13" fill="currentColor">{chart.xLabel}</text>
      </svg>
      <div style={{ overflowX: 'auto' }}>
        <table className="prompt-table" style={{ width: '100%', textAlign: 'left' }}>
          <caption style={{ textAlign: 'left' }}>Data for {chart.title}</caption>
          <thead><tr><th scope="col">{chart.xLabel}</th><th scope="col">{yLabel}</th></tr></thead>
          <tbody>{chart.points.map((point, index) => <tr key={index}><th scope="row">{point.label}</th><td>{point.value}</td></tr>)}</tbody>
        </table>
      </div>
    </figure>
  )
}
