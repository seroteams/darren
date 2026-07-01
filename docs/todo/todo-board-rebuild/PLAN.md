# Build a new "Tasks" board so it's clear to run

**Goal:** Stand up a NEW page (its own nav item, separate from the existing Build plan) where I keep one clear status per step, you're told exactly how to check each one, and the free checks run for you — so you never again wonder what's done or whether your ticks vanished. The old Build plan page is left untouched so you can fall back to it.
**Driver:** Carl
**Created:** 2026-06-27

**Approach (Carl's call):** Don't edit the existing Build plan page (`admin/src/stages/checklist.js`, `/todo`). Build the new board as a separate page (`/tasks`, "Tasks" nav item) so both exist side by side. Carl doesn't want the working page put at risk.

## Done means
- Each step shows **one** status that I set and keep current (✅ Built / 🔵 Building / ⚪ Not started) — you never tick a box to make it say "done". Your verdict is a separate, clearly-yours control.
- Every step tells you **exactly how to check it** in plain numbered steps (paste this / open that screen / you should see X) — no vague one-liners.
- The page **runs the free, safe checks for you** (test suite, offline replay) and shows ✅/❌. You only eyeball the visual things.
- Your verdicts don't disappear: the page lives at one fixed address (localhost:3000) and **warns you** if it's ever opened on the wrong one.

**Decision (2026-06-27, Carl):** Don't keep two boards. The duplicated phase data was guaranteed to drift (it already did — Phase 003 once read "all TO DO"). So: Tasks becomes the **single** board, the Build plan's one valuable feature (the Copy continue/verify prompt) moves into it, and the Build plan page is retired. CTO/Darren/founder lenses all landed on the same call: one source of truth.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | New Tasks page + nav | A brand-new "Tasks" page at `/tasks` with its own nav item. Clean board: my status (✅ Built / 🔵 Building / ⚪ Not started) kept separate from your verdict tick; wrong-address warning. | ✅ |
| 2 | Plain check steps | Every step's "how to check" rewritten into concrete lines: "App runs (free check)" + "You check (by eye)" | ✅ |
| M | Merge boards | Port the Copy continue/verify prompt into Tasks (driven by build status, never your ticks); retire the Build plan page (nav, route, stage, file) so there's one board, not two. | ✅ |
| 3 | Run-checks button | The page runs the FREE checks for you and shows ✅/❌ per step | 🔨 backend built + tested; UI button pending |

⬜ not started · 🔨 in progress (built, awaiting test) · ✅ done (committed)

## Current state
**Phases 1, 2 and the Merge are DONE and COMMITTED** (commit `a55ccf44` "feat(admin): new Tasks board replacing the Build plan page"; screenshots gitignored in `c028344a`). The Build plan page is fully retired and Tasks is the single board.

**Carl's decisions (2026-06-27):**
- Build plan removal — **accepted.** Tasks-only is fine; do NOT restore the old page.
- Phase 3 (run-checks button) — **greenlit to build.** This is the only remaining phase.

One tiny uncommitted edit sits in `tasks.js` (4 lines): Phase 003's step 3 flipped `doing`→`done` to reflect the now-complete TS conversion. It can ride along with the Phase 3 commit.

**Audit reconciliation (2026-07-01):** Phase 3's **backend half is already built + tested** — `backend/api/services/checks/checks.controller.ts` + `checks.service.ts` implement `runFreeCheck`, allow-list exactly the two free commands and refuse others, wired at `POST /api/v1/checks/run`, with a passing test (`backend/tests/checks/test-checks-service.js`). It landed via the Phase-004 api-v1 relocation. **Only the UI button is missing** — no "Run the free checks" button in `tasks.js` yet, and nothing in `admin/` calls `/checks/run`. So Phase 3 = frontend-only remaining. (The old `server.js` note below is stale — the backend is 100% TypeScript now; start the API the normal way.)

**Prerequisite for Phase 3 (historical note):** the button calls the API, so the API server must run. An earlier note said `node backend/api/server.js` errors (`Cannot find module './handlers/preparation'`) — that was a stale `.js` entry; the backend is now 100% TypeScript (`server.ts`).

Next: build Phase 3 — recommended in a FRESH session (this chat is long/messy; Darren rule). Then Carl walks the Phase 3 scenarios; on his go, commit and close the folder to `docs/todo/done/`.

## Parked
- Saving verdicts on the server (so they survive across browsers/computers, not just this one). Carl chose "pin to one address" for now — revisit if he ever uses a second machine.
- Auto-running the *paid* checks (gate/smoke/eval). Out of scope on purpose — the run-checks button only ever triggers FREE, offline checks. Paid runs still need Carl's explicit yes, per the cost rule.
- Note: this is build effort on the internal control panel, not on a product phase (e.g. 003). Carl asked for it directly because the board is how he runs everything — worth it, but flagging it's tooling time.
