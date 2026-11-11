import type { Block } from './types.ts'

export type DiagramBlock = Extract<Block, { t: 'diagram' }>
const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0
const within = (value: number, max: number) => Number.isFinite(value) && value >= 0 && value <= max

export function diagramError(diagram: DiagramBlock): string | null {
  if (!text(diagram.title) || !text(diagram.description)) return 'Diagram needs a title and a spatial description'
  if (!Array.isArray(diagram.points) || diagram.points.length < 2 || diagram.points.length > 12) return 'Diagram needs 2–12 labelled points'
  if (diagram.points.some(p => !p || !text(p.label) || !within(p.x, 400) || !within(p.y, 260))) return 'Diagram points must fit the finite 400 by 260 layout'
  if (new Set(diagram.points.map(p => p.label)).size !== diagram.points.length) return 'Diagram point labels must be unique'
  if (!Array.isArray(diagram.segments) || diagram.segments.length > 20 || diagram.segments.some(s => !s || !Number.isInteger(s.from) || !Number.isInteger(s.to) || s.from < 0 || s.to < 0 || s.from >= diagram.points.length || s.to >= diagram.points.length || s.from === s.to || (s.label !== undefined && !text(s.label)))) return 'Diagram segments must reference two different existing points'
  if (diagram.circles !== undefined && (!Array.isArray(diagram.circles) || diagram.circles.length > 4 || diagram.circles.some(c => !c || !Number.isFinite(c.r) || c.r <= 0 || !within(c.x - c.r, 400) || !within(c.x + c.r, 400) || !within(c.y - c.r, 260) || !within(c.y + c.r, 260) || (c.label !== undefined && !text(c.label))))) return 'Diagram circles must fit the finite layout'
  if (!diagram.segments.length && !diagram.circles?.length) return 'Diagram needs a segment or circle'
  return null
}
