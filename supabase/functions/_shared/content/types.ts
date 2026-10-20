import type { Rng } from '../rng.ts'
export type { Rng }

export type Block =
  | { t: 'p'; text: string }
  | { t: 'note'; text: string }
  | { t: 'code'; text: string }
  | { t: 'list'; items: string[]; ordered?: boolean }
  | { t: 'table'; head: string[]; rows: string[][]; caption?: string }

export type Tolerance = { abs?: number; rel?: number }

export type Option = { id: string; label: string }

export type AnswerSpec =
  | { type: 'number'; unit?: string; tolerance: Tolerance }
  | { type: 'integer'; unit?: string }
  | { type: 'estimate'; unit: string; log10Tolerance: number }
  | { type: 'choice'; options: Option[] }
  | { type: 'multi'; options: Option[] }
  | { type: 'sequence'; items: Option[] }
  | { type: 'code'; languages: ('python' | 'cpp' | 'javascript')[] }

export type Answer = number | string | string[]
export type RawAnswer = string | string[]

export type TrackId = 'judgment' | 'logic' | 'math' | 'code'

export type Concept = {
  id: string
  track: TrackId
  name: string
  summary: string
  prereqs: string[]
  entryRating: number
  sort: number
}

export type Review = {
  author: string
  reviewer: string | null
  reviewedAt: string | null
  notes?: string
}

export type Status = 'draft' | 'reviewed' | 'published' | 'retired'

export type Step<P> = {
  prompt: (p: P) => Block[]
  answer: (p: P) => number
  tolerance: Tolerance
  explain: (p: P) => Block[]
}

export type Template<P> = {
  id: string
  version: number
  track: Exclude<TrackId, 'code'>
  concept: string
  family: string
  status: Status
  review: Review
  levels: { level: number; initialRating: number }[]
  skins: string[]
  sample(rng: Rng, level: number): P
  solve(p: P): Answer
  verify(p: P, rng: Rng): Answer
  render(p: P, skin: string): Block[]
  answer(p: P): AnswerSpec
  misconceptions: { id: string; value: (p: P) => Answer; feedback: (p: P) => string }[]
  steps: Step<P>[]
  solution(p: P): Block[]
  dailyLevels?: number[]
}

export type ConceptCard = {
  conceptId: string
  version: number
  body: Block[]
  status: Status
  review: Review
}

export type InstanceSecret = {
  answer: Answer
  misconceptions: { id: string; value: Answer; feedback: string }[]
  steps: { prompt: Block[]; answer: number; tolerance: Tolerance; explain: Block[] }[]
  solution: Block[]
}

export type BuiltInstance = {
  prompt: Block[]
  answerSpec: AnswerSpec
  skin: string
  secret: InstanceSecret
}
