# MVP experience verification — 11 November 2026

The requested experience additions are implemented locally on `task/4.7-mvp-experience`. This is not a production-launch sign-off.

## Delivered

- Original, quiet success chime and a brief burst of 22 confetti pieces after correct answers in practice, code, Daily, the sample, tutorials and repair steps. Loaded results do not replay feedback. Sound and celebrations have separate Settings controls; both system and account reduced-motion choices suppress confetti. Audio is prepared during the submission gesture, following [MDN’s Web Audio guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).
- First-party cookie choices: essential only or optional preferences, reversible from the footer. Consent and optional signed-out effects cookies expire after 180 days. Optional storage is absent before acceptance and removed on withdrawal. Blocked cookies leave practice usable with an explicit visit-only notice. Existing sign-in storage remains essential local storage; no trackers were added.
- Editable display name, photo upload/removal, existing handle changes, and consistent avatars in navigation and public profiles. JPEG/PNG/WebP inputs up to 5 MB are re-encoded as 256-pixel square JPEGs without source metadata. Names/photos follow public-profile visibility and are included in export and deletion. Database constraints and existing owner RLS protect these fields. Saving a profile preserves pending edits in the separate preferences form.
- Mobile Settings layouts and dark-theme surface text fixes; an explicit “Use this order” control for ordering answers; corrected handle validation; and account deletion now refreshes `private.leaderboard`, matching migration 0007.
- Existing tests now handle the expanded question formats and the code problem actually selected. Shared browser-test database cleanup runs at worker teardown. Numeric input tests temporarily isolate their fixtures and restore the existing publication statuses afterward.

## Verification

| Command | Actual result |
| --- | --- |
| `npx supabase migration up --local` | `Applying migration 0008_profile_experience.sql...` / `Migrations applied` |
| `npm run check` | Exit 0: TypeScript, ESLint and Deno checks |
| `npm test` | `Test Files 38 passed (38)` / `Tests 373 passed (373)` |
| `npm run test:db` | `Files=1, Tests=35` / `Result: PASS` |
| `npm run test:api` | `Test Files 13 passed (13)` / `Tests 70 passed (70)` |
| `npm run test:e2e -- --max-failures=1` | `46 passed (3.7m)` — full Chromium suite, including desktop/mobile/zoom journeys and all four accessibility checks |
| Follow-up experience, Settings and profile suites | `11 passed (17.1s)` after the separate-form draft regression was added, failed and fixed |
| `npm run content:check` | `All content checks passed successfully (106 templates, 45 code problems, 34 concept cards checked).` |
| `npm run build` | Exit 0; main JavaScript approximately 180 KB gzip; CodeMirror remains lazy-loaded |
| `npm run content:check:launch` | Exit 1: `Content checks failed with 42 error(s)`; source has zero published launch items in every track |

Regression tests failed before implementation for missing preferences code, missing profile columns and missing cookie/ordering controls. Profile tests also caught the explicit export projection omitting the new fields; the export query was corrected. One combined CPU-heavy unit/browser run exceeded two existing 5-second content-test timeouts; the subsequent serial unit run passed all 373 tests.

Chromium exercises real local Supabase auth, RLS, persistence, export and deletion. Judge0 tests use a local scripted fixture. Browser audio scheduling was checked; physical speaker output and other browser engines were not checked. No remote CI result or production behavior is claimed.

## Release gates still open

1. Human review and publication of content and concept cards. Test fixtures in the local database are not reviewed launch content; no source reviewer/publication fields were filled by this work.
2. Owner review of legal drafts, including the new cookie/photo disclosures.
3. The closed calibration beta and its measured acceptance criteria in execution.md Task 8.3.
4. Production Supabase/hosting, migration 0008 before the frontend release, SMTP/OAuth and Judge0 configuration, backups, CI and production smoke tests under Task 8.4.

No production deployment was created. The owner subsequently requested a GitHub push. Commits use `Codex (GPT-6) <codex@openai.com>`, with the address verified against [OpenAI's commit instructions](https://github.com/openai/symphony/blob/main/.codex/skills/commit/SKILL.md). Prerequisite content and release work is included in separate commits; unrelated local notes remain excluded. No new dependency was added.
