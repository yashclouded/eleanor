import { useId } from 'react'
import { diagramError, type DiagramBlock } from '../../supabase/functions/_shared/content/diagram.ts'

export function QuestionDiagram({ diagram }: { diagram: DiagramBlock }) {
  const titleId = useId()
  const descriptionId = useId()
  if (diagramError(diagram)) return <p>Diagram data is unavailable.</p>

  return (
    <figure style={{ margin: '0 0 var(--space-4)' }}>
      <figcaption id={titleId} style={{ fontWeight: 600 }}>{diagram.title}</figcaption>
      <p id={descriptionId}>{diagram.description}</p>
      <svg role="img" aria-labelledby={titleId} aria-describedby={descriptionId} viewBox="0 0 400 260" style={{ width: '100%', maxWidth: 640, height: 'auto', color: 'var(--text)' }}>
        {diagram.circles?.map((circle, i) => <circle key={i} cx={circle.x} cy={circle.y} r={circle.r} fill="none" stroke="currentColor" strokeWidth="2" />)}
        {diagram.segments.map((segment, i) => {
          const a = diagram.points[segment.from], b = diagram.points[segment.to]
          // Authored endpoint order chooses which side of the segment holds its label.
          const length = Math.hypot(b.x - a.x, b.y - a.y) || 1
          return <g key={i}>
            <line data-testid="diagram-segment" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" strokeWidth="2" />
            {segment.label && <text x={(a.x + b.x) / 2 - (b.y - a.y) / length * 18} y={(a.y + b.y) / 2 + (b.x - a.x) / length * 18 + 4} textAnchor="middle" fontSize="13" fill="currentColor" paintOrder="stroke" stroke="var(--surface)" strokeWidth="4" strokeLinejoin="round">{segment.label}</text>}
          </g>
        })}
        {diagram.points.map(point => <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="3" fill="currentColor" />
          <text x={point.x > 270 ? point.x - 6 : point.x + 6} y={point.y - 9} textAnchor={point.x > 270 ? 'end' : 'start'} fontSize="14" fill="currentColor">{point.label}</text>
        </g>)}
      </svg>
      <ul>
        {diagram.segments.map((segment, i) => <li key={i}>{diagram.points[segment.from].label}–{diagram.points[segment.to].label}{segment.label ? `: ${segment.label}` : ''}</li>)}
        {diagram.circles?.filter(c => c.label).map((circle, i) => <li key={`circle-${i}`}>{circle.label}</li>)}
      </ul>
    </figure>
  )
}
