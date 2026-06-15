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
| 4 | (optional) Promote stage-id check to a gate | Orphaned question tags caught by `npm test`; de-hardcode `test-intro-order.js`. | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

_Phases 1–3 done + signed off (overlay layer, read view, edit/save with orphan guard); 5/5 scenarios verified live. Detail in git history._

## Current state
**Phase 4 (optional gate) stays parked.** The shipped feature is complete; this is a nice-to-have
hardening step only.

## Parked
- Editing `eval_rules` (a sensitive per-type string) — possible later phase, out of v1.
- Editing `forbidden_question_res` (regex — not JSON-safe) — stays code-only.
- Board note: `SERO_BOARD.md` §1 says "no new build until Now is green." This jumps that
  queue at Carl's explicit request; add to the board when Phase 1 lands.
