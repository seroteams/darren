# Phase 1 — Quick wins

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-25 — Carl walked all five on the local build (commit 72a7c64b)
Brand marks back on the Design system page, a table row under the build badge clickable, the badge still copying its SHA, "never active" replacing the nonsense phrase, and one date format down Past 1:1s.

## Built (2026-07-25)

Baseline before any edit: `npm test` 186/186, `npm run typecheck` clean, `lint:copy` PASS, `lint:tokens` PASS. Nothing was already red.

| Fix | Files | Proof (measured, not assumed) |
|---|---|---|
| F6 brand marks | `admin/src/stages/design.js` | 8 brandmark images on the Design system page, **8 loaded**, `naturalWidth > 0` on every one, **zero 404s** on the page. Was 6 × 404. |
| F17 build stamp | `admin/src/ui/build-stamp.js` | Chip `pointer-events: none`; `document.elementFromPoint` at its centre now returns the `TD` underneath instead of the chip. The SHA span keeps `pointer-events: auto`, so click-to-copy still works. |
| F15 search name | `admin/src/ui/list-toolbar.ts`, `admin/src/stages/library.js` | The input now renders `aria-label="Search name or email"`. One change covers all ten screens via a placeholder fallback; Library gets an explicit label because its placeholder trails an ellipsis. |
| F14 auth typeface | `admin/src/styles/design/auth.css` | Computed `font-family` on the auth h1 is now `"Bricolage Grotesque Variable"` on `/login`, `/register` and `/forgot-password`, and `document.fonts.check` says the face is really loaded. Width proof: "Welcome back" measures **313.66px** in Bricolage vs **318.08px** forced to Inter, so it is the real face and not a silent fallback. |
| F11 dates | `admin/src/ui/time.ts` (new `whenLabelsFor`), `admin/src/stages/runs.ts`, `start-rows.ts`, `start-core.js`, `admin/src/stages/admin-registered.ts` | Manager Home: 3 rows, **3 absolute, 0 relative, no mixing**. Past 1:1s: 5 rows, **5 absolute, 0 relative, no mixing**. Was "2d ago" / "5d ago" / "Fri 17 Jul 2026" in one list. User management: **16 rows now read "never active"**, and **0** read "last active no runs yet". |

Tests added: `whenLabelsFor` (4 cases) in `admin/src/ui/time.test.ts`, the accessible-name contract in `admin/src/ui/list-toolbar.test.ts`, the one-vocabulary-per-list guard in `admin/src/stages/runs.test.ts`.

After: `npm test` 186/186, `typecheck` clean, `lint:copy` PASS, `lint:tokens` PASS.

Screenshots: `audits/full-app-audit-2026-07-25/p1-proof/`.

**Set your expectation on F14:** Bricolage Grotesque and Inter are close at heavy weight, so the login headline will not look dramatically different. The 4.4px width difference above is the proof it changed; do not fail the walk because it looks familiar.

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
