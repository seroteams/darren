# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| 2ee8127c | Screen-gallery v2 — static HTML gallery + export script + fixtures (Part B/C) | scripts/gallery-export.mjs, scripts/gallery/, docs/screen-gallery/, docs/plans/doing/screen-gallery/ | 2026-07-18 |
| 6d4593d4 | Brief style-tip — new AI-written styleTip field in prep brief (engine+prompt+render) | content/prompts/preparation.md, backend/engine/preparation.ts, backend/engine/preparation.test.ts, backend/engine/cli/stages/preparation.ts, backend/shared/session.types.ts, scripts/test-prep-wording.js, frontend/src/stages/preparation-brief.ts, frontend/src/stages/preparation.css, docs/plans/doing/brief-style-tip/ | 2026-07-20 || ba75315b | UX-audit Phase A (partial) — customer nav "New 1:1"→"Start 1:1" + promise-status chips → Done/Partly/Not done/Changed | admin/src/ui/app-nav.js, frontend/src/ui/app-nav.js, frontend/src/stages/team.ts, admin/src/ui/promise-checkin.ts, frontend/src/stages/guided/coaching-copy.ts | 2026-07-20 |
| 0854764d | Promise lock-in redesign (Todoist, desktop+mobile) — promise-agree component + styles + its /test mock | admin/src/ui/promise-agree.ts, admin/src/styles/design/promise-agree.css, admin/src/stages/tests/promises-before-recap.js | 2026-07-20 |
**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
