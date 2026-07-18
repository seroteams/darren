# Phase 2 — Member runner (guided.css)

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Detox the single biggest offender — `frontend/src/stages/guided/guided.css`, a verbatim prototype port that was never tokenised.

## Changes
- `frontend/src/stages/guided/guided.css`:
  - **46 stale hex fallbacks** — the `var(--token, #fallback)` fallbacks are an OLD palette (ink `#102d42` vs real `#1f2a37`, border `#e3e8ee` vs `#e8e8e8`, blue-grey charcoal ramp). Tokens all exist, so drop the fallbacks (they never render but mislead).
  - **49 font-sizes** → `--type-*` (15px → the new `--type-body-md`).
  - **~47 off-grid spacing** values → `--sero-space-*`.
  - **6 box-shadows** tinted with old ink → `--sero-shadow-*` / `--shadow-card`.
  - **Backdrop scrim** `rgba(16,45,66,.35)` → `--color-backdrop`.
  - **4 near-max-int z-indexes** → `--sero-z-*`.
  - **4 controls at 8px radius → 4px** (`--radius-button`) per DESIGN §6 rule 4 — *the one deliberate visible nudge: controls get slightly crisper corners.*

## Not in this phase
- `member-home.js`, `team-card.css`, the guided `.ts` files — that's phase 3.

## Done when
- [ ] `npm run typecheck` clean, `npm test` green.
- [ ] Screenshot of the live monthly-check-in runner confirms it renders identically (bar the 4 crisper control corners).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Full runner walk** — `local > member app (frontend, email+pass) > start a Monthly Check-in`. Walk the pill bar, every question card, the notes panel, the error label, the save pip, and the backdrop when the panel opens. Everything reads the same. ❌ Not OK if any colour or spacing visibly shifts.
2. **The intended nudge** — look at the buttons and field inputs. Their corners are *slightly* tighter (8px → 4px, matching the rest of the app). ❌ Not OK if they look wrong or inconsistent with other Sero controls.
3. **Panel + backdrop** — open the check-in panel; the dark backdrop behind it should look the same calm ink scrim as before.
