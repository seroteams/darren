# Phase 2 — Flow-screen prefill

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The 1:1 flow screens (Intake → One-page → Focus → Preparation → Bank → Interview → Evaluate → Briefing → Debrief) open in the gallery genuinely filled in, from one shared demo session.

## Changes
- `admin/src/stages/gallery/screens.js` — pin `DEMO_SESSION_ID` (a real completed local run); add per-screen `seed` hooks.
- `admin/src/stages/gallery/fixtures.js` (NEW) — `seedFlowSession`: try `getSession(DEMO_SESSION_ID)` live first, fall back to a static snapshot copied once from a real response.
- Small seeds for the four parameterised screens (Run detail, Person detail, Admin user, Review run): list real items, pick the first.

## Not in this phase
- Empty/error-state design variants (Phase 3, only if wanted).

## Done when
- [ ] Every flow screen opens prefilled — verified by screenshots of Briefing (full recap) and Interview (mid-run question) actually rendered.
- [ ] Run detail / Person detail / Admin user / Review run open on a real item without hand-typing an id.
- [ ] The "needs demo data" tags from Phase 1 are gone.
- [ ] `npm run typecheck` + `npm test` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **The flow, filled** — in the gallery, click each 1:1 flow screen in order, Intake through Debrief. Every one should look like a real mid-flight or finished session — Briefing shows a full written briefing, Interview shows a question on screen. ❌ Not OK if any shows "nothing here yet" or a blank.
2. **Detail screens** — click "Run detail" and "Person detail". Each should open showing a real run / real person, without you picking one first.
3. **Still safe** — the banner still reminds you buttons are live; clicking around doesn't error.
