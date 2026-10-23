import type { ConceptCard } from '../types.ts'

export const LOGIC_CARDS: ConceptCard[] = [
  {
    conceptId: 'logic.deduction',
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
        text: 'Propositional deduction is the systematic derivation of logically guaranteed conclusions from a set of premises using formal truth functions including conjunction (AND), disjunction (OR), and negation (NOT). Unlike empirical inferences which carry probabilistic uncertainty, deductive validity guarantees that if all initial premises are true, the derived conclusion must necessarily be true. Complex truth arguments can be resolved by constructing truth valuations or systematically eliminating assignments that contradict given premises.',
      },
      {
        t: 'p',
        text: 'Worked Example: Consider three servers: Alpha, Beta, and Gamma. You are given three premises: (1) Exactly one server is active. (2) If Alpha is active, then Beta is not active. (3) If Gamma is not active, then Alpha is active. Question: Which server is active? From premise (1), exactly one server is active. Suppose Gamma is not active; then by premise (3), Alpha must be active, which means Beta and Gamma are both inactive. That assignment satisfies all premises. If Gamma were active, Alpha would be inactive by premise (1), but premise (3) would not force a contradiction. However, checking each single active possibility shows that Gamma being inactive uniquely implies Alpha is active, leaving Alpha as the guaranteed active server.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Confusing inclusive disjunction (A or B or both) with exclusive disjunction (either A or B, but not both).',
          'Common Traps: Conflating sound arguments (valid deduction with true premises) with merely valid deductions whose premises may be false.',
          'Common Traps: Negating a conjunction incorrectly by writing NOT (A AND B) as (NOT A AND NOT B) instead of De Morgan law: (NOT A OR NOT B).',
        ],
      },
    ],
  },
  {
    conceptId: 'logic.ordering',
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
        text: 'Strict orderings involve arranging distinct entities along an asymmetric, transitive linear sequence based on partial relational clues (such as earlier/later, heavier/lighter, or higher/lower). Transitivity ensures that if entity A precedes B, and B precedes C, then A must precede C. Resolving ordering problems requires maintaining position slots, propagating transitive constraints, and identifying anchor entities whose positions are uniquely locked to eliminate downstream degrees of freedom.',
      },
      {
        t: 'p',
        text: 'Worked Example: Five presentations (Q, R, S, T, U) are scheduled in five consecutive slots from 1 to 5. Clues: (1) Q is scheduled immediately before R. (2) T is scheduled earlier than S. (3) U is scheduled in slot 5. (4) T is not in slot 1. Question: Which presentation occupies slot 1? Because U is in slot 5, slots 1 through 4 remain for Q, R, S, T. The block [Q, R] requires two adjacent slots. T cannot be in slot 1, and T must appear before S. If [Q, R] occupied slots 1 and 2, then T would have to be in slot 3 and S in slot 4, satisfying all constraints. Thus, Q must occupy slot 1.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Confusing relative ordering (A precedes B somewhere) with strict adjacency (A is immediately before B).',
          'Common Traps: Forgetting that strict inequality is transitive, leading to unpropagated relational inferences.',
          'Common Traps: Neglecting boundary constraints at the extreme ends of the ordering sequence.',
        ],
      },
    ],
  },
  {
    conceptId: 'logic.counting',
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
        text: 'Combinatorial counting determines the exact size of discrete configurations, selections, and arrangements without exhaustive brute-force enumeration. Foundational counting principles rely on the rule of product (multiplying independent choice stages) and the rule of sum (adding mutually exclusive cases). The fundamental distinction between permutations (where selection sequence matters: n! / (n - k)!) and combinations (where order is irrelevant: n! / (k! · (n - k)!)) governs whether symmetries must be divided out to prevent multiple counting of identical subsets.',
      },
      {
        t: 'p',
        text: 'Worked Example: A panel committee of 4 members is selected from a department containing 6 software engineers and 5 data analysts. The committee must contain at least 3 software engineers. The problem splits into two mutually exclusive cases: (Case 1) Exactly 3 software engineers and 1 data analyst: C(6, 3) × C(5, 1) = 20 × 5 = 100 ways. (Case 2) Exactly 4 software engineers and 0 data analysts: C(6, 4) × C(5, 0) = 15 × 1 = 15 ways. Summing the disjoint cases yields 100 + 15 = 115 valid committee configurations.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Double counting overlapping subsets by omitting the principle of inclusion-exclusion.',
          'Common Traps: Using permutations when the problem describes an unordered selection, overcounting by a factor of k!.',
          'Common Traps: Creating phantom distinctions among identical objects during multistage selection procedures.',
        ],
      },
    ],
  },
  {
    conceptId: 'logic.conditionals',
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
        text: 'Conditionals express logical implication of the form "If P, then Q" (P → Q), where P is the antecedent and Q is the consequent. A conditional assertion guarantees only that whenever P is true, Q must also be true; it makes no claim about Q whenever P is false. The contrapositive statement ("If NOT Q, then NOT P") is logically equivalent to the original conditional and always shares its truth value. In contrast, the converse ("If Q, then P") and the inverse ("If NOT P, then NOT Q") are distinct propositions that do not logically follow.',
      },
      {
        t: 'p',
        text: 'Worked Example: A quality rule states: "If a batch passes chemical screening (P), then it receives gold certification (Q)." Suppose an inspector knows that Batch 402 did NOT receive gold certification (NOT Q). By applying the contrapositive (NOT Q → NOT P), the inspector can logically conclude with certainty that Batch 402 did NOT pass chemical screening. However, if another batch did receive gold certification (Q), concluding that it passed chemical screening would commit the formal fallacy of affirming the consequent.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Affirming the consequent—concluding P must be true simply because Q is observed.',
          'Common Traps: Denying the antecedent—concluding Q must be false simply because P is false.',
          'Common Traps: Confusing necessary conditions (Q in P → Q) with sufficient conditions (P in P → Q).',
        ],
      },
    ],
  },
  {
    conceptId: 'logic.knights',
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
        text: 'Knights and Knaves logic puzzles feature agents who belong to immutable truth-telling classes: Knights always speak the truth, and Knaves always lie. Resolving these self-referential scenarios requires testing truth-assignment hypotheses. For each hypothesis, an agent statement is evaluated: if an assigned Knight utters a false statement, or an assigned Knave utters a true statement, the hypothesis generates a logical contradiction and is discarded. Because the search space over binary types is finite, systematic case analysis guarantees finding the unique consistent truth state.',
      },
      {
        t: 'p',
        text: 'Worked Example: You meet two islanders, X and Y. Islander X makes the statement: "At least one of us is a Knave." Hypothesis 1: Assume X is a Knave. If X is a Knave, his statement must be a lie (false). But if X is a Knave, then it is indeed true that at least one of them is a Knave, which means the statement would be true. A Knave cannot speak the truth, producing an immediate contradiction. Hypothesis 2: Assume X is a Knight. Then X statement is true: at least one of them is a Knave. Because X is a Knight, Y must be the Knave. Thus, X is a Knight and Y is a Knave.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Forgetting that a Knave statement must be strictly negated to determine the true underlying reality.',
          'Common Traps: Assuming that an islander cannot make an assertion about their own identity or logical type.',
          'Common Traps: Stopping after finding one locally plausible assignment without verifying that it produces zero contradictions across all agent statements.',
        ],
      },
    ],
  },
  {
    conceptId: 'logic.pigeonhole',
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
        text: 'The pigeonhole principle states that if n items (pigeons) are placed into k containers (pigeonholes) and n > k, then at least one container must contain at least two items. In generalized form, if n items are distributed into k containers, at least one container must contain at least ⌈n / k⌉ items. The power of this principle lies in establishing non-constructive existence proofs: it proves that a collision or shared property is guaranteed to occur without needing to pinpoint which container holds the duplicate.',
      },
      {
        t: 'p',
        text: 'Worked Example: A warehouse stores boxes in 12 distinct aisle categories. How many boxes must an auditor inspect to guarantee that at least 5 inspected boxes belong to the exact same aisle category? To find the threshold, consider the worst-case scenario that avoids having 5 boxes in any aisle: the auditor could inspect up to 4 boxes from every one of the 12 aisles without any aisle reaching 5 boxes (12 × 4 = 48 boxes). Inspecting just 1 additional box (48 + 1 = 49 boxes) guarantees by the generalized pigeonhole principle that at least one aisle must contain ⌈49 / 12⌉ = 5 boxes.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Identifying the wrong entities as pigeons and pigeonholes, such as swapping items and categories.',
          'Common Traps: Forgetting the worst-case boundary: k · (m - 1) + 1 items are required to guarantee at least m items in a single bin.',
          'Common Traps: Assuming the principle reveals which specific container contains the duplicate, rather than merely proving its existence.',
        ],
      },
    ],
  },
  {
    conceptId: 'logic.invariants',
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
        text: 'An invariant is a mathematical property or quantity that remains strictly unchanged under every permissible state transition of a dynamic system. Monovariants, similarly, change only monotonically in one direction. Invariants are among the most powerful tools in discrete logic: to prove that a target terminal state cannot be reached from an initial configuration, one simply shows that the invariant holds in the initial state but is violated in the target state. Parity (evenness versus oddness) is a ubiquitous example.',
      },
      {
        t: 'p',
        text: 'Worked Example: A grid puzzle begins with a board containing 15 black counters and 12 white counters. At each step, a player may remove any two counters: if they are the same color, a white counter is placed on the board; if they are different colors, a black counter is placed on the board. Can this process terminate with a single white counter? Consider the invariant: parity of black counters. In every allowable move, the count of black counters either decreases by 2 (if two black counters are removed) or remains unchanged (if one black and one white are removed). Thus, the parity of black counters is conserved. The initial state has 15 black counters (odd). A final state with 0 black counters has even parity (0). Because parity is invariant, reaching a state with 0 black counters is mathematically impossible.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Attempting to prove impossibility by simulating thousands of transition paths instead of searching for an invariant.',
          'Common Traps: Choosing a property that is conserved under some transitions but altered by others.',
          'Common Traps: Forgetting to check whether the proposed terminal configuration actually violates the invariant.',
        ],
      },
    ],
  },
  {
    conceptId: 'logic.games',
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
        text: 'Game analysis over finite, deterministic, two-player games of perfect information determines optimal play through backward induction and state classification. States are classified recursively from terminal configurations: any state from which a player can move to a known losing state (P-position) is a winning state (N-position). A state is losing if every legal move from it leads exclusively to winning states for the opponent. Under optimal play, the first player has a guaranteed forced win if and only if the starting configuration is an N-position.',
      },
      {
        t: 'p',
        text: 'Worked Example: Two players take turns taking 1, 2, or 3 stones from a single pile initially containing 21 stones. The player who takes the last stone wins. Working backward from 0 stones: 0 is a losing state. States 1, 2, 3 are winning (can take all to leave 0). State 4 is losing because any move leaves 1, 2, or 3. By induction, every multiple of 4 (4, 8, 12, 16, 20) is a losing position for the player whose turn it is. Because 21 is not a multiple of 4 (21 = 4 × 5 + 1), the first player can take 1 stone to leave 20 (a losing position for player two), securing a forced win.',
      },
      {
        t: 'list',
        items: [
          'Common Traps: Evaluating intermediate game states from an intuitive psychological perspective rather than backward induction from terminal states.',
          'Common Traps: Failing to verify that a winning position offers at least one transition to a losing state for the opponent.',
          'Common Traps: Conflating the player whose turn it is with the player who initiated the game.',
        ],
      },
    ],
  },
]
