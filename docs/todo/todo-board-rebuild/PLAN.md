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
| 1 | New Tasks page + nav | A brand-new "Tasks" page at `/tasks` with its own nav item. Clean board: my status (✅ Built / 🔵 Building / ⚪ Not started) kept separate from your verdict tick; wrong-address warning. | 🔨 |
| 2 | Plain check steps | Every step's "how to check" rewritten into concrete lines: "App runs (free check)" + "You check (by eye)" | 🔨 |
| M | Merge boards | Port the Copy continue/verify prompt into Tasks (driven by build status, never your ticks); retire the Build plan page (nav, route, stage, file) so there's one board, not two. | 🔨 |
| 3 | Run-checks button | The page runs the FREE checks for you and shows ✅/❌ per step | ⬜ |

⬜ not started · 🔨 in progress (built, awaiting test) · ✅ done (tested)

## Current state
Phases 1, 2 and the **Merge** are BUILT but NOT yet committed — awaiting Carl's green light (he walks the scenarios; I don't self-certify). Baseline before work: `npm test` = **30/30**. After the merge: `npm run build` clean; `/tasks` verified via preview — 8 phases, 8 copy-prompt buttons (001/002 "Copy verify prompt", 003+ "Copy continue prompt"), Phase 003 snapshot accurate (resumes at step 3), no console errors, Build plan removed from the nav.

What the merge changed:
- `admin/src/stages/tasks.js` — added the prompt generator (PREAMBLE / KICK / VERIFY / buildContinue / CONTINUES) + the per-phase "Copy continue/verify prompt" block and its copy handler.
- Retired the Build plan: removed `CHECKLIST` from `state.js`, `router.js` (`/todo`), `main.js` loaders, and `app-nav.js` (icon, link, handler, active map); deleted `admin/src/stages/checklist.js`; swapped `CHECKLIST`→`TASKS` in `notes-panel-utils.js` HIDDEN_STAGES. Shared `cl-` CSS left intact (Tasks reuses it).

Known unrelated breakage: the API server (`backend/api/server.js`) won't start — `Cannot find module './handlers/preparation'` (the Phase 003 TS conversion deleted `preparation.js`, added `preparation.ts`, but server.js still requires the old path). Pre-existing backend work, not part of this plan. The Tasks page makes no API calls, so it's unaffected — but a full app run needs that fixed.

Next: Carl walks `/tasks` at localhost:3000 — confirm the copy-prompt buttons work, the statuses look right, and the Build plan really is gone. On his go, commit, then build Phase 3 (run-checks button).

## Parked
- Saving verdicts on the server (so they survive across browsers/computers, not just this one). Carl chose "pin to one address" for now — revisit if he ever uses a second machine.
- Auto-running the *paid* checks (gate/smoke/eval). Out of scope on purpose — the run-checks button only ever triggers FREE, offline checks. Paid runs still need Carl's explicit yes, per the cost rule.
- Note: this is build effort on the internal control panel, not on a product phase (e.g. 003). Carl asked for it directly because the board is how he runs everything — worth it, but flagging it's tooling time.
