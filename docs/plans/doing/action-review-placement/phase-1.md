# Phase 1 — The offer replaces the gate

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal

A repeat 1:1 opens on the walk-in card and then on question 1. Last time's actions are offered there as a second, quieter button, and reviewing them never blocks the meeting.

## Changes

- **[questioning-ready.ts](../../../../admin/src/stages/questioning-ready.ts)** — `readyCardHtml()` takes an optional `openActions: number`. When it's above zero, pass a ghost button through `wizardFooter`'s existing `secondaryHtml` slot. New exported copy constant so the wording is testable, plural-aware, and free of jargon: *"Check off last time's 3 things first"*. Zero open actions renders exactly today's card, byte for byte.
- **[questioning.js](../../../../admin/src/stages/questioning.js)** — in `proceedBoot()`, move the `getPriorPromises()` read to *before* `showReadyGate()` so the gate knows the count. `showReadyGate` resolves with which button was pressed; "Start the meeting" goes to `showNextQuestion()`, the secondary goes to `showPromiseCheckin()` and then on to the questions. A failed read still falls through to the questions and never blocks a 1:1 (unchanged behaviour).
- **[bank.js](../../../../admin/src/stages/bank.js)** — the same walk-in card is rendered here while the question bank is still generating (`readyCardHtml` at `:148`). It gets the same treatment so the two copies of the card never disagree.
- **[promise-checkin.ts](../../../../admin/src/ui/promise-checkin.ts)** — drop the `allTapped()` disable on "Start the questions". Untapped rows are simply not sent; the write path already ignores anything it wasn't given, so promises stay open exactly as the skip path leaves them. `allTapped()` itself stays exported (it still describes the complete state) but no longer gates the button.
- **[promise-checkin.css](../../../../admin/src/styles/design/promise-checkin.css)** — fix the stale header comment ("Yes / Partly / Not yet" → the real Done / Partly / Not done / Changed).

## Not in this phase

- The "Something feels off" suppression and its recap entry point (phase 2).
- Any change to what the check-in card looks like once opened, beyond removing the disable.
- Anything on the engine side: no prompt change, no planner feed, no paid run.
- The order promises are listed in (manager's own first stays as-is).

## Done when

- [ ] `npm test` + `npm run typecheck` green.
- [ ] Unit tests: the card renders one button with zero open actions and two with some; the copy is singular at 1 and plural above; the check-in's "Start the questions" is enabled from the first paint.
- [ ] **Verify the DESTINATION, not the routing:** after a partial check-in (tap 2 of 3, then continue), read the PRIOR run's stored state back — the two tapped promises carry their outcome, the third is still `null`, and `outcomeCheck` reflects only what was declared.
- [ ] Screenshot of the real screen: the walk-in card with both buttons, and question 1 arriving directly after "Start the meeting".
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner

`local > admin > /interview`, with a person you've had a 1:1 with before (one that ended with actions locked in).

1. **The meeting opens on a question.** Start the 1:1. First screen is "Before you walk in" as usual, now with a second, quieter button underneath about last time's actions. Press **Start the meeting**. ✅ **Pass:** the very next thing you see is a real opening question. ❌ **Fail:** the agreements form appears first.
2. **The review is still there when you want it.** Start another 1:1 with the same person and press the second button instead. ✅ **Pass:** the "How did last time's agreements go?" card appears, and the questions follow after it. ❌ **Fail:** the button does nothing, or it skips the questions.
3. **It no longer traps you.** On that card, tap an answer for just one of the items and press "Start the questions". ✅ **Pass:** the button was live from the start and the questions begin. ❌ **Fail:** the button is greyed out until every row is tapped.
4. **Half a check-in saves honestly.** Open the previous 1:1 from Past 1:1s. ✅ **Pass:** the item you tapped shows the outcome you gave it; the ones you left alone are still open. ❌ **Fail:** an untouched item has been given an answer you never chose.
5. **A first meeting is unchanged.** Start a 1:1 with somebody brand new. ✅ **Pass:** the walk-in card has one button only, and question 1 follows it. ❌ **Fail:** a second button appears with nothing behind it.
