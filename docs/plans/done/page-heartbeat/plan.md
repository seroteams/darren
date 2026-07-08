# Page heartbeat — real UPDATE buttons

**Goal:** The three admin pages that describe the app itself (Guide, Universe, Tasks board) stop lying: each gets a real update that re-reads the codebase via the server, refreshes the page, and reports in plain words what changed.
**Driver:** Carl
**Created:** 2026-07-05

Born from the 2026-07-05 page audit: 16 of 25 pages already fetch live data; these 3 are hand-typed
snapshots of the codebase with nothing checking them against reality. Guide's current "Check for
changes" button only covers build + meeting types + arcs — the rest of the page can silently drift.

## Done means
- On /guide, one UPDATE re-reads the repo (screens on disk, npm commands, axes, question count, build) — the page redraws itself from that and shows "changed since your last check: …" in plain words.
- On /universe, the pipeline ring comes from the app's real flow (not a private copy), and Update reports stage changes.
- On /tasks, a check button compares the board against what actually landed (commits + plan folders) and flags rows that look stale.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Heartbeat endpoint + Guide goes live | `GET /api/v1/heartbeat` (screens, commands, axes, question count, build) + Guide sections render from it; UPDATE = refresh + plain-words changelog | ✅ |
| 2 | Universe honest ring | Pipeline ring derived from the app's real flow stages; Update reports added/removed/renamed stages | ✅ |
| 3 | Tasks board reality check | **Re-aimed at the planner** (build board was removed): "Update from docs" syncs auto-managed "Docs" cards from `docs/plans/doing/` — lists what it checks, animates add/update/move/remove. Since extended: board auto-syncs on open, seed removed (`1e9a42b4`) | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**✅ TRACK CLOSED 2026-07-08 — all 3 phases green-lit by Carl, $0 total spend.** The three pages that
described the app by hand now read it live: /guide (P1), /universe's ring (P2), /tasks (P3).

**Phase 2 ✅ green-lit by Carl 2026-07-08 ("yeah its ok" / "a") after the staged live walk:** same
7-step ring on open, Update unchanged on data, then a fake "Shadow review" stage added to the real
flow → Update announced "Pipeline step added: Shadow review." with 8 planets; revert →
"Pipeline step removed". Detail in [phase-2.md](phase-2.md).

**Phase 3 ✅ green-lit by Carl 2026-07-08 after a full live walk.**

Phase 3 walk record (2026-07-08, all free): Carl walked all 4 scenarios live on /tasks — board
fills itself on open + "Update from docs" reconciles ①, hand-added cards untouched ②, a staged
phase-status flip made the card pulse 1/3→2/3 ③, and a throwaway plan folder appeared, faded to
Done when moved to `done/`, and vanished when deleted ④. Test artifacts fully cleaned up.
Code was already committed (build 2026-07-05 + auto-sync-on-open extension `1e9a42b4`);
`npm test` 96/96 · both typechecks clean.

Phase 3 detail: built 2026-07-05 (jumped ahead of Phase 2 because Carl asked for the /tasks Update
button directly); re-aimed at the planner after the build board was removed the same day; option A
(Update only touches its own "Docs" cards). The `1e9a42b4` extension removed the hardcoded seed —
/tasks now fills itself from the live plan folders on open (quiet sync, no modal), "Reset" became
"Reset from docs".

Phase 1 ✅ — walked + green-lit by Carl 2026-07-05 ("ALL GOOD"); code committed `4e4ea787`.

Phase 1 detail (for the record):
- Landed: `backend/api/services/heartbeat/` (repo + service + controller + 8 tests), route `GET /api/v1/heartbeat` (admin-gated), `getHeartbeat()` in shared/api.js, guide.js Screens + Commands sections now render live + the UPDATE button diffs screens/commands/axes/question count on top of build/types/arcs.
- After: `npm test` **65/65** · both typechecks clean.
- Verified live in the browser: first-check snapshot ✓ · "No changes" ✓ · dummy file added → "Screens added: test-page.js" under "New screens — not yet grouped" with its own header comment ✓ · deleted → "Screens removed" ✓. Bonus: the live list fixed a standing lie (old page said `team.js`; the real file is `team.ts`).
- The running dev API on :3001 auto-restarted onto this code, so Carl can walk /guide right away — no restart needed.
- Next: Carl walks phase-1.md scenarios → green light → commit → Phase 2 (Universe ring).

Baseline (free checks, before any edits): `npm test` **63/63 PASS** · `npm run typecheck` clean · `npm run typecheck:admin` clean. Paid gate not needed — no engine/prompt changes in this plan.

## Parked
- Live API-route list on /guide (deriving the route table from server.ts registrations) — nice, but the API contract is stable; hand-written for now.
- Verifying the Guide's prose sections (QA, files, gaps) — prose is curation, a scanner can't check it.
- ENV var list live-derived from code — low churn, hand-written for now.
- Auto-updating tasks.js `s` fields from git — the check only *warns*; the board's build statuses stay human-set (standing rule: sign-off is Carl's).
