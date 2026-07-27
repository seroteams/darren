# Shell trio dedupe + finish the scaffold adoption

**PARKED 2026-07-27.** Opened from the 27 July clean-up sweep
([report](../../../reports/cleanup/2026-07-27.md), Lens F) so these findings live on the
board instead of only inside a report. Nothing here is urgent and nothing blocks the
validation stage. Un-park when a session has room for structural work.

## Why this exists

The shared-stages trap is already solved for stages proper: frontend stages cross-import
admin's modules. But the **app shell trio** is genuinely duplicated, so a fix has to land
twice or the two apps silently drift. Two of the three carry routing logic, which is where
drift actually costs us (the auth-landing trap).

## Scope

| # | What | Where | Effort |
|---|------|-------|--------|
| 1 | Twin left-rail navs, 138 of 181 lines identical (mobile drawer, scrim, collapse, logo) | `admin/src/ui/app-nav.js` vs `frontend/src/ui/app-nav.js` | M |
| 2 | Twin `boot()`/popstate route dispatch, 65 of 130 lines identical; admin repeats its own dispatch internally | `admin/src/main.js:141`, `frontend/src/main.js:134`, `admin/src/main.js:103-136` | L |
| 3 | Twin router loop-guards (suppress flag + compare-before-write) | `admin/src/router.js:207-222` vs `frontend/src/router.js:124-138` | S |
| 4 | 19 screens hand-roll the "Couldn't load" card that `screen-scaffold.ts` was built to own (P5 adoption unfinished) | `admin/src/stages/admin-runs.ts:208`, `admin-guest-runs.ts:141`, +17 | M (S per file) |
| 5 | Oversized files: `design.js` 941, `runs-store.ts` 924, `reviewer.ts` 884 lines | as cited | M-L |

## The model to copy

`frontend/src/boot-splash.js` is a 9-line re-export of admin's copy, kept only because the
CSP needs a file at that Vite path. That is the shape the trio should end up in: one
implementation, per-app config passed in, thin re-export where the bundler needs a file.

## Order, if un-parked

Start with **3** (S, self-contained, low blast radius), then **4** (mechanical, file by
file, each one screenshot-verifiable), then **1**. Leave **2** last: the differences that
exist between the two `main.js` files are exactly the auth-landing logic, so it needs the
login/register mirror re-verified rather than assumed.

**5 is separate and needs Carl's nod before starting** — `runs-store.ts` holds the run-history
security wall re-checks, so any split is tests-first and reviewed, not a mechanical move.

## Not in scope

Retiring the two shipped welcome prototypes (`admin/src/stages/tests/welcome-redesign.js`,
`welcome-options.js`, 1,051 lines). They are deliberately kept: the live welcome screen cites
both as provenance at `admin/src/stages/start-welcome.ts:4,52`, and the Test area is hidden
in production. Leave them.
