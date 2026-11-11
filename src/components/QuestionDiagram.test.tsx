import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PromptBlocks } from './PromptBlocks.tsx'
import type { Block } from '../../supabase/functions/_shared/content/types.ts'

const diagram: Extract<Block, { t: 'diagram' }> = {
  t: 'diagram', title: 'Intersecting chords', description: 'Schematic, not to scale. A, P, B and C, P, D are collinear.',
  points: [{ label: 'A', x: 70, y: 70 }, { label: 'P', x: 200, y: 130 }, { label: 'B', x: 330, y: 190 }],
  segments: [{ from: 0, to: 1, label: 'AP = 6' }, { from: 1, to: 2 }],
  circles: [{ x: 200, y: 130, r: 110, label: 'Circle O' }],
}

describe('question geometry diagrams', () => {
  it('renders local shapes, a labelled description and every given in visible text', () => {
    const html = renderToStaticMarkup(<PromptBlocks blocks={[diagram]} />)
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-describedby=')
    expect(html).toContain(diagram.description)
    expect(html).toContain('A–P: AP = 6')
    expect(html).toContain('Circle O')
    expect(html).toContain('text-anchor="end"')
    expect(html.match(/data-testid="diagram-segment"/g)).toHaveLength(2)
    expect(html).not.toMatch(/<image|<script|foreignObject|hidden|answer|correct/)
  })

  it('does not render invalid coordinates or point references', () => {
    const html = renderToStaticMarkup(<PromptBlocks blocks={[{ ...diagram, segments: [{ from: 0, to: 5 }] }]} />)
    expect(html).not.toContain('<svg')
    expect(html).toContain('Diagram data is unavailable')
  })
})
