# Eleanor

> *Think first. Commit an answer and how sure you are. Get rated like a chess player. Prove it a week later on a problem you have never seen.*

Eleanor is chess-style rated practice for **judgment**, **logic**, **mathematics**, and **code**. Every learner has a rating per track that rises as they improve. Every problem has a rating too. An adaptive learner model ([ERM-1](#learner-model-erm-1)) picks the next problem so it is hard enough to stretch you but solvable about 70 % of the time.

Two things no other rated platform measures sit beside the rating:

| Measure | What it tells you |
|---|---|
| **Calibration** | Do you know when you are right? Your stated confidence is scored against reality with the same reliability diagram the model itself is held to. |
| **Echoes** | Can you still do it days later, on a changed problem from the same family? Mastery is proven only through unaided echo successes at 1, 3, 7, and 21-day intervals. |

There is **no AI anywhere in the learning loop**. Explanations, hints, repair ladders, and feedback are human-authored. Grading is deterministic.

---

## The Core Loop

```
   ┌─────────────────────────────────────────────────────────────────┐
   │                                                                 │
   │  Read  ─▸  Attempt unaided  ─▸  Commit answer + confidence     │
   │                                          │                      │
   │                                          ▼                      │
   │                  Result, rating Δ, misconception fingerprint    │
   │                  + Eleanor's own forecast vs. your confidence   │
   │                                          │                      │
   │                               ┌──────────┴──────────┐          │
   │                               ▼                      ▼          │
   │                       Repair ladder            Reveal solution  │
   │                      (step-by-step,            (worked solution │
   │                        unrated)                 + editorial)    │
   │                               │                      │          │
   │                               └──────────┬──────────┘          │
   │                                          ▼                      │
   │                             Save one-line insight               │
   │                                          │                      │
   │                                          ▼                      │
   │                         Echo in 1 · 3 · 7 · 21 days            │
   │                                                                 │
   └─────────────────────────────────────────────────────────────────┘
```

1. **Attempt unaided.** Parameterised generator problems—reviewed templates with constrained random parameters—so every attempt is fresh and the platform never runs out of problems at your level.
2. **Commit answer & confidence.** Explicitly state how certain you are (0 %–100 %) with no default. Declare outside help to make an attempt unrated.
3. **Resolved.** Server-side grading evaluates the answer, updates ratings, and provides **misconception feedback** ("mistake fingerprints"). The model's own forecast is shown beside your confidence.
4. **Repair ladder.** If wrong, rebuild the solution step by step. Each intermediate value is checked before the full solution appears. Repair is unrated.
5. **Reveal & insight.** Study the human-authored worked solution and save an optional takeaway to your personal **Playbook**.
6. **Echoes.** Re-encounter concepts at spaced intervals on a changed problem from the same family. A concept is *Proven* only after unaided echo successes.

---

## Four Rated Tracks

| Track | What you practise | Problem format |
|---|---|---|
| **Judgment** | Probability, risk, Fermi estimation, decisions under uncertainty | Numeric, estimate, choice |
| **Logic** | Deduction, Knights & Knaves, counting, invariants, combinatorial games | Choice, multi-select, sequence |
| **Math** | Ratios, sequences, divisibility, functions, optimisation | Numeric, integer |
| **Code** | Binary search, DP, graphs, greedy, strings, two-pointers | Python 3 · C++17 · JavaScript (Node) |

Each track has **9 concepts** with prerequisites, authored **concept cards**, and multiple difficulty levels. 34 concept cards, 38 generator templates, and 45 code problems ship at launch—**217 distinct items** total.

---

## What Makes Eleanor Different

| Problem | Eleanor's mechanism |
|---|---|
| Too easy or too hard | Adaptive selection targets ~70 % success at your rating. Learners choose intensity: Steady (80 %), Balanced (70 %), Stretch (55 %). |
| No visible growth | Chess-style rating per track, rating graph, peak rating, titles (Novice → Legend), and a concept map that fills in as you prove concepts. |
| Progress feels fake | **Echoes:** concepts return at 1, 3, 7, 21 days in a new form. Mastery requires unaided success on changed problems. |
| Wrong answers feel bad | **Mistake fingerprints:** a wrong answer is matched against known misconceptions. In code, failing test groups name the bug class. Feedback is about the task, never the person. |
| Being shown the answer | **Repair ladder:** rebuild the solution step by step instead of answer-dumping. |
| Lonely | **Daily Crux:** one shared unrated problem per day, then the crowd's reveal—how many solved it, how sure they were, the most common wrong answers. |
| Streak guilt | A weekly goal ("train on 3 days") with no streak counter, no debt, no notifications. Sets have a clear end. |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React 19 + Vite                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Today    │ │ SetPlayer│ │ Progress │ │ Leaderboard /    │  │
│  │  Daily    │ │ Code     │ │ Playbook │ │ Profile / Admin  │  │
│  │  Landing  │ │ Editor   │ │ Charts   │ │ Settings / Legal │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│                              │                                  │
│                     Supabase JS Client                          │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────┼──────────────────────────────────┐
│                    Supabase Edge Functions (Deno)                │
│  ┌──────────┐ ┌──────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Router   │ │ Transitions  │ │ Selection  │ │ Judge0     │  │
│  │ Auth     │ │ (idempotent) │ │ Engine     │ │ (code)     │  │
│  │ RateLimit│ │ Grading      │ │ ERM-1 Model│ │            │  │
│  └──────────┘ └──────────────┘ └────────────┘ └────────────┘  │
│                              │                                  │
│           Content Registry · Template Generators                │
│          (RNG, parameterised instances, skins)                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                   PostgreSQL + Row-Level Security               │
│                                                                 │
│  learners · items · attempts · echoes · misconceptions          │
│  sets · daily_crux · reports · integrity · cron jobs            │
│                                                                 │
│  7 migrations · 35 database assertions · RLS tests              │
└─────────────────────────────────────────────────────────────────┘
```

### Key design decisions

- **Server-side writes only.** The browser never writes attempts, ratings, echoes, or results. Every learning write goes through the `api` Edge Function in one Postgres transaction. Transitions are idempotent through `transitionId`.
- **Zero information leakage.** Solutions, step answers, misconceptions, and forecasts never leave the server until the attempt resolves.
- **Commitments are fixed.** The first commit is immutable. "I'm stuck" is always available and counts as a rated loss.
- **Leaderboards without surveillance.** Public rankings rely on statistical outcome integrity—never tracking keystrokes, clipboards, or browser focus.
- **Accessibility & privacy first.** WCAG 2.2 AA, keyboard-only flows, zero third-party scripts/fonts/analytics, full data export, complete account deletion, 16+ age floor.

---

## Learner Model: ERM-1

ERM-1 (Eleanor Rating Model v1) treats each rated response as a game between a learner and an item, using **Glicko-1** ratings with uncertainty (RD) that governs how fast ratings move.

| Subject | Start | Updated by |
|---|---|---|
| Learner × track | 1200 ± 350 | every rated response in the track |
| Learner × concept | track rating ± 250 | rated responses on items of that concept |
| Item | author estimate ± 250 | responses from settled learners (RD ≤ 150) |

**The model is held to the same standard as the learner.** Each rated attempt stores the model's forecast. Admin health shows the model's Brier score, log loss, and reliability diagram. Items with |residual| > 0.15 (n ≥ 50) are flagged. ~10 % of items per track are **anchors** (frozen after n ≥ 200) to pin the rating scale against drift.

### Titles

| Rating | Title | Rating | Title |
|---|---|---|---|
| < 1000 | Novice | 1800–1999 | Expert |
| 1000–1199 | Apprentice | 2000–2199 | Master |
| 1200–1399 | Thinker | 2200–2399 | Grandmaster |
| 1400–1599 | Analyst | ≥ 2400 | Legend |
| 1600–1799 | Strategist | | |

---

## Project Structure

```
eleanor/
├── src/                         # React frontend
│   ├── components/              #   UI components (SetPlayer, CodeEditor, Charts, …)
│   ├── pages/                   #   Route pages (Today, Daily, Progress, Admin, …)
│   ├── lib/                     #   Supabase client, auth, API helpers, types
│   └── styles.css               #   Design system (Oat & Oxblood, light/dark)
├── supabase/
│   ├── functions/
│   │   ├── api/                 #   Edge Function: router, routes, transitions, Judge0
│   │   └── _shared/             #   Shared logic: model, grading, selection, RNG, content
│   │       └── content/         #     Template generators (judgment, logic, math, code)
│   │           └── cards/       #     Concept cards (34 human-authored)
│   ├── migrations/              #   0001–0007: schema, RLS, functions, cron, integrity
│   ├── tests/                   #   pgTAP database tests (35 assertions)
│   └── seed.sql                 #   Local development seed data
├── content/
│   └── code/                    #   45 code problems with statements, tests, editorials
├── scripts/                     #   Content tools, admin, simulation, model replay
├── tests/
│   ├── api/                     #   Vitest API integration tests
│   └── e2e/                     #   Playwright end-to-end tests (27 tests, 7 files)
├── .github/workflows/ci.yml    #   GitHub Actions: check, test, content, e2e, build
└── docs/
    ├── execution.md             #   Task contracts and completion records
    └── research.md              #   Evidence base and claim limits
```

---

## Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| **Node.js** | 22.11.0+ (see `.nvmrc`) |
| **npm** | 10.9.0+ |
| **Docker Desktop** | Required for local Supabase |
| **Deno** | For Edge Functions (`deno check`) |

### Setup

```bash
# 1. Clone and install
git clone https://github.com/yashclouded/eleanor.git
cd eleanor
npm ci

# 2. Start local Supabase (requires Docker)
npm run db:start

# 3. Create .env.local from supabase status
#    (credentials are printed by the start command)
cat > .env.local << EOF
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key-from-supabase-status>
EOF

# 4. Apply migrations and seed content
npm run db:reset
npm run content:sync -- --include-drafts

# 5. Serve Edge Functions (separate terminal)
npm run functions:serve

# 6. Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Test emails (magic links) are captured by **Mailpit** at [http://127.0.0.1:54324](http://127.0.0.1:54324).

---

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server on port 5173 |
| `npm run build` | TypeScript compile + Vite production build |
| `npm run check` | TypeScript + ESLint + Deno edge check |
| `npm test` | Run Vitest unit & integration tests |
| `npm run test:api` | API integration tests (requires local stack) |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run test:db` | pgTAP database assertions |
| `npm run db:start` | Start local Supabase stack |
| `npm run db:stop` | Stop local Supabase stack |
| `npm run db:reset` | Reset and re-apply all migrations |
| `npm run db:types` | Regenerate TypeScript types from schema |
| `npm run functions:serve` | Serve Edge Functions locally |
| `npm run content:check` | Validate all templates, problems, and cards |
| `npm run content:sync` | Sync content registry to database |
| `npm run model:simulate` | Run ERM-1 simulation gate |

---

## Testing

**145 unit tests** across 16 files, **35 database assertions**, and **27 end-to-end tests** across 7 Playwright files.

```bash
# Unit & integration
npm test                    # 145 tests, 16 files

# Database
npm run test:db             # 35 pgTAP assertions

# Content verification
npm run content:check       # 38 templates, 45 code problems, 34 concept cards

# Model simulation
npm run model:simulate      # ERM-1 calibration gate

# End-to-end (requires running stack)
npm run test:e2e            # Playwright with axe-core accessibility
```

CI runs all of the above on every push and PR via [GitHub Actions](.github/workflows/ci.yml), including a full isolated Supabase stack with content sync, code problem builds, and Playwright browser tests.

---

## Design

The visual direction is **Oat & Oxblood**—calm, adult, and precise: generous working space, readable type, restrained colour, and title colours as the main accent. System fonts keep the app entirely self-contained with zero external requests.

- Light and dark themes
- Reduced-motion support
- WCAG 2.2 AA target
- No third-party scripts, fonts, or analytics

---

## Status

**Available for local testing; not ready for public launch.** The core learning app—all four tracks, adaptive selection, rated commits, repair ladders, echoes, Daily Crux, progress, calibration, leaderboards, profiles, settings, export, and deletion—exists and passes checks. See [`updates.md`](updates.md) for the detailed MVP readiness audit.

Remaining launch gates: human content review & publication, admin/integrity tooling, security & performance hardening, accessibility CI, staging beta, and production deployment.

---

## Documentation

| Document | Purpose |
|---|---|
| [`doc.md`](doc.md) | Full product and system specification (v2) |
| [`docs/execution.md`](docs/execution.md) | Task contracts, acceptance tests, completion records |
| [`docs/research.md`](docs/research.md) | Evidence base and claim limits |
| [`content/REVIEW.md`](content/REVIEW.md) | Content review status and process |
| [`updates.md`](updates.md) | MVP readiness audit (8 Nov 2026) |

---

## License

All rights reserved.
