# Arc editor — in-app meeting-arc viewer/editor

**Goal:** A page inside the app where you can see and safely edit every meeting type's arc (its phases, intents, target question counts, tone, anti-patterns) — without touching the source code.
**Driver:** Carl
**Created:** 2026-06-14

## Done means
- A "Meeting arcs" page in the left-rail nav lists all five meeting types and their phases.
- You can edit a phase's label/intent/target-questions, the tone, and anti-patterns, hit Save, reload, and the change is still there.
- Edits never touch `src/one-on-one-types/<slug>/type.js` — they live in a side-file, and "Reset to default" wipes them.
- Renaming/removing a phase that has questions tagged to it warns you first (how many would be orphaned).
- The live engine uses the edited arc on the next session — no server restart.

## Why an overlay (not editing the code files)
Rewriting live `.js` source from the browser is fragile and dangerous. The app already
has a safe pattern for "let a user edit generated data without clobbering the source":
`src/role-profile.js` writes user words to a `*.overlay.json` sidecar and merges them at
read time. We reuse that exact shape for arcs. Code defaults stay pristine and reviewable;
edits are plain JSON; reset = delete the overlay.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Overlay data layer + registry merge | Backend can store an arc overlay and merge it over the code default; validation + orphan-count helper; offline tests. No UI. | ✅ |
| 2 | Read API + read-only view | `GET /api/arcs` + a new in-app "Meeting arcs" page that shows every arc. View only. | ✅ |
| 3 | Edit + save (write path + guardrail) | Save/reset endpoints behind the localhost guard; inline editing, add/remove/reorder phases, orphan warning before risky saves. | ✅ |
| 4 | (optional) Promote stage-id check to a gate | Orphaned question tags caught by `npm test`; de-hardcode `test-intro-order.js`. | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 3 ✅ green-lit + committed (2026-06-15).** All five phase-3.md scenarios verified live
against the running API; Carl gave the go. Phase 4 (optional gate) stays parked.

- Phase 3 lands: `save`/`reset` in `frontend/server/handlers/arcs.js`; `POST /api/arcs/:slug`
  + `POST /api/arcs/:slug/reset` behind `originOk` in `server.js`; `saveArc`/`resetArc` in
  `api.js`; full inline editor (edit phases/tone/anti-patterns, add/remove/reorder, orphan-
  warning confirm, Reset to default) in `stages/meeting-arcs.js`.
- Verified live (free, $0): edit saved + persisted across re-fetch; `src/one-on-one-types/`
  diff stayed empty (source untouched); reset cleaned the overlay back to default; renaming
  `pulse` was held with the correct orphan count ("3 questions — 1 intro, 2 opener"); engine
  reads arcs through the same `getArc` merge the page uses. `npm test` **26/26 green**.

---
_Prior state:_
**Phase 1 ✅ green-lit + committed (2026-06-14). Phase 2 ✅ green-lit + committed.**

- Baseline: `npm test` 24/24 → **25/25 green** after Phase 1 (free, $0).
- Phase 1 shipped: `src/arc-overlay.js`, overlay-aware `getType`/`getArc` in
  `src/one-on-one-types/index.js`, `scripts/test-arc-overlay.js`. `type.js` files untouched.
- Phase 1 ✅ committed `e9857b2`.
- Phase 2 ✅ green-lit + committed `0020cae` (2026-06-14). The shared frontend wiring was
  interleaved with Carl's in-progress "regression" feature; per his call the commit bundled
  that regression wiring + the untracked files it imports (handlers/regression.js,
  stages/regression.js, scripts/lib/replay-suite.js) so the tree builds.
- **Phase 3 next — not started.** Awaiting Carl's go (one phase per run).

Dev note: the standalone API on :3001 was restarted during Phase 2 verification but its
background process has since exited — restart with `API_PORT=3001 node frontend/server/server.js`
before Phase 3 browser testing.

**Cost note:** this whole feature is offline, so the baseline is the **free** `npm test`,
never `npm run gate` (~$3, needs a separate yes, proves nothing here).

## Parked
- Editing `eval_rules` (a sensitive per-type string) — possible later phase, out of v1.
- Editing `forbidden_question_res` (regex — not JSON-safe) — stays code-only.
- Board note: `SERO_BOARD.md` §1 says "no new build until Now is green." This jumps that
  queue at Carl's explicit request; add to the board when Phase 1 lands.
