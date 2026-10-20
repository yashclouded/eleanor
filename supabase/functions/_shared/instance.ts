import { isCorrect } from './grading.ts'
import { makeRng } from './rng.ts'
import type { BuiltInstance, InstanceSecret, Template } from './content/types.ts'

export function itemId(t: { id: string; version: number }, level: number): string {
  return `${t.id}@${t.version}#${level}`
}

export function buildInstance<P>(
  t: Template<P>,
  level: number,
  seed: number,
  skin: string,
): BuiltInstance {
  const rng = makeRng(seed)
  const params = t.sample(rng, level)

  const prompt = t.render(params, skin)
  const answerSpec = t.answer(params)
  const answer = t.solve(params)

  const misconceptions: InstanceSecret['misconceptions'] = []
  for (const m of t.misconceptions) {
    const val = m.value(params)
    const fb = m.feedback(params)
    // Drop misconceptions whose value is correct-equivalent for this seed
    if (!isCorrect(answerSpec, answer, val)) {
      misconceptions.push({ id: m.id, value: val, feedback: fb })
    }
  }

  const steps: InstanceSecret['steps'] = t.steps.map((s) => ({
    prompt: s.prompt(params),
    answer: s.answer(params),
    tolerance: s.tolerance,
    explain: s.explain(params),
  }))

  const solution = t.solution(params)

  return {
    prompt,
    answerSpec,
    skin,
    secret: {
      answer,
      misconceptions,
      steps,
      solution,
    },
  }
}
