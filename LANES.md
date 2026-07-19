# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| 1b4b459f | Promises-loop P3 engine feed + scorer-trust fix | backend/engine/run-health.ts, backend/engine/run-health.test.ts, backend/api/services/sessions/session-streams.ts, backend/engine/reviewer.ts, backend/engine/cli/stages/, backend/engine/preparation-inputs.ts, content/prompts/, docs/plans/doing/promises-loop/ | 2026-07-18 |
| 2ee8127c | Screen-gallery v2 — static HTML gallery + export script + fixtures (Part B/C) | scripts/gallery-export.mjs, scripts/gallery/, docs/screen-gallery/, docs/plans/doing/screen-gallery/ | 2026-07-18 || 457faf5d | Promises-before-recap — dedicated agreement step + recap/PDF plumbing | docs/plans/doing/promises-before-recap/, admin/src/ui/promise-agree.ts, admin/src/ui/promise-agree.test.ts, admin/src/ui/promise-confirm.ts, admin/src/ui/promise-confirm.test.ts, admin/src/styles/design/promise-agree.css, admin/src/styles/design/promise-confirm.css, admin/src/styles/design.css, admin/src/stages/briefing.js, admin/src/stages/briefing-structure.test.ts, admin/src/state.js, admin/src/state.test.ts, admin/src/main.js, admin/src/ui/recap-pdf.ts, admin/src/ui/recap-pdf.test.ts, backend/api/services/sessions/session-views.ts, admin/src/stages/tests/promises-loop.js, admin/src/stages/tests/promises-before-recap.js, admin/src/stages/test.js, frontend/src/main.js | 2026-07-19 |
| 5d716aaf | Coach panel (runner-v2 real build) — plan folder; Phase 1 will add questioning split + axes wiring | docs/plans/doing/coach-panel/, admin/src/stages/questioning.js, admin/src/ui/axes.js, backend/engine/axes.ts | 2026-07-19 |
**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
