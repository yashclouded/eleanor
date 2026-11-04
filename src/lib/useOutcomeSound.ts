import { useEffect, useRef } from 'react'
import type { AttemptView } from './api.ts'
import { newlyResolvedOutcome, playOutcomeSound } from './feedback.ts'

export function useOutcomeSound(attempt: AttemptView | null) {
  const previous = useRef<AttemptView | null>(null)
  useEffect(() => {
    const outcome = newlyResolvedOutcome(previous.current, attempt)
    previous.current = attempt
    if (outcome) void playOutcomeSound(outcome)
  }, [attempt])
}
