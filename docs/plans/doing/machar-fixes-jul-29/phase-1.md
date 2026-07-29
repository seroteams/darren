# Phase 1 — The last screen stops interviewing them

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Finding:** F7

## Goal

The prompt a tester meets after finishing a 1:1 reads like Sero asking one thing, not like an
internal QA form.

## The problem

Carl spotted it live over Machar's shoulder: *"see that QA prompt. We don't need that QA prompt.
That's for me."* Today [finish-feedback-modal.js](../../../../admin/src/ui/finish-feedback-modal.js)
stacks three labelled sections with button rows:

1. Did the prep give you something useful? (Yes / Sort of / No)
2. Would you use this before your next 1:1? (Yes / No)
3. Where did you get stuck or confused? (one line)

Three stacked questions with small-caps labels is what makes it read as a form rather than a
conversation. It is shown to every logged-in manager on every run
([briefing.js:556](../../../../admin/src/stages/briefing.js) gates only on `store.user && !store.scripted`).

## Why not just delete it

Question 2 is the **pass bar for the whole validation stage**. It is the only automatic read on
whether a tester would come back, and it keeps working when Carl is not in the room. Machar is about
to run sessions Carl is not attending. So the fix is to soften, not remove. (Carl's call,
2026-07-29.)

## Changes

- [admin/src/ui/finish-feedback-modal.js](../../../../admin/src/ui/finish-feedback-modal.js) — down to
  **one question plus an optional line**. Keep `submitRunVerdict` (the return-intent signal) and the
  optional note, which still packs into the same inbox row. No API change, no database change.
- [admin/src/styles/finish-feedback-modal.css](../../../../admin/src/styles/finish-feedback-modal.css) — drop
  the multi-section rhythm the three blocks needed.
- Copy exactly as signed off on the mockup. House rule: no em dashes.

## The trade-off, stated

Question 1 currently doubles as the star rating: Yes/Sort of/No maps to 5/3/1 through `rateMyRun`.
Dropping it means **a finished run no longer auto-rates itself**. Ratings still exist and are still
collected from Past 1:1s, and the admin Ratings screen keeps working, but the numbers will thin out.
Inventing a star value from "would you use this again" would be fabricating a rating, so the honest
options are: lose the auto-star (recommended), or keep two questions. Both are drawn on the mockup.

## Not in this phase

- Changing who sees the prompt. The gate stays as it is.
- The internal run debrief behind the same button. Already correctly fenced to internal admins
  ([briefing.js:547, 563-566](../../../../admin/src/stages/briefing.js)) and Machar never saw it.
- The guest-only feedback card ([briefing.js:181-193](../../../../admin/src/stages/briefing.js)).

## Done when

- [ ] Finishing a real 1:1 as a manager shows one question and an optional line, matching the mockup.
- [ ] The answer still lands in the Feedback inbox — **verified by reading the inbox row**, not by
      reading the routing code.
- [ ] Every way out still lets Finish proceed: Done, Skip, Escape, clicking the backdrop.
- [ ] `npm test` and `npm run typecheck` green; `npm run lint:copy` green (no em dashes).
- [ ] Screenshot of the real card on the real screen.
- [ ] Carl has tested the scenarios below and said go.

## Test scenarios — for Carl

`local > customer app (localhost:3000) > sign in as a manager > run any 1:1 to the end`

1. **The card itself** — finish a 1:1 and click Finish. You should see **one** question and one
   optional line. ❌ Not OK if it still reads like a form, or if any small-caps label stack remains.
2. **It saves** — answer the question, type a line, click Done. Then open
   `admin console > Feedback`. You should see your answer on a row with the line attached.
   ❌ Not OK if the row is missing or the line is dropped.
3. **It never traps you** — run another 1:1, click Finish, then press Escape without answering.
   You should land on the next screen as normal. ❌ Not OK if Finish stalls or the card sticks.
