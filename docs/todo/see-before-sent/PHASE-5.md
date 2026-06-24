# Phase 5 — Live Q&A (QUESTIONING, per-turn) preview

## Scope
The payload is built **per turn**, not once. Add `assembleNextTurn(session)` in `src/queue-manager.js` that previews the **next** turn's plan from current transcript / axisState / queue (reuse `buildMessages`). The existing per-turn `stage.turns` path already shows each logged turn's exact prompt — this adds the *upcoming* turn.

## QA scenarios
1. Mid-conversation, Sent tab shows what would be sent for the **next** question, with a header making the per-turn nature clear ("next question's payload").
2. After answering, the just-sent turn's exact prompt appears in the logged view (existing behaviour intact).

## Sign-off
- [ ] Product owner green light → commit (local).
