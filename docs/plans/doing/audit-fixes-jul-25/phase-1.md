# Phase 1 — Quick wins

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Clear the five findings that are each a line or two of code, so the obvious breakage is gone before we touch anything structural.

## Changes
- **Brand marks (F6)** — `admin/src/stages/design.js`: prefix the six `/sero-flowbite/brand/*.svg` paths with `import.meta.env.BASE_URL`, matching how `google-g.svg` is already done in `admin/src/stages/login.js`.
- **Build stamp stops blocking clicks (F17)** — `admin/src/ui/build-stamp.js`: `pointer-events:none` on the chip, `pointer-events:auto` on the inner SHA span so click-to-copy still works.
- **Search boxes get a name (F15)** — `admin/src/ui/list-toolbar.ts`: add an `aria-label` to the search input. One change, ten screens (Team, Members, Library, User management, Guest runs, Feedback inbox, All runs, Ratings, Gate 1, Registered).
- **Auth screens use the brand face (F14)** — `admin/src/styles/design/auth.css`: set the display font on the auth headings so the front door, Log in, Create account and both password screens match every in-app screen.
- **One date format per column (F11)** — the shared time helper in `admin/src/ui/time.ts`: relative under seven days, absolute after, decided per column rather than per row. Plus replace "last active no runs yet · 0 runs" on User management with "never active".

## Not in this phase
- Anything that moves layout — the header collision and the sidebar height are Phase 2.
- The em dashes — Phase 5, and they need three separate changes.
- Tap-target sizes — Phase 4, they sit with the other control work.

## Done when
- [ ] `npm test` and `npm run typecheck` both green (baseline taken before any edit, recorded in plan.md)
- [ ] The six brandmark SVGs return 200, checked in the network panel, not assumed from the path
- [ ] `document.elementFromPoint` at the build chip's centre returns the element underneath it, not the chip
- [ ] The search input reports an accessible name (read from the accessibility tree, not from the markup)
- [ ] Screenshot of Log in showing the brand face, next to the old one
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

1. **Brand marks are back** — `local > admin (audit.admin login) > Design system`, scroll to "Brandmark / logo". You should see six brand marks in their colours. ❌ Not OK if any slot is a broken-image icon or empty.
2. **You can click under the badge** — `local > admin > User management`, scroll so a table row sits behind the build badge bottom-right, then click that row. It should open. ❌ Not OK if nothing happens.
3. **The badge still copies** — click the build badge itself. It should flash and copy the SHA, exactly as now.
4. **Log in looks like Sero** — `local > customer (log out first) > /login`. "Welcome back" should be in the same typeface as "Prep a 1:1" on Home. ❌ Not OK if it still looks like the body font.
5. **One date format per list** — `local > customer (audit.manager) > Past 1:1s`. Every row in the list should use the same style of date, not "5d ago" above "Fri 17 Jul 2026". ❌ Not OK if two styles are still mixed in one group.
6. **No nonsense empty state** — `local > admin > User management`, find a user with no runs. It should say "never active", not "last active no runs yet".
