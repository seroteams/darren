# Phase 1 — Build and walk the concept

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-15
Carl walked all five screens at `localhost:3200/test` and signed off. Five connected mock
screens with a persistent navigator, no dead ends, 14px floor, focus-visible, responsive at
390px. `npm test` green, `typecheck:admin` clean, `build` ok.

## Goal
Create one polished, frontend-only manager workspace concept that Carl can walk end to end from `/test`.

## Changes
- Add a failing co-located unit test for five valid, mutually reachable scenes.
- Add `admin/src/stages/tests/manager-workspace.prototype.ts` with mock data, typed navigation, scoped responsive CSS, and the five scenes.
- Add one import, one gallery entry, and one token-based schematic thumbnail in `admin/src/stages/test.js`.
- Use the shared Lucide renderer and existing Sero design tokens; do not add dependencies.
- Run the offline suite, admin typecheck, production build, and a browser walk at desktop and phone widths.

## Screen contract
1. **Today** — a focused daily view: next 1:1, why Aisha needs attention, and promises due.
2. **Team** — a clean roster grouped by attention, steady, and new; no opaque people score.
3. **Aisha** — a person workspace with recent signals, last 1:1 context, growth goal, and open promise.
4. **Prepare** — a concise meeting brief with three evidence-linked questions and a private notes field.
5. **Follow-through** — editable-looking mock commitments with owner and date, plus a preview of what returns next time.

Every screen includes the same five-item navigator. Each screen has exactly one blue action, and that action advances the intended story.

## Safety contract
- No imports from backend code.
- No `fetch`, API helpers, form submission, `localStorage`, `sessionStorage`, cookies, or URL mutation.
- No edits to existing prototypes.
- No literal colour values in the new screen module.
- No user-facing text below 14px.
- No new package or build dependency.
- No broad formatting, staging, or cleanup in the dirty worktree.

## Not in this phase
- Real manager or employee records.
- Saving notes, commitments, or navigation state.
- Production app navigation or route changes.
- Alternative design directions two and three.

## Done when
- [ ] The gallery card opens the concept and “All tests” returns safely.
- [ ] All five scenes work by direct navigator and primary-action path.
- [ ] The layout remains usable without page-level horizontal scrolling at 390px.
- [ ] Keyboard focus is visible and reduced motion is respected.
- [ ] Offline tests, admin typecheck, and build pass.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Sign-off waits for your green light.
1. **The main story** — open `/test` → “Manager Loop”, then use the blue action on each screen. You should move Today → Team → Aisha → Prepare → Follow-through and always understand why the next step matters. ❌ Not OK if it feels like five unrelated dashboards.
2. **Move freely** — from Follow-through, use the persistent navigator to jump directly to Today, Team, Aisha, and Prepare. Each should open immediately without losing the prototype shell. ❌ Not OK if any screen is a dead end.
