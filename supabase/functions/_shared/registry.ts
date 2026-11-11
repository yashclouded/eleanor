import type { ConceptCard, Template } from './content/types.ts'
import type { CodeProblem } from './content/code/types.ts'
import { countingTableTemplate } from './content/judgment/counting-table.ts'
import { fermiQuantityTemplate } from './content/judgment/fermi-quantity.ts'
import { conditionalTwoWayTemplate } from './content/judgment/conditional-two-way-table.ts'
import { conditionalTreeTemplate } from './content/judgment/conditional-tree.ts'
import { baseRateScreeningTemplate } from './content/judgment/base-rate-screening.ts'
import { baseRateTwoTestsTemplate } from './content/judgment/base-rate-two-tests.ts'
import { expectedValueBetsTemplate } from './content/judgment/expected-value-bets.ts'
import { expectedValueInsuranceTemplate } from './content/judgment/expected-value-insurance.ts'
import { riskFramingRelativeAbsoluteTemplate } from './content/judgment/risk-framing-relative-absolute.ts'
import { riskFramingNntTemplate } from './content/judgment/risk-framing-nnt.ts'
import { independenceCompoundEventsTemplate } from './content/judgment/independence-compound-events.ts'
import { independenceAtLeastOneTemplate } from './content/judgment/independence-at-least-one.ts'
import { regressionSelectionEffectTemplate } from './content/judgment/regression-selection-effect.ts'
import { oddsLikelihoodRatioTemplate } from './content/judgment/odds-likelihood-ratio.ts'
import { JUDGMENT_FOUNDATIONS } from './content/judgment/foundations.ts'
import { JUDGMENT_ADVANCED } from './content/judgment/advanced.ts'
import { VARIETY_DATA } from './content/judgment/variety-data.ts'
import { VARIETY_PROBABILITY } from './content/judgment/variety-probability.ts'
import { VARIETY_DECISIONS } from './content/judgment/variety-decisions.ts'
import { chainsTemplate, contrapositiveTemplate, cardSelectionTemplate } from './content/logic/deduction.ts'
import { lineUpTemplate, scheduleTemplate } from './content/logic/ordering.ts'
import { arrangementsTemplate, inclusionExclusionTemplate, pigeonholeTemplate } from './content/logic/counting.ts'
import { parityMovesTemplate, takeAwayTemplate } from './content/logic/invariants-games.ts'
import { threeStatementsTemplate } from './content/logic/knights-three-statements.ts'
import { knightsTwoTemplate } from './content/logic/knights-two.ts'
import { ratesWorkTemplate, unitConversionTemplate } from './content/math/ratios.ts'
import { successiveTemplate, reversePercentTemplate } from './content/math/percent-change.ts'
import { wordEquationsTemplate, twoUnknownsTemplate } from './content/math/linear.ts'
import { similarTrianglesTemplate, pythagorasTemplate } from './content/math/geometry.ts'
import { sequencesTemplate, gcdLcmTemplate } from './content/math/sequences-divisibility.ts'
import { linearExponentialTemplate, fenceAreaTemplate } from './content/math/functions-optimization.ts'
import { MATH_ARITHMETIC } from './content/math/depth-arithmetic.ts'
import { MATH_DISCRETE } from './content/math/depth-discrete.ts'
import { MATH_SPATIAL } from './content/math/depth-spatial.ts'
import { JUDGMENT_CARDS } from './content/cards/judgment.ts'
import { LOGIC_CARDS } from './content/cards/logic.ts'
import { MATH_CARDS } from './content/cards/math.ts'
import { CODE_CARDS } from './content/cards/code.ts'
import { LAUNCH_CODE_PROBLEMS } from './content/code/launch.ts'
import { rangeSumsProblem } from './content/code/code.prefix.range-sums.ts'
import { robotWalkProblem } from './content/code/code.implementation.robot-walk.ts'

export const CODE_PROBLEMS: CodeProblem[] = [
  rangeSumsProblem,
  robotWalkProblem,
  ...LAUNCH_CODE_PROBLEMS,
]

/**
 * Heterogeneous list of all content templates in the bank.
 * Note: `Template<any>` is the only allowed use of `any`, documented here
 * because each template has a different parameter type P that cannot be
 * unified in a single array without existential/any typing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TEMPLATES: Template<any>[] = [
  ...JUDGMENT_FOUNDATIONS,
  ...JUDGMENT_ADVANCED,
  ...VARIETY_DATA,
  ...VARIETY_PROBABILITY,
  ...VARIETY_DECISIONS,
  countingTableTemplate,
  fermiQuantityTemplate,
  conditionalTwoWayTemplate,
  conditionalTreeTemplate,
  baseRateScreeningTemplate,
  baseRateTwoTestsTemplate,
  expectedValueBetsTemplate,
  expectedValueInsuranceTemplate,
  riskFramingRelativeAbsoluteTemplate,
  riskFramingNntTemplate,
  independenceCompoundEventsTemplate,
  independenceAtLeastOneTemplate,
  regressionSelectionEffectTemplate,
  oddsLikelihoodRatioTemplate,
  knightsTwoTemplate,
  chainsTemplate,
  contrapositiveTemplate,
  cardSelectionTemplate,
  threeStatementsTemplate,
  lineUpTemplate,
  scheduleTemplate,
  arrangementsTemplate,
  inclusionExclusionTemplate,
  pigeonholeTemplate,
  parityMovesTemplate,
  takeAwayTemplate,
  ratesWorkTemplate,
  unitConversionTemplate,
  successiveTemplate,
  reversePercentTemplate,
  wordEquationsTemplate,
  twoUnknownsTemplate,
  similarTrianglesTemplate,
  pythagorasTemplate,
  sequencesTemplate,
  gcdLcmTemplate,
  linearExponentialTemplate,
  fenceAreaTemplate,
  ...MATH_ARITHMETIC,
  ...MATH_DISCRETE,
  ...MATH_SPATIAL,
]

export const CARDS: ConceptCard[] = [
  ...JUDGMENT_CARDS,
  ...LOGIC_CARDS,
  ...MATH_CARDS,
  ...CODE_CARDS,
]

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
