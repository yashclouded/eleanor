import { describe, expect, it } from 'vitest'
import { generatePreview } from './content-preview.ts'
import { TEMPLATES } from '../supabase/functions/_shared/registry.ts'
import { buildInstance } from '../supabase/functions/_shared/instance.ts'
import { isCorrect, parseAnswer } from '../supabase/functions/_shared/grading.ts'

describe('reviewing nonnumeric responses', () => {
  it('preserves enough precision for tiny canonical answers to grade correctly', () => {
    const t = TEMPLATES.find(t => t.id === 'math.sequences.advanced.telescoping-recurrences')!
    const instance = buildInstance(t, 1, 1, t.skins[0])
    const preview = generatePreview(t.id)
    const line = preview.match(/\*\*Canonical Answer:\*\* ([^\n]+)/)?.[1] ?? ''
    const parsed = parseAnswer(instance.answerSpec, line)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(isCorrect(instance.answerSpec, instance.secret.answer, parsed.value)).toBe(true)
    const shownMisconception = preview.match(/\(Value: ([^)]+)\)/)?.[1] ?? ''
    const misconception = parseAnswer(instance.answerSpec, shownMisconception)
    expect(misconception.ok).toBe(true)
    if (misconception.ok) expect(isCorrect(instance.answerSpec, instance.secret.misconceptions[0].value, misconception.value)).toBe(true)
  })
  it('includes the choices when a task has a single selection', () => {
    expect(generatePreview('logic.deduction.chains').includes('##### Select one option')).toBe(true)
  })

  it('shows the actual selectable labels for a multi-select task', () => {
    const preview = generatePreview('logic.knights.two')
    expect(preview.includes('##### Select all that apply')).toBe(true)
    expect(preview).toMatch(/- `A`:/)
    expect(preview).toMatch(/- `B`:/)
    expect(preview).toMatch(/- `C`:/)
  })

  it('shows the initially presented order for an ordering task', () => {
    const preview = generatePreview('logic.ordering.line-up')
    expect(preview.includes('##### Initial order')).toBe(true)
    expect(preview).toMatch(/1\. `[^`]+`:/)
  })
})
