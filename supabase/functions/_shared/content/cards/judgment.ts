import type { ConceptCard } from '../types.ts'

export const JUDGMENT_CARDS: ConceptCard[] = [
  {
    conceptId: 'judgment.frequencies',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Natural frequencies represent uncertainty by tracking raw, unnormalized counts of individuals in a concrete population rather than manipulating percentages or decimal probabilities. Human cognitive reasoning evolved to process discrete encounters with objects and people, so fractions with shifting denominators often induce cognitive overload. When conditional relationships are expressed as whole numbers within a fixed reference class, nested probabilistic reasoning resolves into direct comparisons between observed subgroups.',
      },
      {
        t: 'p',
        text: 'Worked Example: Out of 10,000 manufactured circuit boards, 200 are defective and 9,800 are functional. An automated optical scanner correctly flags 90% of defective boards (180 boards) and false-flags 5% of functional boards (490 boards). When a board triggers an inspection alarm, the probability it is genuinely defective is the number of flagged defectives divided by the total number of flagged boards: 180 / (180 + 490) = 180 / 670 ≈ 26.9%.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Forgetting to track the false-positive subgroup when calculating the total pool of positive signals.',
          'Common Traps: Confusing the detector hit rate (90%) with the probability that a flagged item is actually defective (26.9%).',
          'Common Traps: Converting frequencies into rounded intermediate percentages, which introduces compounding precision errors.',
        ],
      },
    ],
  },
  {
    conceptId: 'judgment.estimation',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Fermi estimation breaks an intractable aggregate unknown into a series of smaller, dimensionally consistent sub-factors whose values can be individually bounded. Direct intuitive guesses over vast numerical scales are notoriously vulnerable to cognitive bias and anchoring. By expressing a target quantity as the product of rates, population segments, and physical capacities, independent estimation errors across logarithmic scales tend to partially cancel each other out rather than compounding in a single direction.',
      },
      {
        t: 'p',
        text: 'Worked Example: To estimate the weekly gasoline consumption of a city with 600,000 residents, decompose the problem into vehicle count, distance driven, and fuel economy. Assume roughly 1 passenger vehicle per 2 residents (300,000 vehicles). Assume each vehicle travels 150 kilometers per week and consumes 8 liters of fuel per 100 kilometers (12 liters per vehicle per week). The resulting estimate is 300,000 × 12 = 3,600,000 liters (3.6 × 10^6 liters per week).',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Guessing aggregate numbers directly without decomposing the problem into verifiable physical units.',
          'Common Traps: Failing to enforce dimensional consistency, such as multiplying rates without aligning time intervals.',
          'Common Traps: Conflating linear and logarithmic midpoints when setting plausible lower and upper bounds.',
        ],
      },
    ],
  },
  {
    conceptId: 'judgment.conditional',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Conditional probability measures the likelihood of an outcome given that another event has definitely occurred, denoted P(A | B). Conditioning restricts the valid sample space from the entire universe of possibilities exclusively to outcomes where event B holds true. The probability measure is renormalized across this restricted subspace via the relation P(A | B) = P(A ∩ B) / P(B). Observing new evidence permanently eliminates inconsistent outcomes from the denominator.',
      },
      {
        t: 'p',
        text: 'Worked Example: A software test suite contains 200 automated end-to-end tests. Among these, 50 are integration tests and 40 are known to take longer than ten seconds to finish. Exactly 25 tests are both integration tests and run longer than ten seconds. If an engineer picks a test at random and observes that it took longer than ten seconds, the conditional probability that it is an integration test is P(Integration | Slow) = 25 / 40 = 5/8 = 62.5%.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Falling for the inverse fallacy by treating P(A | B) as equivalent to P(B | A).',
          'Common Traps: Forgetting to restrict the sample space denominator when new qualifying evidence is introduced.',
          'Common Traps: Conditioning on a collider variable that creates spurious dependence between two unrelated causes.',
        ],
      },
    ],
  },
  {
    conceptId: 'judgment.expected-value',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Expected value is the probability-weighted average of all possible quantitative outcomes of a random process: E[X] = Σ x_i · P(X = x_i). It quantifies the long-run average outcome if an identical decision were repeated across thousands of independent trials. Evaluating risky ventures, insurance options, and wagers by expected value provides an objective mathematical foundation for comparing unequal payoffs with varying likelihoods, stripping away emotional reactions to extreme outliers.',
      },
      {
        t: 'p',
        text: 'Worked Example: A logistics provider evaluates insurance for a refrigerated cargo container. The policy premium is $500. Without insurance, there is a 2% chance of a catastrophic cooling failure costing $18,000, a 10% chance of minor temperature deviation costing $2,000, and an 88% chance of zero damage. The uninsured expected financial loss is (0.02 × 18,000) + (0.10 × 2,000) + (0.88 × 0) = $360 + $200 = $560. Because the expected loss ($560) exceeds the fixed premium ($500), purchasing insurance has a positive net expected value of +$60.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Judging a decision by its single realized outcome rather than its expected value at the time of commitment.',
          'Common Traps: Comparing maximum upside payoffs while neglecting their minute probability of occurring.',
          'Common Traps: Confusing expected value with the median or most likely single outcome when distributions are skewed.',
        ],
      },
    ],
  },
  {
    conceptId: 'judgment.risk-framing',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Risk framing describes how human risk tolerance systematically changes depending on whether identical objective payoffs are phrased as gains or losses relative to an arbitrary baseline. Prospect theory reveals that people are typically risk-averse when choosing between potential gains, but become risk-seeking when choosing between potential losses. Clear analytical reasoning requires translating framing rhetoric into raw absolute probabilities and absolute risk differences.',
      },
      {
        t: 'p',
        text: 'Worked Example: A data center with 6,000 servers experiences a severe cooling malfunction. Plan A guarantees that 2,000 servers will be saved with certainty. Plan B offers a 1/3 probability that all 6,000 servers will be saved and a 2/3 probability that no servers will be saved. When framed in terms of lives or equipment saved, decision makers overwhelmingly select Plan A. However, when identical outcomes are framed as losses (Plan A guarantees 4,000 servers are lost; Plan B offers a 2/3 chance of losing 6,000 and 1/3 chance of losing 0), choices flip toward Plan B.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Reversing risk preferences when identical distributions are presented in terms of survival versus mortality.',
          'Common Traps: Overweighting relative risk reductions (e.g. 50% drop) without checking tiny underlying absolute baseline rates.',
          'Common Traps: Failing to identify the arbitrary reference point against which gains and losses are evaluated.',
        ],
      },
    ],
  },
  {
    conceptId: 'judgment.base-rates',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Base rate integration is the disciplined practice of combining background population prevalence with specific diagnostic test results according to Bayes theorem. When a target condition is rare in the general population, the vast pool of healthy or negative cases can produce a total volume of false positives that easily dwarfs true positives, even for diagnostic tests boasting 95% or 99% nominal accuracy. Failing to weight evidence against prior odds results in severe diagnostic misattribution.',
      },
      {
        t: 'p',
        text: 'Worked Example: A rare hardware defect occurs in 0.2% of microchips (2 in 1,000). A diagnostic probe correctly identifies 95% of defective chips, but also triggers a false alarm on 2% of non-defective chips. Across a batch of 100,000 microchips: 200 are defective (yielding 190 positive flags) and 99,800 are good (yielding 1,996 false positive flags). If a chip tests positive, the actual probability that it is defective is 190 / (190 + 1,996) = 190 / 2,186 ≈ 8.69%.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Base rate neglect—assuming a test with 95% accuracy implies a 95% probability of having a rare condition.',
          'Common Traps: Treating test sensitivity P(Positive | Condition) as though it were the predictive value P(Condition | Positive).',
          'Common Traps: Forgetting that a low prior probability requires extraordinarily strong diagnostic evidence to overcome.',
        ],
      },
    ],
  },
  {
    conceptId: 'judgment.independence',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Statistical independence occurs when the occurrence of one event provides zero information about the likelihood of another event: P(A ∩ B) = P(A) · P(B), or equivalently P(A | B) = P(A). When events are correlated through common environmental factors or hidden latent dependencies, multiplying their marginal probabilities severely underestimates systemic joint risks. Valid probabilistic modeling requires explicitly verifying whether underlying mechanisms are truly decoupled before applying product rules.',
      },
      {
        t: 'p',
        text: 'Worked Example: A cloud architecture deploys two independent database replicas in separate geographical zones. Each replica has an independent daily outage probability of 1% (0.01). If their failures are strictly independent, the joint probability of both going down on the same day is 0.01 × 0.01 = 0.0001 (0.01%). However, if both replicas share a single global DNS provider that experiences outages on 0.5% of days, their outages become correlated through that common cause, and the true joint downtime increases dramatically.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Multiplying individual probabilities together without confirming statistical independence.',
          'Common Traps: Falling for the gambler fallacy—believing that independent random trials must balance out short-term streaks.',
          'Common Traps: Overlooking shared common-cause variables that induce correlation between seemingly isolated systems.',
        ],
      },
    ],
  },
  {
    conceptId: 'judgment.regression',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Regression to the mean is the mathematical principle that extreme observations are naturally followed by subsequent measurements closer to the population average whenever measurements involve random noise or imperfect correlation. Any observed performance reflects true underlying ability plus an unpredictable random error term. Outlier performances—whether brilliant or terrible—almost always benefit from extreme random noise that is unlikely to recur on a second trial.',
      },
      {
        t: 'p',
        text: 'Worked Example: A corporate sales division selects the bottom 10% of regional representatives for an intensive performance improvement workshop. Over the following quarter, the average sales volume of these representatives increases by 15%. Management celebrates the training as a major success. However, an analysis of historical sales variance reveals that uncoached cohorts in previous years experienced an identical 11% rebound purely from regression to the mean, meaning the training itself accounted for only 4% of the observed gain.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Inventing elaborate causal explanations for what is fundamentally a statistical mean-reversion artifact.',
          'Common Traps: Evaluating interventions on extreme subgroups without using a randomized control group.',
          'Common Traps: Assuming that an extraordinary initial performance establishes a permanent baseline for future projections.',
        ],
      },
    ],
  },
  {
    conceptId: 'judgment.odds',
    version: 1,
    status: 'draft',
    review: {
      author: 'Eleanor Team',
      reviewer: null,
      reviewedAt: null,
    },
    body: [
      {
        t: 'p',
        text: 'Odds express uncertainty as the ratio of favorable to unfavorable outcomes rather than favorable outcomes to the total pool. In Bayesian inference, the odds formulation simplifies belief revision: Posterior Odds = Prior Odds × Bayes Factor (Likelihood Ratio). Rather than recalculating normalization constants across multiple evidence steps, evidence updates are processed sequentially by multiplying odds by the ratio P(Evidence | H1) / P(Evidence | H2). Odds convert back to standard probability via p = Odds / (1 + Odds).',
      },
      {
        t: 'p',
        text: 'Worked Example: An investigator evaluates whether an archival manuscript is an authentic 18th-century original (H1) or a late copy (H2). The prior odds of authenticity are 1:3 (prior probability = 1/4 = 0.25). Chemical ink analysis reveals an iron gall composition typical of original manuscripts: this feature appears in 60% of authentic works but only 15% of late copies. The Bayes factor is 0.60 / 0.15 = 4. Multiplying the prior odds by the Bayes factor yields posterior odds of (1/3) × 4 = 4:3. In terms of probability, 4 / (4 + 3) = 4/7 ≈ 57.1%.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Confusing probability (successes / total trials) with odds (successes / failures).',
          'Common Traps: Inverting the numerator and denominator of the likelihood ratio, causing belief updates in the wrong direction.',
          'Common Traps: Adding Bayes factors together instead of multiplying them during sequential evidence updates.',
        ],
      },
    ],
  },
]
