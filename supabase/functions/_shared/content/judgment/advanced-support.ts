import type { Block, Step } from '../types.ts'

export const advancedLevels = [1, 2, 3, 4].map(level => ({ level, initialRating: 1500 + 300 * level }))
export const advancedReview = { author: 'GPT-6', reviewer: null, reviewedAt: null }
export const precise = { abs: 0.000001 }
export const paragraph = (text: string): Block[] => [{ t: 'p', text }]
export const display = (value: number): string => String(Number(value.toFixed(6)))

export function numberStep<P>(prompt: (p: P) => string, answer: (p: P) => number, explain: (p: P) => string): Step<P> {
  return { prompt: p => paragraph(prompt(p)), answer, tolerance: precise, explain: p => paragraph(explain(p)) }
}
