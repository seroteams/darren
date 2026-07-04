# Phase 007 · Step 02 — The "Registered" screen (frontend)

## Goal
A superadmin-only admin page that shows every alpha company and its people, with the return-visit signal —
so Carl can watch adoption at a glance.

## What you'll have
- A new admin stage **"Registered"** at `/admin/registered`: the alpha rating summary up top, then each
  company with its users (name, role, joined date, run count, last active, this-week/last-week).
- The nav item shows **only for the superadmin** (see below); its own loading / empty / error states.
- Read-only. Reachable only by Carl — a normal owner/admin is refused by the backend (403).

## A grounding example
- **Before:** Carl queries the database by hand to see who signed up.
- **After:** Carl opens "Registered" → the alpha's companies, people, and whether they're coming back.

## Technical detail
- Register the stage via the admin page pattern (mirror an existing admin stage): `state.js` STAGE +
  `router.js` path (add to `ADMIN_ONLY`) + `main.js` loader + `app-nav.js` link (`admin: true`). New
  `admin/src/stages/admin-registered.ts` fetching a new `getRegistered()` in `shared/api.js`. `escapeHtml`
  every value; ≥14px; plain language.
- **Nav visibility (cosmetic only):** the nav guard can't be the security boundary (every owner satisfies
  `admin: true`). To show the item to Carl **only**, expose a boolean `isSuperadmin` on `GET /api/v1/auth/me`
  (server-computed from the same allowlist — a flag, never the allowlist itself) and gate the nav link on
  it. Security still rests entirely on the backend 403; the flag is UX, not a gate.
- Match the admin design (this is internal tooling, admin surface — not the member app).

## Check
- `npm run typecheck` clean; `npm test` green. As Carl: the page lists every company + users with the
  signal; loading/empty/error states render. As a normal owner: the nav item isn't shown **and** hitting
  the route/endpoint is refused (403) — the nav hiding is not the only defense. No OpenAI.
