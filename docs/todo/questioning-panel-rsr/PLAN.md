# Questioning panel — Received / Sending / Rules

**Goal:** On the Live Q&A step, the side panel becomes genuinely useful during a turn: you see what came back last turn (**Received**), what will go to the AI next — filling in live as you type your answer (**Sending**), and the guardrails shaping it (**Rules**).
**Driver:** Carl
**Created:** 2026-07-05
**Grows from:** [run-preview-all-stages](../run-preview-all-stages/PLAN.md) Phase 4 — its `assemblePlanTurn` backend is the foundation "Sending" builds on.

## Why
The before-send preview works for the 4 single-shot steps, but on questioning it flickers:
the planner preview only exists in the split-second between submit and scoring, so the panel
usually shows "Waiting…". Carl's better model — as you *type* the next answer, the "Sending"
view fills in live; plus **Received** (last turn's reply) and **Rules** (the filters/gates
that a founder never gets to see). Everything here is **free** — previews make zero API calls.

## Done means
- On a question, type into the answer box → the **Sending** view updates live to show the
  exact text that will go to the AI, including what you're typing.
- **Received** shows the raw reply the AI sent back last turn.
- **Rules** lists the guardrails active for this meeting type + which ones actually fired
  last turn (e.g. "competency questions hidden — bi-weekly", "answer looked shallow —
  scoring damped", "planner skipped — no signal").

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Sending, live from your draft | Type → the planner prompt fills in live (kills the "Waiting…" blank) | ⬜ |
| 2 | Received | Last turn's raw reply, clearly shown on the questioning step | ⬜ |
| 3 | Rules | The guardrails view: what's active for this meeting type + what fired last turn | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Plan drafted, awaiting Carl's confirm before Phase 1. Baseline to be captured at Phase 1
start (free: `npm test` + `npm run typecheck`). No paid runs anywhere — previews are free.

## Parked
- Rename applies panel-wide (Sent→Sending, Reply→Received) since the before/after framing
  fits every step; decide during Phase 1/2 whether to rename globally or only on questioning.
- Extending "Rules" to the other steps (focus/bank/briefing also have arc/relational gates).
- A live "as-you-type" preview for stages other than questioning (not needed — they're
  single-shot; their inputs don't change while you sit on them).
