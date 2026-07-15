# Phase 1 — Close the H-1 leak (cross-company run read)

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT

## ✅ GREEN-LIT 2026-07-16 — Carl approved ("nice then go for it") after the plain-English walk; committed path-scoped (excl. server.ts, which carries a parallel session's work).

## Built (2026-07-16)
- `backend/api/middleware/require-auth.ts` — new exported `requirePrefillAccess(identity, isProduction?)`: production → `requireSuperadmin`, else → `requireAuth`.
- `backend/api/services/runs/runs.controller.ts` — `callerPrefill` now calls `requirePrefillAccess` (was inline `requireAdmin`, which passed for `manager`). Import + comments updated.
- Stale "admin-guarded"/"dev-only" comments corrected in `runs.controller.ts`, `runs.service.ts`, `runs.repo.ts`, `server.ts` so the code no longer misdescribes its own guard.
- `backend/tests/runs/test-prefill-access-gate.js` — new regression test (7 checks).
- **Proof (offline, free):** `npm test` = **143/143** (was 142 + 1 new); `npm run typecheck` clean. New test proves: prod manager → 403, prod non-allowlisted admin → 403, prod superadmin → allowed, prod anon → 401, dev any-logged-in → allowed, empty allowlist → denies everyone (fail-safe).
- **Design note:** gated to superadmin only; did NOT org-fence the clone reads (would break the tool's internal cross-org QA purpose; superadmin allowlist is the correct, already-used boundary + fails safe).

## Goal
Stop a signed-up customer from reading any other company's runs, notes and briefings through the "prefill a run" clone routes.

## The hole (verified against code)
- `/runs/clonable` + `/runs/clone` are registered in production (`server.ts:524-528`).
- Their guard `callerPrefill` uses `requireAdmin` in prod (`runs.controller.ts:32-37`), and `requireAdmin` passes for role `manager` (`require-auth.ts:16`). Every signup is a `manager` → every customer passes.
- `clonable` lists every finished run across ALL companies (`listFinished(null)` → `runOwnedByOrg(state,null)===true`).
- `clone` copies any run (source lookup unfenced) under the caller's own id, who then reads it via `/runs/mine/:id`.

## Changes
- `backend/api/middleware/require-auth.ts` — add a small exported, unit-testable gate `requirePrefillAccess(identity, isProduction?)`: production → `requireSuperadmin`, else → `requireAuth`. (Captures the security policy in one testable place.)
- `backend/api/services/runs/runs.controller.ts` — `callerPrefill` calls `requirePrefillAccess(identity)` instead of the inline `requireAdmin`/`requireAuth`. Update the surrounding comments to say **superadmin-only in production**.
- `backend/tests/runs/test-prefill-access-gate.js` — new regression test (below).

## Not in this phase
- Org-fencing the clone reads (deliberately not done — see plan.md design decision).
- Gemini key, security headers, log purge → Phase 2.
- Manager-fencing run history (M-2), trust page, retention → parked.

## Done when
- [ ] In production mode, a `manager` identity is refused (403) by the prefill gate; a superadmin is allowed.
- [ ] In non-production, any logged-in user is allowed (dev QA one-click unaffected); anonymous is refused.
- [ ] `npm test` green (new test passes, nothing else breaks); `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

1. **Customer can't peek at another company (the fix).** On the live site, sign in as a normal manager account. There is no button for this in the UI — it's a behind-the-scenes route — so the real proof is the automated test (scenario 3) plus my explanation. What you should be satisfied by: a plain customer account is now treated as "not internal staff" for this tool. ❌ Not OK if any customer account can still pull up runs it didn't create.
2. **Your own internal account still works.** Nothing you do day-to-day changes — the tool was only ever meant for internal Sero use, and your superadmin account still reaches it. ❌ Not OK if your own internal seeding/testing broke.
3. **The automated test proves it.** I run `npm test` (free, no AI cost). You should see the new `test-prefill-access-gate` pass: manager → blocked, superadmin → allowed. ❌ Not OK if it fails or is skipped.
