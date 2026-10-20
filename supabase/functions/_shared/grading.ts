import type { Answer, AnswerSpec, RawAnswer } from './content/types.ts'

export type Parsed = { ok: true; value: Answer } | { ok: false; error: string }

export function parseNumber(
  raw: string,
  unit?: string,
): { ok: true; value: number } | { ok: false; error: string } {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Input must be a string.' }
  }

  let s = raw.trim().replace(/\u2212/g, '-')
  if (s === '') {
    return { ok: false, error: 'Input cannot be empty.' }
  }

  if (unit === '%') {
    if (/\s*%\s*$/.test(s)) {
      s = s.replace(/\s*%\s*$/, '')
    }
    if (s.includes('%')) {
      return { ok: false, error: 'Invalid percentage format.' }
    }
  } else {
    if (s.includes('%')) {
      return { ok: false, error: 'This answer is not a percentage.' }
    }
  }

  s = s.trim()
  if (s === '') {
    return { ok: false, error: 'Input cannot be empty.' }
  }

  // 1. Fractions: ^[+-]?\d+\s*/\s*\d+$ with nonzero denominator
  const fracMatch = s.match(/^([+-]?\d+)\s*\/\s*(\d+)$/)
  if (fracMatch) {
    const num = Number(fracMatch[1])
    const den = Number(fracMatch[2])
    if (den === 0) {
      return { ok: false, error: 'Denominator cannot be zero.' }
    }
    const val = num / den
    if (!Number.isFinite(val)) {
      return { ok: false, error: 'Number is out of range.' }
    }
    return { ok: true, value: val === 0 ? 0 : val }
  }

  // 2. US thousands commas: ^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$
  const commaRegex = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/
  if (commaRegex.test(s)) {
    const stripped = s.replace(/,/g, '')
    const val = Number(stripped)
    if (!Number.isFinite(val)) {
      return { ok: false, error: 'Number is out of range.' }
    }
    return { ok: true, value: val === 0 ? 0 : val }
  }

  // 3. Standard decimal / scientific notation: ^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$
  const decimalRegex = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/
  if (decimalRegex.test(s)) {
    const val = Number(s)
    if (!Number.isFinite(val)) {
      return { ok: false, error: 'Number is out of range.' }
    }
    return { ok: true, value: val === 0 ? 0 : val }
  }

  return { ok: false, error: 'Invalid number format.' }
}

export function parseAnswer(spec: AnswerSpec, raw: RawAnswer): Parsed {
  switch (spec.type) {
    case 'number': {
      if (typeof raw !== 'string') {
        return { ok: false, error: 'Expected string input.' }
      }
      return parseNumber(raw, spec.unit)
    }

    case 'integer': {
      if (typeof raw !== 'string') {
        return { ok: false, error: 'Expected string input.' }
      }
      const res = parseNumber(raw, spec.unit)
      if (!res.ok) {
        return res
      }
      if (!Number.isInteger(res.value)) {
        return { ok: false, error: 'Please enter a whole number.' }
      }
      return { ok: true, value: res.value }
    }

    case 'estimate': {
      if (typeof raw !== 'string') {
        return { ok: false, error: 'Expected string input.' }
      }
      const res = parseNumber(raw, spec.unit)
      if (!res.ok) {
        return res
      }
      if (res.value <= 0) {
        return { ok: false, error: 'Estimate must be greater than zero.' }
      }
      return { ok: true, value: res.value }
    }

    case 'choice': {
      if (typeof raw !== 'string') {
        return { ok: false, error: 'Expected string option id.' }
      }
      const opt = spec.options.find((o) => o.id === raw)
      if (!opt) {
        return { ok: false, error: 'Invalid option selected.' }
      }
      return { ok: true, value: raw }
    }

    case 'multi': {
      if (!Array.isArray(raw)) {
        return { ok: false, error: 'Expected an array of options.' }
      }
      for (const id of raw) {
        if (typeof id !== 'string') {
          return { ok: false, error: 'Option id must be a string.' }
        }
      }
      const set = new Set(raw)
      if (set.size !== raw.length) {
        return { ok: false, error: 'Duplicate options are not allowed.' }
      }
      const validIds = new Set(spec.options.map((o) => o.id))
      for (const id of raw) {
        if (!validIds.has(id)) {
          return { ok: false, error: `Invalid option selected: ${id}` }
        }
      }
      return { ok: true, value: [...raw] }
    }

    case 'sequence': {
      if (!Array.isArray(raw)) {
        return { ok: false, error: 'Expected an array of options.' }
      }
      for (const id of raw) {
        if (typeof id !== 'string') {
          return { ok: false, error: 'Item id must be a string.' }
        }
      }
      const set = new Set(raw)
      if (set.size !== raw.length) {
        return { ok: false, error: 'Duplicate items are not allowed in sequence.' }
      }
      if (raw.length !== spec.items.length) {
        return { ok: false, error: 'Sequence must contain all items.' }
      }
      const validIds = new Set(spec.items.map((o) => o.id))
      for (const id of raw) {
        if (!validIds.has(id)) {
          return { ok: false, error: `Invalid item in sequence: ${id}` }
        }
      }
      return { ok: true, value: [...raw] }
    }

    case 'code': {
      if (typeof raw !== 'string') {
        return { ok: false, error: 'Expected code as a string.' }
      }
      return { ok: true, value: raw }
    }
  }
}

