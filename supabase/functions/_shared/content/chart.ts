import type { Block } from './types.ts'

export type ChartBlock = Extract<Block, { t: 'chart' }>

export function chartError(chart: ChartBlock): string | null {
  if (chart.kind !== 'bar' && chart.kind !== 'line') return 'Chart kind must be bar or line'
  if (![chart.title, chart.xLabel, chart.yLabel].every((label) => typeof label === 'string' && label.trim())) return 'Chart needs a title and both axis labels'
  if (chart.unit !== undefined && (typeof chart.unit !== 'string' || !chart.unit.trim())) return 'Chart unit must be nonempty text'
  if (!Array.isArray(chart.points) || chart.points.length < 2 || chart.points.length > 12) return 'Chart needs 2–12 data points'
  if (chart.points.some((point) => !point || typeof point.label !== 'string' || !point.label.trim() || !Number.isFinite(point.value) || point.value < 0)) return 'Chart points need labels and finite nonnegative values'
  return null
}
