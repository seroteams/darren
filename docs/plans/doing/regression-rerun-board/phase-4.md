# Phase 4 — Rerun all, batches, history

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
One click reruns all 8 cases as a batch; history shows every past batch with cost, verdicts and the prompt-version fingerprint, so a red batch names what changed.

## Changes
- Service: `start()` with no ids = all 8 sequentially under one batchId; one case failing doesn't kill the batch; $6 ceiling aborts mid-batch.
- History read model: group reruns by batchId (date, n cases, ok/regressed, total cost, judge arrows) + the batch's `promptVersion` fingerprint (already stamped on every session via `buildFingerprint`), diffed vs the previous batch. Latest-rerun rows gain the human-review badge (existing `reviewSummary` projection).
- Admin: "Rerun all (about $3.60 in AI, 10–20 minutes)" button; batch progress ("Case 3 of 8 — Interview, question 4 of 6"); History section; per-case "Compare with previous" → `/compare` prefilled via state params (local only — `/compare` stays LIVE_HIDDEN).
- Free tests: batch sequencing (order, mid-batch failure, ceiling abort), history grouping, fingerprint diff.

## Not in this phase
- Live behaviour, bless.

## Done when
- [ ] Batch + history tests green; `npm test` + typecheck clean.
- [ ] A real batch's rows verified in the database under one batchId.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
`local > localhost:3000/admin (dev login) > Build > Regression`
Rerun all spends about $3.60 — your click is the approval.
1. **The big button** — press Rerun all. You should see it walk case by case ("Case 3 of 8...") and finish in 10–20 minutes with every row updated. ❌ Not OK if one bad case stops the whole batch.
2. **History** — a new batch entry appears: date, 8 cases, how many OK, cost, and a short "engine version" tag. If the tag differs from the last batch, that's the fingerprint saying prompts changed.
3. **Compare** — on a case with two reruns, press "Compare with previous". You should land on the Compare screen with both runs loaded side by side.
