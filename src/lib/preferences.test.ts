import { describe, expect, it } from 'vitest'
import { readBrowserPreferences } from './preferences.ts'

describe('browser cookie preferences', () => {
  it('uses session defaults before consent and ignores unsolicited optional cookies', () => {
    expect(readBrowserPreferences('')).toEqual({ consent: null, sound: true, celebrations: true })
    expect(readBrowserPreferences('eleanor_preferences=quiet')).toEqual({ consent: null, sound: true, celebrations: true })
    expect(readBrowserPreferences('eleanor_consent=essential; eleanor_preferences=quiet')).toEqual({ consent: 'essential', sound: true, celebrations: true })
  })

  it('reads only valid, explicitly allowed preferences', () => {
    expect(readBrowserPreferences('eleanor_consent=preferences; eleanor_preferences=00')).toEqual({ consent: 'preferences', sound: false, celebrations: false })
    expect(readBrowserPreferences('eleanor_consent=preferences; eleanor_preferences=10')).toEqual({ consent: 'preferences', sound: true, celebrations: false })
    expect(readBrowserPreferences('eleanor_consent=%broken; eleanor_preferences=00')).toEqual({ consent: null, sound: true, celebrations: true })
    expect(readBrowserPreferences('eleanor_consent=preferences; eleanor_preferences=invalid').sound).toBe(true)
  })
})
