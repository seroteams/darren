# Phase 1 — Shared foundation

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
Move the machinery both apps will need (api client, router core, state store, shared UI bits, styles) into one shared spot the current admin app imports — with **no change to how anything works**. This is the enabling refactor; nothing new appears on screen.

## Changes
- Create a `shared/` area (locked decision: a plain folder both apps import via relative paths).
- Move only the genuinely-shared, **non-branching** pieces there: `api.js`, `sse.js`, the generic `ui/` primitives (e.g. `html.js`, `field.js`, `confirm.js`, `reveal.js`), and the base styles.
- **Leave `state.js` and `router.js` where they are** — they interleave admin + member concerns and get *split* when the customer app is built (Phase 2/3), not moved whole here.
- Repoint the existing `admin/` imports to the new location (≈27 files import api/sse alone — mechanical, do it in small checkable batches).
- **Verify with a Vite build** after each batch — `npm test`/`tsc` are backend-only and won't catch a broken frontend import.

## Not in this phase
- No new customer app yet (that's Phase 2).
- No removing anything from admin (that's Phase 3).
- No JS→TS conversion.

## Done when
- [ ] `npm test` matches the Phase-1 baseline (no drop) and `npm run typecheck` is clean.
- [ ] The admin app boots and a full prep run + the admin tools all still work.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk these yourself. Because this phase is "nothing should change," you're checking that **nothing broke**.
1. **Prep flow still works** — log in, start a new session, walk a full prep run end-to-end. You should see it behave exactly as before. ❌ Not OK if any screen errors, styling looks off, or a step won't advance.
2. **Admin tools still work** — open a couple of internal tools (e.g. Library, Compare, Personas). They should load and work as today. ❌ Not OK if any is blank or broken.
3. **Member view still works** — log in as Standard (quick-swap). Rail = Home · Team · Runs, lands on Home. ❌ Not OK if the rail or landing changed.
