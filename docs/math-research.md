# Math depth and variety

This expansion addresses the owner's request for the third track, Math. The original 12 templates are retained. Each of the eight concepts gains a foundation ladder, an advanced ladder and two additional mechanisms: 32 new templates, 44 total. Logic is outside this change.

All content remains **draft**, with reviewer and review date blank. The initial ratings describe intended progression, not measured contest difficulty. Human review must assess wording, originality, accessibility, prerequisite knowledge, difficulty and whether sessions feel varied before publication.

## Research and authoring decisions

The exercises, contexts, parameters, solutions and distractors are original. Source problems are not copied or embedded. Research supplies mathematical methods and progression ideas; source prestige does not validate these generators or their ratings.

| Primary source | What informed the design |
| --- | --- |
| [OpenStax: proportions and their applications](https://openstax.org/books/prealgebra-2e/pages/6-5-solve-proportions-and-their-applications) | Unit reasoning, scale factors and starting with simple proportions before inverse applications. |
| [OpenStax: Intermediate Algebra](https://openstax.org/books/intermediate-algebra/pages/index) | Moving between words, equations, systems, functions, inverse operations and sequences. |
| [MIT: Mathematics for Computer Science](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf) | Remainders, GCD, modular reasoning, recurrences, invariants and explicit domain assumptions. |
| [MIT: recurrence lecture, Spring 2024](https://live.ocw.mit.edu/courses/6-1200j-mathematics-for-computer-science-spring-2024/mit6_1200j_s24_lec07.pdf) | Replacing repetitive term computation with a useful transformed recurrence or boundary sum. |
| [IMO 2024 official shortlist and solutions](https://www.imo-official.org/assets/documents/problems/2024/IMO2024SL.pdf) | Advanced reasoning should require structure, cases and justification across algebra, geometry, number theory and combinatorics. These numeric/selection tasks are not equivalent to a timed proof contest. |
| [Samin Riasat: Basics of Olympiad Inequalities](https://web.williams.edu/Mathematics/sjmiller/public_html/161/articles/Riasat_BasicsOlympiadInequalities.pdf) | Distinguish a valid inequality from a sharp bound, verify equality conditions and domain constraints, and use rearrangement as an optimisation mechanism. |
| [CIMT: MEP Pupil Text 3](https://www.cimt.org.uk/projects/mepres/allgcse/bka3.pdf) | Angle reasoning, intersecting chords and tangent–secant products. The extremal shortest-chord extension uses an authored equality argument. |
| [UCLA: inequalities notes](https://www.math.ucla.edu/~lvese/PUTNAM/Olga_Inequalities_ref.pdf) | AM–GM and its equality conditions, distinguishing continuous bounds from constrained integer attainability. |
| [Oliver Knill, Harvard: Math 21b handouts](https://people.math.harvard.edu/~knill/teaching/math21b2004/handouts/s.pdf) | Orthogonal columns, metric preservation and the distinction between distance, angle and area invariants. |
| [OpenStax: law of reflection](https://openstax.org/books/college-physics-2e/pages/25-2-the-law-of-reflection) | Reflection geometry. The route problem includes its own reflection/triangle-inequality argument and an additional gate constraint. |
| [Cambridge NRICH: Mixing More Paints](https://nrich.maths.org/problems/mixing-more-paints) and [CMU: extended Euclidean algorithm](https://www.math.cmu.edu/~bkell/21110-2010s/extended-euclidean.html) | Conservation and linked ratio scales; integer linear solution families. Whole-container, bounded and congruence-constrained extensions are authored here. |
| [OpenStax: geometric sequences and series](https://openstax.org/books/intermediate-algebra/pages/12-3-geometric-sequences-and-series) and [absolute-value inequalities](https://openstax.org/books/college-algebra/pages/2-7-linear-inequalities-and-absolute-value-inequalities) | Geometric accumulation in inverse affine recurrences; piecewise distance constraints and inclusive interval endpoints. |
| [Waterloo CEMC: sequences and series](https://cemc.uwaterloo.ca/sites/default/files/documents/2024/SequencesSeries.html) and [functions, equations and polynomials](https://cemc.uwaterloo.ca/sites/default/files/documents/2024/FunctionsEquationsPolynomials.html) | Explicit sequence rules, reciprocal transformations, telescoping, composition order and domains. A finite displayed prefix is never the sole definition of a continuation. |
| [Stanford: modular exponentiation](https://crypto.stanford.edu/pbc/notes/numbertheory/exp.html) and [Chinese remainder theorem](https://crypto.stanford.edu/pbc/notes/numbertheory/crt.html) | Retain coprimality conditions and complete residue classes. The noncoprime extension is derived by a GCD reduction and independently enumerated. |
| [Po-Shen Loh, CMU: functional equations](https://www.math.cmu.edu/~ploh/docs/math/2023-295/05-functional.pdf) | Use global identities and explicit domains rather than silently assuming real additive functions are continuous. Integer-domain identities and mixed reciprocal compositions have separate authored derivations. |
| [Mathlib: prime valuations and Legendre's factorial formula](https://leanprover-community.github.io/mathlib4_docs/Mathlib/NumberTheory/Padics/PadicVal/Basic.html) | Check the prime requirement and factorial valuation formula. Exact BigInt binomial/product verification is implemented independently; Mathlib is a research reference, not a dependency. |

Sources were consulted on 10–11 November 2026. A UWA Olympiad page could not be fetched and is not used as evidence.

## Progression and variation

Foundation ladders contain six levels, provisionally 400–1400. Advanced ladders contain four levels, provisionally 1800, 2100, 2400 and 2700. The other ladders bridge these ranges. Different branches add a representation, constraint, inverse step, integer restriction, equality case or global identity; broad numeric ranges alone do not establish harder reasoning.

The new mechanisms include numeric answers, single selections, multiple selections and ordering. A choice must require mathematical work: neutral identifiers, changing correct positions, distinct plausible alternatives and no reliable numerical-extreme or consensus cue. An ordering task starts from a scrambled order and declares tie rules. Misconceptions implement named wrong methods rather than arbitrary offsets from the answer.

| Topic | New foundation | New advanced mechanism | Two additional task families |
| --- | --- | --- | --- |
| Ratios | Equal parts, shares and inverse proportions | Solute conservation with indivisible containers and simultaneous stock, demand and budget bounds | Rank journeys by the requested speed/time quantity; find the smallest integer realization of nested ratio constraints |
| Percent change | Identify the percentage base before applying a change | Invert repeated affine changes, recover cash flow, respect intermediate constraints or infer an integer rate | Choose between independently generated coupon policies; audit percentage claims with changing bases |
| Linear equations | Balance operations, grouped expressions and unknowns on both sides | Count or optimise integer solutions under congruence and box constraints | Analyse exceptional parameters in a system; solve a piecewise linear distance constraint |
| Geometry | Measurement, perimeter, area, angles and scale | Chords, secants, tangents and whole-length algebra | Classify transformation invariants; select a shortest reflected route subject to a boundary gate |
| Sequences | Differences, terms and finite blocks | Transform reciprocal recurrences and telescope weighted or lagged sums | Audit recurrence claims; order terms or block quantities |
| Divisibility | Factors, remainders and grouping | Generalised CRT, noncoprime modular powers and factorial/binomial valuations | Audit residue claims; choose a valid modular strategy |
| Functions | Function machines, composition and inverse operations | Infer values from global identities and analyse affine/rational involutions | Audit domains and exclusions; order compositions |
| Optimisation | Compare feasible values and simple extrema | Integer balancing, constrained products, weighted reciprocal inequalities and lattice bottlenecks | Audit sharp bounds and equality cases; order a rearrangement assignment |

The twelve original templates were read through and retain their existing worked-example checks. Their smaller parameter spaces and repeated numeric formats are not used to establish the new capacity target. In particular, unit-conversion samples contain unused measurements at early levels; those hidden fields do not constitute different questions. Some original misconception methods coincide with the answer on simple instances and are filtered by the existing instance builder.

Each template has at least two contexts, a reproducible sampler, an independent computation, authored explanations and a three-to-five-step numeric repair ladder. For a selection or ordering task the solution explicitly explains the resulting selection/order; numeric repair steps establish its mathematical ingredients.

## Visual questions and answer privacy

Geometry uses local SVG schematics built from labelled points, indexed segments and optional circles. The title, spatial description and segment labels also appear in visible text. Layout coordinates are fixed within a level, marked schematic/not to scale, and must not encode an unknown length. Only given mathematical measurements belong in public labels. Charts use given data and retain exact values in a visible table.

The new block is supported by the shared content type, validator, app renderer, Markdown preview and word counter. The renderer rejects invalid coordinates and references. There are no remote images, scripts, model calls or new dependencies. Public review examples contain prompts and answer specifications; answers, repair steps and solutions are in separate review previews. Product publication and correctness-release rules are unchanged.

## Capacity and its limits

Ten continuous years at five minutes per question is 1,051,920 questions, using 365.25 days per year. The gate is 1,100,000 distinct visible prompts. Run `npm run content:capacity:math` to reproduce the audit and write `build/review/math-capacity.json`.

The audit draws 50,000 deterministic seeds per advanced level, uses only the first context and globally deduplicates SHA-256 hashes of rendered prompt blocks. It excludes the original, foundation and variety templates, option permutations, hidden parameters and answers. Advanced givens must affect the mathematical task; an irrelevant random quantity cannot establish capacity. The count is a measured lower bound within the authored parameter space, not a claim of mathematical infinity or of that many different solution strategies.

Large bank capacity does not guarantee duplicate-free delivery, ten years of engagement, accurate difficulty ratings or an absence of recognisable patterns. The existing delivery and learner model remain unchanged. Human playtesting must still assess repetition and boredom.

## Review and validation

The bank contains **44 templates, 189 levels and 43 families** (the two original percentage templates intentionally share one family). The 32 additions introduce 32 distinct families. Answer formats are 22 numeric, nine integer, three single-selection, six multi-selection and four ordering templates. See [the draft review inventory](../content/REVIEW.md) for every preview.

Implementation is grouped in [arithmetic](../supabase/functions/_shared/content/math/depth-arithmetic.ts), [discrete mathematics](../supabase/functions/_shared/content/math/depth-discrete.ts) and [geometry/optimisation](../supabase/functions/_shared/content/math/depth-spatial.ts). Every group received independent source and oracle review. Review fixes included dominant zero/no-solution samplers, an option-coordinate consensus shortcut, a conditional domain assertion, an unseen random quantity in a misconception, off-path repair steps, rounded review answers and overlapping diagram labels.

Executed on 11 November 2026:

- `npm run check`: exit 0 (TypeScript, ESLint and Deno API check).
- `npm test`: **37 files / 371 tests passed**. Coverage includes worked examples, independent verifiers, valid response specifications, changing answer positions, initial ordering, schematic privacy, preview precision and modal-answer sampling regressions.
- `npm run content:check`: **106 templates, 45 code problems and 34 concept cards passed**, with 2,000 seeds per level. Math accounts for 378,000 checked instances across 189 levels.
- `npm run content:capacity:math`: **1,583,810 distinct prompts from 1,600,000 draws**, counting only the 32 advanced levels. This is **15.06 continuous years** at five minutes each. The JSON report records the audit method.
- `npm run build`: exit 0. Vite retains its existing warning about chunks exceeding 500 kB; no dependency was added.
- All **44 Math previews** regenerated with round-trippable numeric answers and misconception values, covering every level, both contexts and three seeds.

The interactive review gallery is [Math depth](../build/review/math-depth.html). It contains 44 public examples using the actual prompt and answer components. Keyboard radio, multi-select and ordering controls were exercised; automated WCAG 2.2 AA checks found no violations; 320- and 390-pixel layouts had no horizontal overflow or clipped controls. Geometry labels are also checked across 30 sampled visual layouts. These automated checks do not replace assistive-technology or human usability review.

No content was published or synced into a live bank. No learner-model, grading, selection, transaction or API behaviour changed. Live API/E2E journeys and human difficulty/engagement calibration were not rerun.
