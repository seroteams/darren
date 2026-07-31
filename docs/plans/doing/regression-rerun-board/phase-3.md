# Phase 3 — The AI reviewer (the committee column)

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Every rerun gets one AI reviewer verdict: a score out of 5 on the same 8 checks Carl's review tool uses, plus better/same/worse than the previous rerun with a one-line reason.

## Changes
- NEW `backend/engine/regression-judge.ts` + `.test.ts` — pure function, injected `callAI`; `modelFor("judge")`, schema-constrained JSON `{score 1–5, dimensions[8]{key, verdict, reason}, head_to_head{overall, dimensions, reason}|null, flags[]}`; rubric = `REVIEW_DIM_KEYS` + hints from `review-serialize.js`; calibration lines borrowed from `eval-judge.js` (trust failures ≤2, don't reward length). First-ever rerun → `head_to_head: null`. Cost label `regression-judge` so spend lands in the run's cost.json.
- Runner: after evaluate, look up the case's previous completed rerun (briefing + transcript), call the judge, `logRunRoot("judge.json", …)`. Judge failure is non-fatal (`judge: unavailable`).
- List endpoint includes the judge summary per rerun.
- Admin: Committee column — score /5 + ▲ improved / = same / ▼ worse, one-line reason on expand; "first rerun — nothing to compare" state.

## Not in this phase
- Rerun-all, history, live behaviour, bless. No panel of judges (Carl chose one reviewer; panel parked).

## Done when
- [ ] Judge module tests with fake callAI (schema parse, null baseline, all 8 REVIEW_DIM_KEYS present in the prompt); `npm test` + typecheck clean.
- [ ] One real judged rerun's judge.json verified in the database.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
`local > localhost:3000/admin (dev login) > Build > Regression`
One rerun now costs about $0.40 (engine + reviewer) — your click is the approval.
1. **Judged rerun** — rerun the same case you ran in Phase 2. You should see the Committee column fill with a score out of 5 and ▲/=/▼ against the Phase-2 run, with a one-line reason when you expand. ❌ Not OK if the column stays empty on a finished rerun.
2. **Honest first-timer** — rerun a case that has never been rerun. Its Committee cell should say there's nothing to compare yet (score only, no arrow).
3. **Your rating still rules** — open the run and rate it yourself; your marks save exactly as before, independent of what the AI reviewer said.
