# Phase 4 — Feedback, private Review, prep facts

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Size:** ~1 day

## Goal
The reflective stages get their real shape: two-way feedback, the manager-only wrap-up with an engagement score, and a prep screen that states the facts before the meeting starts.

## Changes
- Feedback stage (`stage-feedback.component.ts`): keep doing / more of / less of — three prompted note areas, per the concept doc and the old-Sero "Looking to the future" screenshot (guided one-question-at-a-time feel: (1/3), (2/3), (3/3)).
  <!-- refine from reference image — Carl has 3 more old-Sero screens pending; fold in whichever show Feedback/"Looking to the future" detail -->
- Wrapup stage (`stage-wrapup.component.ts`, UI label "Review"): opens with the interstitial "Private — this will never be shared with {name}"; engagement 1–5 with "last time: N/5" comparison (from the denormalised `engagement` of the previous completed guided session); private notes prompted around general comments / areas of concern / focus for next time.
  <!-- refine from reference image — pending old-Sero Review screen -->
- `complete()` denormalises `state.wrapup.engagement` → the `engagement` column.
- Prep screen (`stage-prep.component.ts`) renders the mechanical facts computed at create: days since last Monthly 1:1, open promise/request/goal counts + titles (the tab layout from the old-Sero "Before you start" screenshot), last session's six-block average + biggest mover.
- Summary stage stays a structured manual notes area this phase (AI draft arrives in Phase 5).
  <!-- refine from reference image — pending old-Sero Summary screen -->

## Not in this phase
- Both AI calls (Phase 5), record template (Phase 6).

## Done when
- [ ] `engagement` column populated on a completed session (query the table)
- [ ] `npm run typecheck` + `npm test` green
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **The private wall** — enter the Review stage: the warning names the person ("never be shared with Sarah"). Set engagement 4, add a private note, finish. Nothing about it appears anywhere except this stage.
2. **Last-time comparison** — next meeting for the same person: Review shows "last time: 4/5" next to the engagement control. ❌ Not OK if it shows the wrong number or nothing.
3. **Prep facts are true** — before Meeting B, the prep screen's facts match reality: correct days since Meeting A, the actual open promises/requests listed by name. ❌ Not OK if counts or names are wrong.
4. **Feedback captured** — fill keep/more/less; reload; all three survive.
