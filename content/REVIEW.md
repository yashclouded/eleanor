# Eleanor Content Review Record

Tracking checklist for content items (templates, concept cards, code problems).
Per Eleanor review guidelines, every content item begins in \`draft\` status. Items are promoted to \`published\` only after review by a person other than the author (self-review is allowed only for closed beta under task 8.3).

---

## Concept Cards (34)

| ID | Type | Status | Author | Reviewer | Date | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| \`judgment.frequencies\` | Card | draft | Eleanor Team | | | Natural frequencies, 2x2 counts |
| \`judgment.estimation\` | Card | draft | Eleanor Team | | | Fermi estimation, orders of magnitude |
| \`judgment.conditional\` | Card | draft | Eleanor Team | | | Conditional probability, subspace restriction |
| \`judgment.expected-value\` | Card | draft | Eleanor Team | | | Expected value, probability weighting |
| \`judgment.risk-framing\` | Card | draft | Eleanor Team | | | Risk framing, gain vs loss shifts |
| \`judgment.base-rates\` | Card | draft | Eleanor Team | | | Base rate integration, Bayes theorem |
| \`judgment.independence\` | Card | draft | Eleanor Team | | | Statistical independence, product rule |
| \`judgment.regression\` | Card | draft | Eleanor Team | | | Regression to the mean, noise vs skill |
| \`judgment.odds\` | Card | draft | Eleanor Team | | | Odds and Bayes factor likelihood ratios |
| \`logic.deduction\` | Card | draft | Eleanor Team | | | Propositional deduction, truth operators |
| \`logic.ordering\` | Card | draft | Eleanor Team | | | Strict orderings, sequence constraints |
| \`logic.counting\` | Card | draft | Eleanor Team | | | Combinatorial counting, permutations/combinations |
| \`logic.conditionals\` | Card | draft | Eleanor Team | | | Conditionals and contrapositive equivalence |
| \`logic.knights\` | Card | draft | Eleanor Team | | | Knights and Knaves, truth assignment |
| \`logic.pigeonhole\` | Card | draft | Eleanor Team | | | Pigeonhole principle, collision guarantees |
| \`logic.invariants\` | Card | draft | Eleanor Team | | | Invariants and parity preservation |
| \`logic.games\` | Card | draft | Eleanor Team | | | Game analysis, backward induction, N/P positions |
| \`math.ratios\` | Card | draft | Eleanor Team | | | Ratios, proportions, part-to-whole scaling |
| \`math.percent-change\` | Card | draft | Eleanor Team | | | Percentage change, compounding multipliers |
| \`math.linear\` | Card | draft | Eleanor Team | | | Linear relationships, rates of change, slopes |
| \`math.geometry\` | Card | draft | Eleanor Team | | | Geometric reasoning, areas, Pythagoras |
| \`math.sequences\` | Card | draft | Eleanor Team | | | Arithmetic and geometric sequences |
| \`math.divisibility\` | Card | draft | Eleanor Team | | | Prime factors, GCD, LCM, modular arithmetic |
| \`math.functions\` | Card | draft | Eleanor Team | | | Function behavior, domain, transformations |
| \`math.optimization\` | Card | draft | Eleanor Team | | | Discrete optimization, integer constraints |
| \`code.implementation\` | Card | draft | Eleanor Team | | | Algorithmic control flow, state machine |
| \`code.math\` | Card | draft | Eleanor Team | | | Algorithmic math, modular arithmetic, primes |
| \`code.sorting-greedy\` | Card | draft | Eleanor Team | | | Sorting and greedy heuristics, exchange arguments |
| \`code.prefix\` | Card | draft | Eleanor Team | | | Prefix aggregation, constant time range queries |
| \`code.two-pointers\` | Card | draft | Eleanor Team | | | Two pointers, sliding window intervals |
| \`code.binary-search\` | Card | draft | Eleanor Team | | | Binary search, monotonic answer spaces |
| \`code.graphs\` | Card | draft | Eleanor Team | | | Graph traversal, BFS shortest paths, DFS |
| \`code.strings\` | Card | draft | Eleanor Team | | | String algorithms, palindromes, matching |
| \`code.dp\` | Card | draft | Eleanor Team | | | Dynamic programming, memoization, DAG states |

---

## Templates (15)

| ID | Type | Status | Author | Reviewer | Date | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| \`judgment.frequencies.counting-table\` | Template | draft | Eleanor Team | | | Natural frequencies in 2x2 contingency tables |
| \`judgment.estimation.fermi-quantity\` | Template | draft | Eleanor Team | | | Fermi estimation and multi-factor volume scaling |
| \`judgment.conditional.two-way-table\` | Template | draft | Eleanor Team | | | Conditional probability in two-way frequency tables |
| \`judgment.conditional.tree\` | Template | draft | Eleanor Team | | | Conditional probability trees and sequential branching |
| \`judgment.base-rate.screening\` | Template | draft | Eleanor Team | | | Base rate screening and diagnostic test posterior |
| \`judgment.base-rate.two-tests\` | Template | draft | Eleanor Team | | | Sequential independent screening and multi-stage updating |
| \`judgment.expected-value.bets\` | Template | draft | Eleanor Team | | | Expected value of asymmetric wagers and decision lotteries |
| \`judgment.expected-value.insurance\` | Template | draft | Eleanor Team | | | Expected insurance loss, deductibles, and actuarial pricing |
| \`judgment.risk-framing.relative-absolute\` | Template | draft | Eleanor Team | | | Relative risk reduction vs absolute risk reduction framing |
| \`judgment.risk-framing.nnt\` | Template | draft | Eleanor Team | | | Number needed to treat (NNT) and reciprocal absolute risk reduction |
| \`judgment.independence.compound-events\` | Template | draft | Eleanor Team | | | Independent compound events, multiplication rule, and joint probabilities |
| \`judgment.independence.at-least-one\` | Template | draft | Eleanor Team | | | Complement rule for at-least-one occurrence across independent trials |
| \`judgment.regression.selection-effect\` | Template | draft | Eleanor Team | | | Regression to the mean from extreme baseline scores |
| \`judgment.odds.likelihood-ratio\` | Template | draft | Eleanor Team | | | Prior odds, Bayes factor likelihood ratios, and posterior odds |
| \`logic.knights.two\` | Template | draft | Eleanor Team | | | Task 1.3 reference template (Knights & Knaves 2 persons) |

---

## Code Problems: reference drafts (2)

| ID | Type | Status | Author | Reviewer | Date | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| \`code.prefix.range-sums\` | Code | draft | Eleanor Team | | | Task 5.1 reference problem (Static Range Sum Queries) |
| \`code.implementation.robot-walk\` | Code | draft | Eleanor Team | | | Task 5.1 reference problem (Robot Walk Simulation) |

## Task 6.3: Logic template drafts

Human review and publication remain pending. Previews are generated under `build/review/`; repair inputs are numeric, so set/sequence ladders end with reconstruction checks. The existing `logic.knights.two` reference includes a silent third islander at level 1; the id is retained for compatibility. Its draft ratings now use the allowed +100 offset.

| ID | Type | Status | Author | Reviewer | Date | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `logic.deduction.chains` | Template | draft | GPT-6 | | | [Preview](../build/review/logic.deduction.chains.md) |
| `logic.deduction.contrapositive` | Template | draft | GPT-6 | | | [Preview](../build/review/logic.deduction.contrapositive.md) |
| `logic.conditionals.card-selection` | Template | draft | GPT-6 | | | [Preview](../build/review/logic.conditionals.card-selection.md) |
| `logic.knights.three-statements` | Template | draft | GPT-6 | | | [Preview](../build/review/logic.knights.three-statements.md) |
| `logic.ordering.line-up` | Template | draft | GPT-6 | | | [Preview](../build/review/logic.ordering.line-up.md) |
| `logic.ordering.schedule` | Template | draft | GPT-6 | | | [Preview](../build/review/logic.ordering.schedule.md) |
| `logic.counting.arrangements` | Template | draft | GPT-6 | | | [Preview](../build/review/logic.counting.arrangements.md) |
| `logic.counting.inclusion-exclusion` | Template | draft | GPT-6 | | | [Preview](../build/review/logic.counting.inclusion-exclusion.md) |
| `logic.pigeonhole.guarantee` | Template | draft | GPT-6 | | | [Preview](../build/review/logic.pigeonhole.guarantee.md) |
| `logic.invariants.parity-moves` | Template | draft | GPT-6 | | | [Preview](../build/review/logic.invariants.parity-moves.md) |
| `logic.games.take-away` | Template | draft | GPT-6 | | | [Preview](../build/review/logic.games.take-away.md) |

Reference preview: [logic.knights.two](../build/review/logic.knights.two.md). All twelve templates require human wording, ambiguity, difficulty, and feedback review before publication.

## Task 6.4: Math template drafts

Human wording, ambiguity, level ordering, skins, and misconception-feedback review remain pending. All metadata stays draft with reviewer and review date blank.

| ID | Type | Status | Author | Reviewer | Date | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `math.ratios.rates-work` | Template | draft | GPT-6 | | | [Preview](../build/review/math.ratios.rates-work.md) |
| `math.ratios.unit-conversion` | Template | draft | GPT-6 | | | [Preview](../build/review/math.ratios.unit-conversion.md) |
| `math.percent-change.successive` | Template | draft | GPT-6 | | | [Preview](../build/review/math.percent-change.successive.md) |
| `math.percent-change.reverse` | Template | draft | GPT-6 | | | [Preview](../build/review/math.percent-change.reverse.md) |
| `math.linear.word-equations` | Template | draft | GPT-6 | | | [Preview](../build/review/math.linear.word-equations.md) |
| `math.linear.two-unknowns` | Template | draft | GPT-6 | | | [Preview](../build/review/math.linear.two-unknowns.md) |
| `math.geometry.similar-triangles` | Template | draft | GPT-6 | | | [Preview](../build/review/math.geometry.similar-triangles.md) |
| `math.geometry.pythagoras-applied` | Template | draft | GPT-6 | | | [Preview](../build/review/math.geometry.pythagoras-applied.md) |
| `math.sequences.arithmetic-geometric` | Template | draft | GPT-6 | | | [Preview](../build/review/math.sequences.arithmetic-geometric.md) |
| `math.divisibility.gcd-lcm-word` | Template | draft | GPT-6 | | | [Preview](../build/review/math.divisibility.gcd-lcm-word.md) |
| `math.functions.linear-vs-exponential` | Template | draft | GPT-6 | | | [Preview](../build/review/math.functions.linear-vs-exponential.md) |
| `math.optimization.fence-area` | Template | draft | GPT-6 | | | [Preview](../build/review/math.optimization.fence-area.md) |

## Task 6.5: Coding problem drafts (43 new, 45 total)

All five drafts per concept remain unpublished. Human reviewers must check originality, ambiguity, provisional difficulty ordering, constraints, editorials, and test coverage. Each family has an echo partner. New problem previews are generated under `build/review/`; executable verification logs are under `build/`.

| ID | Type | Status | Author | Reviewer | Date | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `code.implementation.charge-reserve` | Code | draft | GPT-6 | | | Rating 1000; [Preview](../build/review/code.implementation.charge-reserve.md) |
| `code.implementation.robot-returns` | Code | draft | GPT-6 | | | Rating 1300; [Preview](../build/review/code.implementation.robot-returns.md) |
| `code.implementation.robot-radius` | Code | draft | GPT-6 | | | Rating 1600; [Preview](../build/review/code.implementation.robot-radius.md) |
| `code.implementation.robot-repeated` | Code | draft | GPT-6 | | | Rating 2000; [Preview](../build/review/code.implementation.robot-repeated.md) |
| `code.math.shared-batch` | Code | draft | GPT-6 | | | Rating 800; [Preview](../build/review/code.math.shared-batch.md) |
| `code.math.synchronised-lights` | Code | draft | GPT-6 | | | Rating 1000; [Preview](../build/review/code.math.synchronised-lights.md) |
| `code.math.discard-one-batch` | Code | draft | GPT-6 | | | Rating 1300; [Preview](../build/review/code.math.discard-one-batch.md) |
| `code.math.pair-compatibility` | Code | draft | GPT-6 | | | Rating 1600; [Preview](../build/review/code.math.pair-compatibility.md) |
| `code.math.coprime-segments` | Code | draft | GPT-6 | | | Rating 2000; [Preview](../build/review/code.math.coprime-segments.md) |
| `code.sorting-greedy.closest-crates` | Code | draft | GPT-6 | | | Rating 800; [Preview](../build/review/code.sorting-greedy.closest-crates.md) |
| `code.sorting-greedy.meeting-rail` | Code | draft | GPT-6 | | | Rating 1000; [Preview](../build/review/code.sorting-greedy.meeting-rail.md) |
| `code.sorting-greedy.supply-budget` | Code | draft | GPT-6 | | | Rating 1300; [Preview](../build/review/code.sorting-greedy.supply-budget.md) |
| `code.sorting-greedy.shared-depot` | Code | draft | GPT-6 | | | Rating 1600; [Preview](../build/review/code.sorting-greedy.shared-depot.md) |
| `code.sorting-greedy.connected-coverage` | Code | draft | GPT-6 | | | Rating 2000; [Preview](../build/review/code.sorting-greedy.connected-coverage.md) |
| `code.prefix.all-window-total` | Code | draft | GPT-6 | | | Rating 800; [Preview](../build/review/code.prefix.all-window-total.md) |
| `code.prefix.balanced-tape` | Code | draft | GPT-6 | | | Rating 1000; [Preview](../build/review/code.prefix.balanced-tape.md) |
| `code.prefix.target-window-count` | Code | draft | GPT-6 | | | Rating 1600; [Preview](../build/review/code.prefix.target-window-count.md) |
| `code.prefix.cyclic-window-count` | Code | draft | GPT-6 | | | Rating 2000; [Preview](../build/review/code.prefix.cyclic-window-count.md) |
| `code.two-pointers.paired-parcels` | Code | draft | GPT-6 | | | Rating 800; [Preview](../build/review/code.two-pointers.paired-parcels.md) |
| `code.two-pointers.bounded-load` | Code | draft | GPT-6 | | | Rating 1000; [Preview](../build/review/code.two-pointers.bounded-load.md) |
| `code.two-pointers.limited-types` | Code | draft | GPT-6 | | | Rating 1300; [Preview](../build/review/code.two-pointers.limited-types.md) |
| `code.two-pointers.nearby-pairs` | Code | draft | GPT-6 | | | Rating 1600; [Preview](../build/review/code.two-pointers.nearby-pairs.md) |
| `code.two-pointers.complete-inspection` | Code | draft | GPT-6 | | | Rating 2000; [Preview](../build/review/code.two-pointers.complete-inspection.md) |
| `code.binary-search.threshold-index` | Code | draft | GPT-6 | | | Rating 800; [Preview](../build/review/code.binary-search.threshold-index.md) |
| `code.binary-search.parallel-makers` | Code | draft | GPT-6 | | | Rating 1000; [Preview](../build/review/code.binary-search.parallel-makers.md) |
| `code.binary-search.contiguous-trucks` | Code | draft | GPT-6 | | | Rating 1300; [Preview](../build/review/code.binary-search.contiguous-trucks.md) |
| `code.binary-search.separated-stations` | Code | draft | GPT-6 | | | Rating 1600; [Preview](../build/review/code.binary-search.separated-stations.md) |
| `code.binary-search.capped-level` | Code | draft | GPT-6 | | | Rating 2000; [Preview](../build/review/code.binary-search.capped-level.md) |
| `code.graphs.island-links` | Code | draft | GPT-6 | | | Rating 800; [Preview](../build/review/code.graphs.island-links.md) |
| `code.graphs.relay-hops` | Code | draft | GPT-6 | | | Rating 1000; [Preview](../build/review/code.graphs.relay-hops.md) |
| `code.graphs.two-shift-network` | Code | draft | GPT-6 | | | Rating 1300; [Preview](../build/review/code.graphs.two-shift-network.md) |
| `code.graphs.forward-routes` | Code | draft | GPT-6 | | | Rating 1600; [Preview](../build/review/code.graphs.forward-routes.md) |
| `code.graphs.minimum-cabling` | Code | draft | GPT-6 | | | Rating 2000; [Preview](../build/review/code.graphs.minimum-cabling.md) |
| `code.strings.symbol-runs` | Code | draft | GPT-6 | | | Rating 800; [Preview](../build/review/code.strings.symbol-runs.md) |
| `code.strings.repeating-label` | Code | draft | GPT-6 | | | Rating 1000; [Preview](../build/review/code.strings.repeating-label.md) |
| `code.strings.proper-borders` | Code | draft | GPT-6 | | | Rating 1300; [Preview](../build/review/code.strings.proper-borders.md) |
| `code.strings.pattern-stamps` | Code | draft | GPT-6 | | | Rating 1600; [Preview](../build/review/code.strings.pattern-stamps.md) |
| `code.strings.mirror-windows` | Code | draft | GPT-6 | | | Rating 2000; [Preview](../build/review/code.strings.mirror-windows.md) |
| `code.dp.stepping-cost` | Code | draft | GPT-6 | | | Rating 800; [Preview](../build/review/code.dp.stepping-cost.md) |
| `code.dp.subset-capacity` | Code | draft | GPT-6 | | | Rating 1000; [Preview](../build/review/code.dp.subset-capacity.md) |
| `code.dp.message-repair` | Code | draft | GPT-6 | | | Rating 1300; [Preview](../build/review/code.dp.message-repair.md) |
| `code.dp.rising-readings` | Code | draft | GPT-6 | | | Rating 1600; [Preview](../build/review/code.dp.rising-readings.md) |
| `code.dp.paid-bookings` | Code | draft | GPT-6 | | | Rating 2000; [Preview](../build/review/code.dp.paid-bookings.md) |
