import { describe, expect, it } from 'vitest'
import { diagramError, type DiagramBlock } from './diagram.ts'
import { renderBlock } from '../../../../scripts/content-preview.ts'
import { countBlockWords } from '../../../../scripts/content-check.ts'

const diagram: DiagramBlock = {
  t: 'diagram', title: 'Triangle ABC', description: 'Schematic, not to scale. AB is perpendicular to BC.',
  points: [{ label: 'A', x: 60, y: 60 }, { label: 'B', x: 60, y: 200 }, { label: 'C', x: 320, y: 200 }],
  segments: [{ from: 0, to: 1, label: 'AB = 3' }, { from: 1, to: 2, label: 'BC = 4' }, { from: 2, to: 0 }],
}

describe('authored schematic diagrams', () => {
  it('keeps all supplied labels and the spatial description in text reviews', () => {
    expect(diagramError(diagram)).toBeNull()
    const preview = renderBlock(diagram)
    expect(preview).toContain(diagram.description)
    expect(preview).toContain('A–B: AB = 3')
    expect(preview).toContain('B–C: BC = 4')
    expect(preview).not.toContain('320')
    expect(countBlockWords([diagram])).toBeGreaterThan(15)
  })

  it('rejects invalid references, nonfinite geometry, empty descriptions and out-of-bounds shapes', () => {
    expect(diagramError({ ...diagram, description: '' })).toBeTruthy()
    expect(diagramError({ ...diagram, points: [{ label: 'A', x: NaN, y: 0 }] })).toBeTruthy()
    expect(diagramError({ ...diagram, points: diagram.points.map(p => ({ ...p, x: 401 })) })).toBeTruthy()
    expect(diagramError({ ...diagram, segments: [{ from: 0, to: 3 }] })).toBeTruthy()
    expect(diagramError({ ...diagram, segments: [{ from: 0, to: 0 }] })).toBeTruthy()
    expect(diagramError({ ...diagram, circles: [{ x: 20, y: 20, r: 60 }] })).toBeTruthy()
    expect(diagramError({ ...diagram, circles: [{ x: 200, y: 130, r: Infinity }] })).toBeTruthy()
    expect(diagramError({ ...diagram, circles: [{ x: 200, y: 130, r: 80, label: 'Circle O' }] })).toBeNull()
  })
})
