import { describe, it, expect } from 'vitest'
import { compareOutput } from './compare.ts'

describe('compareOutput', () => {
  describe('tokens mode', () => {
    const checker = { kind: 'tokens' as const }

    it('matches identical single-line and multi-line strings', () => {
      expect(compareOutput('1 2 3', '1 2 3', checker)).toBe(true)
      expect(compareOutput('1 2\n3\n', '1 2 3', checker)).toBe(true)
      expect(compareOutput('1\n2\n3\n', '1  2   3', checker)).toBe(true)
    })

    it('rejects different token values or counts', () => {
      expect(compareOutput('1 2', '1 2 3', checker)).toBe(false)
      expect(compareOutput('1 2 3', '1 2', checker)).toBe(false)
      expect(compareOutput('1 2 4', '1 2 3', checker)).toBe(false)
      expect(compareOutput('apple banana', 'apple orange', checker)).toBe(false)
    })

    it('handles trailing whitespace, multiple spaces, and CRLF', () => {
      expect(compareOutput("hello \t\r\nworld\r\n", "hello   world", checker)).toBe(true)
      expect(compareOutput("line1\r\nline2\r\n", "line1\nline2\n", checker)).toBe(true)
      expect(compareOutput("   42   \n\n", "42", checker)).toBe(true)
      expect(compareOutput("", "   \r\n \t ", checker)).toBe(true)
      expect(compareOutput("42", "", checker)).toBe(false)
    })
  })

  describe('float mode', () => {
    const checker = { kind: 'float' as const, abs: 1e-6, rel: 1e-6 }

    it('matches numbers within absolute tolerance', () => {
      expect(compareOutput('0.3333333', '0.33333335', checker)).toBe(true)
      expect(compareOutput('0.0000001', '0.0000005', checker)).toBe(true)
    })

    it('rejects numbers outside absolute and relative tolerance', () => {
      expect(compareOutput('0.334', '0.3333', checker)).toBe(false)
      expect(compareOutput('1.0', '1.01', checker)).toBe(false)
    })

    it('matches large numbers within relative tolerance', () => {
      // 1e9 * 1e-6 = 1000 tolerance
      expect(compareOutput('1000000000', '1000000500', checker)).toBe(true)
      expect(compareOutput('1000000000', '1000002000', checker)).toBe(false)
    })

    it('handles mixed text and numbers in float mode', () => {
      expect(compareOutput('Case #1: 3.14159265', 'Case #1: 3.14159270', checker)).toBe(true)
      expect(compareOutput('Case #1: 3.14', 'Case #2: 3.14', checker)).toBe(false)
      expect(compareOutput('Case #1: 3.14', 'Case #1: 3.15', checker)).toBe(false)
    })

    it('handles CRLF and trailing whitespace in float mode', () => {
      expect(compareOutput("1.5\r\n2.5\r\n", "1.50000001 2.50000001\n", checker)).toBe(true)
    })
  })
})
