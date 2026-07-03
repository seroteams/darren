# Phase 003 · Step 02 — Rate right at the end of a 1:1 (in-flow)

## 1. Goal (plain)
The moment the briefing is written and the memory is fresh, gently ask "Did this help you run
the 1:1?" — one tap on the stars, or Skip. No pressure, no nagging.

## 2. What you'll have when it's done
- At the **end of a live 1:1** (the final briefing screen), a small, calm rating prompt appears
  under the briefing, with the same star widget from Step 01 and a clear **Skip**.
- Tapping a star saves it (same run, same `rating.json`) and the prompt settles into a quiet
  "Thanks — saved" state. Skipping just dismisses it — the run is left unrated, no guilt.
- A low score (≤2) reveals the same one-line "What missed?" as on the detail page.

## 3. A grounding example (before → after)
- **Before:** you finish a 1:1, read the briefing, and there's nowhere to say whether it landed.
- **After:** under the briefing you see "Did this help you run the 1:1?" ★★★★★ · Skip. You tap
  four stars → "Thanks — saved." Done, without leaving the screen.

## 4. The technical detail
- The end-of-1:1 briefing the member sees is the **`BRIEFING` stage**
  ([admin/src/stages/briefing.js](../../../admin/src/stages/briefing.js)) — reached at the end of a
  run. (If the member is on the one-page flow, the same briefing block in
  [onepage.js](../../../admin/src/stages/onepage.js) is the twin spot; wire whichever the member
  actually lands on — confirm at build time.)
- **Reuse the Step 01 widget and client call** — do not build a second rating control. Render it in
  a calm card under the briefing: heading "Did this help you run the 1:1?", the stars, and a plain
  **Skip** button.
- On star change → `rateRun(runId, stars, note)`; on success show a quiet "Thanks — saved" (no
  confetti, no redirect). On Skip → hide the card for this view; **write nothing**.
- Seed from any existing `rating` on the run so re-entering doesn't wipe a prior score.
- **Never** show an "unrated" count or a reminder to come back and rate. The unrated state is silent.
- Keyboard-operable, visible focus, ≥14px, every value escaped — same bar as Step 01.

**Do NOT in this step:** the list-row badge is **Step 03**. Don't re-implement the widget or the
endpoint. Don't add any "you have N unrated 1:1s" prompt, ever.

## 5. How to check it worked
- `npm test` green, `npm run typecheck` clean.
- Finish a 1:1 → the prompt appears under the briefing; tapping a star saves (confirm in
  `rating.json`) and shows "Thanks — saved"; Skip dismisses it and leaves the run unrated.
- A ≤2 score reveals the "What missed?" line; a good score does not.
- Nothing anywhere nags about unrated runs.
