import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { TEMPLATES } from '../supabase/functions/_shared/registry.ts'
import { hashSeed, makeRng } from '../supabase/functions/_shared/rng.ts'

export function measureCapacity(templates: typeof TEMPLATES, drawsPerLevel: number) {
  if (!Number.isInteger(drawsPerLevel) || drawsPerLevel < 1) throw new Error('Draw count must be a positive integer')
  const seen = new Set<string>()
  let sampledPrompts = 0
  const byTemplate = templates.map((template) => {
    const before = seen.size
    for (const { level } of template.levels) {
      for (let i = 0; i < drawsPerLevel; i++) {
        const params = template.sample(makeRng(hashSeed('judgment-capacity', template.id, level, i)), level)
        const prompt = template.render(params, template.skins[0])
        // Hash only rendered givens; skins, unused parameters and answers cannot inflate capacity.
        seen.add(createHash('sha256').update(JSON.stringify(prompt)).digest('base64'))
        sampledPrompts++
      }
    }
    return { id: template.id, levels: template.levels.length, additionalUniquePrompts: seen.size - before }
  })
  return { uniquePrompts: seen.size, sampledPrompts, byTemplate }
}

if (process.argv[1]?.endsWith('judgment-capacity.ts')) {
  // Introductory read-off tasks and ancillary distractors must not establish the ten-year claim.
  const excluded = [
    { id: 'judgment.conditional.selection-filter', level: 2, reason: 'The neither-property selection rate does not affect the restricted event' },
    { id: 'judgment.base-rate.dependent-evidence', level: 2, reason: 'The second-positive rate after a first positive does not affect an at-least-one event' },
    { id: 'judgment.estimation.joint-bounds', level: 1, reason: 'The independently varied lower bound does not affect the maximum' },
    { id: 'judgment.estimation.joint-bounds', level: 2, reason: 'The independently varied lower bound does not affect the maximum' },
  ]
  const audited = TEMPLATES.filter((template) => template.track === 'judgment' && !template.id.includes('.variety.') && template.levels[0].initialRating >= 1800)
    .map((template) => ({ ...template, levels: template.levels.filter(({ level }) => !excluded.some((item) => item.id === template.id && item.level === level)) }))
  const result = measureCapacity(audited, 50_000)
  const report = {
    ...result,
    target: 1_100_000,
    continuousYearsAtFiveMinutes: result.uniquePrompts * 5 / (60 * 24 * 365.25),
    method: '50,000 deterministic seeds per audited advanced level; first skin only; global SHA-256 deduplication of rendered Block JSON. Foundation and existing templates are excluded, along with the listed advanced levels whose ancillary distractors could inflate counts. This is a measured lower bound, not an exhaustive count or a no-repeat delivery guarantee.',
    excluded,
  }
  mkdirSync('build/review', { recursive: true })
  writeFileSync('build/review/judgment-capacity.json', JSON.stringify(report, null, 2) + '\n')
  console.log(`${result.uniquePrompts.toLocaleString('en-US')} distinct visible Judgment prompts from ${result.sampledPrompts.toLocaleString('en-US')} draws (${report.continuousYearsAtFiveMinutes.toFixed(2)} years continuously at five minutes each).`)
  console.log('Report: build/review/judgment-capacity.json')
  if (result.uniquePrompts < report.target) {
    console.error(`Capacity gate failed: need at least ${report.target.toLocaleString('en-US')} distinct visible prompts.`)
    process.exitCode = 1
  }
}
