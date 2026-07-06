# Phase 2 — Outcome capture ("did it happen?")

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜ · **Cost:** $0

## Goal
When you return to a person, each agreed action from last time gets a one-tap answer — **yes /
partly / no / changed** — recorded as a plain fact the rest of the plan runs on (this is the
consumer for the `outcomeCheck` contract the no-inference spec seeded).

## Changes
- Data: per-action outcome records tied to the prior run + person (store where runs live today;
  verify at the destination, not the routing). Shape: action text (as agreed), answer, when, by whom.
- UI: on the "Since last time" block (Phase 1) and the person page, each agreed action shows the
  four taps. Optional, skippable, changeable.
- The person page's thread now shows each past action with its outcome mark.
- Tests first: save/overwrite/fence + "skipped stays blank".

## Not in this phase
- The engine still doesn't read outcomes (Phase 3 feeds them in).
- No streaks/trends ("rolled over 3 times") — parked until after Phase 3.

## Done when
- [ ] Tapping an outcome saves it and it survives a reload (checked at the store, not the screen).
- [ ] Skipping is fine — nothing nags, nothing defaults.
- [ ] Outcomes visible on the person page next to their actions.
- [ ] `npm test` + typechecks green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
All free.
1. **Tap and reload** — open a return-visit prep, tap "partly" on an agreed action, reload the page.
   The tap is still there. ❌ Not OK if it forgot, or if I only *claim* it saved — ask me to show the
   stored row/file.
2. **Change your mind** — tap "no", then tap "yes". Latest answer wins, shown everywhere.
3. **Skip it** — answer nothing and run the 1:1 anyway. No blocker, no warning, blank stays blank.
4. **The thread** — open the person's page. Last time's actions each show their outcome mark in
   plain words.
5. **Fence** — the QA/other-manager account can't see or set outcomes on your person's actions.
