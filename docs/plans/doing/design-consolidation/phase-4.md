# Phase 4: Flow spine B

## Built (2026-07-23)

Awaiting Carl's QA walk. Landed: interview split sits below the topbar (stepper visible all meeting), coach half calmed to paper with lavender accents, action row = shared footer (Back / quiet Skip / one primary), Esc-skip gone, Enter = newline with Ctrl/Cmd+Enter submit, one stable exit label; briefing renders instantly (choreography deleted, one soft fade, celebration wash kept), grammar converged on briefing-view, sticky footer; Prepare ships ONE customer layout (Sheet; DEFAULT_VARIANT constant flips to Arc on Carl's word) with the 12-variant lab fenced behind isInternalAdmin, closing a manager-reachable leak. CSS diet honestly deferred: zero orphaned rules while the lab keeps all 12 variants (Carl fork for P7). Offline proof: 183/183, typecheck, lint:tokens, lint:copy; interview + flow screenshots eyeballed.

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting QA

## Goal

The two signature screens (Interview, Briefing) keep their character but stop breaking the product's rules: stepper stays visible, content renders instantly, one Prepare layout ships.

## Changes

- Interview (`admin/src/stages/questioning.js`, `admin/src/styles/coach-panel.css`): compact stepper visible above the split; coach panel calmed to white with lavender accents; action row cut to ≤3 (Back left, quiet Skip, primary Submit right); Esc-to-skip removed; Enter = newline.
- Briefing (`admin/src/stages/briefing.js`): instant render (fastPath default, one soft fade, celebration wash kept as a moment); one sticky footer with primary bottom-right; recap converges on the briefing-view section grammar.
- Prepare (`frontend/src/stages/preparation-brief.ts`, `preparation.css`): ONE customer layout (Carl picks from the mockup; default proposal: Sheet); the other 11 fenced behind the admin lab flag; orphaned variant CSS deleted (target: preparation.css well under half its 1,004 lines).

## Not in this phase

Guided (Phase 5). Admin tools.

## Done when

- [ ] Interview shows the stepper and a ≤3-button action row
- [ ] Briefing readable immediately on arrival
- [ ] One Prepare layout for customers; variant CSS gone
- [ ] Free checks green; gallery re-export diffed; F6-F8 tickable

## Test scenarios — for the product owner

1. **Interview keeps you oriented** — in the interview, the step bar should still be visible up top, and the answer box should take Enter as a new line. ❌ Not OK if the progress bar vanishes or Enter submits.
2. **The recap doesn't make you wait** — arrive at the briefing. Everything readable at once, one soft fade. ❌ Not OK if sections drip in over seconds.
3. **One brief look** — open Prepare on two different 1:1s. Both should use the same layout. ❌ Not OK if the layout changes between runs.
