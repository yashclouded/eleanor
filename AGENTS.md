# Eleanor agent instructions

## Context

- Node v22.11.0, npm 10.9.0. Task 0.1 landed (Vite React TS toolchain scaffolded).
- Where to find things:
  - [docs/execution.md](docs/execution.md): what to build next, with each task's contracts, tests, and prompt.
  - [doc.md](doc.md): product behaviour and the learner model (ERM-1).
  - [docs/research.md](docs/research.md): evidence and claim limits.
  - `docs/archive/`: superseded material. Never implement from it.
- Stack (planned): Node 22, npm, React + TypeScript + Vite, Supabase (Auth, Postgres + RLS, Edge Functions, `pg_cron`), Judge0 for code, Vitest, Playwright.

## Getting context with minimum tokens

- Start from your task in `docs/execution.md`. Read only that task, the Global Constraints, and the `doc.md` sections it cites (§ numbers).
- Locate before you read: grep or search first, then read only the needed line range. Never read a whole large file "for background".
- Do not re-read a file you just wrote or edited. Do not summarise what you read back to the user.
- Do not explore directories the task does not touch. Do not run broad searches when the task names the file.
- Prefer the interfaces block in a task over reading earlier implementations. Open the source only when you call it or change it.
- Fetch library docs (context7 or the official site) only for APIs you are about to use and are unsure of. Supabase and Judge0 change often; check them.

## How to work

- **Act directly.** If the task and spec are clear, implement without asking. Ask only for a 🔒 owner gate, or a real contradiction in the spec. Fix the spec first, then the code.
- **Senior-developer standard:**
  - Make the smallest correct change. Read the code path it touches end to end first, and fix root causes in the shared function, not in each caller.
  - Reuse `supabase/functions/_shared`; never re-implement grading, model, or selection logic.
  - No speculative abstractions, config for constants, or "for later" scaffolding. Delete dead code.
  - Clear names over cleverness. Comments explain *why*. A deliberate shortcut gets a `ponytail:` comment naming its ceiling.
  - Dependencies: only the allowlist in execution.md's Global Constraints. Anything else needs a justification in the commit body.
- **Test first.** Write the failing test, run it, implement, run again. Report the **actual** command output. Never claim a check passed without running it.
- **Atomic commits:**
  - One logical change per commit, with its tests, and every commit must pass `npm run check && npm test`.
  - Never mix a refactor, a feature, and formatting in one commit.
  - Message format: `type(scope): imperative summary` (types: feat, fix, test, refactor, chore, docs, content). Add a body only when the *why* is not obvious.
  - Never commit secrets, `.env*`, `build/`, `dist/`, or generated test data.
- **Git:** one branch per task (`task/<id>-<slug>`). Do not push to `main`, force-push, or amend pushed commits.
- **Finish** by running the task's "Done when" commands. Check the boxes only with evidence, and keep this file's commands accurate.

## Commands

`npm ci` · `npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint` · `npm run check` · `npm test` · `npm run test:watch`

## Non-negotiables

- **No AI in the product:** no model calls, generated explanations, or runtime-generated content.
- **Server-side writes only.** The browser never writes attempts, ratings, echoes, or results; every learning write goes through the `api` Edge Function in one Postgres transaction. Transitions are idempotent through `transitionId`.
- **No leaks before resolution.** Nothing correctness-related leaves the server until the attempt resolves: no answer, step, solution, item rating, or forecast.
- **Commitments are fixed.** The first commit is immutable. Confidence has no default. "I'm stuck" is always available and counts as a rated loss. Declared help makes an attempt unrated.
- **Model fidelity.** ERM-1 constants and formulas are exactly those in doc.md §6, with `MODEL_VERSION = 'erm-1'`. Any change means a new version, a passing simulation gate, and a replay.
- **Content gating.** Only human-reviewed `published` content is selectable. An agent never fills `reviewer` or sets `published`.
- **Leaderboards without surveillance.** Leaderboards are public, but integrity relies on review flags from outcome statistics only: no keystroke, clipboard, paste, tab-switch, or speed tracking, and no automatic penalties.
- **Honest metrics.** Show Brier alongside calibration error, overconfidence gap, and N. Never claim IQ or general-intelligence gains.
- **Accessibility and privacy are release requirements:** keyboard-only flows, WCAG 2.2 AA, export and delete-account, no third-party scripts, fonts, or analytics, and an age floor of 16+.

## Commit attribution

- AI-authored commits end with a `Co-Authored-By:` trailer naming the actual agent model and its legitimate attribution address.
- Never invent an email or impersonate the owner. If attribution details are unavailable, say so.
