# Phase 2 — The feels-off exception

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl's walk

## Built (2026-08-01)

- **The rule, as one testable predicate.** `offerActionsFor(meetingType, openActions)` in
  [questioning-ready.ts](../../../../admin/src/stages/questioning-ready.ts); both hosts
  ([questioning.js](../../../../admin/src/stages/questioning.js),
  [bank.js](../../../../admin/src/stages/bank.js)) ask it before showing the offer.
- **The recap half reuses the rows, it does not copy them.** `renderCheckinRows` was lifted out
  of [promise-checkin.ts](../../../../admin/src/ui/promise-checkin.ts) and is now used by both the
  walk-in offer and a new section above "Lock in what you two agreed" in
  [promise-agree.ts](../../../../admin/src/ui/promise-agree.ts). One press closes last time's and
  agrees this time's. No new CSS: the section rides the card the step already uses.
- **The hand-off is a per-1:1 record, written once at boot**
  ([prior-actions.ts](../../../../admin/src/stages/prior-actions.ts)). The server stops handing
  these back the moment a meeting has a transcript, so the recap cannot re-ask.

**A real defect this phase introduced and then closed.** The first version read that record at
boot as well as writing it, and the walk was what caught it: with two 1:1s for the same person
open in one tab, the second offered "3 things" that the first had already closed off. The boot
read now always asks the server and the record is written once and never overwritten. Stated,
not hidden: the recap lists what THAT meeting saw when it started, so if another 1:1 closes one
off in between, answering it here overwrites that outcome.

**Offline:** 228/228 tests (baseline 226/226), typecheck clean, both linters pass.

**Walked on the real running app:**
1. A "Something feels off" 1:1 with three actions open: the walk-in card shows **one button only**, and the three are still carried (nothing is dropped).
2. A bi-weekly with the same person, same tab: the offer is there.
3. That feels-off meeting's recap shows **"First, how did last time's go?"** above "Lock in what you two agreed", with the three actions and the same four words.
4. Tapped Done and Changed, then flipped an owner on the new list (which re-renders the whole step): **the taps survived**.
5. Pressed "Lock these in" once. The prior run reads back `wp-1 → "yes"`, `wp-2 → null`, `wp-3 → "changed"`, roll-up `"partly"` — and the two new promises are now what the next 1:1 with her will offer.

**Cost: one real evaluation call** (~a few pence; no per-stage figure is logged for that
stage) to produce a genuine recap for the walk. Everything else was seeded from finished runs
at £0. Not screenshotted: the browser pane still would not composite frames, so the evidence is
read out of the live DOM and the stored run.

---


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

`local > admin > Start 1:1 > Recent 1:1s`. Priya Sharma has open actions waiting; seed more with
`node scripts/seed-walkin.ts` (add `SEED_MEETING_TYPE="Something feels off"` for a feels-off one).

1. **The difficult meeting opens clean.** Start a 1:1 and choose **Something feels off**. ✅ **Pass:** the walk-in card has one button only — no mention of last time's actions. ❌ **Fail:** the offer appears anyway.
2. **The other arcs still offer it.** Start a 1:1 with the same person, this time a **Bi-weekly check-in**. ✅ **Pass:** the second button is back. ❌ **Fail:** it has gone missing everywhere.
3. **Nothing is lost.** Run the feels-off 1:1 through to the end. ✅ **Pass:** at the recap, before you lock in new actions, last time's open ones are listed with the same Done / Partly / Not done / Changed. ❌ **Fail:** they never appear and are quietly dropped.
4. **The tap lands.** Answer one of them there, then open the previous 1:1 from Past 1:1s. ✅ **Pass:** it carries the outcome you gave it. ❌ **Fail:** the outcome shows only in the new meeting.
