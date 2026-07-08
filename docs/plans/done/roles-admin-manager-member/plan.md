# Roles: admin / manager / member

**Goal:** Replace the `owner / admin / member` role model with `admin / manager / member` — end users who run 1:1s are "managers", internal Sero is "admin", the people being managed stay "members".
**Driver:** Carl
**Created:** 2026-07-04

## Decisions (locked)
- Existing accounts: every `owner` → `manager`; `carl@seroteams.com` → `admin`.
- Console access (the `requireAdmin` gate): open to **admin + manager** — no current end user loses access.
- Superadmin is unchanged — still the `SUPERADMIN_EMAILS` email allowlist, separate from role.

## Done means
- Log in as `carl@seroteams.com` → role is `admin`, still gets into the console + superadmin screens.
- Log in as any existing signup (e.g. Daniel) → role is `manager`, still gets into the console.
- Register a brand-new account → it comes out as `manager`.
- A `member` account → still `member`, no console.
- The word "owner" no longer appears as a role anywhere in the DB or the app.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Switch the role model | Enum rename + data migration + signup + console gate — the functional core, app stays working | ✅ |
| 2 | Sweep the leftovers | User-facing labels, seed scripts, test fixtures updated off "owner" — no behaviour change | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ done + applied to live DB (2026-07-04).** Carl said GO. Migration `0003_role_admin_manager_member` applied to Neon: enum is now `manager/admin/member`, live counts admin=1 (carl)/manager=11/member=1, no `owner` remains. Code: enum, signup→manager, gate→admin+manager, dev side-door→admin, gate test updated. `npm test` 57/57, typecheck clean. Verified by direct DB query (not inferred).

**Phase 2 ✅ done (2026-07-04).** Frontend `isAdmin` (`admin/src/state.js`) now allows manager+admin (mirrors the backend gate — without this managers lose the console nav). Dead `"owner"` role value purged from all live code + test fixtures. Company-ownership wording (`createOrgWithOwner`, register/privacy copy) deliberately kept — different concept. Backend + admin typecheck clean, 57/57 tests green. `admin/dist` bundle is stale but gitignored (rebuilds on deploy).

**All phases ✅ — plan complete.** Folder moves to `docs/archive/done/`. Remaining: Carl's eyeball QA (log in as manager/admin/member in the browser) whenever convenient — the mechanics are verified.

Baseline (2026-07-04, free): `npm test` → **57/57 pass**. `npm run gate` (~$3, OpenAI) skipped on purpose — it doesn't exercise roles.

## Parked
- Renaming the `createOrgWithOwner` repo method / `NewOrgOwner` type to `...Manager` — pure cosmetics, do only if it doesn't bloat Phase 1.
- Tidying the 10 test accounts (separate earlier thread) — not part of this plan.
