import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { RatingChart } from './RatingChart.tsx'
import { ReliabilityChart } from './ReliabilityChart.tsx'

describe('Task 4.4: Hand-built SVG Charts Unit Tests', () => {
  describe('RatingChart', () => {
    it('renders one point per event, has role="img", aria-label summary, and table lists values', () => {
      const events = [
        { id: 1, createdAt: '2026-10-20T10:00:00Z', rAfter: 1200, rdAfter: 350 },
        { id: 2, createdAt: '2026-10-20T11:00:00Z', rAfter: 1250, rdAfter: 300 },
        { id: 3, createdAt: '2026-10-20T12:00:00Z', rAfter: 1280, rdAfter: 280 },
      ]

      const html = renderToString(
        <RatingChart track="Judgment" events={events} peak={1280} initialShowTable={true} />
      )

      // 1. role="img" and accessible label
      expect(html).toContain('role="img"')
      expect(html).toContain('aria-label')
      expect(html).toContain('Judgment')

      // 2. Renders one point marker per event
      const pointMatches = html.match(/data-testid="rating-point"/g)
      expect(pointMatches).toHaveLength(3)

      // 3. Peak marker is present
      expect(html).toContain('data-testid="peak-marker"')

      // 4. Accessible table lists the same values
      expect(html).toContain('data-testid="rating-table"')
      expect(html).toContain('1200')
      expect(html).toContain('1250')
      expect(html).toContain('1280')
      expect(html).toContain('350')
      expect(html).toContain('300')
      expect(html).toContain('280')
    })
  })

  describe('ReliabilityChart', () => {
    it('omits empty bins and prints n per non-empty bin', () => {
      const learnerBins = [
        { lo: 0.0, hi: 0.2, n: 5, meanP: 0.15, meanY: 0.2 },
        { lo: 0.2, hi: 0.4, n: 0, meanP: 0.0, meanY: 0.0 }, // empty
        { lo: 0.4, hi: 0.6, n: 12, meanP: 0.52, meanY: 0.58 },
        { lo: 0.6, hi: 0.8, n: 0, meanP: 0.0, meanY: 0.0 }, // empty
        { lo: 0.8, hi: 1.0, n: 25, meanP: 0.88, meanY: 0.84 },
      ]

      const html = renderToString(
        <ReliabilityChart learnerBins={learnerBins} initialShowTable={true} />
      )

      // 1. role="img" and aria-label
      expect(html).toContain('role="img"')
      expect(html).toContain('aria-label')

      // 2. Only non-empty bins are rendered in the SVG
      const binPointMatches = html.match(/data-testid="reliability-point"/g)
      expect(binPointMatches).toHaveLength(3) // 3 non-empty bins (5, 12, 25)

      // 3. Prints n per bin
      expect(html).toContain('n=5')
      expect(html).toContain('n=12')
      expect(html).toContain('n=25')
      expect(html).not.toContain('n=0')

      // 4. Table view lists non-empty bins
      expect(html).toContain('data-testid="reliability-table"')
      expect(html).toContain('0.0–0.2')
      expect(html).toContain('0.4–0.6')
      expect(html).toContain('0.8–1.0')
    })
  })
})
