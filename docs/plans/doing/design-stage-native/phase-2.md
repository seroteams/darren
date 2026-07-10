# Phase 2 — Form foundations

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Port the form sections natively, landing the reusable input + control classes the whole app can use.

## Changes
- `admin/src/stages/design.js` — add sections: buttons, inputs, selects (pick controls), datetime, login card.
- `admin/src/styles/design/buttons-inputs.css` — author a canonical boxed `.form-input` (the app has none today, only ad-hoc ones) + `.ds-check` / `.ds-radio` / `.ds-toggle`.
- Reuse existing `.btn` / `.btn--ghost` / `.btn--danger`, `.textarea`, `.field`, and the big underline `.input` (session variant).
- Add the five sections to the second-level rail (SECTIONS array) so scrollspy covers them.

## Not in this phase
- Table, cards, badges (Phase 3); toasts/scores/overlays (Phase 4).

## Done when
- [ ] Button variants render with token colours; disabled is non-interactive.
- [ ] Boxed input, error field, search, and the big session input all show the correct focus ring.
- [ ] Checkbox / radio / toggle checked state is action-blue; login card matches.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Buttons** — open Buttons. You see primary (one blue), secondary, quiet, danger, disabled — no trailing arrows. Disabled can't be clicked.
2. **Inputs** — boxed name/type/message inputs, an error field in coral with a message, a search box with a magnifier, and the big "one question" underline input. Tab through — each shows a clear focus ring.
3. **Pick controls** — checkboxes (many), radios (one), toggles (on/off). Checked = action blue every time.
4. **Login card** — reads like the real login: title, fields, one blue button.
