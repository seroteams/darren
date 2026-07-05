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
| 1 | Heartbeat endpoint + Guide goes live | `GET /api/v1/heartbeat` (screens, commands, axes, question count, build) + Guide sections render from it; UPDATE = refresh + plain-words changelog | 🔨 built — awaiting walk |
| 2 | Universe honest ring | Pipeline ring derived from the app's real flow stages; Update reports added/removed/renamed stages | ⬜ |
| 3 | Tasks board reality check | "Check board" reports what landed since last check (commits, plan folders) and flags stale-looking rows | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 BUILT + machine-verified 2026-07-05 — awaiting Carl's walk (not committed; green light = commit).**
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
