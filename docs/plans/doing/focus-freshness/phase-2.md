# Phase 2 — Live proof

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Prove on real model output that repeat sessions get fresher focus lists, and that a re-signalled note still wins over freshness.

## Changes
- No planned code changes — this phase runs and judges. Prompt-wording tweaks to the freshness rule are allowed if the first result shows the model over- or under-rotating (e.g. avoiding a theme the notes clearly re-raise).
- If a run produces a list worth keeping, promote it into the prompt examples via `node scripts/focus-example.js <runId>` (replace a weak example, don't append).

## Not in this phase
- New engine features or UI.
- Catalogue changes.

## Done when
- [ ] A same-person repeat bi-weekly (thin notes) yields a focus list that is not a repeat of last time's ids.
- [ ] A same-person repeat where the notes re-name the previous theme keeps that theme as a `signal` point.
- [ ] `npm run gate --only` on the relevant case stays green (no FOCUS_ARC_LEAK, no regression).
- [ ] Product owner has tested the scenarios below and said go.

## Cost note
This phase needs paid runs: two focus-stage generations (~$0.35 per full pipeline run; focus stage alone is a fraction of that) plus one `--only` gate case. Within the one-paid-run-per-task allowance for the first; anything beyond gets asked first, per the cost rule.

## Test scenarios — for the product owner
Walk through these yourself. All phases ✅ after your green light.
1. **Fresh list** — run a bi-weekly prep for a person you've prepped before, notes left thin ("all fine"). The suggested focus points should be mostly different topics from last time. ❌ Not OK if it's the same list again.
2. **Signal beats freshness** — same person again, but write a note naming last time's theme (e.g. "workload still heavy"). Workload should come back as a suggested point, anchored to your note. ❌ Not OK if the system dodges it to look fresh.
3. **Reads naturally** — the suggestions must not mention "last session" or "previously discussed" in the labels/reasons you see. ❌ Not OK if the past leaks into the wording.
