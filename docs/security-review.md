# Task 8.2 — security and performance review

Reviewed locally on 2 November 2026, using Node 22.11.0, npm 10.9.0, Deno 2.x, and the local Supabase stack. No production deployment was performed. This branch includes the UI refresh and Tasks 7.1–7.2.

## Findings and fixes

- **Judge0 destination injection:** a request could select a Judge0 URL through `x-judge0-url`, receiving hidden inputs and potentially the configured authentication header. Removed the request override from every caller and the client factory. Tests inject the existing Judge0 client directly; no HTTP testing backdoor remains. Submission errors no longer echo upstream response details.
- **Unbounded JSON and incomplete CORS enforcement:** bodies are counted as UTF-8 bytes while streaming, including chunked requests and dishonest lengths. Limits are 8 KiB normally and 64 KiB for code requests; excess returns 413. The configured `APP_ORIGIN` is checked before authentication for actual requests and preflights. Requests without Origin remain usable by server clients. Private API responses use `Cache-Control: no-store`.
- **Ownership and replay binding:** malformed UUIDs and malformed URI escapes return 400 before SQL. Versioned registry keys remain valid for item moderation. Set and attempt reads include learner predicates in SQL. Transition replays must match the learner, action, and attempt. Code submissions reserve their transition before sending a Judge0 batch, preventing concurrent duplicate submissions.
- **Non-atomic or missing quotas:** a transaction advisory lock protects each learner/quota count and insertion. Limits are 30 newly created sets/hour, 300 commitments/hour (including give-up and code submission), 20 code runs/10 minutes, and five reports/24 hours. Successful retries are charged once; resuming an existing rated set does not create a charge. Rejected foreign attempts do not consume a quota.
- **Database access:** the security advisor reported an exposed materialized view. The snapshot now lives at `private.leaderboard`; a read-only, invoker-security `public.leaderboard` view preserves the existing public columns. Refresh callers and the cron job target the private snapshot. Client roles cannot invoke `daily_stats`, `close_stale_sets`, or the existing server-only diagnostics. This also closes the anonymous `daily_stats(date, uuid)` impersonation path. Only the intentionally public leaderboard aggregate has private-schema SELECT grants.
- **Deployment headers:** builds emit Netlify-compatible `dist/_headers` and `dist/_redirects`. CSP permits scripts only from self, connections only to self and the configured Supabase origin, images from self/data, and no framing. Existing React/CodeMirror styles require `style-src 'unsafe-inline'`; neither script inline execution nor eval is allowed. Referrers are suppressed. Unused browser capabilities are denied; explicit copy/share permissions remain available. Other static hosts must translate these files into their equivalent configuration.
- **Bundle and dependencies:** CodeMirror and Admin load as separate chunks with loading/error recovery. Vite deduplicates CodeMirror state/view packages so a Deno dependency install does not create incompatible editor instances. Pinned updates: React Router DOM 6.30.6 (18 August), Vite 6.4.4 (6 October), Vitest 4.1.12 (15 October), Playwright 1.55.1 (23 September 2025). All direct updates were at least two weeks old on the review date. The required Deno check uses `--node-modules-dir=none`, keeping its cache separate from npm's installed module graph.

## Evidence

Red tests reproduced six API boundary/rate/replay failures, six database privilege failures, the oversized main bundle/missing headers, and duplicate Judge0 batches ending in a unique-constraint error. The corresponding regressions pass after the fixes.

| Check | Actual result |
| --- | --- |
| `npx supabase db lint --local --fail-on warning` | `No schema errors found`, empty results |
| `npx supabase db advisors --local --type security --level warn --fail-on warn` | `No issues found`, empty results |
| `npm run test:db` | `Files=2, Tests=43`, `Result: PASS` |
| `npm run check && npm test && npm run build` | All exit 0: TypeScript, ESLint, Deno, unit suite, and production build |
| `npm test` | 17 files passed; 113 passed, five optional database cases skipped |
| `npm run test:replay` | 11 passed, including the optional database cases in a disposable database |
| Hardening API set, below | Six files, 37 passed |
| `npx playwright test --config playwright.hardening.config.ts` | Five passed: full code flow plus four production-build/header checks |
| Main entry, gzip | 169,406 bytes, below 250,000; CodeEditor and Admin are separate chunks |
| 300-attempt Progress, cold browser navigation | 174 ms, including authenticated reads through Supabase Auth/PostgREST/RLS; limit 1,500 ms |
| `npm audit --omit=dev --json` | Zero high, zero critical; two moderate |
| `npm audit --omit=dev --audit-level=high` and `npm audit --audit-level=high` | Both exit 0; moderate/low findings remain |
| Full dependency audit after upgrades | Zero high, zero critical; 13 moderate and one low |

API tests automatically start this checkout's `index.ts` in Deno with the frozen repository lock and local Supabase authentication/database, on a free loopback port. A test-only clock flag enables the existing fixed-date fixtures. The other agent's Edge server is not restarted. The focused command is:

```sh
npm run test:api -- \
  tests/api/edge.test.ts tests/api/http-security.test.ts \
  tests/api/security.test.ts tests/api/code.test.ts \
  tests/api/admin.test.ts tests/api/account.test.ts
```

`edge.test.ts` owns its HTTP runtime and checks `APP_ORIGIN=http://localhost:5173`. An optional `API_TEST_URL` can point the remaining tests at an existing test API. Code API tests inject the existing client with a fake Judge0 HTTP service. The full code browser flow starts an API with its fake Judge0 URL configured server-side; it no longer sends a destination-selection header. These tests use real database transactions and Supabase authentication. Production browser checks verify CSP, opt-in win sounds, lazy editor editing and sample copying, and recovery from a failed editor download.

