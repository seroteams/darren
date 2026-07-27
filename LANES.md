# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| 35146fdf | Carl Method portable pack | docs/carl-method/ | 2026-07-25 |
| f1f7e175 | Welcome screen = option B (brief as hero), Carl's pick 2026-07-27 | admin/src/stages/start-welcome.ts, admin/src/stages/start-welcome.test.ts, admin/src/styles/design/start-stage.css, admin/src/stages/tests/welcome-options.js | 2026-07-27 |
| 4b899314 | Audit fix-up P2 (shell + layout) | docs/plans/doing/audit-fixes-jul-25/, audits/full-app-audit-2026-07-25/p2-proof/, admin/src/styles/design/primitives.css, admin/src/styles/design/session-topbar.css, admin/src/styles/design/app-nav.css, admin/src/ui/session-topbar.js, frontend/src/router.js, frontend/src/ui/app-nav-flow.test.ts | 2026-07-25 |
| 70b40d36 | Shape-matched loading skeletons P4 (run lane + forms) | docs/plans/doing/skeleton-shapes/, admin/src/ui/flow-interstitial.ts, admin/src/stages/bank.js, admin/src/stages/eval.js, admin/src/stages/focus-points.js, admin/src/stages/questioning.js, admin/src/stages/intake.js, frontend/src/stages/preparation.ts, frontend/src/stages/join.js, admin/src/stages/admin-pulse.ts, admin/src/stages/run-detail.ts, admin/src/stages/admin-user-detail.ts, admin/src/stages/review-run.js, admin/src/stages/job-lexicons.js, admin/src/stages/guide.js, admin/src/stages/admin-feedback.ts, admin/src/stages/admin-error-log.ts, admin/src/ui/stage-data-tab.js, admin/src/ui/skeleton.js, admin/src/ui/skeleton-parts.ts, admin/src/ui/skeleton-presets.ts, admin/src/ui/skeleton-presets.test.ts, admin/src/ui/screen-scaffold.ts, admin/src/styles/design/motion.css, admin/src/stages/runs.ts, admin/src/stages/library.js, admin/src/stages/start-core.js, admin/src/stages/start-core.test.ts, admin/src/stages/admin-registered.ts, admin/src/stages/admin-runs.ts, admin/src/stages/admin-ratings.ts, admin/src/stages/admin-gate1.ts, admin/src/stages/admin-guest-runs.ts, frontend/src/stages/member-home.js | 2026-07-26 |
| d03316aa | Component consolidation P8 (the component guard) | docs/plans/doing/component-consolidation/, scripts/lint-components.js, package.json | 2026-07-27 |
| a6878b4e | Stage look-back (kill the review popup) | admin/src/stages/stage-lookback.js, admin/src/ui/stage-recap-sections.js, admin/src/ui/stage-lookback.test.ts, admin/src/styles/design/stage-lookback.css, admin/src/ui/stage-review.js, admin/src/state.ts, admin/src/stage-loaders.js, admin/src/router.js | 2026-07-27 |
| af340cd2 | Prep-brief layout picker: Arc default, managers + admin | frontend/src/stages/preparation-brief.ts, frontend/src/stages/preparation-lab.ts, frontend/src/stages/preparation.css, frontend/src/stages/preparation-lab.css, frontend/src/stages/preparation-brief.test.ts | 2026-07-27 |

**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
