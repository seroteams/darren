# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| a6878b4e | Stage look-back (kill the review popup) | admin/src/stages/stage-lookback.js, admin/src/ui/stage-recap-sections.js, admin/src/ui/stage-lookback.test.ts, admin/src/styles/design/stage-lookback.css, admin/src/ui/stage-review.js, admin/src/state.ts, admin/src/stage-loaders.js, admin/src/router.js | 2026-07-27 |
| 20818dd4 | User-test fixes P2+P3 (recap/lock-in + focus-aware seeds) | docs/plans/doing/user-test-fixes-jul-29/, admin/src/ui/promise-agree.ts, admin/src/ui/axes.js, admin/src/styles/design/axes.css, admin/src/ui/recap-pdf.ts, admin/src/stages/briefing.js, admin/src/styles/design/briefing.css, admin/src/stages/test.js, admin/src/stages/tests/recap-fixes.js, content/questions/_seed/, backend/engine/axis-coverage.ts, backend/engine/axis-coverage.test.ts, backend/engine/closer.ts, backend/engine/closer.test.ts, backend/api/services/sessions/session-streams.ts | 2026-07-30 |
| fcc85cf6 | Follow-up questions written by the model, not a code template | backend/engine/thread-follow.ts, backend/engine/thread-follow.test.ts, backend/engine/queue-manager.ts, backend/engine/queue-manager.test.ts, backend/shared/question.types.ts, backend/api/services/sessions/sessions.service.ts, content/prompts/plan-turn.md, content/prompts/generate-questions.md, scripts/test-question-integrity.js, admin/src/stages/questioning.js, admin/src/ui/coach-panel.ts | 2026-07-30 |
| 080b9104 | Brief star rating (prep screen + feedback inbox) | docs/plans/doing/brief-star-rating/, frontend/src/stages/preparation.ts, frontend/src/stages/preparation-brief.ts, frontend/src/stages/preparation-brief.test.ts, frontend/src/stages/preparation.css, backend/api/services/feedback/, backend/db/schema.ts, backend/db/migrations/, backend/api/server.ts, shared/api.js, admin/src/ui/feedback-kinds.ts, admin/src/ui/feedback-kinds.test.ts, admin/src/stages/admin-feedback.ts, admin/src/styles/feedback-inbox.css | 2026-07-30 |



**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