The built JavaScript was scanned for `sb_secret`, `service_role`, service-role JWTs, and the configured local Judge0 URL/hostname. There were zero secret credentials, zero service-role JWTs, zero `service_role` occurrences, and zero Judge0 URL/hostname occurrences. The only `sb_secret` occurrence is the SDK's key-prefix validation string, not a credential. No Judge0 authentication token is configured locally; the automated scan also checks `JUDGE0_AUTH_TOKEN` whenever supplied to the test process. Build tests use test-only public values; the final browser build uses the local public environment. No credentials are recorded in this report.

### Selection query plans

`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` was run for all nine actual `loadSelectionInput` queries for the 300-attempt fixture. Results from the first recorded EXPLAIN run:

| Query | Access path | Execution |
| --- | --- | ---: |
| Profile | `profiles_pkey` | 0.013 ms |
| Track rating | `track_ratings_pkey` | 0.010 ms |
| Set slots | `attempts_set_id_slot_key` | 0.010 ms |
| Track concepts | Sequential scan of 34 rows plus sort | 0.018 ms |
| Learner concepts | `concept_ratings_pkey` | 0.007 ms |
| Misconceptions | Sequential scan of 87 rows | 0.015 ms |
| Published items | Sequential scan of 238 rows, 54 returned | 0.045 ms |
| Family exposures | Indexed learner attempts, aggregate of 300 rows | 0.225 ms |
| Due echoes | `one_due_echo_per_family` plus sort | 0.010 ms |

Existing indexes support the learner predicates. The small launch catalog scans are cheaper than adding another index; this measurement found no missing index requiring a change. No speculative indexes were added. These are local launch-scale measurements, not a production latency guarantee.

## Remaining limits

Before integration, the full API run against the shared development database finished with **71 passed, five failed**. Three Daily tests and one logic attempt encountered published entries from another agent's newer content registry (for example `logic.games.take-away` and `logic.conditionals.card-selection`) that did not exist in that checkout. The remaining echo assertion assumed a particular selected fixture family. The 3 November integration run below supersedes these failures after combining the registry and isolating the fixtures. The hardened request boundaries passed over real HTTP in both runs.

The two production audit advisories affect React Router 6: GHSA-wrjc-x8rr-h8h6 (navigation open redirect) and GHSA-337j-9hxr-rhxg (SSR hydration). This app is a client-rendered SPA and uses internal navigation targets, but both moderate advisories remain tracked. Resolving them requires a separate Router 7 migration. Development-tool findings are below high severity; Vite 6.4.5 fixes its remaining moderate advisory but was only 12 days old on the review date, below the repository’s two-week minimum. `npm audit` exits 1 for those moderate findings; it is not reported as a clean audit.

Netlify header/rewrite files were exercised locally; no hosted deployment, hosted advisor, live Judge0 execution, or production load test was performed. Apply migration `0007_security.sql` before deploying the API refresh callers. The next execution task is the owner-led closed beta (8.3); its owner gates remain in place.

CLI workflow references: [Supabase security advisors](https://supabase.com/docs/guides/observability/advisors) and [Supabase CLI reference](https://supabase.com/docs/reference/cli/global-flags).

## Combined integration verification — 3 November 2026

The integration branch combines Tasks 7.1, 7.2, 8.1 and 8.2, the UI refresh, and the captured Logic, Math and Code drafts. Verification used a separate local Supabase project with fresh migrations; the shared checkout and other local stacks were left untouched.

| Command | Actual output/result |
| --- | --- |
| `npm ci --legacy-peer-deps=false` | Exit 0 with the default peer-resolution lockfile |
| `npm run check && npm test` | Exit 0; `Test Files 21 passed (21)`; `Tests 161 passed \| 5 skipped (166)` |
| `npm run content:check` | `All content checks passed successfully (38 templates, 45 code problems, 34 concept cards checked).` |
| `npm run content:code:build` | All 45 banks built and verified, including C++/Python references, brute comparisons and negative solutions |
| `supabase test db --workdir <isolated-stack>` | `Files=2, Tests=43`; `Result: PASS` |
| `supabase db lint --local --fail-on warning` | `No schema errors found` |
| `supabase db advisors --local --type security --level warn --fail-on warn` | `No issues found` |
| `npm run test:api` | `Test Files 12 passed (12)`; `Tests 76 passed (76)` |
| `npm run test:replay` | `Tests 11 passed (11)`, including the five opt-in database cases |
| `npm run test:e2e` | `52 passed (3.4m)`; Chromium, light/dark route audits, keyboard and 200% desktop/mobile journeys |
| `npm run build` | Exit 0; main JavaScript gzip 169.44 kB; Admin and CodeEditor remain separate chunks |
| `npm audit --audit-level=high` | Exit 0; `14 vulnerabilities (1 low, 13 moderate)`; zero high/critical |

The 300-attempt Progress check measured 207 ms. Integration fixes give browser specs separate SQL pools and run their contexts with reduced motion; the light Apprentice badge was darkened after a real contrast failure. An interrupted browser run had three sign-in timeouts, including an expired flow state; all 52 tests passed on the complete rerun while keeping the host awake, without changing auth code.

All 67 captured template/problem review records remain draft with empty human-review fields. At the owner's instruction, the conflicting uncommitted AI-tutor proposal is preserved byte-for-byte in [the archive](archive/uncommitted-ai-tutor-proposal-2026-11-03.md); canonical `doc.md` and the ERM-1 model constants are unchanged. Human content review/publication, production replay apply, beta and deployment remain owner gates. No production apply or deployment was performed. Manual assistive-technology and non-Chromium checks remain outside this automated run.
