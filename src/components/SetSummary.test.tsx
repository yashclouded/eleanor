import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { SetSummary, type SetSummaryData } from './SetSummary.tsx'

const summary: SetSummaryData = {
  track: 'logic', ratingBefore: 900, ratingAfter: 1700, echoesPassed: 2, suggestedConcept: null,
  attempts: [{ concept: { id: 'logic', name: 'Deduction' }, outcome: 'correct', itemRating: 1300, ratingDelta: 12, fingerprintId: null }],
}

it('celebrates only recorded title, echo, and completed-problem achievements', () => {
  const html = renderToStaticMarkup(<MemoryRouter><SetSummary summary={summary} /></MemoryRouter>)
  expect(html).toContain('completion-trophy')
  expect(html).toContain('Title reached')
  expect(html).toContain('2 echoes passed')
  expect(html).toContain('Every problem solved')
  const incomplete = renderToStaticMarkup(<MemoryRouter><SetSummary summary={{ ...summary, ratingAfter: 900, echoesPassed: 0, attempts: [] }} /></MemoryRouter>)
  expect(incomplete).not.toContain('Title reached')
  expect(incomplete).not.toContain('completion-trophy')
  expect(incomplete).not.toContain('echoes passed')
  expect(incomplete).not.toContain('Every problem solved')
})
