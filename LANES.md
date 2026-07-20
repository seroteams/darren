# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| 2ee8127c | Screen-gallery v2 — static HTML gallery + export script + fixtures (Part B/C) | scripts/gallery-export.mjs, scripts/gallery/, docs/screen-gallery/, docs/plans/doing/screen-gallery/ | 2026-07-18 |
| 7d264f5e | Better-reads P3 finish — prep-freshness prompt + wiring (Carl cleared 1b4b459f's claim, 2026-07-20) | content/prompts/preparation.md, backend/api/services/sessions/preparation-inputs.ts, backend/api/services/sessions/session-streams.ts, backend/engine/preparation.ts, backend/engine/preparation.test.ts, backend/engine/prep-history.ts, backend/engine/prep-history.test.ts, docs/plans/doing/better-reads/ | 2026-07-20 |

**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
