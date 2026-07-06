# Phase 2 — Session flow triage

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ done (committed 2026-07-07; QA waived — Carl "just go")

## Build notes — mechanism
`text-base` (Tailwind 16px) is essentially unused in the codebase, so under JIT it isn't generated and wouldn't apply. Reliable in-system fix instead: **remove `text-sm`** so the element inherits the 16px body default (`body { font-size: var(--type-body) }`), keeping its `text-ink-dim/mute` colour. Same result, no dependency on an ungenerated utility.

## Triage decisions
**→ 16px (dropped `text-sm`) — reading text:**
- `questioning.js:129` drill hint "↳ Following up on what you just said."
- `focus-points.js:24` "Pick what this 1:1 should cover." (lede)
- `focus-points.js:85` manager-notes display (reading content)
- `briefing.js:136` "This run is complete and saved."
- `briefing.js:228` axis-meaning rows (definition text)
- `briefing.js:238` "…not enough signal to read this session."
- `onepage.js:67` flow lede "Answer each step…"
- `preparation.js:23` "The core issue, your opener, and what to listen for."

**Kept 14px — label/meta/chrome (unchanged):**
- `questioning.js:34` `.footer-host` (injected footer chrome), `onepage.js:506` `.js-note-host` (live-note host)
- `briefing.js:123/133/140` status spans (Saved / rate-status / Copied)
- `run-debrief.js:13` metric legend (caption), `:19` copy-confirm status

**Deferred:** intake lede (`.js-intake-lede`) — `intake.js` still held by another session.

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
