# Jun 11 demo fixes — Machar run

**Goal:** The four live-Q&A trust bugs from the Jun 11 demo can't happen again, the brief reads like it knows the person, the live scores are honest, and the manager can step back to fix an answer.
**Driver:** Carl
**Created:** 2026-06-12

Source: demo run `logs/june/2026_Jun11_08-12-c6dacfe1` (Machar · Partner alliance manager · Lead · Bi-weekly) + Carl's 14 in-run notes. Full diagnosis in the approved plan (`~/.claude/plans/read-this-and-lets-generic-phoenix.md`).

## Done means
- Re-running the Machar inputs produces: no outside-work opener, no duplicate question, no question from another run's bank, no forbidden seed, no debug text in the UI.
- The brief says "Machar", not "a lead partner alliance manager", and contains no jargon ("air cover" etc.).
- Live score bars move every answered turn — or visibly say they didn't.
- A "back" control lets the manager amend the previous answer and the session follows the corrected answer.
- The Machar run is a permanent regression fixture wired into `npm run gate`.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 4 | Back navigation | One-step-back to amend the previous answer (spec questions answered before code) | 🔨 |

⬜ not started · 🔨 built, awaiting product-owner QA · ✅ done (tested)

_Phases 1–3 done + signed off 2026-06-15 (question integrity, brief wording, live scores); detail in git history. Code in `7b8921a`._

## Current state
**Phase 4 (back navigation) built + offline-verified (2026-06-16) — awaiting your walkthrough.**
Full discard-&-re-run on one step back, per the confirmed spec: `plan.js` snapshots turn state
before mutating; `POST /api/back` ([back.js](../../../frontend/server/handlers/back.js)) pops it,
restores turn/queue/axes/transcript/agenda flags, clears the undone turn's cached plan, and appends
the discarded answer to `amend-log.json`. UI: a "Back" control from Q2 onward (manual mode only)
re-presents the previous question prefilled and reverts the live score bars. Snapshots persist/
hydrate across restart.

Verified offline (no paid run): new [test-back-nav.js](../../../scripts/test-back-nav.js) (wired
into `npm test`) proves snapshot → mutate → back → restore, axis revert, amend-log, and the
nothing-to-undo 409. `npm test` 28/28, `npm run replay` 7/7 ($0).

**What's left before close-out:** your live walkthrough of scenarios 1–7 below (a real manual
interview run — that hits the API, ~$0.35). Folder moves to `done/` on your green light.

## Parked
- Voice/transcript input — typing-while-listening friction ("we're filling in a form almost"). Bigger UX theme, own track.
- Role context for unfamiliar roles — already the role-profiles track (`docs/todo/done/role-profiles/`); the Machar run predated role-profile wiring, newer runs have it.
- Axis scoring penalises garbled *typing* as low "clarity" — worth a look at whether clarity should judge the report's message, not the manager's typos. Revisit after Phase 4.
- Marketing/content angles from the call (meeting-type content pillars, "types of 1:1s" audience question) — Machar's side, not engine work.
- Thread-follow now fires rarely by design: it grounds in the answer's words or stays silent, and the validator rejects the vague mirror on long (≥8-word) answers — so substantive answers get no injected follow-up (the planner prompt is still told to follow them itself). The deeper fix is a real model-generated follow-up instead of a template stem. Revisit if live runs feel like threads get dropped.
- `forbidden_question_res` exists only on bi-weekly so far — grows per type strictly from observed leaks, never speculatively (the gate mechanism already supports every type).
- `scripts/batch-k-verify.js` has a stale FX-28 check that predates the honest-coverage rewrite (fails on HEAD too) — separate cleanup task flagged.
