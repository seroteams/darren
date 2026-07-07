# Phase 1 — Rule + `.hint` bump

**Part of:** [PLAN.md](plan.md) · **Status:** ✅ done (tested by Carl 2026-07-07)

## Build notes
- `.hint` → `var(--type-body)` (16px) done in `buttons-inputs.css`. Moves all 18 `.hint` uses.
- **Intake lede deferred:** `.js-intake-lede` lives in `intake.js`, which had another session's uncommitted edits — leaving it to avoid entangling commits. Do it when intake.js is clean.
- `.hint--kbd` left inheriting 16px for now — flagged in QA scenario 4; add a `--type-body-sm` override only if it looks too big.

## Goal
The shared `.hint` class renders reading text at 16px, and the session-flow ledes are 16px — the highest-leverage single change.

## Changes
- `admin/src/styles/design/buttons-inputs.css` — `.hint` `font-size: var(--type-small)` → `var(--type-body)` (14→16px). Moves all 18 `.hint` uses at once.
- Keep `.hint--kbd` (keyboard hint) at 14px if it looks too big at 16 — add an explicit `font-size: var(--type-body-sm)` override (decide by eye).
- Session-flow ledes currently `text-sm`: the intake lede (`.js-intake-lede`, "Sero prepares and runs a 1:1…") → `text-base`. (Other ledes handled in their phase.)

## Not in this phase
- The 160 `text-sm` triage — Phases 2–4.
- Label/meta elements — they stay 14px.

## Done when
- [ ] `.hint` renders at 16px everywhere it's used.
- [ ] Intake lede is 16px.
- [ ] `.hint--kbd` call recorded (kept 14px or moved).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk these; next phase waits for your green light.
1. **/new (intake)** — "Pick someone from your team…" reads a touch larger (16px) and comfortable; the lede under it too. Card meta ("UX Researcher", "Last 1:1 · …") and "OR ADD SOMEONE NEW" stay their smaller label size. ❌ Not OK if the meta/eyebrow grew too, or the layout jumps.
2. **Questioning screen** — the hint under the question ("Optional. Tap what's prompting this 1:1…") reads at the larger size and sits well. ❌ Not OK if it crowds the input.
3. **A couple more hint spots** — open focus-points and the one-page run; their hint lines look consistently sized with the others. ❌ Not OK if one looks off.
4. **Keyboard hint** — if any screen shows a small "press Enter" style hint, check it didn't balloon awkwardly (that's the `.hint--kbd` call).
