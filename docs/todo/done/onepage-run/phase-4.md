# Phase 4 — Synthesis + briefing

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
After the last interview answer, the "writing the brief" wait and then the final briefing land as the closing section at the bottom of the page — completing the whole flow on one page.

## Changes
- In `onepage.js`, after the interview ends, append a short inline "working…" section while synthesis runs, then append the **final briefing** as the closing section.
- Reuse the evaluation SSE stream from `api.js` and the existing briefing render — same briefing content; placement is the only change.
- Make sure the page ends cleanly at the briefing (no dangling active section).

## Not in this phase
- Polish / mobile / reduced-motion / copy pass (Phase 5).
- Run-debrief or verdict tooling (out of scope for one-page run).

## Done when
- [ ] After the interview, a brief "working" state shows, then the full briefing appears as the bottom section.
- [ ] The briefing reads the same as a normal run's briefing.
- [ ] The full one-page run works start → finish on one growing page.
- [ ] `npm test` still passes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself in the browser. Next phase waits for your green light.

1. **Brief appears at the bottom** — finish the interview in a one-page run. You should see a short "writing the brief" wait, then the **full briefing** appears as the last section, with everything above it still settled. ❌ Not OK if it jumps to a separate screen or the page clears.
2. **Whole run on one page** — scroll from top to bottom: setup → focus → prep brief → interview Q&A → final briefing, all stacked in order. ❌ Not OK if any part is missing or out of order.
3. **Briefing reads right** — the briefing should match a normal run's briefing in quality and substance for the same setup. ❌ Not OK if it's blank, generic, or different from normal.
4. **Clean ending** — at the bottom there's no leftover half-finished question or active input; it clearly reads as "done". ❌ Not OK if something still looks awaiting input.
5. **Old run still fine** — run a normal screen-by-screen run through to its briefing; unchanged. ❌ Not OK if the normal flow regressed.
