# Interface refresh — 2 November 2026

Owner request: a more luxurious interface, icons, animation, achievement trophies,
and win/loss sound effects.

The interface uses warm ivory, graphite, and brass, with matching light and dark
themes. The landing and sign-in pages have an editorial layout and locally drawn
geometric artwork. Shared controls, navigation, track cards, and result icons use
the same visual language. Fonts come from the operating system; no dependencies,
third-party requests, or external media were added.

Motion uses CSS transitions and transforms. Both the operating system's reduced
motion setting and the existing profile preference suppress continuous motion.

Completed sets show a trophy when at least one attempt exists. Achievement details
come only from the existing summary: an upward title crossing, passed echoes,
and a set whose attempts are all correct. No achievement score or new rating rule
was introduced. Track title badges use the existing model's titles; the formerly
hardcoded Novice label in the account header was removed.

Sound is off by default. The header's Sound effects toggle saves a local preference.
Brief Web Audio tones distinguish correct and incorrect outcomes, including code
and Daily Crux resolutions. A restored result or repeated response does not play
again. Audio is unlocked from the learner's explicit action, and audio failures
cannot interrupt practice. No interaction telemetry or audio assets are sent.

## Validation

```text
npm run check && npm test && npm run build
Test Files  15 passed (15)
Tests       103 passed (103)
Production build succeeded; the existing large JavaScript chunk warning remains.
```

Browser verification uses `tests/e2e/visual.spec.ts`, the two admin tests, and the
original landing sample test. It covers light/dark screens at 320, 390, and 1440
pixels; text scaling to 200%; reduced motion; axe serious/critical violations;
opt-in win/loss audio; mobile navigation; and the completed-set trophy screen.
The original sample test now identifies the Edge Function API by its path rather
than assuming Vite always uses port 5173. Accessibility checks wait for finite
entrance animations to finish before measuring contrast. The final Chromium run
reported `11 passed (29.4s)`.

The visual tests use a real local Supabase session and temporary database fixtures;
Daily Crux and completed-set HTTP responses are mocked. The sound tests verify
Web Audio scheduling, mute behavior, and result-transition deduplication. Physical
audio output and other browser engines have not been checked.

The isolated preview runs on port 5178 to leave other agents' servers alone. Its
temporary Playwright config is `/private/tmp/eleanor-playwright-visual.config.ts`.
The normal committed Playwright config can run the same test files on port 5173.

## Integration

Branch: `task/ui-luxury-refresh`, based on admin commit `f78e5a4`. Preserve that
parent when integrating the UI, since the navigation includes the admin link.
The shared content checkout was not modified. No production deployment was run.
