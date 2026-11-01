type Outcome = 'correct' | 'incorrect' | 'gave_up' | 'abandoned'
type SoundAttempt = { id: string; state: string; result?: { outcome: Outcome } }
let enabled: boolean | undefined
let audio: AudioContext | null = null

export function isSoundEnabled(): boolean {
  if (enabled === undefined) {
    try { enabled = localStorage.getItem('eleanor_sound') === 'on' } catch { enabled = false }
  }
  return enabled
}

export async function prepareSound(): Promise<void> {
  if (!isSoundEnabled() || typeof AudioContext === 'undefined') return
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') await audio.resume()
  } catch {
    // Optional audio must never interrupt an answer or hide its result.
  }
}

export function setSoundEnabled(value: boolean): void {
  enabled = value
  try { localStorage.setItem('eleanor_sound', value ? 'on' : 'off') } catch { /* Session-only preference if storage is blocked. */ }
  if (value) void prepareSound()
  else {
    void audio?.close().catch(() => {})
    audio = null
  }
}

export async function playOutcomeSound(outcome: Outcome): Promise<void> {
  if (outcome === 'abandoned' || !isSoundEnabled()) return
  await prepareSound()
  const context = audio
  if (!isSoundEnabled() || !context || context.state !== 'running') return
  try {
    const notes = outcome === 'correct' ? [523.25, 659.25, 783.99] : [329.63, 293.66]
    notes.forEach((frequency, index) => {
      const start = context.currentTime + index * 0.09
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, start)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.045, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.3)
    })
  } catch {
    // Audio devices can disappear while a result is arriving.
  }
}

export function newlyResolvedOutcome(previous: SoundAttempt | null, current: SoundAttempt | null): Outcome | null {
  return previous && current && previous.id === current.id &&
    (previous.state === 'presented' || previous.state === 'judging') &&
    (current.state === 'resolved' || current.state === 'revealed')
    ? current.result?.outcome ?? null : null
}
