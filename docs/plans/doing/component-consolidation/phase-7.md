# Phase 7 — Kill the two app forks

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal

Changing the left nav becomes a one-file job instead of two.

`app-nav.js` and `router.js` each exist twice, once in the admin app and once in the customer app, and they are about two-thirds byte-identical. Every nav or routing change has to be made twice today, and when it isn't, the two apps quietly diverge.

## Changes

- **app-nav:** extract the shared 186 lines (the logo, `hrefFor`, `rowHtml`, the icon map, the mobile drawer behaviour) into one module. Each app then passes only its own `LINKS` list and role filter. Admin's file is 423 lines, the customer's is 278.
- **router:** one shared core for `PATH_FOR`, `STAGE_FOR`, `parseLocation`, `urlForState`, `syncUrl`, `startPopstate`. Admin keeps its extra `withBase` / `stripBase` / `replaceUrl` on top.

**Precedent to copy:** `frontend/src/boot-splash.js` is 9 lines that just re-export admin's 154-line version. That is the shape.

## Lane check before starting

Session `4b899314` holds `frontend/src/router.js`, `admin/src/ui/session-topbar.js` and `design/app-nav.css`. **This phase cannot start while that lane is live.** Tell Carl and hold.

## Not in this phase

- Changing what is in either nav, or the order of the items.
- The wider shared-folder split. That is a separate board track, scheduled after testers are on live.

## Done when

- [ ] The two `app-nav.js` files no longer contain duplicate logic.
- [ ] The two `router.js` files no longer contain duplicate logic.
- [ ] `npm test`, `npm run typecheck` clean.
- [ ] Both apps loaded in the browser, every nav item clicked, screenshots attached.
- [ ] Carl has tested the scenarios below and said go.

## Test scenarios — for the product owner

`local > admin (email + password) > any screen`

1. **Admin nav** — click every item in the left rail. Each one loads the right screen and stays highlighted. ❌ Not OK if the highlight sticks on the wrong item.
2. **Customer nav** — `local > customer app > Home`. Click every item there too. The customer nav still shows only the customer items, not the admin ones. ❌ Not OK if an admin-only item appeared.
3. **Mobile drawer** — narrow the window to phone width on both apps. The hamburger opens the drawer, tapping an item closes it and navigates.
4. **Back button** — navigate three screens deep, then press the browser Back button three times. You retrace exactly.
5. **Deep link** — copy a screen's URL, open it in a fresh tab. It lands on that screen, not on Home.
6. **Both roles** — sign in as a manager and as an admin. Each sees the nav items they saw before, no more, no fewer.
