# Phase 3 — Member forms + team card

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-18 — under Carl's continuous-run authorisation. Verified in-browser (tab 3041): `.mh-btn` bg = primary #5aa9e6, radius 4px; `.mh-input` 4px/15px; `.mh-error` = #ac1608 (the correct token, was #a3372c); no console errors.

## Built (2026-07-18)
`member-home.js` — the requests/goals form de-inlined into new `member-home.css` (`.mh-*` token classes); error colour `#a3372c` → `var(--color-negative-text)`; control radius 8→4px; 15px → `--type-body-md`. `team-card.css` — dropped stale/absent-token fallbacks (`--radius-full`→`--sero-radius-full`, `--radius-sm`→`--sero-radius-sm`, `--color-surface-hover` now real), 15px avatar → `--type-body-md`, 17px name → `--type-body-lg`. `guided.page.ts` — error cssText hex fallback dropped → `--color-negative-text` + `--type-body-sm`. `record.component.ts` — inline clamp font-size → `.mcr-h1--rec` class. Typecheck clean.

## Goal
Kill the inline-style drift in the member home form and clean the remaining member-app CSS.

## Changes
- `frontend/src/stages/member-home.js`:
  - The requests/goals form is built with inline `style=""` on every input/select/button (13 blocks). Route it through the shared `.card-flat` / member-runs input+button classes the rest of the page already uses.
  - **Error colour `#a3372c` → `var(--color-negative-text)` (#ac1608)** — *deliberate: the error red isn't even a Sero colour today; it becomes the real token.*
  - Drop `#fff` / stale hex fallbacks; tighten 8px control radius → 4px; 15px → `--type-body-md`.
- `frontend/src/styles/team-card.css`: fix 15px avatar/name literals, off-grid gaps, and the three `var()` calls that pointed at absent tokens (now defined in phase 1).
- Fold in minor inline styles in `guided-stages.ts`, `record.component.ts`, `guided.page.ts` (static gaps/margins/font-sizes on already-classed elements — no colour drift).

## Not in this phase
- Admin app (phases 4–5). The dynamic inline styles (progress-bar widths, score offsets) stay — those are legitimate computed values.

## Done when
- [ ] `npm run typecheck` clean, `npm test` green.
- [ ] Screenshot of member home (form) + Team screen confirms identical layout, correct error red on the empty-submit path.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Add a request / goal** — `local > member app (frontend, email+pass) > member home`. Add a request and a goal; both save as before. Inputs/select/button corners are 4px (crisper). ❌ Not OK if the form looks broken or misaligned.
2. **Error path** — submit an empty request to trigger the error line. It should read in the proper Sero error red (a touch deeper than before). ❌ Not OK if it's a different-looking red or the message doesn't show.
3. **Team screen** — open Team; the person cards render exactly as before. ❌ Not OK if avatar size, name weight or spacing shifts.
