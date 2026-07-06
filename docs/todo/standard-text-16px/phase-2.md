# Phase 2 — Session flow triage

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Every `text-sm` (and inline 14px) reading text on the core 1:1 session screens is re-tiered per the rule: reading → 16px, labels/meta stay 14px.

## Changes
- Triage `text-sm` in: `intake.js`, `questioning.js`, `focus-points.js`, `preparation.js`, `briefing.js`, `onepage.js`, `run-debrief.js`.
- For each: reading text → `text-base` (16px); labels/meta/timestamps/badges stay `text-sm`.
- Record the per-element calls in this file as they're made.

## Not in this phase
- `.hint` (Phase 1). User/admin pages (Phases 3–4). Anything that's a genuine label.

## Done when
- [ ] Each session-flow file's `text-sm` uses are triaged; reading text is 16px.
- [ ] A short list of "kept 14px because label/meta" is recorded here.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Run a session start→finish** — the descriptive/reading text on each step (prompts, explanations, the prep brief body, the briefing prose) reads at the comfortable 16px. ❌ Not OK if any reading block still looks cramped/small.
2. **Labels held the line** — step counters, timestamps, badges, field labels, "optional" tags stayed at their smaller size. ❌ Not OK if a label grew and the hierarchy flattened.
3. **No layout breaks** — nothing wraps badly or overflows from the ~2px growth on phone and desktop width.
