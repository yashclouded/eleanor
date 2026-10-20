import { describe, expect, it } from 'vitest'
import {
  formatWarning,
  isCorrect,
  matchMisconception,
  parseAnswer,
  parseNumber,
} from './grading.ts'
import type { AnswerSpec } from './content/types.ts'

describe('parseNumber', () => {
  it('parses valid numbers, decimals, fractions, and units correctly', () => {
    expect(parseNumber('1,000.5')).toEqual({ ok: true, value: 1000.5 })
    expect(parseNumber('−3')).toEqual({ ok: true, value: -3 })
    expect(parseNumber('8.3 %', '%')).toEqual({ ok: true, value: 8.3 })
    expect(parseNumber('.5')).toEqual({ ok: true, value: 0.5 })
    expect(parseNumber('5.')).toEqual({ ok: true, value: 5 })
    expect(parseNumber('3/4')).toEqual({ ok: true, value: 0.75 })
  })

  it('rejects invalid inputs, division by zero, non-finite values, and bad formatting', () => {
    expect(parseNumber('1/0')).toMatchObject({ ok: false })
    expect(parseNumber('1e400')).toMatchObject({ ok: false })
    expect(parseNumber('0x10')).toMatchObject({ ok: false })
    expect(parseNumber('')).toMatchObject({ ok: false })
    expect(parseNumber('12,34')).toMatchObject({ ok: false })
    expect(parseNumber('8%')).toEqual({ ok: false, error: 'This answer is not a percentage.' })
    expect(parseNumber('1.2.3')).toMatchObject({ ok: false })
  })
})

describe('isCorrect', () => {
  it('handles number tolerance (abs)', () => {
    const spec: AnswerSpec = { type: 'number', tolerance: { abs: 0.5 } }
    expect(isCorrect(spec, 10, 10.5)).toBe(true)
    expect(isCorrect(spec, 10, 9.5)).toBe(true)
    expect(isCorrect(spec, 10, 10.5000001)).toBe(false)
  })

  it('handles number tolerance (rel)', () => {
    const spec: AnswerSpec = { type: 'number', tolerance: { rel: 0.01 } }
    expect(isCorrect(spec, 200, 202)).toBe(true)
    expect(isCorrect(spec, 200, 202.01)).toBe(false)
  })

  it('handles estimate log10 tolerance', () => {
    const spec: AnswerSpec = { type: 'estimate', unit: 'km', log10Tolerance: 0.3 }
    expect(isCorrect(spec, 1000, 1995)).toBe(true)
    expect(isCorrect(spec, 1000, 2000)).toBe(false) // log10(2) = 0.30103 > 0.3
    expect(isCorrect(spec, 1000, -5)).toBe(false)
  })

  it('handles integer exact match', () => {
    const spec: AnswerSpec = { type: 'integer' }
    expect(isCorrect(spec, 7, 7)).toBe(true)
    expect(isCorrect(spec, 7, 7.0000001)).toBe(false)
  })

  it('handles multi set equality', () => {
    const spec: AnswerSpec = {
      type: 'multi',
      options: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
      ],
    }
    expect(isCorrect(spec, ['a', 'c'], ['c', 'a'])).toBe(true)
    expect(isCorrect(spec, ['a', 'c'], ['a'])).toBe(false)
  })

  it('handles sequence order sensitivity', () => {
    const spec: AnswerSpec = {
      type: 'sequence',
      items: [
        { id: 'first', label: 'First' },
        { id: 'second', label: 'Second' },
      ],
    }
    expect(isCorrect(spec, ['first', 'second'], ['first', 'second'])).toBe(true)
    expect(isCorrect(spec, ['first', 'second'], ['second', 'first'])).toBe(false)
  })
})

describe('matchMisconception', () => {
  it('matches misconception only when answer is incorrect and returns the misconception id', () => {
    const spec: AnswerSpec = { type: 'number', tolerance: { abs: 0.1 } }
    const misconceptions = [{ id: 'base-rate-neglect', value: 90 }]
    const expected = 8.333

    expect(matchMisconception(spec, misconceptions, 90.05, expected)).toBe('base-rate-neglect')
    expect(matchMisconception(spec, misconceptions, 8.333, expected)).toBeNull()
    expect(matchMisconception(spec, misconceptions, 50, expected)).toBeNull()
  })
})

describe('formatWarning', () => {
  it('warns when entering a proportion where a percentage was expected', () => {
    const spec: AnswerSpec = { type: 'number', unit: '%', tolerance: { abs: 0.1 } }
    const warning = formatWarning(spec, 0.083)
    expect(warning).not.toBeNull()
    expect(warning).toContain('8.3')

    expect(formatWarning(spec, 8.3)).toBeNull()
  })
})

describe('parseAnswer', () => {
  it('validates choice answers', () => {
    const spec: AnswerSpec = {
      type: 'choice',
      options: [
        { id: 'x', label: 'X' },
        { id: 'y', label: 'Y' },
      ],
    }
    expect(parseAnswer(spec, 'x')).toEqual({ ok: true, value: 'x' })
    expect(parseAnswer(spec, 'z')).toEqual({ ok: false, error: 'Invalid option selected.' })
  })

  it('validates multi answers rejecting unknown ids and duplicates', () => {
    const spec: AnswerSpec = {
      type: 'multi',
      options: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
      ],
    }
    expect(parseAnswer(spec, ['a', 'b'])).toEqual({ ok: true, value: ['a', 'b'] })
    expect(parseAnswer(spec, ['a', 'a'])).toMatchObject({ ok: false })
    expect(parseAnswer(spec, ['a', 'd'])).toMatchObject({ ok: false })
  })

  it('validates sequence answers requiring permutation of items', () => {
    const spec: AnswerSpec = {
      type: 'sequence',
      items: [
        { id: '1', label: 'Step 1' },
        { id: '2', label: 'Step 2' },
        { id: '3', label: 'Step 3' },
      ],
    }
    expect(parseAnswer(spec, ['2', '1', '3'])).toEqual({ ok: true, value: ['2', '1', '3'] })
    expect(parseAnswer(spec, ['1', '2'])).toMatchObject({ ok: false })
    expect(parseAnswer(spec, ['1', '2', '2'])).toMatchObject({ ok: false })
    expect(parseAnswer(spec, ['1', '2', '4'])).toMatchObject({ ok: false })
  })
})
