// A quiet, original three-note chime; no downloaded audio or network requests.
export function createSuccessSound() {
  let context: AudioContext | null = null

  return {
    prepare() {
      try {
        context ??= new AudioContext()
        if (context.state === 'suspended') void context.resume().catch(() => {})
      } catch {
        // Sound is optional when a browser or device cannot play audio.
      }
    },
    play() {
      try {
        if (!context || context.state !== 'running') return
        const audio = context
        const start = audio.currentTime
        for (const [index, frequency] of [523.25, 659.25, 783.99].entries()) {
          const oscillator = audio.createOscillator()
          const gain = audio.createGain()
          const at = start + index * 0.085
          oscillator.type = 'sine'
          oscillator.frequency.setValueAtTime(frequency, at)
          gain.gain.setValueAtTime(0.0001, at)
          gain.gain.exponentialRampToValueAtTime(0.07, at + 0.012)
          gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28)
          oscillator.connect(gain)
          gain.connect(audio.destination)
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
          oscillator.start(at)
          oscillator.stop(at + 0.3)
        }
      } catch {
        // Feedback must never prevent showing a graded answer.
      }
    },
    dispose() {
      if (context) void context.close().catch(() => {})
      context = null
    },
  }
}
