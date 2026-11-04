import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { ReliabilityChart } from './ReliabilityChart.tsx'

it('renders model-only reliability data and its table without labelling it as the learner', () => {
  const html = renderToStaticMarkup(<ReliabilityChart
    learnerBins={[]}
    modelBins={[{ lo: 0.6, hi: 0.8, n: 12, meanP: 0.7, meanY: 0.5 }]}
    initialShowTable
  />)
  expect(html).toContain('1 populated confidence bins')
  expect(html).toContain('Model Forecast')
  expect(html).toContain('70%')
  expect(html).toContain('n=12')
  expect(html).not.toContain('Learner (n)')
  expect(html).not.toMatch(/>\s*You\s*</)
})
