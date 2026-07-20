# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| 1b4b459f | Promises-loop P3 engine feed + scorer-trust fix | backend/engine/run-health.ts, backend/engine/run-health.test.ts, backend/api/services/sessions/session-streams.ts, backend/engine/reviewer.ts, backend/engine/cli/stages/, backend/engine/preparation-inputs.ts, content/prompts/, docs/plans/doing/promises-loop/ | 2026-07-18 |
| 2ee8127c | Screen-gallery v2 — static HTML gallery + export script + fixtures (Part B/C) | scripts/gallery-export.mjs, scripts/gallery/, docs/screen-gallery/, docs/plans/doing/screen-gallery/ | 2026-07-18 |
| b7cefddf | Meeting types — hide Onboarding card + open Monthly Check-in to managers | backend/api/services/catalog/, backend/api/services/guided-sessions/guided-sessions.controller.ts, backend/api/services/guided-sessions/guided-sessions.gate.test.ts, backend/api/services/trackers/trackers.controller.ts, backend/api/server.ts, frontend/src/main.js, frontend/src/router.js, frontend/src/router.test.ts, admin/src/router.js, admin/src/router.test.ts, admin/src/main.js, admin/src/stages/guide.js, admin/src/stages/intake.js, docs/plans/done/monthly-one-on-one/plan.md | 2026-07-19 |
| 9935e387 | Run-memory Phase 1 — one read-quality signal (planTurn → transcript → run detail chip) | backend/engine/read-quality.ts, backend/engine/read-quality.test.ts, backend/engine/reviewer.read-quality.test.ts, backend/engine/delta-gates.ts, backend/engine/reviewer.ts, backend/engine/queue-manager.ts, backend/engine/run-history.ts, backend/db/runs-store.ts, backend/db/runs-store.test.ts, backend/shared/session.types.ts, backend/engine/cli/stages/questioning.ts, backend/api/services/sessions/session-streams.ts, backend/api/services/persona-runs/persona-runs.runner.ts, admin/src/stages/run-detail.ts, admin/src/styles/design/run-detail.css, docs/plans/doing/sero-run-memory/ | 2026-07-20 |
**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
