import type { CodeChecker } from '../content/code/types.ts'

/**
 * Splits a text into whitespace-delimited tokens.
 * Handles spaces, tabs, newlines, CRLF, and trailing whitespace.
 */
function tokenize(text: string): string[] {
  const trimmed = text.trim()
  if (trimmed === '') return []
  return trimmed.split(/\s+/)
}

/**
 * Compares actual program output against expected output according to checker configuration.
 * Pure function: no I/O, no network, no clock.
 */
export function compareOutput(
  expected: string,
  actual: string,
  checker: CodeChecker,
): boolean {
  const expTokens = tokenize(expected)
  const actTokens = tokenize(actual)

  if (expTokens.length !== actTokens.length) {
    return false
  }

  if (checker.kind === 'tokens') {
    for (let i = 0; i < expTokens.length; i++) {
      if (expTokens[i] !== actTokens[i]) {
        return false
      }
    }
    return true
  }

  if (checker.kind === 'float') {
    const absTol = checker.abs
    const relTol = checker.rel

    for (let i = 0; i < expTokens.length; i++) {
      const eStr = expTokens[i]
      const aStr = actTokens[i]

      const eNum = Number(eStr)
      const aNum = Number(aStr)

      // If both tokens parse as finite numbers, check absolute and relative tolerance
      if (Number.isFinite(eNum) && Number.isFinite(aNum)) {
        const diff = Math.abs(eNum - aNum)
        const tol = Math.max(absTol, relTol * Math.abs(eNum))
        if (diff > tol) {
          return false
        }
      } else {
        // Fall back to exact string match for non-numeric tokens
        if (eStr !== aStr) {
          return false
        }
      }
    }
    return true
  }

  return false
}
