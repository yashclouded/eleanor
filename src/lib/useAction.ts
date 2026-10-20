import { useState, useRef, useCallback } from 'react'
import type { ApiError } from './api.ts'

export function useAction<A, R>(
  fn: (args: A & { transitionId: string }) => Promise<R>
): {
  run(args: A): Promise<R>
  pending: boolean
  error: ApiError | null
  reset(): void
} {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const transitionIdRef = useRef<string | null>(null)

  const reset = useCallback(() => {
    transitionIdRef.current = null
    setError(null)
    setPending(false)
  }, [])

  const run = useCallback(
    async (args: A): Promise<R> => {
      if (!transitionIdRef.current) {
        transitionIdRef.current = crypto.randomUUID()
      }
      setPending(true)
      setError(null)
      try {
        const result = await fn({ ...args, transitionId: transitionIdRef.current })
        transitionIdRef.current = null
        setPending(false)
        return result
      } catch (err) {
        setPending(false)
        const apiErr = err as ApiError
        setError(apiErr)
        throw err
      }
    },
    [fn]
  )

  return { run, pending, error, reset }
}
