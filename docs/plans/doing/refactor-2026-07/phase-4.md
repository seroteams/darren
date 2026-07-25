# Phase 4 — customer bundle: variant lab out + frontend dead code

Goal: the customer app ships ~950 lines of internal layout-lab code it never shows (preparation-brief variants A..L — only H is customer-facing — plus their CSS), and some dead code.

Work: extract renderA..L (~290 lines of frontend/src/stages/preparation-brief.ts) + the ~660 variant lines of preparation.css into an admin-only module/stylesheet; delete the unreachable member branch in admin/src/stages/runs.ts:109-215 (frontend router excludes RUNS for members); drop the 11 dead frontend exports; de-dupe boot-splash.js (frontend cross-imports admin's copy, the established pattern); move `.stage-exit` CSS out of the customer bundle.

Verify: `npm run build:all` with before/after bundle sizes; `npm test`; both app typechecks; lint:tokens + lint:copy; screenshots of preparation (variant H) and the customer runs screen — pixel-identical.

QA: user-visible — closes on the screenshots + bundle-size drop. ✅ Pass: both screens look exactly as before, bundle smaller. ❌ Fail: any visible difference.
