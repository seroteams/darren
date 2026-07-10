# Phase 3b — Finish modal + typed feedback inbox

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-10
Carl walked it (~25 min) and gave the "A". Honest note: no new tap row exists in the DB from his walk — the **local Neon hit its data-transfer quota during exactly those minutes** (any tap write would have failed), so the row check was impossible; Carl upgraded the Neon plan on the spot. The verification on record is the agent's pre-quota E2E proof: Finish → modal → No + comment → row in DB (direct SQL) → Escape path → nothing written. Typed inbox seen live with Carl's real P3 verdict wearing the chip.

## Goal
One clean feedback moment instead of two stacked asks: clicking Finish on the briefing opens a single modal (star rating + the verdict question); the briefing page itself carries no feedback clutter. The admin Feedback inbox types every row (💬 note / ✅ 1:1 verdict) so kinds read at a glance.

*(Scope agreed with Carl after his real P3 walk, 2026-07-10: guests keep the inline card — they have no Finish button; the star rating folds INTO the modal; inbox types = notes + verdicts only, ratings stay on their run surfaces.)*

## Changes
- New `admin/src/ui/finish-feedback-modal.js` — backdrop/focus-trap/Escape pattern of `confirm.js` (reuses `.modal-backdrop` + `.card.modal`), content: stars (reuse `createStarRating`, prefilled) + the verdict question + optional comment + Done/Skip. Saves fire on interaction (`rateMyRun`, `submitRunVerdict`); Done/Skip/Escape/backdrop ALL proceed — never blocks.
- `admin/src/stages/briefing.js` — Finish (`js-restart`) shows the modal first for logged-in non-scripted users, then continues to the existing destination; the inline verdict card + rating block are removed for logged-in users (guests keep the inline card).
- New `admin/src/ui/feedback-kinds.ts` (+ mirrored test) — pure `noteKind(note)` helper, extensible kind map.
- `admin/src/stages/admin-feedback.ts` + `feedback-inbox.css` — Type cell (icon + label) per row. **Sequencing:** these two files carry a parallel session's uncommitted redesign — wire this part only once they're clean.

## Not in this phase
- Ratings as an inbox type (parked — Carl's call).
- Filter chips, re-ask/nudge logic (parked; the modal shows once per Finish click).

## Done when
- [ ] Finish on a real briefing → ONE modal (stars + question); answers land in the DB (DESTINATION check).
- [ ] Escape/Skip goes straight through — nothing saved extra, no re-ask.
- [ ] A guest briefing still shows the inline card, no modal.
- [ ] Inbox rows are typed at a glance.
- [ ] Product owner has tested the scenarios below and said go.

## Built — 2026-07-10

- **Finish modal** — new `finish-feedback-modal.js` (+ own CSS file): "Before you go —" with the star rating (prefilled from the saved rating) and the verdict question, Done/Skip. Saves on interaction via the existing `rateMyRun` / `submitRunVerdict`; Done/Skip/Escape/backdrop all proceed — Finish can never be blocked, even if the modal itself throws.
- **briefing.js** — Finish shows the modal for logged-in non-scripted users; the inline verdict card is now guests-only and the inline rating block is gone (it lives in the modal). Scripted lane untouched.
- **feedback-kinds.ts** (+ mirrored test, TDD red → green, 4 tests) — pure `noteKind()` + the extensible `FEEDBACK_KINDS` map, ready for the inbox wiring.
- **Part 2 wired** (on Carl's "the redesign session is done"): the inbox is now the other session's message-card layout, and each card head carries the kind chip — 💬 "Note" / 📋 "1:1 verdict" (blue) — driven by `FEEDBACK_KINDS`; verified live (Carl's real tap shows the verdict chip, plain notes show Note; 14px floor confirmed). ⚠️ These two files interleave both sessions' work — the phase commit will carry the (finished) inbox redesign along, stated in the commit message.
- **Verified live** (isolated pair, logged in as carl@ via the shared localhost cookie): briefing shows NO inline cards + Finish present → click Finish → modal with both sections → tap No + comment + Done → landed on /debrief AND the row hit the DB (direct SQL: `vk3b-mgr · no · "3b modal verification"`) → back to the briefing, Finish + **Escape** → sailed through to /debrief with the DB **unchanged**. Console clean. Test artifacts deleted.
- **Honest limit:** the guest inline card couldn't be re-verified E2E tonight — the preview browser carries Carl's login cookie (localhost cookies span ports), so it can't be anonymous. The guest rendering was proven E2E in Phase 3 and 3b only added the `!store.user` condition; Carl's scenario 3 is the real check.
- **Checks** — `npm test` 115/115 · root typecheck clean · admin typecheck fails on a PRE-EXISTING error in `runs.ts:125` (committed by the member-runs session, `4bc43984` — not this phase; fix chip raised). My files typecheck clean.

## Test scenarios — for the product owner
1. **One moment** — finish a prep, click Finish → one modal with stars + the question; answer both, Done → you land where Finish always took you. (~$0.35 — one paid prep.) ❌ Not OK if two asks still stack on the page.
2. **Ignorable** — on another briefing click Finish and hit Escape (or Skip) → straight through. ❌ Not OK if it nags or re-asks.
3. **Guest unchanged** — a guest briefing still shows the small inline card, no modal. ❌ Not OK if guests hit a modal before saving their run.
4. **Typed inbox** — /admin/feedback shows 💬 Note and ✅ 1:1-verdict rows, distinguishable in a second. ❌ Not OK if you have to read the message to know the kind.
