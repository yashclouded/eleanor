/**
 * Judge0 thin HTTP client for Eleanor API.
 * Supports single and batch submissions with base64 encoding and 10s fetch timeouts.
 */

export function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function fromBase64(b64: string | null | undefined): string {
  if (!b64) return ''
  try {
    const binary = atob(b64.trim())
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
  } catch {
    return b64
  }
}

export const JUDGE0_STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR_SIGSEGV: 7,
  RUNTIME_ERROR_SIGXFSZ: 8,
  RUNTIME_ERROR_SIGFPE: 9,
  RUNTIME_ERROR_SIGABRT: 10,
  RUNTIME_ERROR_NZEC: 11,
  RUNTIME_ERROR_OTHER: 12,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14,
} as const

export interface Judge0SubmissionRequest {
  source_code: string
  language_id: number
  stdin?: string
  cpu_time_limit?: number
  memory_limit?: number
}

export interface Judge0SubmissionResponse {
  token: string
  status: { id: number; description: string }
  stdout: string | null
  stderr: string | null
  compile_output: string | null
  time: number | null
  memory: number | null
}

export interface Judge0RunResult {
  stdout: string
  stderr: string
  compileOutput: string | null
  status: { id: number; description: string }
  timeSeconds: number
}

export interface Judge0Client {
  createSubmission(req: Judge0SubmissionRequest): Promise<{ token: string }>
  getSubmission(token: string): Promise<Judge0SubmissionResponse>
  createBatchSubmissions(reqs: Judge0SubmissionRequest[]): Promise<{ token: string }[]>
  getBatchSubmissions(tokens: string[]): Promise<Judge0SubmissionResponse[]>
  run(req: Judge0SubmissionRequest, maxWaitMs?: number): Promise<Judge0RunResult>
}

export interface Judge0Config {
  url: string
  authHeader?: string
  authToken?: string
}

export function getLanguageId(lang: 'python' | 'cpp' | 'javascript'): number {
  const envVal = Deno.env.get('JUDGE0_LANGUAGES')
  if (envVal) {
    try {
      const parsed = JSON.parse(envVal)
      if (typeof parsed[lang] === 'number' && parsed[lang] > 0) {
        return parsed[lang]
      }
    } catch {
      // ignore JSON parse error and fallback to default
    }
  }

  const defaults: Record<'python' | 'cpp' | 'javascript', number> = {
    python: 71, // Python (3.8.1)
    cpp: 105, // C++ (GCC 14.1.0)
    javascript: 63, // JavaScript (Node.js 12.14.0)
  }
  return defaults[lang]
}

function truncateUtf8(str: string, maxBytes: number): string {
  const encoded = new TextEncoder().encode(str)
  if (encoded.length <= maxBytes) return str
  const slice = encoded.slice(0, maxBytes)
  return new TextDecoder().decode(slice)
}

