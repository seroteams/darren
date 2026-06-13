# Phase 1 — Scaffold + setup grows down

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ (green-lit 2026-06-13 — Carl walked a full setup)

## Goal
A new "one-page run" exists, and its first part — the 5 setup questions (name → role → seniority → meeting type → notes) — happens on one page that grows downward, with each answered question settling into a locked/done look.

## Changes
- New stage `ONEPAGE` + module `frontend/client/src/stages/onepage.js` (the page that owns the scrolling column and stacks sections).
- Register the new stage in `state.js` (stage value + an `onepage` flag/session field), `router.js` (stage↔path), and the `loaders` map in `main.js`.
- An entry point on the START screen to begin a one-page run (alongside the normal start).
- New CSS in `design.css`: a top-aligned scrolling page + a **settled** section style (locked, "done", *not* the disabled grey look). Scoped so it doesn't touch the existing `.stage`.
- Reuse: the setup question config + field rendering from `intake.js` (lift into a small shared helper), `reveal.js` for the appear animation, and `startSession` from `api.js` when setup completes.

## Not in this phase
- Focus points, prep brief (Phase 2).
- Interview loop (Phase 3).
- Synthesis + briefing (Phase 4).
- Polish / mobile / reduced-motion pass (Phase 5).
- Editing a past answer — past sections are locked on purpose.

## Done when
- [ ] A one-page run can be started and the 5 setup questions complete on one growing page.
- [ ] Answering reveals the next question below and scrolls to it; answered ones settle and can't be edited.
- [ ] Completing setup creates the session (same as a normal run) and hands off cleanly (it can stop at "setup done" for this phase).
- [ ] The normal screen-by-screen run is unchanged; `npm test` still passes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself in the browser. Next phase waits for your green light.

1. **Start a one-page run** — from the start screen, choose the new one-page option. You should land on a page showing only the first setup question ("Who are you prepping for?") with its input. ❌ Not OK if it looks like the old full-screen wizard or errors.
2. **It grows down** — type a name and continue. The next question (role) should **appear below** the first and the page should scroll down to it — no full-screen jump. Keep going through seniority, meeting type, notes. Each new question stacks under the last. ❌ Not OK if the screen replaces/clears instead of growing.
3. **Past answers settle** — after you've answered a couple, look back up the page. The earlier questions + your answers should still be visible, looking **finished/locked** — clearly behind you. Try to click into an earlier answer: you should **not** be able to edit it. ❌ Not OK if it looks greyed-out "disabled", or if you can still type into it.
4. **Finish setup** — answer all 5. It should accept the run and move on (for now it's fine if it just confirms setup is done / shows a brief "ready" state). ❌ Not OK if it errors or loses what you typed.
5. **Old run still works** — start a **normal** (screen-by-screen) run as before. It should behave exactly as it always has. ❌ Not OK if anything about the old flow changed.
