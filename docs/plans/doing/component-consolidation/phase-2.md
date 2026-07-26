# Phase 2 — Small primitives sweep

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal

Four small things that exist in many copies become one copy each.

## Changes

- New `admin/src/ui/avatar.ts` — `initialsOf(name)` and `avatarHtml()`. Replaces 10 hand-written copies of the initials helper. **Settles a real inconsistency:** the Pulse screen shows two letters, everywhere else shows one. One letter wins.
- New `admin/src/ui/logo.ts` — the Sero logo SVG as one constant. Replaces 4 pasted copies (`app-nav.js`, `session-topbar.js`, `recap-pdf.ts`, and the customer app's `app-nav.js`).
- Adopt the existing `wireRetry()` from `screen-scaffold.ts` in the 5 screens that re-wire their own Try again button. It has zero users today.
- Collapse the two byte-identical `postcss.config.js` files into one.

## Lane check before starting

`session-topbar.js` and `app-nav.css` are held by session `4b899314`. If that lane is still live, do the avatar and `wireRetry` work and hold the logo until it clears.

## Not in this phase

- Changing the avatar colours or shape. Only the letter inside it becomes consistent.
- The six different avatar CSS families. Those collapse in Phase 4 with cards.

## Done when

- [ ] `grep "initialOf\|function initials"` returns only `avatar.ts`.
- [ ] The logo SVG path string appears once in the repo.
- [ ] `wireRetry` has 5 call sites, not 0.
- [ ] `npm test`, `npm run typecheck`, `npm run lint:tokens` clean.
- [ ] Carl has tested the scenarios below and said go.

## Test scenarios — for the product owner

`local > admin (email + password) > Runs`

1. **Initials match** — look at the round avatars on Runs, then on Admin > Pulse. Same person should show the same letter in both places. ❌ Not OK if one shows "CB" and the other shows "C".
2. **Logo unchanged** — check the logo top-left on the nav, and in the top bar during a session. Both look exactly as before.
3. **Recap PDF** — download a recap PDF. The logo is still on it and still the right size.
4. **Try again** — go to Admin > Runs with the server stopped. You get the "Couldn't load" card. Start the server, click Try again. The list loads. ❌ Not OK if the button does nothing.
