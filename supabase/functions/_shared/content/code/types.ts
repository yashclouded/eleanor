import type { Block, Review, Status } from '../types.ts'

export type CodeChecker =
  | { kind: 'tokens' }
  | { kind: 'float'; abs: number; rel: number }

export type CodeProblem = {
  id: string
  version: number
  slug: string
  concept: string
  family: string
  status: Status
  review: Review
  initialRating: number
  statement: Block[]
  inputFormat: Block[]
  outputFormat: Block[]
  constraints: Block[]
  samples: { input: string; output: string; explain?: Block[] }[]
  groups: { label: string; fingerprint: string }[] // in judging order, <= 12
  limits: { cpuSeconds: number; memoryKb: number }
  checker: CodeChecker
  editorial: Block[]
  wrong: { file: string; failsGroup: number }[] // declared expectations for known-wrong solutions
}