export function createJudge0Client(config: Judge0Config): Judge0Client {
  let baseUrl = config.url.replace(/\/+$/, '')
  // If running in Docker (Supabase Edge Runtime container), 127.0.0.1/localhost on host is reached via host.docker.internal
  if (typeof Deno !== 'undefined' && (baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost'))) {
    baseUrl = baseUrl.replace('://127.0.0.1', '://host.docker.internal').replace('://localhost', '://host.docker.internal')
  }
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  if (config.authHeader && config.authToken) {
    headers[config.authHeader] = config.authToken
  }

  async function fetchWithTimeout(
    url: string,
    init?: RequestInit,
    timeoutMs = 15_000
  ): Promise<Response> {
    const res = await fetch(url, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string>) },
      signal: AbortSignal.timeout(timeoutMs),
    })
    return res
  }

  function parseRawResult(raw: any): Judge0SubmissionResponse {
    const status = raw.status ?? { id: 0, description: 'Unknown' }
    return {
      token: raw.token,
      status: { id: Number(status.id), description: String(status.description ?? '') },
      stdout: raw.stdout !== null && raw.stdout !== undefined ? fromBase64(raw.stdout) : null,
      stderr: raw.stderr !== null && raw.stderr !== undefined ? fromBase64(raw.stderr) : null,
      compile_output:
        raw.compile_output !== null && raw.compile_output !== undefined
          ? fromBase64(raw.compile_output)
          : null,
      time: raw.time !== null && raw.time !== undefined ? parseFloat(raw.time) : null,
      memory: raw.memory !== null && raw.memory !== undefined ? parseInt(raw.memory, 10) : null,
    }
  }

  return {
    async createSubmission(req: Judge0SubmissionRequest): Promise<{ token: string }> {
      const payload: Record<string, unknown> = {
        language_id: req.language_id,
        source_code: toBase64(req.source_code),
      }
      if (req.stdin !== undefined) {
        payload.stdin = toBase64(req.stdin)
      }
      if (req.cpu_time_limit !== undefined) {
        payload.cpu_time_limit = req.cpu_time_limit
      }
      if (req.memory_limit !== undefined) {
        payload.memory_limit = req.memory_limit
      }

      const res = await fetchWithTimeout(`${baseUrl}/submissions?base64_encoded=true`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(`Judge0 create submission failed (${res.status}): ${await res.text()}`)
      }
      const data = await res.json()
      return { token: data.token }
    },

    async getSubmission(token: string): Promise<Judge0SubmissionResponse> {
      const res = await fetchWithTimeout(
        `${baseUrl}/submissions/${token}?base64_encoded=true&fields=token,status,stdout,stderr,compile_output,time,memory`,
        { method: 'GET' }
      )
      if (!res.ok) {
        throw new Error(`Judge0 get submission failed (${res.status}): ${await res.text()}`)
      }
      const data = await res.json()
      return parseRawResult(data)
    },

    async createBatchSubmissions(reqs: Judge0SubmissionRequest[]): Promise<{ token: string }[]> {
      const submissions = reqs.map((req) => {
        const item: Record<string, unknown> = {
          language_id: req.language_id,
          source_code: toBase64(req.source_code),
        }
        if (req.stdin !== undefined) {
          item.stdin = toBase64(req.stdin)
        }
        if (req.cpu_time_limit !== undefined) {
          item.cpu_time_limit = req.cpu_time_limit
        }
        if (req.memory_limit !== undefined) {
          item.memory_limit = req.memory_limit
        }
        return item
      })

      const res = await fetchWithTimeout(
        `${baseUrl}/submissions/batch?base64_encoded=true`,
        {
          method: 'POST',
          body: JSON.stringify({ submissions }),
        },
        25_000
      )
      if (!res.ok) {
        throw new Error(`Judge0 create batch submissions failed (${res.status}): ${await res.text()}`)
      }
      const data = await res.json()
      if (!Array.isArray(data)) {
        throw new Error(`Judge0 batch response is not an array: ${JSON.stringify(data)}`)
      }
      return data.map((item: any) => ({ token: item.token }))
    },

    async getBatchSubmissions(tokens: string[]): Promise<Judge0SubmissionResponse[]> {
      if (tokens.length === 0) return []
      const res = await fetchWithTimeout(
        `${baseUrl}/submissions/batch?tokens=${tokens.join(',')}&base64_encoded=true&fields=token,status,stdout,stderr,compile_output,time,memory`,
        { method: 'GET' }
      )
      if (!res.ok) {
        throw new Error(`Judge0 get batch submissions failed (${res.status}): ${await res.text()}`)
      }
      const data = await res.json()
      const list = Array.isArray(data.submissions) ? data.submissions : []
      const map = new Map<string, any>()
      for (const item of list) {
        if (item && item.token) {
          map.set(item.token, item)
        }
      }
      return tokens.map((token) => {
        const item = map.get(token)
        if (!item) {
          return {
            token,
            status: { id: JUDGE0_STATUS.IN_QUEUE, description: 'In Queue' },
            stdout: null,
            stderr: null,
            compile_output: null,
            time: null,
            memory: null,
          }
        }
        return parseRawResult(item)
      })
    },

    async run(req: Judge0SubmissionRequest, maxWaitMs = 20_000): Promise<Judge0RunResult> {
      const { token } = await this.createSubmission(req)
      const startTime = Date.now()

      while (Date.now() - startTime < maxWaitMs) {
        const sub = await this.getSubmission(token)
        if (
          sub.status.id !== JUDGE0_STATUS.IN_QUEUE &&
          sub.status.id !== JUDGE0_STATUS.PROCESSING
        ) {
          const stdout = truncateUtf8(sub.stdout ?? '', 65536)
          const stderr = truncateUtf8(sub.stderr ?? '', 8192)
          return {
            stdout,
            stderr,
            compileOutput: sub.compile_output,
            status: sub.status,
            timeSeconds: sub.time ?? 0,
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      // If timed out waiting on Judge0, return status as TIME_LIMIT_EXCEEDED
      return {
        stdout: '',
        stderr: 'Execution timed out',
        compileOutput: null,
        status: { id: JUDGE0_STATUS.TIME_LIMIT_EXCEEDED, description: 'Time Limit Exceeded' },
        timeSeconds: maxWaitMs / 1000,
      }
    },
  }
}

let injectedClient: Judge0Client | null = null

export function setJudge0Client(client: Judge0Client | null): void {
  injectedClient = client
}

export function getJudge0Client(customUrl?: string): Judge0Client {
  if (injectedClient) {
    return injectedClient
  }
  const url =
    customUrl ||
    Deno.env.get('JUDGE0_URL') ||
    'https://ce.judge0.com'
  const authHeader = Deno.env.get('JUDGE0_AUTH_HEADER') || undefined
  const authToken = Deno.env.get('JUDGE0_AUTH_TOKEN') || undefined
  return createJudge0Client({ url, authHeader, authToken })
}
