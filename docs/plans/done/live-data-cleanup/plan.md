# Live-data cleanup — finish the v1 migration, drop the dead routes

**Goal:** Every screen talks to the one real `/api/v1/` API; the 54 dead legacy routes are gone; the todo folder matches reality.
**Driver:** Carl (asked 2026-07-05: "do a live data audit — I have the feeling some pages/files aren't truly connected")
**Created:** 2026-07-05

## Done means
- The audit report is saved and Carl has read it.
- `shared/api.js` has zero non-v1 calls (except `/api/version`, which has no v1 twin by design).
- `backend/api/server.ts` has no legacy `/api/*` alias routes left.
- Every genuinely finished `docs/workstreams/` folder sits in `done/`.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Audit report | `docs/reports/2026-07-05-live-data-audit.md` — the full findings, plain words | ✅ |
| 2 | Finish the v1 migration | ALL non-v1 calls switched to `/api/v1/` — 15 in `shared/api.js` + **10 SSE stream URLs in stage files the audit undercounted** | ✅ |
| 3 | Delete the legacy routes | ~54 alias routes + unconsumed `pipeline/manifest` removed from server.ts | ✅ |
| 4 | docs/todo housekeeping | finished folders moved to `done/`, trackers matched to reality | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**ALL 4 PHASES DONE — plan CLOSED 2026-07-05, same day it opened.** Carl green-lit the whole cleanup ("go for it, happy to complete"; per-phase walks waived — the phase-file scenarios stay valid for spot-checks).
**Phase 4:** the todo folder was already honest — the only stale entry was **member-nav**, closed to done/ on Carl's call (Phase 2 superseded by pre-go-live PG1–5). Everything else is genuinely active (error-log, user-management, page-heartbeat, hide-ai-words, manager-ready, this plan) or deliberately parked (continuity — hard-parked; design-cleanups, planner-grounding, briefing-readability-p0, run-qa-fixes-jul04 P2–4, frontend-admin-split P2–4).
**Phase 3 landed:** every legacy `/api/*` alias route deleted from server.ts (145 lines gone); the whole unconsumed `pipeline/manifest` chain removed (route + controller + service + repo scan/counts + its test); `adminLegacy` renamed `adminRaw` (now only wraps the library file stream); Guide text + library redirect fallback updated. **Live-proven on a scratch API (port 3199):** legacy `/api/arcs`, `/api/meeting-types`, `/api/bank/stream`, `/api/v1/pipeline/manifest` all **404**; `/api/v1/arcs` **401** (exists, gated), `/api/v1/meeting-types` + `/api/version` **200**. `npm test` 69/69 · admin build ✓ · typecheck clean outside the other session's in-flight error-log files.
⚠️ Note for Carl: **restart your dev API server** — the old process still serves the old routes until restarted.
**Phase 2 note:** the audit's "13 calls" was an undercount — the sweep also caught `saveArc`/`resetArc` (template literals) and **10 SSE stream URLs living in stage files** (bank/eval/focus-points/onepage×5/preparation/questioning), all migrated; dev-badge labels updated. Deleting the aliases without those would have broken the whole run pipeline.
**Checks (free):** `npm test` **69/69 PASS** · admin build ✓ · repo grep shows only `/api/v1/` + `/api/version` in the frontend. Typecheck errors exist but all sit in the other session's in-flight error-log files — pre-existing, not this work.
**Baseline (2026-07-05, free):** `npm test` **67/67 PASS** before any change (test count grew to 69 via the parallel error-log/mobile sessions).

## Parked
- `feedback.jsonl` grows forever (no rotation) and run artifacts on disk have no retention policy — decide later.
- `invitations` DB table is scaffolded but unused — owned by the active [user-management](../user-management/plan.md) plan, not this one.
- `/tasks`, `/privacy`, `/about` stay hardcoded — that's by design (the tasks board is the build tracker; page-heartbeat covers drift warnings).
- `/api/version` keeps its non-v1 path (no v1 twin; used by the build stamp).
