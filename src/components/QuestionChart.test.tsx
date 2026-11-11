import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PromptBlocks } from './PromptBlocks.tsx'
import type { Block } from '../../supabase/functions/_shared/content/types.ts'

describe('question charts', () => {
  const chart: Block = {
    t: 'chart', kind: 'bar', title: 'Observed outcomes', xLabel: 'Group', yLabel: 'Events', unit: 'per 1000',
    points: [{ label: 'Group A', value: 24 }, { label: 'Group B', value: 12 }],
  }

  it('renders the given values as a labelled graph and a visible equivalent table', () => {
    const html = renderToStaticMarkup(<PromptBlocks blocks={[chart]} />)
    expect(html).toContain('role="img"')
    expect(html).toContain('Observed outcomes')
    expect(html).toContain('Events (per 1000)')
    expect(html.match(/data-testid="question-bar"/g)).toHaveLength(2)
    expect(html).toContain('<th scope="row">Group A</th><td>24</td>')
    expect(html).toContain('<th scope="row">Group B</th><td>12</td>')
    expect(html).not.toContain('hidden')
    expect(html).not.toContain('correct')
  })

  it('handles a zero-valued line chart without invalid coordinates', () => {
    const html = renderToStaticMarkup(<PromptBlocks blocks={[{ ...chart, kind: 'line', points: [{ label: 'Before', value: 0 }, { label: 'After', value: 0 }] }]} />)
    expect(html).toContain('<polyline')
    expect(html.match(/data-testid="question-point"/g)).toHaveLength(2)
    expect(html).not.toMatch(/NaN|Infinity/)
  })

  it('does not plot malformed content', () => {
    const html = renderToStaticMarkup(<PromptBlocks blocks={[{ ...chart, points: [{ label: 'A', value: -1 }, { label: 'B', value: Infinity }] }]} />)
    expect(html).not.toContain('<svg')
    expect(html).toContain('Chart data is unavailable')
  })
})
