import { beforeEach, afterEach, expect, it, vi } from 'vitest'

let feedback: typeof import('./feedback.ts')
const frequencies: number[] = []
const close = vi.fn(async () => {})
const context = {
  state: 'running', currentTime: 0, destination: {}, close,
  resume: vi.fn(async () => {}),
  createOscillator: () => ({
    type: 'sine', frequency: { setValueAtTime: (frequency: number) => frequencies.push(frequency) },
    connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
  }),
  createGain: () => ({
    gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }),
}
const Audio = vi.fn(function () { return context })

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  frequencies.length = 0
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) })
  vi.stubGlobal('AudioContext', Audio)
  feedback = await import('./feedback.ts')
})
afterEach(() => vi.unstubAllGlobals())

it('is silent by default and creates no audio context until explicitly enabled', async () => {
  expect(feedback.isSoundEnabled()).toBe(false)
  await feedback.prepareSound()
  await feedback.playOutcomeSound('correct')
  expect(Audio).not.toHaveBeenCalled()
})

it('plays distinct brief win and loss sounds and stops audio when disabled', async () => {
  feedback.setSoundEnabled(true)
  await feedback.playOutcomeSound('correct')
  expect(frequencies).toEqual([523.25, 659.25, 783.99])
  frequencies.length = 0
  await feedback.playOutcomeSound('incorrect')
  expect(frequencies).toEqual([329.63, 293.66])
  feedback.setSoundEnabled(false)
  expect(close).toHaveBeenCalledOnce()
  expect(feedback.isSoundEnabled()).toBe(false)
})

it('sounds only a newly resolved attempt, never a restored result or a retry', () => {
  const presented = { id: 'one', state: 'presented' }
  const resolved = { id: 'one', state: 'resolved', result: { outcome: 'correct' as const } }
  expect(feedback.newlyResolvedOutcome(presented, resolved)).toBe('correct')
  expect(feedback.newlyResolvedOutcome({ ...presented, state: 'judging' }, resolved)).toBe('correct')
  expect(feedback.newlyResolvedOutcome(null, resolved)).toBeNull()
  expect(feedback.newlyResolvedOutcome(resolved, resolved)).toBeNull()
  expect(feedback.newlyResolvedOutcome({ ...presented, id: 'another' }, resolved)).toBeNull()
})

it('keeps optional sound failures from interrupting practice', async () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Blocked storage') }, setItem: () => { throw new Error('Blocked storage') } })
  expect(feedback.isSoundEnabled()).toBe(false)
  vi.stubGlobal('AudioContext', vi.fn(function () { throw new Error('Audio unavailable') }))
  expect(() => feedback.setSoundEnabled(true)).not.toThrow()
  await expect(feedback.playOutcomeSound('correct')).resolves.toBeUndefined()
})
