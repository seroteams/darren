# Phase 1 — Security review findings (008 execution)

**Part of:** [phase-1.md](phase-1.md) · **Date:** 2026-07-01 · **Reviewer:** automated + Claude (human expert deferred by Carl's call)

> This is the review record 008 calls for. The named human expert sign-off is **waived for the small alpha
> (accepted risk)** — this doc is what an expert should read when one is booked. Automated checks are a floor.

## Method
Free/offline audit of three 008 concerns: AI-key leakage, company+role data fencing, and PII in logs.
Baseline at review time: `npm test` 52/52 · `npm run typecheck` clean.

## Findings

### 1. AI keys — ✅ server-only, no leak
- `OPENAI_API_KEY` / `GEMINI_API_KEY` read from `process.env` only in `backend/` (`server.ts`, `cli.ts`,
  `engine/ai-client.ts`) and paid scripts; used in a server-side `Authorization` header.
- The 3 "frontend" hits are `admin/src/stages/guide.js` listing env-var *names* on a setup help page — not values.
- Built client bundle (`admin/dist`) grepped for `sk-`/key patterns → zero hits. Vite only inlines `VITE_*`;
  the key isn't prefixed, so it can't be bundled.
- **Action:** none. Keep keys unprefixed and server-side.

### 2. Company + role fencing — ✅ correct for stamped data · ⚠️ null-org escape hatch
- **Role:** `require-auth.ts` — `requireAuth` 401 when logged out; `requireAdmin` 401-then-403; internal
  tooling wrapped in `requireAdminRoute`. Unit-tested.
- **Company (runs):** `findRunDir(id, orgId)` — a by-id read of another company's run resolves to 404.
- **Company (sessions):** `sessions.service` refuses cross-company access.
- **⚠️ THE HOLE:** fencing only applies when `orgId` is set. `sessions.service.ts:241` fences only when
  `s.orgId` is truthy; the runs repo notes "Omitted = unfenced." Null-org rows come from legacy data and the
  deliberately-open anonymous session-start path. **Any 1:1 created while not logged in is cross-company visible.**
  - **RESOLVED 2026-07-01 (`f0e5401d`):** the sessions wall now default-denies — an org caller never resolves
    a null-org session (test-first; `npm test` 52/52 · typecheck clean). Runs were already default-denied for
    org callers (`runOwnedByOrg` rejects a mismatch). Residual is non-code: the DB audit + anonymous-start decision.
- **Action (Phase 1 fix):** (a) default-deny — if a caller *has* an org, never serve them null-org rows;
  (b) audit the DB for existing null-org rows before real data flows; (c) decide the anonymous-start path
  (keep but never stamp real alpha data, or close it).

### 3. PII in logs — ✅ web path clean · ⚠️ CLI renderer prints PII
- **Web API:** 500 handlers log the error/stack (not request bodies); note-write failure logs only the error
  message. No PII dump on the served path.
- **⚠️ CLI renderer:** `briefing.ts` / `cli/stages/questioning.ts` print names, evaluations, and the
  manager-only `brutal_truth_manager` to stdout (local terminal display). On a hosted box, stdout → platform logs.
- **Action:** deploy the **web server only**; never run the CLI renderer on the host. Once hosted, spot-check
  that 500 stacks don't embed request PII.

## Summary
Keys and the web-path logging are clean. **One real code fix for Phase 1: close the null-org escape hatch.**
One deploy-time condition: web server only (carried into Phase 2 hosting). Expert sign-off deferred, not cancelled.
