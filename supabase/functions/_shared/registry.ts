import type { ConceptCard, Template } from './content/types.ts'
import { baseRateScreeningTemplate } from './content/judgment/base-rate-screening.ts'
import { knightsTwoTemplate } from './content/logic/knights-two.ts'
import { JUDGMENT_CARDS } from './content/cards/judgment.ts'

/**
 * Heterogeneous list of all content templates in the bank.
 * Note: `Template<any>` is the only allowed use of `any`, documented here
 * because each template has a different parameter type P that cannot be
 * unified in a single array without existential/any typing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TEMPLATES: Template<any>[] = [
  baseRateScreeningTemplate,
  knightsTwoTemplate,
]

export const CARDS: ConceptCard[] = [...JUDGMENT_CARDS]

/**
 * Resolves a template and difficulty level from an item ID string.
 * Item ID format: `${id}@${version}#${level}`
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function templateFor(itemId: string): { template: Template<any>; level: number } {
  const hashIdx = itemId.lastIndexOf('#')
  if (hashIdx === -1) {
    throw new Error(`Invalid itemId format (missing level delimiter '#'): ${itemId}`)
  }

  const idAndVersion = itemId.slice(0, hashIdx)
  const levelStr = itemId.slice(hashIdx + 1)
  const level = parseInt(levelStr, 10)
  if (Number.isNaN(level)) {
    throw new Error(`Invalid level in itemId: ${itemId}`)
  }

  const atIdx = idAndVersion.lastIndexOf('@')
  if (atIdx === -1) {
    throw new Error(`Invalid itemId format (missing version delimiter '@'): ${itemId}`)
  }

  const id = idAndVersion.slice(0, atIdx)
  const versionStr = idAndVersion.slice(atIdx + 1)
  const version = parseInt(versionStr, 10)
  if (Number.isNaN(version)) {
    throw new Error(`Invalid version in itemId: ${itemId}`)
  }

  const template = TEMPLATES.find((t) => t.id === id && t.version === version)
  if (!template) {
    throw new Error(`Template not found for itemId: ${itemId}`)
  }

  const levelExists = template.levels.some((l) => l.level === level)
  if (!levelExists) {
    throw new Error(`Level ${level} not found in template ${id}@${version}`)
  }

  return { template, level }
}
