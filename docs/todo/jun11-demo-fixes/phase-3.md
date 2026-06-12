# Phase 3 — Live scores: diagnose or be honest

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Score bars move every answered turn — or the UI plainly says they didn't update, instead of silently freezing.

## Changes
- Live repro under preview tools (API on 3001, Vite on 3000 — known port-conflict setup): drive a session via the API, watch SSE `axes` events and the panel update path (`frontend/client/src/stages/questioning.js` ~332–337, `frontend/client/src/ui/axes.js`).
- Suspects to test (unproven until repro shows them): cached plan replay sending `axes: undefined`; role-profile block substitution making the planner fail silently.
- **Timeboxed.** If it doesn't reproduce within the budget: ship a visible "scores didn't update this turn" indicator (no silent masking) and park the deeper hunt.

## Not in this phase
- Changing how scores are *calculated* (the all-negative-deltas/typo question is parked in PLAN.md).

## Done when
- [ ] Either: root cause found and fixed, with the repro showing bars moving every turn.
- [ ] Or: honest indicator ships, appearing whenever a turn lands without an axes update.
- [ ] `npm run gate` green; live session walkthrough recorded.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Bars move** — run a session and answer 4–5 questions. The four score bars (Wellbeing, Engagement, Clarity, Growth) should visibly change after answers. ❌ Not OK if they sit still for the whole session.
2. **Skip a question** — skip one. The session should carry on normally; bars unchanged is fine for that turn.
3. **Honesty check (if the bug wasn't reproduced)** — if a turn ever lands without a score update, you should see a small note saying so. ❌ Not OK if the bars just freeze with no explanation.
