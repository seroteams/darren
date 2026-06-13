# Phase 2 — Focus points + prep brief

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ (verified 2026-06-13 via a Carl-authorized ~$0.35 end-to-end run)

**Interim bridge:** prep's "Continue to interview" hands off to the existing question + briefing screens so the whole flow is walkable now. Phase 3 replaces that with the interview growing down on-page.

**Verified run:** setup (5 settled) → focus areas streamed on-page (4 points, grounded in the notes) → picked 2 → focus settled into a locked line → prep brief streamed on-page (8 sections) → "Continue to interview" bridge. No console errors. (Preview screenshots were flaky in the environment, so confirmed via accessibility snapshots + DOM evals.)

## Goal
After setup settles, picking your focus areas and reading the prep brief happen as the next sections **below** on the same page.

## Changes
- In `onepage.js`, after setup completes, append a **focus-points** section (the multi-select cards) and, once chosen, append the **prep brief** as a read-only section beneath it.
- Reuse the existing focus-point logic + selection API and the preparation SSE stream from `api.js` — same calls the normal flow uses; only the placement changes (append + settle, not full-screen swap).
- Settled treatment applies to the focus-points section once you continue (your picks stay visible, locked).

## Not in this phase
- Interview loop (Phase 3).
- Synthesis + briefing (Phase 4).
- Polish pass (Phase 5).

## Done when
- [ ] Focus-points selection appears as a section below settled setup; choosing + continuing settles it.
- [ ] The prep brief streams in as the next section below, readable in place.
- [ ] Same focus areas / same brief content as a normal run (only the layout differs).
- [ ] `npm test` still passes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself in the browser. Next phase waits for your green light.

1. **Focus points appear below** — finish setup in a one-page run. A focus-areas section should appear **below** your settled setup answers, and the page scrolls to it. ❌ Not OK if it opens a new screen or clears the page.
2. **Pick and continue** — select your focus areas and continue. Your picks should settle (stay visible, locked) above, and the prep brief should start appearing **below**. ❌ Not OK if your picks vanish or you can re-edit a settled section.
3. **Prep brief reads right** — the brief that streams in should read like the normal run's prep brief (grounded, specific to who you set up). ❌ Not OK if it's blank, generic, or errors.
4. **Same as normal** — compare against a normal run with the same setup: the focus options and the brief should match in substance. ❌ Not OK if the one-page run gives noticeably different content.
5. **Scroll-back check** — scroll up to setup. Everything above is still settled and locked. ❌ Not OK if any earlier section became editable again.
