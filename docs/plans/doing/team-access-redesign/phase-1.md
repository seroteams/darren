# Phase 1 — One list, access visible (remove the mode)

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-14 — Carl walked the Team screen ("a")
No mode, access chip on every card, Give access / Change from the card — all confirmed. Committed.

## Built (2026-07-14)
- **New `frontend/src/stages/team-card.ts`** — the pure, DOM-free card render extracted out so it unit-tests as a string (the modals/menu import CSS, which Node can't load). One `personCard(p, orgUsers)` for everyone; adds the access line: 🔗 account email + **Change** (linked) / 🔒 "No access yet" + **Give access** (unlinked).
- **`frontend/src/stages/team.ts` rewritten** — deleted the `editing` state, `enterEdit`, and the "Manage access / Done" toggle; one list always; `getLinkableUsers()` now loads alongside the roster (non-blocking; failure ⇒ invite-only); the card's access button opens a give/change menu (invite-by-email or link/switch/remove) reusing today's `doInvite`/`doLink`.
- **New `frontend/src/stages/team.test.ts`** — 4 tests on the card render (written first, red → green).
- Covers both apps (admin + customer both load this file).
- **Offline proof:** `npm test` **133/133** (was 132 + the new team test) · root `typecheck` clean · admin + customer typechecks add **zero** new errors (4 pre-existing errors remain in `add-person-modal.ts`/`delete-person-modal.ts` — name first/last splitting, untouched by this work; flagged separately).
- **Not committed** — waiting on the green light (Darren Method: green light = commit).

## Goal
Delete the hidden "Manage access" mode. The Team screen becomes one list where every person card shows its access status, and access actions live on the card — reusing today's invite/link behaviour (no new unified flow yet; that's Phase 2).

## Changes
- `frontend/src/stages/team.ts`:
  - Remove the `editing` state, the `enterEdit` toggle, and the "Manage access / Done" header button. Header subtext stops changing by mode.
  - Merge `personEditRow` into `personCard` — one card renderer used everywhere. Add an **access line** to every card:
    - linked → `🔗 <email> · [ Change ]`
    - not linked → `🔒 No access yet · [ Give access ]`
  - Move `getLinkableUsers()` from "entering edit mode" into `load()` (fetched once, non-blocking; failure ⇒ invite-only, as today).
  - "Give access" (unlinked) → today's `doInvite` email prompt; "Change" (linked) → a small account picker calling `doLink`/`unlinkPerson`. Behaviour reused as-is — Phase 2 unifies them.
- Update the now-stale `// Tidy up` code comments to match.

## Not in this phase
- The single unified "invite OR link" sheet — that's Phase 2. Phase 1 may still show the two paths, just triggered from the card instead of a mode.
- Any change to Prep / Edit / Delete / Add someone.
- Person-merge (parked).

## Done when
- [ ] Team screen shows **no toggle button** anywhere — `grep` confirms `editing`/`enterEdit`/"Manage access" gone from team.ts.
- [ ] Every card renders an access line; a linked person shows their account email, an unlinked person shows "No access yet".
- [ ] Giving access to an unlinked person, then reloading, shows them as linked (verify the DB link via the API/reload, not just the UI state).
- [ ] `npm test` green (incl. any team tests) and `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself on the Team screen (local Engine app). Next phase waits for your green light.
1. **No more mode** — open Team. You should see one list and **no "Manage access"/"Tidy up"/"Done" button**. ❌ Not OK if any toggle remains.
2. **Access at a glance** — look at the cards. Priya (linked) should read 🔗 with her account email; Carl (no account) should read 🔒 "No access yet". ❌ Not OK if you can't tell who has access without clicking.
3. **Give access** — on an unlinked person click **Give access**, invite by email (or link an existing account). After it completes, that card should now show 🔗 their account. ❌ Not OK if the card still says "No access".
4. **Change / remove access** — on a linked person click **Change**, set it back to "none". The card should return to 🔒 "No access yet". ❌ Not OK if the old link sticks.
5. **Nothing else moved** — Prep 1:1, the ⋯ menu (View/Edit/Delete), and Add someone all still work exactly as before. ❌ Not OK if any of those broke.
