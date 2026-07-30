# Phase 2 — The feels-off exception

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal

A "Something feels off" 1:1 never opens on last time's actions. The review is still available, but at the end, next to where the next actions get agreed.

## Why this arc is different

"Something feels off" exists to understand a shift before assuming anything. Its arc opens on a
phase called `landing` ([feels-off/type.ts](../../../../backend/engine/one-on-one-types/feels-off/type.ts)).
Because actions are scoped to the **person** and not the meeting type
([promise-history.ts:144](../../../../backend/engine/promise-history.ts)), the items waiting there
may have been agreed in a Growth or Performance 1:1 — so this arc can open on an accountability
ledger from a completely different conversation. That is the worst available first move.

## Changes

- **[questioning.js](../../../../admin/src/stages/questioning.js)** — suppress the walk-in offer when `store.ctx.meetingType` is the feels-off label. Read the label from one shared constant, not a string literal repeated in two files.
- **[questioning-ready.ts](../../../../admin/src/stages/questioning-ready.ts)** — the suppression rule as a small pure predicate (`offerActionsFor(meetingType, openActions)`) so it is unit-testable without a browser, matching the module's existing style.
- **[briefing.js](../../../../admin/src/stages/briefing.js) / [promise-agree.ts](../../../../admin/src/ui/promise-agree.ts)** — when the review was suppressed and actions are still open, show them above "Lock in what you two agreed", with the same four chips. This is the only new surface in the plan.
- The suppressed case still stamps nothing: skipping the review leaves promises open, exactly as today.

## Not in this phase

- Any change to the other four arcs — they keep phase 1's behaviour unchanged.
- Making the suppression manager-configurable.
- Changing which promises resurface (the person fence stays).

## Done when

- [ ] `npm test` + `npm run typecheck` green.
- [ ] Unit tests: `offerActionsFor` returns false for the feels-off label at any count, true for the other four labels when the count is above zero, false for all five at zero.
- [ ] **Verify the DESTINATION:** after closing off an action from the recap screen in a feels-off run, read the PRIOR run's stored state back — the outcome is on the right promise, on the right run.
- [ ] Screenshot: a feels-off walk-in card showing one button only, and the recap screen showing the review above the lock-in.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner

`local > admin > /interview`, same person as phase 1, with actions still open from a previous 1:1.

1. **The difficult meeting opens clean.** Start a 1:1 and choose **Something feels off**. ✅ **Pass:** the walk-in card has one button only — no mention of last time's actions. ❌ **Fail:** the offer appears anyway.
2. **The other arcs still offer it.** Start a 1:1 with the same person, this time a **Bi-weekly check-in**. ✅ **Pass:** the second button is back. ❌ **Fail:** it has gone missing everywhere.
3. **Nothing is lost.** Run the feels-off 1:1 through to the end. ✅ **Pass:** at the recap, before you lock in new actions, last time's open ones are listed with the same Done / Partly / Not done / Changed. ❌ **Fail:** they never appear and are quietly dropped.
4. **The tap lands.** Answer one of them there, then open the previous 1:1 from Past 1:1s. ✅ **Pass:** it carries the outcome you gave it. ❌ **Fail:** the outcome shows only in the new meeting.
