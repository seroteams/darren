# Phase 6 — Lint guard

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Stop drift ever creeping back — a free, zero-dependency check that fails on raw hex, off-grid values, off-scale radii, sub-14px text and stale fallbacks.

## Changes
- `scripts/lint-design-tokens.js` — pure Node (fs + regex, no stylelint, no install, no network, **never touches OpenAI**). Walks `admin/src/**/*.{css,js,ts}` + `frontend/src/**/*.{css,js,ts}`, skips the allowlist, scans each line. Exit 1 on any violation (prints `file:line:rule`), 0 when clean. `--report` flag prints grouped counts.
- Catches: raw hex outside tokens.css · rgb/rgba colour literals · **sub-14px font-size (HARD ERROR — a11y floor)** · non-token font-size (warn) · off-4px-grid spacing · off-scale / literal border-radius (incl. 8px on controls, 9999/50% pills) · literal z-index · `var(--token, #fallback)` with any hardcoded fallback.
- Allowlist (DESIGN §6): `tokens.css`, `dev-badge.js`, `build-stamp.js`, `design.js`, `universe.*`, the LOGO const (via a `/* lint-tokens-ignore: brandmark */` sentinel so only the logo lines skip, not the whole file), `**/*.test.*`, node_modules, dist.
- `package.json`: add `"lint:tokens": "node scripts/lint-design-tokens.js"`.

## Not in this phase
- Wiring it into a git hook or `pretest` — kept a standalone named script for now (can chain later).

## Done when
- [ ] After phases 1–5, `npm run lint:tokens` exits 0 (clean tree). If it flags anything real, that's a phase-1–5 miss to fix first.
- [ ] A deliberate bad edit is caught (see scenario 2), and exempt files are correctly ignored.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. This is the last phase.
1. **Clean tree passes** — `terminal (free) > npm run lint:tokens`. It should print a clean pass and exit 0. ❌ Not OK if it flags leftovers — those get fixed before sign-off.
2. **Bad edit is caught** — temporarily paste `color:#123456;font-size:11px;border-radius:7px` into any non-exempt file, re-run. It must flag all three (hex, sub-14px as an error, off-scale radius) with file:line. Then paste the same into `dev-badge.js` — it must NOT flag those. Revert both edits.
