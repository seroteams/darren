# Phase 3 — The AI reviewer (the committee column)

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-08-01 — closed UNWALKED on Carl's "a" (commit 0fb425bf)
No second rerun was pressed, so `judge.json` exists on no run and **the AI reviewer has still never made a real model call**. Everything around it is proven offline (228/228, 10 judge tests + 4 runner tests) and the column renders correctly on the real screen, showing "Not scored" for the one pre-judge run rather than inventing a verdict. The first real proof will be the next rerun anyone presses.

## Built (2026-08-01)
- `backend/engine/regression-judge.ts` (+test) — one strong-tier call per rerun (`modelFor("judge")`, schema-constrained, `costLabel: "regression-judge"`). Rubric is the eight `REVIEW_DIM_KEYS` with the same hints the review tool shows, plus the calibration lines borrowed from `scripts/eval-judge.js` so both judges score on one curve: trust and honesty failures score 2 or below, minor nits do not drop the score, length is never rewarded. Head-to-head against the previous rerun of the same case, with a one-line reason.
- Runner: judges AFTER grading (so it sees the safety verdict), writes `judge.json`, and is wrapped so a reviewer failure records `{unavailable: true}` and costs the run nothing.
- Repo: `loadPreviousRun()` plus `regressionRunDetail` / `pgRegressionRunDetail` so the head-to-head works on both storage lanes without carrying transcripts in the list read.
- Admin: Committee column reads "4/5 better" / "2/5 worse" / "5/5 same" with the reviewer's reason underneath; a first rerun shows the score with no direction and says why; a reviewer that could not run says "Not scored" rather than inventing one.

Offline proof: `npm test` 228/228, typecheck clean, copy and token lints clean. 10 judge tests plus 4 new runner tests, including **"a glowing reviewer cannot rescue a failed trust check"** and "a first-ever rerun gets no comparison even if the model invents one".
Live proof: the board renders the new column on the real screen; Priya's existing rerun (which predates the judge) correctly reads "Not scored" instead of faking a verdict. No console errors.
**Not verified:** the judge has never made a real model call. That needs one paid rerun, which is Carl's test click below.

Cost correction landed here: the first real rerun cost **$0.11**, not the $0.35 the button claimed (that number was borrowed from the Test engine's persona line). The control now says "~$0.25" and the line underneath gives the honest range.

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
