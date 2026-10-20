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
