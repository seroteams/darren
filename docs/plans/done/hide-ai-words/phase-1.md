# Phase 1 — Backend save-layer + API

**Part of:** [PLAN.md](plan.md) · **Status:** ✅ done (committed `9a6f1ca9`)

## Goal
Teach the engine to record and honour "this AI word is hidden" in the overlay sidecar, and expose hide/unhide over the API — so a hidden word both leaves the browse list and stops being used in real 1:1s, without ever touching the AI's generated file.

## Changes (test-first per house rules)
Engine — [backend/engine/role-profile.ts](../../../backend/engine/role-profile.ts):
- Overlay schema gains `hidden_terms: string[]` (lowercased AI term strings). `loadOverlay` returns `{ added_terms, hidden_terms }`; `writeOverlay(key, added_terms, hidden_terms)` persists both. Keep null-safe posture (missing/corrupt → empty arrays).
- New `hideOverlayTerm(key, term)` / `unhideOverlayTerm(key, term)` — guard `validKey` + profile exists; dedupe case-insensitively; return the new `hidden_terms`.
- `listRoleProfiles()` (~line 217): tag each AI term with `hidden: hidden_terms.includes(term.toLowerCase())` so the page can separate active vs hidden. (Do **not** drop them here — the UI needs them to offer "restore".)
- `effectiveTerminology(doc)` (~line 325, the runtime path the engine actually uses): **filter out** AI terms whose lowercased term is in `hidden_terms`. This is the "saved into the engine" part — hidden words stop reaching prompts/runs.
- Export the two new functions alongside `addOverlayTerm` / `removeOverlayTerm`.

API — mirror the existing add/remove wiring:
- [role-lexicons.repo.ts](../../../backend/api/services/role-lexicons/role-lexicons.repo.ts): `hideTerm` / `unhideTerm`.
- [role-lexicons.service.ts](../../../backend/api/services/role-lexicons/role-lexicons.service.ts): `hideTerm` / `unhideTerm` → `{ ok: true, hidden }`.
- [role-lexicons.controller.ts](../../../backend/api/services/role-lexicons/role-lexicons.controller.ts): `hideTerm` / `unhideTerm` reading `{ key, term }`.
- [server.ts](../../../backend/api/server.ts) (~line 186): routes `POST /api/role-lexicons/term/hide` + `/unhide` (legacy) and their `/api/v1/` twins, matching the `remove` pattern.
- [shared/api.js](../../../shared/api.js): `hideRoleLexiconTerm(key, term)` / `unhideRoleLexiconTerm(key, term)`.

Tests:
- Engine test (co-located, e.g. `role-profile.test.ts` or the existing role-lexicons test) for hide → term marked hidden in list + absent from `effectiveTerminology`; unhide reverses it; overlay file keeps `added_terms` intact.
- Service test mirroring the add/remove tests.

## Not in this phase
- Any UI. The page keeps showing all AI words (some now carry a `hidden` flag that nothing reads yet).
- Editing wording, bulk actions (Parked in PLAN.md).

## Done when
- [ ] `npm test` passes, including new hide/unhide tests (free — no API cost).
- [ ] `npm run typecheck` stays green.
- [ ] Hitting `POST /api/role-lexicons/term/hide` with `{key, term}` writes `hidden_terms` into `<key>.overlay.json` and the word is gone from `effectiveTerminology`; `/unhide` removes it again. (Verified by test and/or a local curl — no OpenAI spend.)
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
These are backend-only, so I'll drive them for you and show the result (no OpenAI cost — local file + endpoint only). You confirm the outcome reads right.
1. **Hide sticks in the file** — I hide one AI word for a role, then show you that role's `overlay.json`. You should see the word listed under `hidden_terms`, and the role's own generated file **unchanged**. ❌ Not OK if the generated profile file was edited.
2. **Engine stops using it** — I show the role's runtime word list before and after hiding. You should see the hidden word present before, gone after. ❌ Not OK if it still appears after hiding.
3. **Restore reverses it** — I unhide the same word and show the file + runtime list again. The word is back and `hidden_terms` no longer lists it.
4. **Your own words untouched** — a role that also has a "yours" word: after hide/unhide of an AI word, the "yours" word is still there. ❌ Not OK if adding/removing your own words broke.
