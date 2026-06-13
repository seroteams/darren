# Phase 3 — Interview grows down

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The interview questions appear one below the next on the same page: you answer, that question settles above, the next question + input appears below. This is the heart of the "grow-down" idea.

## Changes
- In `onepage.js`, after the prep brief, run the interview loop as appended sections: render the current question + answer box, and on submit settle it and append the next question below.
- Reuse the existing question loop logic — `getQuestion`/`submitAnswer` and the plan SSE stream from `api.js` — and the live-scores UI (`axes.js`) for the active question. Same engine behaviour; only one-at-a-time placement changes to stack-and-settle.
- Handle the "no more questions" end signal by moving on (hand-off to Phase 4's synthesis).

## Not in this phase
- Synthesis + final briefing (Phase 4).
- Polish pass (Phase 5).
- "Go deeper" / skip refinements beyond keeping today's behaviour working.

## Done when
- [ ] Interview questions appear one below the next; each submitted answer settles above.
- [ ] Live scores show for the active question as they do today.
- [ ] The loop ends correctly when questions run out and hands off.
- [ ] Same questions / same scoring as a normal run.
- [ ] `npm test` still passes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself in the browser. Next phase waits for your green light.

1. **One question at a time, growing** — reach the interview in a one-page run. Answer the first question and submit. The question + your answer should settle above, and the **next question appears below** with a fresh answer box; the page scrolls to it. ❌ Not OK if the screen replaces instead of growing, or two answer boxes are active at once.
2. **Past answers locked** — scroll up over earlier interview answers. They're visible and settled; you can't edit them. ❌ Not OK if an earlier answer is editable or looks disabled/greyed.
3. **Live scores work** — while answering the current question, the live scores should update as they do in a normal run. ❌ Not OK if scores are missing or stuck.
4. **It ends cleanly** — keep answering until the interview is done. It should stop asking and move on (a brief "wrapping up" is fine for now). ❌ Not OK if it loops forever or errors at the end.
5. **Same as normal** — the questions asked should match what a normal run asks for the same setup. ❌ Not OK if the one-page run asks noticeably different questions.
