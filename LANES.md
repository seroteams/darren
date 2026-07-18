# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| 82c442a0 | Agency engagement — hardening (Phase 2) | docs/plans/doing/agency-engagement/, docs/reports/, backend/api/server.ts, backend/api/router.ts, backend/db/env-guard.ts, backend/db/sessions-store.ts, backend/db/schema.ts, backend/db/migrations/, backend/api/services/auth/, backend/api/services/sessions/sessions.service.ts, backend/api/services/health/, backend/engine/reviewer.ts, backend/engine/cost.ts, backend/api/handlers/stream-helper.ts, backend/api/services/sessions/session-streams.ts, backend/api/static.ts, scripts/backup-db.js, frontend/src/stages/guided/guided.css, frontend/src/stages/team.ts, frontend/src/stages/members.ts | 2026-07-18 |
**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
