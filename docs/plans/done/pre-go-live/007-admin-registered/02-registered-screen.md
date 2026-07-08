# Phase 007 · Step 02 — The "Registered" screen (frontend)

> **Status: 🔨 built 2026-07-04 — awaiting Carl's QA.** New admin stage `admin-registered.ts` at
> `/admin/registered` (registered via the 6-step pattern: state STAGE + router path/ADMIN_ONLY + main
> loader + app-nav link + `getRegistered()` in api.js). Renders the alpha rating summary + each company
> with its users (role, joined, run count, last-active, this-week/last-week), with loading/empty/error
> states; every value escaped, ≥14px. **Nav visibility:** `/auth/me` now returns a server-computed
> `isSuperadmin` boolean (the allowlist never leaves the server); the nav item is `superadmin: true` and
> hidden unless that flag is set. Security still rests on the backend 403. Verified: `npm test` 57/57 ·
> both typechecks clean · `npm run build` compiles · live check — a **member does not see the item** and
> no console errors. Full superadmin walk (Carl sees the populated page) needs the API restarted with
> these changes → part of Carl's QA. No OpenAI.

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
