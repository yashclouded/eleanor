import { mkdirSync, writeFileSync } from 'node:fs'
import { TEMPLATES } from '../supabase/functions/_shared/registry.ts'
import { measureCapacity } from './judgment-capacity.ts'

if (process.argv[1]?.endsWith('math-capacity.ts')) {
  // Use the same visible-prompt accounting as Judgment; introductory tasks and answer options do not establish capacity.
  const audited = TEMPLATES.filter(t => t.track === 'math' && t.id.includes('.advanced.'))
  if (audited.length !== 8) throw new Error('Math capacity audit requires one advanced family per concept')
  const result = measureCapacity(audited, 50_000)
  const report = {
    ...result,
    target: 1_100_000,
    continuousYearsAtFiveMinutes: result.uniquePrompts * 5 / (60 * 24 * 365.25),
    method: '50,000 deterministic seeds per advanced level, first skin only, global SHA-256 deduplication of rendered Block JSON. Counts only meaningful mathematical givens in advanced families, excluding original, foundation and variety templates. This is measured bank capacity, not an exhaustive count, a duplicate-free delivery guarantee or evidence of pedagogical variety.',
  }
  mkdirSync('build/review', { recursive: true })
  writeFileSync('build/review/math-capacity.json', JSON.stringify(report, null, 2) + '\n')
  console.log(`${result.uniquePrompts.toLocaleString('en-US')} distinct visible Math prompts from ${result.sampledPrompts.toLocaleString('en-US')} draws (${report.continuousYearsAtFiveMinutes.toFixed(2)} years continuously at five minutes each).`)
  console.log('Report: build/review/math-capacity.json')
  if (result.uniquePrompts < report.target) {
    console.error(`Capacity gate failed: need at least ${report.target.toLocaleString('en-US')} distinct visible prompts.`)
    process.exitCode = 1
  }
}
