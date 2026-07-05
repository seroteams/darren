# Phase 2 — The Error log screen

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
A new **Error log** page in the admin nav (superadmin-only) that shows the rows Phase 1 has been collecting as a clean table — newest first, every company in one view. This is the screen from the mockup.

## Why
Phase 1 fills the log; this is where you *read* it. After this phase, "it broke — what happened?" has a one-click answer.

## Changes
- **Read endpoint** `GET /api/v1/admin/errors`, gated by `superadminV1` (= `v1Route(requireSuperadminRoute(h))`) — the same 403 wall as User management. A read-only service + repo query returning the newest N rows across all companies (mirrors the superadmin service pattern).
- **API helper** `getErrorLog()` in [shared/api.js](../../../shared/api.js), next to `getRegistered()`.
- **New stage** `admin/src/stages/admin-error-log.ts`, built from the [admin-registered.ts](../../../admin/src/stages/admin-registered.ts) recipe: loading / empty / error states, `l-container` + `card-flat` layout, `escapeHtml` on all values, `relTime` for the "when." The table: **When · Who (name + company) · Where (route/screen + a source pill) · What went wrong · Status pill**, newest first.
- **Wire the stage in** (the standard touch-points): `ADMIN_ERROR_LOG` in [state.js](../../../admin/src/state.js); lazy loader in [main.js](../../../admin/src/main.js); `PATH_FOR` + `STAGE_FOR` (`/admin/errors`) + `ADMIN_ONLY` in [router.js](../../../admin/src/router.js); nav link (icon + `LINKS` with `superadmin: true` + `onNav` + `ACTIVE_BY_STAGE`) in [app-nav.js](../../../admin/src/ui/app-nav.js).
- Text stays ≥ 14px (the floor).

## Not in this phase
- No row-click detail, no filters, no "mark resolved" (Phase 4) — the row shows the summary only.
- No browser-side errors yet (Phase 3) — the table shows API rows for now.

## Done when
- [ ] Logged in as `carl@seroteams.com`, an **Error log** item appears in the nav and opens the table.
- [ ] The table lists real rows from Phase 1, newest first, with When/Who/Where/What/Status filled.
- [ ] Empty state reads cleanly if there are no errors yet.
- [ ] A non-superadmin can't reach it — the nav item is hidden **and** the endpoint returns 403 (the real wall).
- [ ] `npm test` green, typecheck + admin build clean, 14px floor holds.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Phase 3 waits for your green light.
1. **You can see the log** — log in as yourself, click **Error log** in the nav. A table appears, newest first, and the top rows match errors you know happened (from Phase 1's testing). ❌ Not OK if it's blank when you know there are errors, or the order is wrong.
2. **A row tells the story at a glance** — pick a row. Without clicking in, you can read *who* hit it, *where*, *what* broke, and *when*. ❌ Not OK if you can't tell what happened from the row.
3. **Only you can see it** — swap to a normal member (dev Standard quick-swap). The Error log item is gone from the nav, and typing `/admin/errors` in the address bar doesn't show the data. ❌ Not OK if a member can see anyone's errors.
4. **Empty reads gracefully** — if the log happens to be empty, the page says so plainly (not a broken/blank screen). ❌ Not OK if empty looks like a bug.
