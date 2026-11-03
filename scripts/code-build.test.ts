import { afterEach, describe, expect, it, vi } from 'vitest'
import { robotWalkProblem } from '../supabase/functions/_shared/content/code/code.implementation.robot-walk.ts'
const state = vi.hoisted(() => ({ python: '0 1\n', calls: [] as string[], validatorTimeouts: [] as number[], fileInputs: [] as boolean[] }))
vi.mock('node:fs', () => ({ default: {
  openSync: () => 42, closeSync: () => undefined,
  existsSync: () => true, mkdirSync: () => undefined,
  statSync: () => ({ size: 10 }), writeFileSync: () => undefined,
  readFileSync: (file: string) => file.endsWith('.in') ? '1\nF\n' : '0 1\n',
} }))
vi.mock('node:child_process', () => ({ execFileSync: (cmd: string, args: string[], options?: { timeout?: number; stdio?: unknown[] }) => {
  if (cmd === 'python3' && args[0]?.endsWith('/validator.py')) state.validatorTimeouts.push(options?.timeout ?? 0)
  if (cmd === 'python3' && args[0]?.endsWith('/ref.py')) state.fileInputs.push(typeof options?.stdio?.[0] === 'number')
  state.calls.push([cmd, ...args].join(' '))
  return cmd === 'python3' && args[0]?.endsWith('/ref.py') ? state.python : '0 1\n'
} }))
import { buildProblem } from './code-build.ts'
afterEach(() => { state.python = '0 1\n'; state.calls = []; state.validatorTimeouts = []; state.fileInputs = [] })
describe('code builder Python reference verification', () => {
  const problem = { ...robotWalkProblem, groups: [{ label: 'small', fingerprint: 'minimal' }], wrong: [] }
  it('runs the Python reference as well as the C++ reference', () => {
    buildProblem(problem)
    expect(state.calls.some((c) => c.startsWith('python3 ') && c.endsWith('/ref.py'))).toBe(true)
  })
  it('bounds validator execution so a stuck pipe cannot hang the build', () => {
    buildProblem(problem)
    expect(state.validatorTimeouts.length).toBeGreaterThan(0)
    expect(state.validatorTimeouts.every((timeout) => timeout > 0)).toBe(true)
  })
  it('feeds reference input from a file descriptor rather than a synchronous pipe', () => {
    buildProblem(problem)
    expect(state.fileInputs).toEqual([true])
  })
  it('rejects a Python reference that disagrees with C++', () => {
    state.python = '1 0\n'
    expect(() => buildProblem(problem)).toThrow(/Python reference.*small/)
  })
})
