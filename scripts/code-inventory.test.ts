import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { CODE_PROBLEMS } from '../supabase/functions/_shared/registry.ts'
import { CONCEPTS } from '../supabase/functions/_shared/catalog.ts'

describe('Task 6.5 coding launch inventory', () => {
  it('new validators reject truncation, trailing tokens, and zero lengths', () => {
    const problems = CODE_PROBLEMS.filter((p) => p.review.author === 'GPT-6')
    const inputs = problems.map((p) => ({ file: path.resolve('content/code', p.slug, 'validator.py'), sample: p.samples[0].input }))
    const script = `import sys,json,importlib.util
sys.dont_write_bytecode=True
for case in json.load(sys.stdin):
 spec=importlib.util.spec_from_file_location('validator',case['file'])
 module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
 sample=case['sample']; module.validate(sample)
 invalids=[sample+'999\\n', ' '.join(sample.split()[:-1]), '1\\n0 0\\n']
 if case['file'].endswith('code.two-pointers.nearby-pairs/validator.py'): invalids.append('1\\n1 101\\n0\\n')
 for invalid in invalids:
  try: module.validate(invalid)
  except (ValueError,IndexError): pass
  else: raise AssertionError(case['file']+' accepted invalid input')
`
    const result = spawnSync('python3', ['-c', script], { input: JSON.stringify(inputs), encoding: 'utf-8', timeout: 10000 })
    expect(result.status, result.stderr).toBe(0)
    for (const p of problems) {
      const ref = path.resolve('content/code', p.slug, 'solutions/ref.py')
      expect(fs.readFileSync(ref, 'utf-8')).toBe(p.referenceSolutions?.python)
    }
  })
  it('has five drafts for every coding concept and an echo partner in every family', () => {
    expect(CODE_PROBLEMS).toHaveLength(45)
    expect(new Set(CODE_PROBLEMS.map((p) => p.id)).size).toBe(45)
    for (const concept of CONCEPTS.filter((c) => c.track === 'code')) {
      const problems = CODE_PROBLEMS.filter((p) => p.concept === concept.id)
      expect(problems).toHaveLength(5)
      expect(problems.map((p) => p.initialRating).sort((a, b) => a - b)).toEqual(expect.arrayContaining([800, 1000, 1600, 2000]))
    }
    for (const p of CODE_PROBLEMS) {
      expect(p.status).toBe('draft')
      expect(p.review.reviewer).toBeNull()
      expect(p.review.reviewedAt).toBeNull()
      expect(CODE_PROBLEMS.filter((q) => q.family === p.family).length).toBeGreaterThanOrEqual(2)
      expect(p.referenceSolutions?.cpp).toBeTruthy()
      expect(p.referenceSolutions?.python).toBeTruthy()
      const dir = path.resolve('content/code', p.slug)
      for (const file of ['gen.py', 'validator.py', 'solutions/ref.cpp', 'solutions/brute.py', ...p.wrong.map((w) => `solutions/${w.file}`)]) {
        expect(fs.existsSync(path.join(dir, file)), `${p.slug}/${file}`).toBe(true)
      }
      expect(p.wrong.length).toBeGreaterThanOrEqual(2)
      for (const wrong of p.wrong) expect(p.groups[wrong.failsGroup]).toBeDefined()
    }
  })
})
