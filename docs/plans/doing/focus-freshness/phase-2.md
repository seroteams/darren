# Phase 2 — Live proof

**Part of:** [plan.md](plan.md) · **Status:** 🔨 proven, awaiting Carl's green light

## Built / proven (2026-07-12)
Verification phase — no production code changed (the result was clean, so the "tweak the freshness wording if it over/under-rotates" contingency wasn't needed).

**The one thing Phase 1's walk didn't already cover — signal beats freshness — proven with ONE paid nano focus call (~2c):**
- Nikki's real live history covers workload/energy/priorities/blockers.
- Note re-raising it ("Workload still heavy — hasn't eased… stretched across too many shifts") → the model returned **`workload` as `source: signal`** ("Workload still heavy across too many shifts"), with priorities/blockers as best_practice. Freshness did NOT suppress the re-raised signal.
- Label echoes the manager's own word ("still heavy"), never references past sessions → the no-past-in-wording rule holds.

**The other two scenarios were already met in Phase 1's live Playwright walk:**
- Fresh list on a thin note — prep B dropped workload/priorities/blockers, suggested energy/manager-support/feedback.
- Reads naturally — no "last session"/"again" in any surfaced label.

**Deferred (needs Carl's explicit yes — it's a 2nd paid run):** the golden gate roll (~$0.35 for one case). Low risk to skip: arc-gate logic is unchanged this whole track and is covered by the 123/123 offline suite (relational-filter + FOCUS_ARC_LEAK tests). Left for Carl's call.

**Optional follow-up (free):** promote the Nikki signal-beats-freshness output into the prompt `<examples>` via `scripts/focus-example.js` — but it needs a saved runId; the proof used a direct engine call, so no runId exists. Skip unless we want it as a teaching example from a real saved run.

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
