# Phase 6 — Prove it & write it down

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Contrast-verify the polished light theme properly (measured, not eyeballed), lock the new language
into DESIGN.md + the in-app design sheet, and extend the automated guards so it can't drift back.

## Changes
- **Contrast audit:** every text-on-tint pair and chip variant measured against 4.5:1 (3:1
  large/UI); fixes land at the token step so they propagate. (Known suspect going in:
  white-on-mint-800 ≈ 2.2:1 — **fixed in P3**, see below.)
- **Carried in from P3's defect pass (2026-07-17):** the audit's named text-on-fill offenders are
  already fixed (`cmp-verdict--pass/warn/fail`, `fp-chip--ok`, `cl-badge--done`,
  `lib-badge--keep`/`--block`, `el-pill--warn`, `um-badge--off`, `meeting-card__badge`). Grepping
  `color: var(--color-positive|negative|amber)` while doing it turned up **a wider tail the audit
  didn't list** — `rv-seg__btn.is-pass/.is-fail`, `rv-ov__btn.is-keep/--block`,
  `run-row__review--done`, `rv-status`, `tk-run__result`, `tk-verdict`, `cmp-axis__delta--down`,
  `script-state--*`, `fp-chip--warn`, `um-trend--down`, `joblex-*`. **Judge each one:** these tokens
  are sanctioned for *fills and graphics* (a tick glyph on `--color-positive` is fine — the token
  says so); only the ones rendering real **text** are defects. Deliberately left for this phase's
  measured pass rather than swept blind.
- **DESIGN.md updated:** the sanctioned `--shadow-lift` exception; the `.screen` frame; two-tier
  labels; the one chip spec; the committed-colour-block rule (rail/navy); reconciled button spec.
- **In-app design sheet** (`admin/public/sero-flowbite/` + `stages/design.js`) refreshed — every
  new building block (chips, buttons, labels, frame, dot-meter) shown.
- **Guard tests extended:** 14px floor + no-literal-colour checks across the design barrel,
  `guided.css`, `members.css`.
- **Comms:** changelog + how-it-works deck refreshed (per the keep-the-guide-updated rule).

## Not in this phase
- Nothing follows — this closes the initiative; folder moves to `docs/plans/done/`.
- Dark mode stays parked (see plan.md) — the audit notes in
  [audit-findings.md](audit-findings.md) keep it a one-phase pickup later.

## Done when
- [ ] Measured contrast table complete; all pairs pass (or consciously recorded as accepted
      deviations, like the primary button).
- [ ] `npm test` green including new guards; deliberately adding a 12px font or a raw hex to a
      design file makes them fail.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. This green light closes the initiative.
1. **Spot-check** — 8 key screens: nothing hard to read. You sign the contrast pass.
2. **The sheet is true** — open the in-app design sheet: every building block (chips, buttons,
   labels, frame, dot-meter) shown, matching what's live.
3. **Guards bite** — I add a deliberate 12px font to a design file in front of you: the test run
   fails; revert: green.
