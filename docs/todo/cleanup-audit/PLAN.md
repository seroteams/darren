# Cleanup after the audit — fix, delete, simplify (no new features)

**Goal:** The cruft the July 4 deep-dive audit found is gone: the real fixes are in, dead scripts are deleted, and the copy-pasted helpers are folded into one.
**Driver:** Carl
**Created:** 2026-07-04

Source: full audit report (chat, 2026-07-04). Everything here is offline/free — **no OpenAI spend anywhere in this plan**.

## Done means
- The 5 real problems the audit confirmed are fixed (types, duplicate constant, silent errors, escaping, stale config).
- The dead one-off scripts are deleted and the log folder is purged.
- One shared helper each for HTML escaping, relative time, and prompt filling — no more copies.
- `npm test` and both typechecks stay green after every phase.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Quick fixes | The 4 small real fixes (types, constant, error logging, stale config) | ⬜ |
| 2 | Delete dead cruft | Dead scripts gone, product-qa/clamp decided, logs purged, old branches pruned | ⬜ |
| 3 | Frontend helpers | One escapeHtml + one relTime for the whole admin app | ⬜ |
| 4 | Backend dedup | One prompt-filling helper, one snapDelta, test auto-discovery | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 1 is next. Baseline not yet run.

## Parked
(from the audit — each would be its own plan if Carl wants it)
- **Engine unit tests** for queue-manager.ts + reviewer.ts (~6,500 untested core lines — biggest safety win, ~2 days).
- Split the god files: session-streams.ts (5 handlers), sessions.service.ts, reviewer.ts.
- Split design.css (4,032 lines) into tokens/layout/components/stage files.
- Split onepage.js (732 lines) into form + stream + rail.
- Finish the admin JS→TS migration (file-by-file as touched).
- Session fence: document undefined/null invariant + add org+user wall test.
- Unify the two fmtDate helpers; shared guard factory for admin/superadmin middleware.
- Simplify models.ts 4-level model resolution (unused layers).
- Refresh docs/sero-how-it-works.html changelog (PG phases not reflected).
