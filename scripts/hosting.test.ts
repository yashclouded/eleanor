import { describe, expect, it } from 'vitest'
import { hostingHeaders } from './hosting.ts'

describe('static host privacy headers', () => {
  it('allows connections only to this build’s Supabase origin', () => {
    const headers = hostingHeaders('https://example.supabase.co/')
    expect(headers).toContain("connect-src 'self' https://example.supabase.co")
    expect(headers).toContain("frame-ancestors 'none'")
    expect(headers).toContain("object-src 'none'")
    expect(headers).toContain('Referrer-Policy: no-referrer')
    expect(headers).toContain('clipboard-read=()')
    expect(headers).not.toContain('*.supabase.co')
  })
  it('rejects invalid or insecure remote origins', () => {
    for (const value of ['', 'javascript:alert(1)', 'http://remote.example', 'https://user:pass@example.com']) {
      expect(() => hostingHeaders(value)).toThrow()
    }
    expect(hostingHeaders('http://127.0.0.1:54321')).toContain('http://127.0.0.1:54321')
  })
})
