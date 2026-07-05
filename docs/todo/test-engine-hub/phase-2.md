# Phase 2 — The runner (free)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The real engine loop: given a persona, drive the whole pipeline start-to-finish with its scripted answers — built and proven entirely offline (engine calls faked in tests; no OpenAI spend this phase).

## Changes
- `backend/api/services/persona-runs/persona-runs.runner.ts` + `.test.ts`:
  1. Start a session via the existing sessions service (`mode:"scripted"` + `personaId` — the lane that already exists). QA runs carry no user id, so they never show under "My runs"; they do show in the Library.
  2. Run the stages in order: role profile → focus points → preparation (same logging as live runs).
  3. Freeze the question list to the persona's script (same branch the web session uses).
  4. For each question: pick the scripted answer (or the persona's fallback if the question doesn't match), submit it, run the planner turn — mirroring the existing scripted path; the live session code is NOT touched.
  5. Final evaluation → briefing + cost written; the lexicon/rating prompts are skipped.
  6. Progress callback after every step (stage label, turn x of y) — feeds the status window from Phase 1.
- Wire the real runner into the Phase 1 service (replacing the stub as the default; tests keep injecting fakes).

## Not in this phase
- Any UI (Phase 3).
- Actually clicking a paid run — the phase is proven by offline tests only.

## Done when
- [ ] Offline tests cover: stages run in the right order · scripted-vs-fallback answer choice · run-folder files written · progress values emitted · a mid-run failure lands the job in "failed" with the reason
- [ ] `npm test` all green, `npm run typecheck` clean
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Tests green** — run `npm test`. All green, test count up again. ❌ Not OK if any engine or session test that passed before now fails.
2. **Dry-run story check** — I'll show you the test output that reads like a story: "started session → focus points → preparation → question 1 answered from script → … → briefing written". You should be able to follow it and it should match how a real 1:1 prep flows. ❌ Not OK if any stage is missing or out of order.
3. **Still no money spent** — all engine calls are faked in tests. $0 on the OpenAI dashboard.
