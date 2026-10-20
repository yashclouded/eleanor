> Superseded original brief, preserved from the initial workspace on 19 October 2026.
> Its claims and roadmap are unreviewed historical input. Use [the revised specification](../../doc.md), [research audit](../research.md), and [delivery plan](../plan.md) for current decisions.

Eleanor : A Gym for Human Thinking in the AI Era
Research synthesis and build blueprint · “Eleanor” is a placeholder name · 17 October 2026
0. The short version
You want a site that trains people to think in a world where AI will gladly do the thinking for them. I went through the most relevant recent research, and my honest read is that the idea is strong, the gap is real, and your instincts about what to avoid (quiz sites, kiddish puzzles, generic brain games, another AI SaaS) are right. A few assumptions in the brief need adjusting, though. Those adjustments are what separate a product that feels good from one that actually works.
What the evidence says, in four lines:
• Answer-giving AI damages independent thinking, fast. In randomized trials with 1,222 people, roughly ten to fifteen minutes of AI help left people performing worse and quitting sooner once it was removed (Liu et al., 2026).
• The same technology, designed differently, is an excellent tutor. A purpose-built AI tutor beat expert-led active learning at Harvard (Kestin et al., 2025), and a hint-only tutor removed most of the harm in a school trial of about 1,000 students (Bastani et al., 2025).
• Generic “brain training” does not make you smarter in general. Meta-analyses find little or no far transfer (Simons et al., 2016; Sala et al.). What does work is training specific, teachable skills: debiasing, critical thinking taught through real problems and dialogue, productive struggle, and calibrated self-monitoring.
• AI is a strong sparring partner and a weak source of ideas. Go and chess players improved by wrestling with AI moves (Shin et al., 2023; Schut et al., 2025), while AI-supplied ideas made people’s creative output more alike (Doshi & Hauser, 2024).
The thesis: Crux is a daily practice in which you commit to your own thinking before any help arrives, AI acts as sparring partner, examiner and mirror rather than oracle, and your headline score is not how many answers you got right but how well you know what you know.
The rest of this document covers the evidence, where I would push back on the brief, the product design, the adaptive engine, the tutor rules, the engagement ethics, the tech stack, how to prove it works, and a roadmap that starts with you as user number one.
1. The problem worth solving
The risk of AI is not that people lose access to knowledge. It is that they stop doing the effortful middle of thinking: framing a problem, struggling toward a plan, and checking the result. Several independent lines of evidence point the same way.
• Knowledge workers who trust AI more report doing less critical thinking, and many skip it when they lack the skill to inspect the output (Lee et al., CHI 2025; 319 workers, self-report).
• People solving logic problems with AI scored higher but overestimated their performance, and those with more AI literacy judged themselves less accurately (Fernandes et al., 2026).
• On a large adaptive-maths platform, students spent less time on problems they could paste into a chatbot and later did worse on proctored retention items (Rismanchian et al., 2026 preprint).
• Researchers have started calling the extreme version “cognitive surrender”: adopting AI output as your own answer with minimal scrutiny.
Existing products mostly miss this. Brain-training apps optimize for in-app scores, AI tutors optimize for delivering the answer smoothly, and puzzle apps optimize for fun with no model of you. (That is my read of the landscape, not a systematic market study.) The open space is a serious, adult, adaptive practice whose design objective is your unaided capability.
Who it serves. One engine, three lenses. The undergraduate who struggles to focus gets short sessions, struggle timers and concept-first problems that build maths understanding. The PhD gets hard, open-ended and adversarial problems and fast feedback on how efficiently they find good framings. The executive gets decision-quality work: base rates, pre-mortems, calibration and bias traps, in ten-minute sessions. The skills map and the loop are shared; only the content mix and session length change.
2. What the research says
2.1 AI can erode the thinking it replaces
Randomized evidence. Liu et al. (2026) ran three randomized trials (N = 1,222) in mathematical reasoning and reading comprehension. AI help improved performance while it was available. After it was removed, participants solved fewer problems and skipped more, with effects visible after about ten to fifteen minutes. The decline was concentrated in people who asked for direct solutions; people who used AI to aid understanding did not show the same persistence loss. Bastani et al. (2025, PNAS) found a matching reversal in nearly a thousand high-school students: a ChatGPT-style tutor raised practice grades by 48% but left students 17% below a no-AI control once it was taken away. A version built to give hints rather than answers raised practice grades by 127% and largely avoided the later penalty.
Neural traces. An MIT Media Lab study (2025 preprint, 54 participants, EEG) found the weakest brain connectivity among people who wrote essays with an LLM, with under-engagement persisting when they later wrote unaided. People who wrote alone first and then used the AI showed higher engagement. The sample is small, the work is not peer reviewed, and EEG is blunt, so treat it as a hint about ordering (think first, then use AI) rather than proof of damage.
Population scale. Rismanchian et al. (2026 preprint) analysed 3.2 million learning interactions on an adaptive maths platform over ten years. After ChatGPT’s release, time on chatbot-pasteable word problems fell about 27% for college students over eleven quarters, while interactive graph problems stayed stable. Odds of answering randomly assigned proctored retention items correctly fell about 25% on the pasteable problem types relative to the interactive ones. It is observational and under review, but the contrast design is careful.
Judgment. Lee et al. and Fernandes et al. show that the damage is not only to skill but to calibration: people become more confident than their unaided competence justifies.
What this means for Crux: persistence and calibrated judgment of AI-assisted work are the two capacities most at risk, and both are trainable. They should be first-class scores in the product.
2.2 AI done right is an excellent tutor
In a randomized crossover at Harvard (Kestin et al., 2025, Scientific Reports; N = 194, introductory physics), students learned significantly more, in less time and with higher engagement, from a custom AI tutor than from an expert-run active-learning class. The tutor was designed around the same pedagogical principles as the class rather than being a general chatbot. It covered two short topics in one course, and the authors caution against assuming it generalizes everywhere. Combined with the Bastani result, the lesson is that the failure mode is unstructured answer-giving, not AI tutoring itself.
2.3 AI as sparring partner raises human ceilings
Shin et al. (2023, PNAS) analysed 5.8 million professional Go moves across 71 years and found that decision quality and the rate of novel moves both rose after superhuman AI arrived. Schut et al. (2025, PNAS) extracted new chess concepts from AlphaZero and taught them to four grandmasters, all of whom improved on test positions (a small proof of concept). The pattern: people grew by confronting unfamiliar, strong ideas and working out why they work, not by copying outputs.
2.4 AI as an idea source narrows us
Doshi & Hauser (2024, Science Advances) found that AI-supplied story ideas raised the rated creativity of individual stories, especially for less creative writers, but made the stories more similar to each other. For creative training, quality alone is the wrong metric; distinctiveness has to be measured too.
2.5 What actually trains thinking
• Critical thinking can be taught. Abrami et al. (2015), 341 effect sizes: average g ≈ 0.30. Dialogue, authentic problems and mentoring each helped, and combining them gave roughly double the effect.
• Debiasing works and lasts. Morewedge et al. (2015): a single serious-game session with personalized feedback cut targeted biases by over 30% immediately and over 20% two or more months later, with benefits transferring to new contexts. Instructional videos helped less.
• Struggle before instruction. Sinha & Kapur (2021): across 53 studies (166 comparisons), problem-solving before instruction beat instruction-first for conceptual understanding and transfer, provided learners had some relevant prior knowledge to activate.
• Self-monitoring. Fernandes et al. argue AI systems should push users to reflect on and check their own performance. Training calibration through repeated predict-then-check loops is my design bet, supported by the evidence that miscalibration is the problem and by the debiasing results on feedback.
2.6 The uncomfortable truth: far transfer is weak
Simons et al. (2016) reviewed the brain-training literature and found good evidence of improvement on trained and similar tasks but little for broad real-world benefit. A second-order meta-analysis by Sala and colleagues covering working-memory training, video games, music, chess and exergames found far-transfer effects small or null across programs and age groups. Gobet & Sala conclude that research should redirect toward near transfer. For you this is the most important caution: do not promise that chess, Go, Rubik’s cubes or puzzles will make anyone generally smarter. Use them as rich arenas for practising named reasoning skills, and measure those skills directly.
2.7 Making practice efficient
Wilson et al. (2019, Nature Communications) showed that for a broad class of learners trained by gradient descent on binary classification, learning is fastest near 85% accuracy. The authors suggested that for humans the rule would mostly apply to perceptual-type learning, so treat it as a starting prior, not a law for deep problem-solving. Math Garden (Klinkenberg, Straatemeier, van der Maas) is working proof that Elo-style ratings can update learner ability and item difficulty simultaneously from accuracy and response time, across about 40 games and 50,000+ items.
2.8 The target keeps moving
ARC-AGI-3 launched on 25 March 2026 with interactive, language-free environments; at launch every frontier model tested scored below 1% while humans solved all of them (check the current state before you quote this). Meanwhile the maths-platform authors warn that the boundary between AI-susceptible and AI-resistant problem formats will keep shifting as multimodal and agentic systems improve. Building on “problems AI can’t solve today” is building on sand.
Findings and what they mean for design
Finding
Design rule for Crux
Direct answers hurt later unaided performance and persistence
No answers on demand; hint ladder; attempt gate
Guardrailed tutors can beat classroom active learning
Purpose-built tutor, not a chat box
Think-first-then-AI ordering looks better than AI-first
Commit before any AI contact, every time
AI users become miscalibrated
Confidence rating on every attempt; calibration is the headline score
Far transfer is weak
Train named skills; test them with twin problems; make no “smarter overall” claims
Debiasing games with feedback last
Include bias and decision arenas with personalized feedback
AI ideas homogenize
Score distinctiveness, not only quality
The AI frontier moves
Anchor on process and verification, not on a fixed problem list
3. Where I would challenge the brief
1. “Chess, Go, Rubik’s and art will train the brain.” As magic exercises, the evidence says no. As domains for practising skills such as lookahead, abstraction and critique, yes. This changes the pitch from “brain training” to “thinking practice”, which is more honest and, I think, more credible to your PhD and CEO users.
2. “Problems AI can’t do.” Treat it as a moving target. The durable differentiator is the human process: framing, struggling, verifying, and knowing how sure you are. AI-resistant formats (interactive, visual, unfamiliar worlds, live process) are useful tactically, but the strategy is process.
3. “Show more of what I’m good at.” Doing more of what you already do well feels great and trains little. Deliberate practice targets the edge of ability in weaker sub-skills. I would offer both: a Strength mode for flow and joy, and a Gap mode for growth, with the engine deciding the daily mix. (Matching teaching to “learning styles” has weak support, so personalization should be about skill level and gaps, not styles.)
4. “Addictive.” Compulsion is a design tool, so aim it at effortful thinking and give sessions a satisfying end. Duolingo’s retention team has publicly described streaks as its most impactful engagement feature, and critics worry its engagement can outrun learning. Measure learning, not minutes.
5. “Everyone, every domain.” Launch with one loop, three arenas and one persona (you). Breadth comes after proof.
6. “So AI doesn’t replace them.” Do not promise job security. Promise measurable skills: better calibration, better unaided problem-solving, better verification of AI work.
4. Design principles
1. Attempt before assistance. Every problem starts with the person’s own attempt and a stated confidence level.
2. Withhold answers, not support. A graded hint ladder (nudge, question, partial step, worked solution) that costs something and is logged.
3. Score calibration. Accuracy matters, but the central metric is how well confidence tracks correctness over time.
4. Train named skills. Every item is tagged to skills in an explicit Thinking Map, never to a vague notion of “brain power”.
5. Test transfer with twins. A day or more later, serve a surface-changed problem with the same deep structure. This measures real learning, trains transfer, and resists copy-paste shortcuts.
6. Aim for productive failure. Some problems should be hard enough that your first attempt fails before the idea is explained, with enough prior knowledge to make the failure productive.
7. Use AI as opponent and as the thing being audited. The AI plays strong moves you must understand, and sometimes presents confident but flawed reasoning you must catch.
8. Refuse vanity metrics. Success is unaided capability, not streak length or time on site.
5. The Thinking Map
Twelve trainable skills form the spine of the product. This is my proposed taxonomy, built from the evidence above; refine it as your own data comes in. Every item is tagged to one to three of these.
#
Skill
What it means
How it is measured
1
Framing
Restating a problem in a more useful form
Hint-free solves; time to a productive reformulation
2
Rule discovery
Inferring hidden structure in unfamiliar worlds
Actions taken versus the optimal path
3
Lookahead
Evaluating multi-step consequences
Plan quality against an engine or solver baseline
4
Estimation
Fermi estimates, orders of magnitude, sanity checks
Log error of estimates
5
Probabilistic and causal reasoning
Base rates, Bayes, confounds
Accuracy plus calibration
6
Debiasing
Spotting anchoring, confirmation and similar traps
Pre/post tests on parallel forms
7
Argument and critique
Building, attacking and repairing arguments
Rubric scores; flaw-detection rate
8
Divergent thinking
Generating options that are good and distinct
Quality × distinctiveness
9
Verification
Finding the flaw in confident AI work
Detection rate and false-alarm rate
10
Calibration
Knowing what you know
Brier score and calibration curve
11
Structural and spatial reasoning
Symmetry, invariants, mental manipulation
Accuracy and time at matched difficulty
12
Persistence
Staying productive under difficulty
Time before first hint, skip rate, recovery after failure
6. The arenas
Launch with three, add three later. An arena is a family of problem formats, not a separate app.
Launch arenas
• Rule Lab. Interactive worlds with hidden rules, no language and no numbers, in the spirit of ARC-AGI-3. You act, observe and infer. Rubik’s-style puzzles live here as “invent your own method” challenges rather than memorized algorithms. Generators plus solvers guarantee every world is solvable and give a difficulty estimate. Trains skills 2, 1 and 12.
• Sparring Board. Chess first, Go later. The engine knows the strong move; you must find the plan and explain the idea before seeing it. Curated concept sets (positions that share one idea) follow the spirit of Schut et al., starting with human-curated concepts, since extracting new ones from an engine is research-grade work. Trains 3, 11 and 10.
• Calibration Court. Short judgment problems with base-rate traps, Fermi estimates and bias scenarios, always with a prediction and a confidence, followed by personalized feedback of the kind that worked in Morewedge et al. Trains 4, 5, 6 and 10.
Later arenas
• Red Team the Machine. The AI presents a confident solution or analysis with a verified injected flaw; you find it. False alarms are penalized so the arena trains discernment rather than reflexive distrust. Trains 9 and 7.
• Constraint Studio. Creative briefs in writing, design and art critique. The score combines a quality rubric with distance from what an LLM typically produces for the same brief (measured by embedding distance from sampled model outputs), after a quality gate so that nonsense cannot win. Trains 8 and 7.
• Proof and Principle Dojo. Mathematics without numericals: find the invariant, spot the false lemma, produce the extreme case, explain why. Check with a computer algebra system and later a proof assistant such as Lean. Trains 1, 7 and 11.
7. The daily session
A session takes 20 to 30 minutes (about 10 for the executive lens). The loop is the same every day.
1. Retrieve (3–5 min). Two or three past insights come back for spaced retrieval. You recall the idea, not the answer.
2. Predict (1 min). You see the problem, name your first approach and rate your confidence.
3. Attempt (10–15 min). No AI. A minimum-effort timer must run before the hint ladder unlocks. A light scratchpad records process signals such as time to first action and revisions.
4. Reveal and debrief (5 min). The tutor asks you to explain your reasoning, contrasts alternative strategies, and updates your calibration curve.
5. Log (1–2 min). You name the move you used in a sentence. Over months this becomes a personal playbook of heuristics.
6. Twin (a day or more later). A surface-changed problem with the same deep structure. This is where real learning shows up, and it counts toward mastery, not the original attempt.
Daily Limit. Once a day, one problem is set at the edge of your range. It is scored on breakpoints (where and why your approach broke), not only solved or unsolved. This is how “takes my brain to its limits” becomes a feature rather than a slogan. Sessions end with a clear “done for today”. The product is finite by design.
8. The adaptive engine
Item model. Each item carries weighted skill tags, a difficulty rating, a domain, mechanism tags (invariant, symmetry, extreme case, invert, decompose) and a verified solution. Difficulty updates from outcomes using accuracy and response time, as in Math Garden’s Elo-style approach, ideally with an uncertainty term (Glicko-style).
Learner model. A vector of skill ratings with uncertainty, plus a calibration curve, persistence metrics, hint dependence and domain affinity. A 20-minute onboarding diagnostic seeds it, and the persona lens (student, researcher, executive) sets the content mix.
Selection policy. The next item is chosen by combining:
• a target success rate by mode: Build around 70–85% (start from the 85% prior and tune), Stretch around 30–50% first-attempt success to induce productive failure;
• gap weighting toward low or uncertain skills, with a Strength slot kept for flow;
• spaced retrieval of past items using a modern scheduler such as FSRS;
• interleaving across skills and domains;
• a boredom and fatigue guard.
Treat every number here as a hypothesis to tune with your own data.
Integrity signals. Ratings are only as good as the effort behind them, which is the point the maths-platform authors make about adaptive systems when students route around the work. Use behaviour signals (time to first action, paste events, tab switches) and twin consistency (a strong original and a weak twin suggests an assisted attempt) to down-weight suspect attempts. The stronger defence is incentive design: no public leaderboards on raw correctness, rewards for calibration and process, and a product whose user is the main beneficiary.
Where the LLM fits, and where it does not. Use LLMs for tutor dialogue, rubric scoring of free-form answers, problem variants and flawed-solution injection. The rule: the LLM proposes, a verifier disposes. Every generated item passes a solver, engine or algebra check, or human review, before it enters the bank.
9. The tutor’s rules
• Gives no final answer before an attempt and a confidence rating are logged.
• Prefers questions to explanations, and asks you to predict the next step.
• After a solve, asks you to teach it back in your own words and flags misconceptions.
• Receives the verified solution as context, so it cannot invent a wrong path.
• In creative arenas, shows model-typical ideas only after you have drafted your own, as a contrast.
• Notices dependency: if you ask for solutions early in several sessions, it changes tactics (offers strategies, adjusts difficulty) instead of lecturing.
• Sounds like a sparring partner: direct, specific, never flattering.
• Is tested like software: track hint-leak rate, agreement with verified solutions and the share of turns that are questions, and re-run these evaluations whenever the underlying model changes.
10. Engagement without dark patterns
Borrow: a daily streak with rest days and freezes, a commitment moment where you set your own daily target, visible identity (ranks by skill and calibration rather than by volume), reward from insight (the twin problem that proves you improved), light social play (duels, small cohorts) and a weekly Breakpoint Report.
Refuse: infinite feeds, guilt-driven notification spam, pay-to-skip, and public leaderboards on raw correctness.
Stopping rules: fixed session length, fatigue detection (several declining attempts in a row means stop for today) and a clear end screen.
Guard metric: if time on site rises while unaided twin performance does not, the product is failing, whatever the retention chart says.
11. Technical architecture
Keep it lean enough for one builder.
• Front end: Next.js or React, with canvas or WebGL components for Rule Lab and board components for chess and Go.
• Back end: Postgres with pgvector for item and originality embeddings, a job queue for item generation and verification, and an append-only event log of all interaction telemetry.
• Verification: Stockfish (it can run in the browser via WebAssembly), KataGo or pre-computed analysis for a curated Go set, a computer algebra system such as SymPy (later Lean) for maths, and custom solvers for Rule Lab generators.
• LLM layer: tutor and rubric grading behind a gateway that logs prompts, versions and outputs, with an evaluation suite. Pre-generate and verify item banks so the model is used mostly for dialogue, which keeps cost and variance low.
• Adaptive service: a small module implementing ratings and the selection policy. Start with explicit rules in code; consider bandits or reinforcement learning only after you have real data.
• Privacy: thinking logs are intimate. Offer export and deletion, a local-first journal option, minimal personal data and no data sales.
• Content: start with 150–250 hand-verified items, not thousands.
12. Proving it works
Start with you (N-of-1). In week 0, run a baseline battery on parallel forms: a calibration set (Brier score), a bias test you author in the style of Morewedge et al., unaided transfer problems in two domains, a persistence task (time before skipping) and one real-world outcome you care about. Re-test at weeks 4, 8 and 12 with fresh parallel forms. Write down what counts as improvement before you begin. To learn what matters, alternate weeks with the hint ladder on versus direct answers and compare twin performance. One person is a pilot, not proof, and practice effects and expectancy are real, so have a friend score free-form work blind if possible.
Then a small beta. Recruit 30–50 people from communities you can already reach. Randomize them to the full loop versus a lighter puzzle-only control, and compare unaided transfer performance and calibration at four weeks, alongside retention.
Metric hierarchy. Primary: unaided transfer performance and calibration. Secondary: persistence. Tertiary: retention and daily use. Red flag: rising dependency on hints or on AI help.
Publish honestly, including nulls. A short preprint after 100 or more users would set the product apart from every “brain training” claim.
13. Roadmap
Phase
Timing (solo builder, estimate)
Deliverable
Exit test
0
Weeks 1–2
Daily Crux for you: about 60 verified items; predict, attempt, reveal, log; confidence tracking; manual twins
You used it 12 of 14 days and the calibration chart works
1
Weeks 3–8
Thinking Map, rating engine, hint-ladder tutor with verified solutions, spaced retrieval, automated twins, Calibration Court and chess Sparring Board
Unaided twin scores beat baseline
2
Months 3–4
Rule Lab, onboarding diagnostic and persona lenses, integrity signals, playbook journal, closed beta
Beta cohort shows twin gains and acceptable four-week retention
3
Months 5–6
Red Team, Constraint Studio, Go, duels and cohorts, public beta, first preprint
Results hold outside your own circle
4
Later
Proof and Principle Dojo; optional institutional licences
Only if the evidence holds
Business model, briefly. Free daily session, paid depth and history for individuals, optional cohorts later. No ads, and no B2B-first sales motion while you are still finding out what works.
14. Risks and mitigations
Risk
Mitigation
Overpromising transfer
Claims limited to measured skills; no “smarter overall” language
Bad or hallucinated content
Verifier-first generation; human review of the core bank
Assisted attempts contaminate ratings
Twins, behaviour signals, incentive design
Novelty scoring gets gamed
Quality gate first; periodic human audits
Engagement outruns learning
Guard metric tied to unaided twin performance
Scope creep
One loop, three arenas, one persona until proven
The tutor becomes a crutch
Hint costs, tutor evaluations, dependency detection
Different needs across personas
Lenses on one engine, not separate products
The AI frontier moves
Process-centred tasks; quarterly re-test of items against current models
Part of the evidence base is preprints
Label it clearly; re-check as papers are reviewed
15. Your first 14 days
• Days 1–2: Write the Thinking Map on one page and pick three starting skills (I suggest calibration, lookahead and framing).
• Days 3–5: Collect or author 60 items with verified solutions: 20 estimation and judgment problems, 20 chess positions checked with an engine, and 20 rule-discovery or reframing problems.
• Days 6–7: Build the minimal loop as a single page: predict with confidence, attempt, reveal, log, with events stored.
• Days 8–10: Add the hint ladder, with the tutor restricted to verified solutions, and a calibration chart.
• Days 11–12: Run the baseline battery and write down your success criteria.
• Days 13–14: Do a full week of sessions, look at the calibration chart and first twin results, and decide what to cut.
One rule: no accounts, payments or landing page until you have used it yourself for 14 days. Your own daily use is the first test of whether it is worth anyone else’s time.
References (selected)
• Abrami, P. C., et al. (2015). Strategies for teaching students to think critically: A meta-analysis. Review of Educational Research.
• Bastani, H., et al. (2025). Generative AI without guardrails can harm learning: Evidence from high school mathematics. PNAS, 122(26). doi:10.1073/pnas.2422633122
• Doshi, A. R., & Hauser, O. P. (2024). Generative AI enhances individual creativity but reduces the collective diversity of novel content. Science Advances, 10(28).
• Fernandes, D., et al. (2026). AI makes you smarter but none the wiser: The disconnect between performance and metacognition. Computers in Human Behavior. (arXiv:2409.16708)
• Gobet, F., & Sala, G. Cognitive training: A field in search of a phenomenon. Perspectives on Psychological Science.
• Kestin, G., et al. (2025). AI tutoring outperforms in-class active learning: An RCT introducing a novel research-based design in an authentic educational setting. Scientific Reports, 15, 17458.
• Klinkenberg, S., Straatemeier, M., & van der Maas, H. L. J. (2011). Computer adaptive practice of maths ability using a new item response model for on the fly ability and difficulty estimation. Computers & Education.
• Lee, H.-P., et al. (2025). The impact of generative AI on critical thinking: Self-reported reductions in cognitive effort and confidence effects from a survey of knowledge workers. CHI 2025.
• Liu, G., et al. (2026). AI assistance reduces persistence and hurts independent performance. arXiv:2604.04721.
• MIT Media Lab (2025). Your brain on ChatGPT: Accumulation of cognitive debt when using an AI assistant for essay writing task. arXiv:2506.08872 (preprint).
• Morewedge, C. K., et al. (2015). Debiasing decisions: Improved decision making with a single training intervention. Policy Insights from the Behavioral and Brain Sciences, 2(1).
• Rismanchian, S., et al. (2026). Faster completion, less learning: Generative AI reduced study time on math problems and the knowledge they build. arXiv:2605.21629 (preprint, under review).
• Sala, G., Aksayli, N. D., Tatlidil, K. S., Tatsumi, T., Gondo, Y., & Gobet, F. Near and far transfer in cognitive training: A second-order meta-analysis.
• Schut, L., et al. (2025). Bridging the human–AI knowledge gap through concept discovery and transfer in AlphaZero. PNAS, 122(13). doi:10.1073/pnas.2406675122
• Shaw, S. D., & Nave, G. (2026). Thinking—fast, slow, and artificial: How AI is reshaping human reasoning and the rise of cognitive surrender. Preprint.
• Shin, M., Kim, J., van Opheusden, B., & Griffiths, T. L. (2023). Superhuman artificial intelligence can improve human decision-making by increasing novelty. PNAS, 120(12). doi:10.1073/pnas.2214840120
• Simons, D. J., et al. (2016). Do “brain-training” programs work? Psychological Science in the Public Interest.
• Sinha, T., & Kapur, M. (2021). When problem solving followed by instruction works: Evidence for productive failure. Review of Educational Research. doi:10.3102/00346543211019105
• Wilson, R. C., Shenhav, A., Straccia, M., & Cohen, J. D. (2019). The Eighty Five Percent Rule for optimal learning. Nature Communications, 10. doi:10.1038/s41467-019-12552-4
• ARC Prize Foundation (2026). ARC-AGI-3 launch, 25 March 2026 (as summarized by DataCamp, 3 April 2026).