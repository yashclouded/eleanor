import { mixtureTemplate, boundedEstimateTemplate, selectionTemplate } from './advanced-mixtures.ts'
import { dependentTestsTemplate, competingHypothesesTemplate, precisionTemplate } from './advanced-evidence.ts'
import { informationTemplate, allocationTemplate, commonCauseTemplate } from './advanced-decisions.ts'

export { mixtureTemplate, boundedEstimateTemplate, selectionTemplate, dependentTestsTemplate, competingHypothesesTemplate, precisionTemplate, informationTemplate, allocationTemplate, commonCauseTemplate }

export const JUDGMENT_ADVANCED = [mixtureTemplate, boundedEstimateTemplate, selectionTemplate, dependentTestsTemplate, informationTemplate, allocationTemplate, commonCauseTemplate, precisionTemplate, competingHypothesesTemplate] as const
