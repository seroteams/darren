# Phase 4 — Feedback, private Review, prep facts

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Size:** ~1 day

## Goal
The reflective stages get their real shape: two-way feedback, the manager-only wrap-up with an engagement score, and a prep screen that states the facts before the meeting starts.

## Changes
- Feedback stage (`stage-feedback.component.ts`): keep doing / more of / less of — three prompted note areas, per the concept doc and the old-Sero "Looking to the future" screenshot (guided one-question-at-a-time feel: (1/3), (2/3), (3/3), each card with its coaching copy and a notes-on-answers box).
- Wrapup stage (`stage-wrapup.component.ts`, UI label "Review") — per the old-Sero "Private notes & reflection" screen: header + "Capture your private thoughts about this 1:1. These notes are only visible to you."; info banner "This section is private and will never be shared with {name}."; **engagement as a labelled slider** — Disengaged · Passive · Active · Enthusiastic · Thriving (stored 1–5), question copy "How engaged is {name} overall?", with "last time: {label}" comparison from the previous completed session; "Your private notes" area with placeholder "Consider noting: General comments · Areas of concern · Focus for next 1:1"; finish button = **"Complete this 1:1"** (this stage owns the complete() call).
- `complete()` denormalises `state.wrapup.engagement` → the `engagement` column.
- Prep screen (`stage-prep.component.ts`) renders the mechanical facts computed at create: days since last Monthly 1:1, open promise/request/goal counts + titles (the tab layout from the old-Sero "Before you start" screenshot), last session's six-block average + biggest mover.
- Summary stage (`stage-summary.component.ts`) — structured per the old-Sero "Session wrap-up" screen, manual this phase (AI draft arrives in Phase 5):
  - "Session summary" card (empty/manual notes now; the P5 draft fills it as bullets).
  - **"Next steps" = the promise capture**: two lists, "{name}'s actions" and "My actions", each with "1–3 actions max" guidance — every line saves as a `tracker_items` promise with the matching owner (quick-added promises from earlier stages appear here for review).
  - Side cards, mechanical: **Building blocks** compact (last 1:1 avg · this 1:1 avg · change, red when negative, expandable) and **Goals touched** (each goal's status + % as of this session). Both read data already captured in P2/P3 — no new storage.

## Not in this phase
- Both AI calls (Phase 5), record template (Phase 6).

## Done when
- [ ] `engagement` column populated on a completed session (query the table)
- [ ] `npm run typecheck` + `npm test` green
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **The private wall** — enter the Review stage: the banner names the person ("never be shared with Sarah"). Slide engagement to "Enthusiastic", add a private note, hit "Complete this 1:1". Nothing about it appears anywhere except this stage.
2. **Last-time comparison** — next meeting for the same person: Review shows "last time: Enthusiastic" next to the slider. ❌ Not OK if it shows the wrong label or nothing.
3. **Prep facts are true** — before Meeting B, the prep screen's facts match reality: correct days since Meeting A, the actual open promises/requests listed by name. ❌ Not OK if counts or names are wrong.
4. **Feedback captured** — fill keep/more/less; reload; all three survive.
5. **Actions become promises** — on Summary, add "Draft the workflow proposal" under {name}'s actions and one under My actions. Next meeting's Catch-up lists both with the right owner. ❌ Not OK if owners are swapped or lines vanish.
6. **Side cards tell the truth** — Building blocks card shows last-vs-this averages with the right change (red when it dropped); Goals touched matches the Goals stage's statuses/%.
