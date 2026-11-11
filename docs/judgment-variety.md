# Judgment: distinct reasoning tasks

9 November 2026. Follow-up to the [depth and capacity expansion](judgment-research.md). All additions are original drafts, with publication and human review pending.

## Why another expansion

The previous bank contained 32 families, all using number, integer or estimate responses. Its measured numerical capacity does not establish structural novelty, enjoyment or reduced boredom. A new context or six answer buttons around an old calculation is insufficient by itself. This expansion adds 18 distinct families, two per existing concept, with new decision criteria, observation protocols, critique tasks and comparison tasks.

The existing answer components already support single selection, multiple selection and ordering. Reusing them changes what a learner must do without adding a new interaction engine. Selection tasks need at least six plausible alternatives; multi-select uses six claims rather than a disguised true/false item; ranking tasks use six alternatives, exact ordering and no ties. Neutral IDs and varying answer positions avoid correctness cues. Every solution must explain its selections, not just print an option letter.

## Research basis and limits

| Source | What informs the authored content | Boundary |
| --- | --- | --- |
| [OpenStax, sampling and data](https://openstax.org/books/introductory-statistics-2e/pages/1-2-data-sampling-and-variation-in-data-and-sampling) | Inclusion probabilities, stratification and self-selection motivate sampling corrections and study-design audits. | A larger sample does not automatically fix biased inclusion. Exercise assumptions must state response/inclusion behavior. |
| [Penn State STAT506, unequal probability sampling](https://online.stat.psu.edu/stat506/Lesson03) | Horvitz–Thompson totals weight observed units by reciprocal inclusion probabilities; ratio estimates normalize weighted totals. | Response weighting additionally requires the stated conditional response assumptions; a realized ratio is not exact population knowledge. |
| [USGS, capture-mark-recapture methods](https://pubs.usgs.gov/of/2008/1363/pdf/OF08-1363_508.pdf) | Inferring population size from two overlapping samples adds a different estimation model from multiplying demand factors. | Closed population, retained identifiers and appropriate capture/mixing assumptions are essential. An estimator is not the true population size. |
| [New Zealand DOC, capture-mark-recapture population estimates](https://www.doc.govt.nz/globalassets/documents/science-and-technical/inventory-monitoring/im-toolbox-herpetofauna-population-estimates.pdf) | Technical treatment of population estimators and assumption checks supports the Chapman correction and stratified exercises. | An overlap ambiguity produces a range of estimator outputs, not a confidence interval for the true population. |
| [MIT 18.600, conditional probabilities](https://ocw.mit.edu/courses/18-600-probability-and-random-variables-fall-2019/527d6363696a539e01e581107c3b8a1c_MIT18_600F19_lec6.pdf) | Host behavior is part of a conditional-probability experiment; reporting and stopping rules affect the observed evidence. | Do not assume the familiar Monty Hall result after changing the host's information or policy. Supply the complete protocol. |
| [MIT 6.041, conditional independence](https://ocw.mit.edu/courses/6-041-probabilistic-systems-analysis-and-applied-probability-fall-2010/b200b6217af1cd5dbea8c659ebbf046a_MIT6_041F10_L03.pdf) | Pairwise and mutual independence differ; observation can change independence. Joint-world enumeration supports claim audits and network comparisons. | Multiplication is justified by the given joint law, not by different names for components or sources. |
| [Penn State STAT800, sampling and experiments](https://online.stat.psu.edu/stat800/Lesson03) | Distinguish random sampling from random assignment, association from causal attribution and a control contrast from a raw before/after change. | Causal interpretation requires explicit design/model assumptions. Sample differences alone are not deterministic proof of an effect. |
| [World Bank, impact-evaluation study design](https://worldbank.github.io/dime-data-handbook/design.html) | Difference-in-differences contrasts changes across groups, rather than their outcome levels alone. | Parallel untreated trends and other identifying assumptions are imposed in planning models, not proved by the supplied before/after table. |
| [Original minimax-regret analysis](https://arxiv.org/abs/2203.01420) | Compare actions using state-wise opportunity loss when credible state probabilities are not supplied. | Minimax regret is the stated decision rule, not a universally superior preference; alternative criteria can choose differently. Ordinary maximin payoff is a different criterion. |
| [Bertsekas, dynamic programming and stopping](https://www.mit.edu/~dimitrib/DP2_Chapter%204_UPDATED.pdf) | Finite-horizon stopping decisions compare acting now with the expected value of continued observation, including costs. | State the horizon, available observations and costs. A threshold memorized from one protocol need not work for another. |
| [Cochrane Handbook, interpreting effects](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-15) | Repair risk statements by reconciling baseline risk, absolute changes, relative changes, population and horizon. | Use fictional nonclinical examples. Do not hide the baseline or present an expected benefit as an individual guarantee. |
| [City University, multiobjective optimization](https://optima.cs.cityu.edu.hk/research/moo.html) | Pareto dominance compares alternatives using every stated objective; some nondominated alternatives remain incomparable. | A Pareto frontier does not identify a unique best plan without preferences. Do not invent weights that the prompt did not supply. |
| [Oxford, probability lectures](https://www.philosophy.ox.ac.uk/sitefiles/probabilitylecturestt2025final18june2025.pdf); [original coherence characterization](https://eprints.maths.manchester.ac.uk/1546/1/FHM.pdf) | Probability coherence and evidence provenance motivate audits of compatible event prices and redundant reports. | These are invented credit/pricing models and explicit event laws, not advice to gamble or invest. Coherence alone does not establish empirical accuracy. |

This is a focused authoring review of mathematical mechanisms, with directly opened course/textbook sources where available. Access failures and narrower indexed access are recorded in the final author notes. These sources do not establish that learners will find this particular bank entertaining or that a format change improves learning. Neither engagement nor transfer has been evaluated with Eleanor learners.

Access notes: OpenStax, MIT, Oxford, City University and the DOC technical manual were directly accessible. USGS PDF retrieval returned 403; Penn State pages intermittently failed direct retrieval, so their indexed official course text was used alongside accessible sources. The minimax paper's abstract/metadata were available; the authored exercises state the finite minimax-regret criterion explicitly rather than relying on an unstated optimality claim.

## The eighteen new mechanisms

The previous families remain available. These additions bring Judgment to **50 templates and 207 levels**; the new families contribute **62 levels**. Existing foundation levels still supply the easier entry points. Ratings remain author estimates.

| Topic | New family | Response | What changes across levels |
| --- | --- | --- | --- |
| Frequencies | Inverse-inclusion survey | Number | Estimated user total → weighted proportion → response-adjusted proportion → comparison with the raw rate. The target is a design-based estimator, not a raw count-table probability. |
| Frequencies | Sampling claim audit | Select claims | Respondent versus invitee bounds → coverage and voluntary-response limits → unequal-weight and frame claims. Some statements are warranted, others merely possible. |
| Estimation | Capture–recapture | Number | Overlap model → Chapman correction → unequal-catchability strata → range under ambiguous matches. This models unseen units rather than demand-factor multiplication. |
| Estimation | Bottleneck plan ranking | Order six plans | Serial flow → parallel staffing → yield and input caps → setup and shift output. Learners compare complete processes rather than their fastest worker. |
| Conditional | Host observation protocol | Number | Biased informed revelation → unequal priors → mixed informed/blind hosts → selective offers. The exact observed protocol determines the evidence. |
| Conditional | Reporting-protocol identification | Choose protocol | Infer a retention rule from conditional distributions → multiple observed marginals → acceptance waiting time → a second archive filter. The unknown is the observation mechanism. |
| Base rates | Aggregate prevalence inversion | Number | Perfect flag rate → missed cases → false positives → enriched screening samples. Infer original prevalence from the flag mixture instead of computing a positive-test posterior. |
| Base rates | Operating-point decision | Choose policy | Equal losses → changing prevalence → asymmetric error costs → review-capacity restrictions. The goal is a feasible decision with stated tie rules. |
| Independence | Joint-law audit | Select claims | Pairwise versus mutual claims → recover a missing joint weight → combine conditional strata. Complete laws include independent, parity and common-cause cases. |
| Independence | Reliability architecture ordering | Order six networks | Shared-component AND/OR logic → required gates → common environments. Each architecture is a different event expression; repeated letters are the same component. |
| Regression | Control contrasts | Number | Difference in changes → model counterfactual → target-weighted strata → triple contrast. Calculating a contrast and justifying a causal interpretation are kept distinct. |
| Regression | Forecast and causal-claim audit | Select claims | Expected regression versus possible individual outcomes → infer the model center → randomized/self-selected study designs and missing follow-up. Individual outcomes need not equal an expectation. |
| Expected value | Minimax regret | Choose plan | Supplied regret table → construct regret from payoffs → feasible net-payoff benchmarks. State probabilities are unavailable; the decision criterion changes from expected value. |
| Expected value | Finite stopping | Number | One further observation → adaptive two-stage policy → three stages with recall. Compare stopping with paid continuation separately at each information state. |
| Risk framing | Pareto screening | Select plans | Cost/risk frontier → add recovery time → guaranteed dominance with risk intervals. No preference weights are invented to force one universal winner. |
| Risk framing | Risk-report repair | Choose report | Reconcile absolute/relative reductions and horizon → unequal denominators → supplied intervals that may include or exclude no difference. Plausible wrong estimates lie on both sides of the correct result. |
| Odds | Evidence provenance | Order six packets | Independent origins versus copies → conflicting evidence → conditioned analysis chains. Rank information strength rather than document volume. |
| Odds | Coherent probability book | Choose book | Exhaustive partitions → overlapping events → conditional probabilities and odds. Independently drawn candidate books must each satisfy all their event relations. |

The response mix is five single-choice families, four claim-selection families, three ordering families and six numerical families. Changing only the response widget did not qualify a family: each row specifies a new inference target, decision rule or observation model.

## Authoring and verification

Each family has 3–6 difficulty levels, two contexts, a constrained seeded sampler, an independent verification method, specific misconception feedback, a numeric repair ladder and an authored explanation. New levels change the inference or decision required. Distractors are plausible mistakes, never arbitrary wrong numbers. All necessary information is visible; solutions and correctness remain server-side until resolution.

The shared content checker must respect response semantics. Multi-select compares sets, while sequence compares exact order; sorting both sequences can conceal a broken verifier. A failing regression test is required before that checker correction. Inventory tests pin two new families per topic and require multiple choice, claim-audit and ordering families. Per-family fixtures verify exact small cases, valid option membership, changing correct positions/selections, deterministic generation and independent solutions.

The existing ten-year capacity gate remains a separate check. This expansion is assessed by distinct mechanisms and response tasks, rather than inflating that count through new distractors, contexts or answer formatting. Existing selection rules, prerequisite gates, family cooldowns and publication rules remain in effect.

## Review artifacts

Generate Markdown review previews for every new family, including all levels, contexts, answers, misconceptions, repairs and solutions. A separate mixed-format gallery should use the actual prompt renderer and answer controls with public givens only, so keyboard and mobile behavior can be inspected without a database sync or publication. `content/REVIEW.md` records every addition with reviewer/date blank.

## Verification record — 10 November 2026

- `npm run check` passed TypeScript, ESLint and Deno checking.
- `npm test` passed **31 files and 300 tests**. Tests were added and run failing before corrections for order-insensitive verification, invalid canonical options, incomplete review previews, floating-point comparisons, impossible forecast support, malformed regret tables, and systematic answer cues. The full-bank test retains its 200-seed coverage with a 30-second allowance for the growing bank's independent exhaustive verifiers.
- `npm run content:check` passed **74 templates, 45 code problems and 34 concept cards**, at 2,000 seeds per template level. New Judgment families account for 62 levels and therefore 124,000 of those generated-instance checks. Independent extra probability probes covered 6,600 instances and exact answer positions/orderings.
- `npm run build` passed. The existing large-chunk warning remains; the main JavaScript gzip size is 175.58 kB.
- `npm run content:capacity:judgment` still measures the original conservative advanced subset: **1,597,763 distinct prompts**, or **15.19 continuous years** at five minutes each. The 18 new families are excluded from that benchmark because this work targets task structure.
- All **50 Judgment review previews** were regenerated. [The interactive gallery](../build/review/judgment-variety.html) contains 18 examples using the actual `PromptBlocks` and `AnswerInput` components. Its bundled data contains public question givens and answer specifications, without canonical answers, steps or solutions. Per-family Markdown previews separately include the solutions for human review.
- A local Chromium check passed radio and checkbox selection using Space and ordering using Enter. Axe reported **zero automated WCAG A/AA violations**; at 390px there was no page overflow or clipped input/button. Desktop and mobile screenshots are stored beside the gallery. This automated check does not certify accessibility or replace assistive-technology testing.

Independent reviewers checked all new families' models and giving/conditioning assumptions. Corrections removed modal-value and numeric-extreme answer cues, varied plausible risk errors on both sides, preserved exact comparison boundaries, and aligned misconception selections with the named wrong methods. Answer identities, visible correct positions and default ordering are regression-tested. These checks reduce known shortcuts; they are not proof that no learner can discover a new shortcut.

All content stays `draft` with reviewer/date unset. Existing adaptive selection, prerequisites, family cooldowns, grading and learning-write transactions were retained. No database sync, publication or live-account end-to-end test was performed. Human wording/pedagogy review, difficulty calibration, engagement and transfer evaluation remain outstanding.
