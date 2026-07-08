# Phase 3 — Fill Sent & Reply from the current stage

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
The **Sent** and **Reply** tabs show the real data for whatever stage you're on, and update as the run moves forward.

## Changes
- New helper `frontend/client/src/ui/stage-data-tab.js` that renders the Sent and Reply tab bodies.
- It maps the stage you're on to the right stage data (focus areas, prep, questions, live Q&A, synthesis) and pulls it from the Phase 1 endpoint (`getRunStages`). Reuses the rail's existing per-stage refresh, so it follows you automatically.
- **Sent tab:** a clean labelled list of what the AI was given for this stage (the person, role, seniority, meeting type, your private notes, the focus points offered/picked, the prep, the conversation so far, the running scores — whatever that stage carries), then a collapsed **"Show exact text sent to the model ▸"** that reveals the full prompt. Nothing reworded or hidden.
- **Reply tab:** the AI's raw answer for this stage; underneath it, "what shipped" when a post-processed version was logged, otherwise a one-line note that there wasn't one.
- **Live Q&A:** shows the latest question's sent/reply.
- A small **Copy** button on each block.
- If a stage hasn't run yet, show "Waiting for this stage to run…".

## Not in this phase
- A turn-by-turn switcher in Live Q&A (show the latest; parked unless trivial).
- Viewing these tabs on a finished run from the Library (parked — rail is live-session only today).

## Done when
- [ ] On each stage, Sent shows what the AI was given + the exact prompt; Reply shows its answer.
- [ ] The tabs change as the run advances.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Free way to test without spending: open an existing run so the app is "on" a real session, then watch the tabs as you move through stages. (A brand-new live run is the fullest test but costs ~$0.35 — only with your go-ahead.)

1. **Sent shows the real inputs** — on a stage (e.g. Prep brief), open the **Sent** tab. You should see a readable list of what the AI was told about this person and meeting — and your private notes should be in there. ❌ Not OK if your notes are missing or it's just raw code.
2. **The exact prompt is there** — on the Sent tab, click **"Show exact text sent to the model ▸"**. The full, unedited prompt should expand. ❌ Not OK if it's blank or looks trimmed/cleaned-up.
3. **Reply shows the answer** — open the **Reply** tab. You should see what the AI actually returned for that stage. Where we save a tidied "shipped" version (prep and synthesis), it should appear beneath the raw one. ❌ Not OK if Reply is empty when the stage clearly ran.
4. **It follows the run** — move from one stage to the next. The Sent and Reply tabs should update to the new stage's data on their own. ❌ Not OK if they're stuck on the old stage.
5. **Live Q&A** — during the question phase, the tabs should show the latest question's sent/reply. ❌ Not OK if it shows nothing or an old question.
6. **Copy works** — hit a **Copy** button. The block's text should land on your clipboard. ❌ Not OK if nothing copies.
7. **Before a stage runs** — peek at a tab for a stage that hasn't happened yet. It should say "Waiting for this stage to run…", not error. ❌ Not OK if it breaks.
