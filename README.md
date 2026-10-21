# Eleanor: The Rated Gym for Your Own Thinking

> *Think first. Commit an answer and how sure you are. Get rated like a chess player. Prove it a week later on a problem you have never seen.*

Eleanor is chess-style rated practice for judgment, logic, mathematics, and code. Every learner has an active rating per track that rises as they improve, alongside a rating for every problem. An adaptive learner model (ERM-1) selects problems calibrated to stretch learners while maintaining a target ~70% success rate. 

Unlike conventional platforms, Eleanor pairs your rating with two honest measures of thinking:
1. **Calibration:** Do you know when you are right?
2. **Echoes:** Can you still solve it days later on a completely fresh variant you have never seen before?

---

## The Core Loop

```
Read Problem  ──>  Attempt Unaided  ──>  Commit Answer & Confidence
                                                     │
                                                     ▼
                  Result & Rating Delta  <──  Deterministic Server Grading
                            │
                            ▼
              Repair Ladder (if incorrect)
                            │
                            ▼
                Worked Solution Reveal
                            │
                            ▼
             Personal Insight  ──>  Echo Review (1, 3, 7, 21 days)
```

1. **Attempt Unaided:** Read parameterised generator problems crafted to test deep underlying concepts.
2. **Commit Answer & Confidence:** Explicitly state how certain you are (0%–100%) with no default set. Outside help can be declared to make an attempt unrated.
3. **Instant Resolution:** Server-side grading evaluates your answer, updates ratings, provides misconception feedback ("mistake fingerprints"), and displays the model's own forecast.
4. **Repair Ladder:** Instead of revealing the full answer immediately, work through structured intermediate guidance steps to diagnose the failure without altering your rating.
5. **Reveal & Insight:** Study the human-authored worked solution and save an optional 280-character takeaway to your personal Playbook.
6. **Echoes:** Re-encounter concepts at 1, 3, 7, and 21-day spaced intervals. Mastery is only earned through unaided echo successes.

---

## Four Rated Tracks

- **Judgment:** Probability, risk assessment, Fermi estimation, and decision analysis under uncertainty.
- **Logic:** Formal deductions, Knights & Knaves, truth tables, and combinatorial deduction.
- **Math:** Applied discrete math, number theory, and algebraic reasoning.
- **Code:** Algorithmic programming problems graded deterministically against rigorous test suites.

---

## Architectural Principles & Non-Negotiables

- **No AI in the Product:** Explanations, hints, repair ladders, and feedback are human-authored. Grading is strictly deterministic.
- **Server-Side Writes Only:** The browser never writes attempts, ratings, echoes, or results. All mutations occur within idempotent transactions using `transitionId` through Supabase Edge Functions.
- **Zero Information Leakage:** Solutions, step answers, misconceptions, and forecasts never leave the server until the attempt resolves.
- **Model Fidelity (ERM-1):** Ratings follow exact Glicko-2 dynamics with explicit RD inflation over time and simulation-gated calibration.
- **Leaderboards without Surveillance:** Public rankings rely strictly on statistical outcome integrity—never tracking keystrokes, clipboards, or browser focus.
- **Accessibility & Privacy First:** Built with WCAG 2.2 AA compliance, zero third-party tracking scripts, full export, and complete account deletion.

---

## Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Vanilla CSS design system
- **Backend:** Supabase (Auth, PostgreSQL with Row-Level Security, Edge Functions with Deno)
- **Testing:** Vitest (unit & API suites), Playwright (end-to-end testing with `@axe-core/playwright` accessibility audits)
- **Runtime:** Node.js 22.11+

---

## Getting Started

### Prerequisites

- **Node.js** (v22.11.0+) and **npm** (10.9.0+)
- **Docker Desktop** (required for local Supabase stack)
- **Deno** (for Edge Functions check)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yashclouded/eleanor.git
   cd eleanor
   ```

2. Install dependencies:
   ```bash
   npm ci
   ```

3. Start local Supabase services:
   ```bash
   npm run db:start
   ```

4. Populate local environment configuration (`.env.local`):
   ```bash
   # Credentials from `npx supabase status`
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
   ```

5. Sync content bank:
   ```bash
   npm run content:sync -- --include-drafts
   ```

6. Start local development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173). Inbound test emails (magic links, OTPs) can be viewed at Mailpit: [http://127.0.0.1:54324](http://127.0.0.1:54324).

---

## Verification & Commands

| Command | Description |
|---|---|
| `npm run check` | Run TypeScript compiler, ESLint, and Deno edge check |
| `npm test` | Run Vitest unit tests |
| `npm run test:api` | Run Supabase API integration tests |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run db:reset` | Reset and re-apply local migrations |
| `npm run content:check` | Validate all problem templates, skins, and levels |
| `npm run model:simulate` | Run ERM-1 model simulation gate |

---

## License

Private / All rights reserved.
