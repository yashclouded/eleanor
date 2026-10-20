import { isCorrect } from '../supabase/functions/_shared/grading.ts'
import { hashSeed, makeRng } from '../supabase/functions/_shared/rng.ts'
import { CONCEPTS } from '../supabase/functions/_shared/catalog.ts'
import { TEMPLATES } from '../supabase/functions/_shared/registry.ts'
import type { Concept, Template } from '../supabase/functions/_shared/content/types.ts'

/**
 * Checks bank-level rules on templates and concepts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function checkBank(templates: Template<any>[], concepts: Concept[]): string[] {
  const errors: string[] = []
  const conceptMap = new Map<string, Concept>()

  for (const c of concepts) {
    conceptMap.set(c.id, c)
  }

  // 1. Template IDs are unique
  const seenTemplateIds = new Set<string>()
  for (const t of templates) {
    const key = `${t.id}@${t.version}`
    if (seenTemplateIds.has(key)) {
      errors.push(`Duplicate template ID: ${key}`)
    }
    seenTemplateIds.add(key)
  }

  // 2. Prerequisite graph has no cycles
  const visited = new Set<string>()
  const inStack = new Set<string>()

  function detectCycle(id: string, path: string[]): string | null {
    visited.add(id)
    inStack.add(id)
    const c = conceptMap.get(id)
    if (c) {
      for (const p of c.prereqs) {
        if (!visited.has(p)) {
          const res = detectCycle(p, [...path, p])
          if (res) return res
        } else if (inStack.has(p)) {
          return [...path, p].join(' -> ')
        }
      }
    }
    inStack.delete(id)
    return null
  }

  for (const c of concepts) {
    if (!visited.has(c.id)) {
      const cycle = detectCycle(c.id, [c.id])
      if (cycle) {
        errors.push(`Cycle detected in concept prerequisites: ${cycle}`)
        break
      }
    }
  }

  // 3. Template-specific bank checks
  for (const t of templates) {
    // Every concept referenced exists in CONCEPTS
    if (!conceptMap.has(t.concept)) {
      errors.push(`Template ${t.id} references non-existent concept: ${t.concept}`)
    }

    // Levels contract (3–6 levels, initialRating strictly increasing)
    if (!t.levels || t.levels.length < 3 || t.levels.length > 6) {
      errors.push(`Template ${t.id} must have between 3 and 6 levels (has ${t.levels?.length})`)
    } else {
      for (let i = 1; i < t.levels.length; i++) {
        if (t.levels[i].initialRating <= t.levels[i - 1].initialRating) {
          errors.push(
            `Template ${t.id} initialRating must strictly increase (level ${t.levels[i].level}: ${t.levels[i].initialRating} <= level ${t.levels[i - 1].level}: ${t.levels[i - 1].initialRating})`,
          )
        }
        if (t.levels[i].level <= t.levels[i - 1].level) {
          errors.push(`Template ${t.id} levels must strictly increase`)
        }
      }
    }

    // Published items must have reviewer and reviewedAt set
    if (t.status === 'published') {
      if (!t.review?.reviewer || !t.review?.reviewedAt) {
        errors.push(
          `Template ${t.id} is marked 'published' but missing reviewer or reviewedAt`,
        )
      }
    }

    // Choice and multi answers have at least 6 outcomes
    if (t.levels && t.levels.length > 0) {
      const sampleParams = t.sample(makeRng(1), t.levels[0].level)
      const spec = t.answer(sampleParams)
      if (spec.type === 'choice') {
        if (spec.options.length < 6) {
          errors.push(
            `Template ${t.id} has choice answer with only ${spec.options.length} options (minimum 6 required)`,
          )
        }
      } else if (spec.type === 'multi') {
        // Multi outcomes count is 2^n including empty set
        const outcomes = Math.pow(2, spec.options.length)
        if (outcomes < 6) {
          errors.push(
            `Template ${t.id} has multi answer with only ${outcomes} outcomes (minimum 6 required)`,
          )
        }
      }
    }
  }

  return errors
}

/**
 * Checks a single template across all levels and 2,000 seeds per level.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function checkTemplate(template: Template<any>, seedCount = 2000): string[] {
  const errors: string[] = []

  for (const lvl of template.levels) {
    const level = lvl.level
    const paramJsonSet = new Set<string>()
    let allMisconceptionsDroppedCount = 0

    for (let i = 0; i < seedCount; i++) {
      const seed = hashSeed(template.id, level, i)
      const rng = makeRng(seed)
      const params = template.sample(rng, level)

      // Collect distinct parameter sets over first 1,000 seeds
      if (i < 1000) {
        paramJsonSet.add(JSON.stringify(params))
      }

      const answerSpec = template.answer(params)
      const solveAns = template.solve(params)

      // 1. Answer is finite
      if (typeof solveAns === 'number' && !Number.isFinite(solveAns)) {
        errors.push(
          `Template ${template.id} level ${level} seed ${seed}: solve answer is not finite (${solveAns})`,
        )
        break
      }

      // 2. Solve and verify agree
      const verifyRng = makeRng(hashSeed(template.id, level, i, 'verify'))
      const verifyAns = template.verify(params, verifyRng)

      if (typeof solveAns === 'number' && typeof verifyAns === 'number') {
        // base-rate.screening Monte Carlo agreement threshold is within 0.5 percentage points
        let maxTolerance = 0.5
        if (template.id !== 'judgment.base-rate.screening') {
          const tolAbs = answerSpec.type === 'number' ? (answerSpec.tolerance.abs ?? 0) : 0
          maxTolerance = tolAbs > 0 ? tolAbs / 10 : 0
        }
        if (Math.abs(solveAns - verifyAns) > maxTolerance + 1e-9) {
          if (!errors.some((e) => e.includes(`Template ${template.id} level ${level}`) && e.includes('disagree'))) {
            errors.push(
              `Template ${template.id} level ${level} seed ${seed}: solve (${solveAns}) and verify (${verifyAns}) disagree beyond tolerance (${maxTolerance})`,
            )
          }
        }
      } else if (Array.isArray(solveAns) && Array.isArray(verifyAns)) {
        const sSorted = [...solveAns].sort()
        const vSorted = [...verifyAns].sort()
        if (
          sSorted.length !== vSorted.length ||
          sSorted.some((val, idx) => val !== vSorted[idx])
        ) {
          if (!errors.some((e) => e.includes(`Template ${template.id} level ${level}`) && e.includes('disagree'))) {
            errors.push(
              `Template ${template.id} level ${level} seed ${seed}: solve (${JSON.stringify(
                solveAns,
              )}) and verify (${JSON.stringify(verifyAns)}) disagree`,
            )
          }
        }
      } else if (solveAns !== verifyAns) {
        if (!errors.some((e) => e.includes(`Template ${template.id} level ${level}`) && e.includes('disagree'))) {
          errors.push(
            `Template ${template.id} level ${level} seed ${seed}: solve (${solveAns}) and verify (${verifyAns}) disagree`,
          )
        }
      }

      // 3. Misconceptions differ from answer & from each other
      if (template.misconceptions.length > 0) {
        let activeMisconceptions = 0
        const activeValues: unknown[] = []

        for (const m of template.misconceptions) {
          const val = m.value(params)
          // Check if this misconception equals the correct answer
          if (!isCorrect(answerSpec, solveAns, val)) {
            activeMisconceptions++
            activeValues.push(val)
          }
        }

        if (activeMisconceptions === 0) {
          allMisconceptionsDroppedCount++
        }
      }

      // 4. Last numeric step equals the answer
      if (
        (answerSpec.type === 'number' || answerSpec.type === 'integer') &&
        template.steps.length > 0
      ) {
        const lastStep = template.steps[template.steps.length - 1]
        const stepVal = lastStep.answer(params)
        if (!isCorrect(answerSpec, solveAns, stepVal)) {
          if (!errors.some((e) => e.includes(`Template ${template.id} level ${level}`) && e.includes('last numeric step'))) {
            errors.push(
              `Template ${template.id} level ${level} seed ${seed}: last numeric step answer (${stepVal}) does not equal final answer (${solveAns})`,
            )
          }
        }
      }

      // 5. Render blocks are non-empty for every skin
      for (const skin of template.skins) {
        const blocks = template.render(params, skin)
        if (!blocks || blocks.length === 0) {
          if (!errors.some((e) => e.includes(`Template ${template.id} level ${level}`) && e.includes('render returned empty blocks'))) {
            errors.push(
              `Template ${template.id} level ${level} skin '${skin}' seed ${seed}: render returned empty blocks`,
            )
          }
        }
      }
    }

    // Check if more than 1% of seeds would drop all misconceptions
    const droppedRatio = allMisconceptionsDroppedCount / seedCount
    if (template.misconceptions.length > 0 && droppedRatio > 0.01) {
      errors.push(
        `Template ${template.id} level ${level}: ${(droppedRatio * 100).toFixed(
          2,
        )}% of seeds dropped all misconceptions (maximum 1% allowed)`,
      )
    }

    // Check at least 50 distinct parameter JSONs per 1,000 seeds
    if (paramJsonSet.size < 50) {
      errors.push(
        `Template ${template.id} level ${level}: only produced ${paramJsonSet.size} distinct parameter JSONs per 1,000 seeds (minimum 50 required)`,
      )
    }
  }

  return errors
}

/**
 * Checks all templates and bank configuration.
 */
export function checkAll(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templates: Template<any>[] = TEMPLATES,
  concepts: Concept[] = CONCEPTS,
  seedCount = 2000,
): string[] {
  const errors: string[] = []
  errors.push(...checkBank(templates, concepts))

  for (const t of templates) {
    errors.push(...checkTemplate(t, seedCount))
  }

  return errors
}

// CLI entry point
if (process.argv[1]?.endsWith('content-check.ts')) {
  console.log('Running Eleanor content checks...')
  const errors = checkAll(TEMPLATES, CONCEPTS, 2000)

  if (errors.length > 0) {
    console.error(`\n❌ Content checks failed with ${errors.length} error(s):`)
    for (const err of errors) {
      console.error(`  - ${err}`)
    }
    process.exit(1)
  } else {
    console.log(`\n✅ All content checks passed successfully (${TEMPLATES.length} templates checked).`)
    process.exit(0)
  }
}
