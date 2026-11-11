import { describe, expect, it } from 'vitest'
import { chartError } from './chart.ts'
import type { Block } from './types.ts'
import { countBlockWords } from '../../../../scripts/content-check.ts'
import { renderBlock } from '../../../../scripts/content-preview.ts'

describe('authored question chart validation and previews', () => {
  const chart: Extract<Block, { t: 'chart' }> = {
    t: 'chart', kind: 'bar', title: 'Outcome counts', xLabel: 'Group', yLabel: 'Count',
    points: [{ label: 'A', value: 0 }, { label: 'B', value: 12 }],
  }

  it('accepts finite nonnegative givens and includes all data in text reviews', () => {
    expect(chartError(chart)).toBeNull()
    const preview = renderBlock(chart)
    expect(preview).toContain('Outcome counts')
    expect(preview).toContain('| A | 0 |')
    expect(preview).toContain('| B | 12 |')
    expect(countBlockWords([chart])).toBe(8)
  })

  it('rejects unreadable, nonfinite or incomplete graphs', () => {
    expect(chartError({ ...chart, title: '' })).toBeTruthy()
    expect(chartError({ ...chart, points: [] })).toBeTruthy()
    expect(chartError({ ...chart, points: [{ label: 'A', value: NaN }, { label: 'B', value: 1 }] })).toBeTruthy()
    expect(chartError({ ...chart, points: [{ label: '', value: 1 }, { label: 'B', value: 2 }] })).toBeTruthy()
    expect(chartError({ ...chart, points: Array.from({ length: 13 }, (_, i) => ({ label: String(i), value: i })) })).toBeTruthy()
  })
})