export function isCorrect(spec: AnswerSpec, expected: Answer, given: Answer): boolean {
  switch (spec.type) {
    case 'number': {
      if (typeof given !== 'number' || typeof expected !== 'number') {
        return false
      }
      if (!Number.isFinite(given) || !Number.isFinite(expected)) {
        return false
      }
      const absTol = spec.tolerance.abs ?? 0
      const relTol = spec.tolerance.rel ?? 0
      const tol = Math.max(absTol, relTol * Math.abs(expected)) + 1e-9
      return Math.abs(given - expected) <= tol
    }

    case 'integer': {
      if (typeof given !== 'number' || typeof expected !== 'number') {
        return false
      }
      return Number.isInteger(given) && Number.isInteger(expected) && given === expected
    }

    case 'estimate': {
      if (typeof given !== 'number' || typeof expected !== 'number') {
        return false
      }
      if (given <= 0 || expected <= 0) {
        return false
      }
      return Math.abs(Math.log10(given / expected)) <= spec.log10Tolerance + 1e-12
    }

    case 'choice': {
      return typeof given === 'string' && typeof expected === 'string' && given === expected
    }

    case 'multi': {
      if (!Array.isArray(given) || !Array.isArray(expected)) {
        return false
      }
      if (given.length !== expected.length) {
        return false
      }
      const gSet = new Set(given)
      const eSet = new Set(expected)
      if (gSet.size !== eSet.size) {
        return false
      }
      for (const item of gSet) {
        if (!eSet.has(item)) {
          return false
        }
      }
      return true
    }

    case 'sequence': {
      if (!Array.isArray(given) || !Array.isArray(expected)) {
        return false
      }
      if (given.length !== expected.length) {
        return false
      }
      return given.every((val, idx) => val === expected[idx])
    }

    case 'code': {
      return typeof given === 'string' && typeof expected === 'string' && given === expected
    }
  }
}

export function matchMisconception(
  spec: AnswerSpec,
  list: { id: string; value: Answer }[],
  given: Answer,
  expected?: Answer,
): string | null {
  if (expected !== undefined && isCorrect(spec, expected, given)) {
    return null
  }
  for (const item of list) {
    if (isCorrect(spec, item.value, given)) {
      return item.id
    }
  }
  return null
}

export function formatWarning(spec: AnswerSpec, given: Answer): string | null {
  if (spec.type !== 'number' || spec.unit !== '%') {
    return null
  }
  if (typeof given !== 'number' || !Number.isFinite(given)) {
    return null
  }
  if (given > 0 && given < 1) {
    const pct = parseFloat((given * 100).toPrecision(10))
    return `You entered a proportion. Did you mean ${pct}%?`
  }
  return null
}
