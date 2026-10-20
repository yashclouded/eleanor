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
        text: 'Natural frequencies represent uncertainty by tracking raw counts in a concrete population rather than manipulating normalized probabilities or percentages. Translating probabilities into counts of individuals makes nested conditional structures intuitive and reduces cognitive load.',
      },
      {
        t: 'p',
        text: 'Worked Example: Suppose a condition affects 1 in 100 people. A test correctly identifies 90% of affected people, but also flags 10% of unaffected people. In a population of 1,000 people: 10 have the condition and 990 do not. Of the 10 affected, 9 test positive. Of the 990 unaffected, 99 test positive. In total, 108 test positive, of whom 9 actually have the condition (9 / 108 ≈ 8.3%).',
      },
      {
        t: 'p',
        text: 'Common Traps: Forgetting to track the false positive subgroup alongside true positives, or confusing the proportion within a subgroup with the proportion across the entire population.',
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
        text: 'Conditional probability is the probability that an event occurs given that another event has already occurred, denoted P(A | B). Conditioning restricts the sample space from all possibilities to strictly the outcomes where B is true.',
      },
      {
        t: 'p',
        text: 'Worked Example: A standard deck has 52 cards. If you draw a card and are told it is a face card (Jack, Queen, King — 12 cards total), what is the probability it is a King? The restricted sample space has 12 face cards. There are 4 Kings among them, so P(King | Face) = 4 / 12 = 1/3 (approx 33.3%).',
      },
      {
        t: 'p',
        text: 'Common Traps: Confusing P(A | B) with P(B | A) (the inverse fallacy or prosecutor fallacy). For instance, P(symptom | disease) is rarely equal to P(disease | symptom).',
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
        text: 'Base rate integration is the practice of combining prior prevalence (the base rate) with new diagnostic evidence according to Bayes rule. When a condition or phenomenon is rare, even a highly accurate test can produce more false alarms than true alarms.',
      },
      {
        t: 'p',
        text: 'Worked Example: A rare security vulnerability occurs in 0.1% (1 in 1,000) of software packages. A scanner has a 99% true positive rate and a 2% false positive rate. Across 100,000 packages: 100 are vulnerable (99 flagged) and 99,900 are safe (1,998 flagged). If a package is flagged, the chance it is actually vulnerable is 99 / (99 + 1,998) ≈ 4.7%.',
      },
      {
        t: 'p',
        text: 'Common Traps: Base rate neglect — anchoring solely on the high accuracy of the test (e.g., 99%) while ignoring the overwhelming size of the unaffected population pool.',
      },
    ],
  },
]
