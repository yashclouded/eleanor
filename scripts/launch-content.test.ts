import { describe, expect, it } from 'vitest'
import { checkLaunchInventory } from './content-check.ts'
import { generateDailyPreview } from './content-preview.ts'

describe('published launch gate', () => {
  it('keeps the real draft bank blocked from launch', () => {
    const errors = checkLaunchInventory()
    expect(errors).toContain('judgment: 0 published items; launch requires 65')
    for (const track of ['judgment', 'logic', 'math']) {
      expect(errors).toContain(`${track}: 0 eligible published Daily items; launch requires 18`)
    }
  })

  it('produces seven deterministic, explicitly draft-only UTC Daily previews', () => {
    const preview = generateDailyPreview(new Date('2026-11-09T23:00:00Z'), true)
    expect(preview).toBe(generateDailyPreview(new Date('2026-11-09T00:00:00Z'), true))
    expect(preview).toContain('DRAFT REVIEW ONLY')
    expect(preview.match(/^## 2026-/gm)).toHaveLength(7)
    expect(preview).toContain('2026-11-15')
    expect(preview).toContain('Worked solution')
    expect(() => generateDailyPreview(new Date('2026-11-09Z'))).toThrow('No published Daily items')
  })
})
