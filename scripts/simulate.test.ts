import { describe, expect, it } from 'vitest'
import { runSimulation } from './simulate.ts'

describe('simulate.ts - ERM-1 model simulation gate', () => {
  it('runs small configuration (100 learners × 60) and asserts post-placement success in [0.62, 0.78]', () => {
    const report = runSimulation({
      numLearners: 100,
      totalResponses: 60,
      learn: 0.5,
      seed: 42,
    })

    const at60 = report.milestones.find((m) => m.responses === 60)
    expect(at60).toBeDefined()
    expect(at60!.postPlacementSuccessRate).toBeGreaterThanOrEqual(0.62)
    expect(at60!.postPlacementSuccessRate).toBeLessThanOrEqual(0.78)

    // Also assert that learner median error converged nicely (<= 75)
    expect(at60!.medianLearnerError).toBeLessThanOrEqual(75)
  })
})
