import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import type { ExecFileSyncOptionsWithStringEncoding } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { CODE_PROBLEMS } from '../supabase/functions/_shared/registry.ts'
import { compareOutput } from '../supabase/functions/_shared/code/compare.ts'
import type { CodeProblem } from '../supabase/functions/_shared/content/code/types.ts'

// File-backed stdin avoids synchronous-pipe stalls with large generated inputs.
function runWithInputFile(command: string, args: string[], inputFile: string, options: ExecFileSyncOptionsWithStringEncoding): string {
  const input = fs.openSync(inputFile, 'r')
  try {
    return execFileSync(command, args, { ...options, stdio: [input, 'pipe', 'pipe'] })
  } finally {
    fs.closeSync(input)
  }
}

/**
 * Builds and verifies code problem test suites locally.
 * 1. Run gen.py <group> <seed>. Writes one multi-test input per group to build/code-tests/<slug>/<group>.in
 * 2. Run validator on every input (non-zero exit fails build)
 * 3. Compile and run ref.cpp to produce .out files, failing if any exceeds cpuSeconds * 0.5
 * 4. Run brute.py on groups labelled small and require identical output
 * 5. Run each wrong solution and require it to fail exactly at its declared group (earlier groups pass)
 */
export function buildProblem(problem: CodeProblem): void {
  console.log(`\n=== Building ${problem.slug} ===`)

  const slug = problem.slug
  const srcDir = path.resolve('content/code', slug)
  const buildDir = path.resolve('build/code-tests', slug)

  if (!fs.existsSync(srcDir)) {
    throw new Error(`Problem directory not found: ${srcDir}`)
  }

  fs.mkdirSync(buildDir, { recursive: true })

  // Ensure DEVELOPER_DIR is set on macOS so g++ doesn't prompt for Xcode license
  const env = {
    ...process.env,
    DEVELOPER_DIR: process.env.DEVELOPER_DIR || '/Library/Developer/CommandLineTools',
  }

  // 1. Generate inputs for all groups
  console.log(`1. Generating test groups (${problem.groups.length} groups)...`)
  for (let i = 0; i < problem.groups.length; i++) {
    const group = problem.groups[i]
    const inFile = path.join(buildDir, `${group.label}.in`)
    const seed = 1000 + i * 37

    const genScript = path.join(srcDir, 'gen.py')
    const out = execFileSync('python3', [genScript, group.label, String(seed), inFile], {
      cwd: srcDir,
      encoding: 'utf-8',
      env,
    })

    // If gen.py printed to stdout rather than writing directly to inFile, save it
    if (!fs.existsSync(inFile) || fs.statSync(inFile).size === 0) {
      if (out && out.trim().length > 0) {
        fs.writeFileSync(inFile, out, 'utf-8')
      } else {
        throw new Error(`gen.py produced empty input for group ${group.label}`)
      }
    }
  }

  // 2. Run validator on every input
  console.log('2. Running validator on inputs...')
  const validatorScript = path.join(srcDir, 'validator.py')
  for (const group of problem.groups) {
    const inFile = path.join(buildDir, `${group.label}.in`)

    try {
      runWithInputFile('python3', [validatorScript], inFile, {
        cwd: srcDir,
        encoding: 'utf-8',
        env,
        timeout: 10000,
      })
      console.log(`  ✓ group '${group.label}' validated`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Validator failed on group '${group.label}': ${msg}`)
    }
  }

  // 3. Compile and run ref.cpp
  console.log('3. Compiling and running reference solution (ref.cpp)...')
  const refSrc = path.join(srcDir, 'solutions/ref.cpp')
  const refBin = path.join(buildDir, 'ref')

  execFileSync('g++', ['-O3', '-std=c++17', refSrc, '-o', refBin], {
    cwd: srcDir,
    encoding: 'utf-8',
    env,
  })

  const halfLimitSec = problem.limits.cpuSeconds * 0.5
  for (const group of problem.groups) {
    const inFile = path.join(buildDir, `${group.label}.in`)
    const outFile = path.join(buildDir, `${group.label}.out`)

    const start = performance.now()
    const outData = runWithInputFile(refBin, [], inFile, {
      encoding: 'utf-8',
      env,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 10000,
    })
    const elapsedSec = (performance.now() - start) / 1000

    fs.writeFileSync(outFile, outData, 'utf-8')

    if (elapsedSec > halfLimitSec) {
      throw new Error(
        `ref.cpp exceeded half cpuSeconds limit on group '${group.label}': ${elapsedSec.toFixed(3)}s > ${halfLimitSec.toFixed(3)}s`,
      )
    }
    console.log(
      `  ✓ ref passed '${group.label}' in ${elapsedSec.toFixed(3)}s (half limit: ${halfLimitSec.toFixed(3)}s)`,
    )
  }

  const pythonSource = problem.referenceSolutions?.python
  let pythonRef = path.join(srcDir, 'solutions/ref.py')
  if (!fs.existsSync(pythonRef)) {
    if (!pythonSource) throw new Error(`Missing Python reference for ${slug}`)
    pythonRef = path.join(buildDir, 'ref.py')
    fs.writeFileSync(pythonRef, pythonSource, 'utf-8')
  }
  for (const group of problem.groups) {
    const inputFile = path.join(buildDir, `${group.label}.in`)
    const expected = fs.readFileSync(path.join(buildDir, `${group.label}.out`), 'utf-8')
    const start = performance.now()
    const actual = runWithInputFile('python3', [pythonRef], inputFile, { encoding: 'utf-8', env, timeout: Math.ceil(halfLimitSec * 1000),
      maxBuffer: 20 * 1024 * 1024,
    })
    if (!compareOutput(expected, actual, problem.checker)) {
      throw new Error(`Python reference disagrees with C++ on '${group.label}'`)
    }
    if ((performance.now() - start) / 1000 > halfLimitSec) {
      throw new Error(`Python reference exceeded half cpuSeconds on '${group.label}'`)
    }
    console.log(`  ✓ Python ref passed '${group.label}' within half limit`)
  }

  // 4. Run brute.py on groups labelled small and require identical output
  console.log('4. Checking brute force against ref on small groups...')
  const bruteScript = path.join(srcDir, 'solutions/brute.py')
  if (fs.existsSync(bruteScript)) {
    for (const group of problem.groups) {
      if (group.label.toLowerCase().includes('small')) {
        const inFile = path.join(buildDir, `${group.label}.in`)
        const outFile = path.join(buildDir, `${group.label}.out`)
            const expected = fs.readFileSync(outFile, 'utf-8')

        const bruteOut = runWithInputFile('python3', [bruteScript], inFile, {
          cwd: srcDir,
          encoding: 'utf-8',
          env,
          timeout: problem.limits.cpuSeconds * 2000,
        })

        if (!compareOutput(expected, bruteOut, problem.checker)) {
          throw new Error(`brute.py output does not match ref on group '${group.label}'`)
        }
        console.log(`  ✓ brute matched ref on '${group.label}'`)
      }
    }
  }

  // 5. Run each wrong solution and require it to fail exactly at its declared group
  console.log('5. Testing known-wrong solutions...')
  for (const w of problem.wrong) {
    const wrongPath = path.join(srcDir, 'solutions', w.file)
    if (!fs.existsSync(wrongPath)) {
      throw new Error(`Declared wrong solution file not found: ${w.file}`)
    }

    let runCmd: string
    let runArgs: string[] = []

    if (w.file.endsWith('.cpp')) {
      const wrongBin = path.join(buildDir, path.basename(w.file, '.cpp'))
      execFileSync('g++', ['-O3', '-std=c++17', wrongPath, '-o', wrongBin], {
        cwd: srcDir,
        encoding: 'utf-8',
        env,
      })
      runCmd = wrongBin
    } else if (w.file.endsWith('.py')) {
      runCmd = 'python3'
      runArgs = [wrongPath]
    } else {
      throw new Error(`Unsupported wrong solution extension: ${w.file}`)
    }

    // Must pass groups 0 .. w.failsGroup - 1, and fail at w.failsGroup
    for (let gIdx = 0; gIdx <= w.failsGroup; gIdx++) {
      const group = problem.groups[gIdx]
      const inFile = path.join(buildDir, `${group.label}.in`)
      const expected = path.join(buildDir, `${group.label}.out`)
        const expectedData = fs.readFileSync(expected, 'utf-8')

      let actualOut: string | null = null
      let failed = false

      try {
        actualOut = runWithInputFile(runCmd, runArgs, inFile, {
          encoding: 'utf-8',
          env,
          timeout: Math.floor(problem.limits.cpuSeconds * 1000),
          maxBuffer: 10 * 1024 * 1024,
        })
        if (!compareOutput(expectedData, actualOut, problem.checker)) {
          failed = true
        }
      } catch {
        // TLE, runtime error, or crash
        failed = true
      }

      if (gIdx < w.failsGroup) {
        if (failed) {
          throw new Error(
            `Wrong solution '${w.file}' was declared to fail group ${w.failsGroup} (${problem.groups[w.failsGroup].label}), but unexpectedly failed earlier group ${gIdx} (${group.label})!`,
          )
        }
      } else {
        // gIdx === w.failsGroup: MUST FAIL
        if (!failed) {
          throw new Error(
            `Wrong solution '${w.file}' was declared to fail group ${w.failsGroup} (${group.label}), but it passed!`,
          )
        }
        console.log(
          `  ✓ '${w.file}' passed groups 0..${gIdx - 1} and failed at declared group ${w.failsGroup} ('${group.label}')`,
        )
      }
    }
  }

  console.log(`✅ ${problem.slug} built and verified successfully.`)
}

export function buildAllCode(): void {
  console.log(`Starting code test build for ${CODE_PROBLEMS.length} problems...`)
  for (const p of CODE_PROBLEMS) {
    buildProblem(p)
  }
  console.log(`\n🎉 All ${CODE_PROBLEMS.length} code problems built and verified.`)
}

// CLI entry point
if (process.argv[1]?.endsWith('code-build.ts')) {
  try {
    const slug = process.argv[2]
    if (slug) {
      const problem = CODE_PROBLEMS.find((p) => p.slug === slug)
      if (!problem) throw new Error(`Unknown code problem: ${slug}`)
      buildProblem(problem)
    } else buildAllCode()
    process.exit(0)
  } catch (err: unknown) {
    console.error('\n❌ Code build failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}
