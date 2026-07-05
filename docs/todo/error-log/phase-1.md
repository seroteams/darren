# Phase 1 — Store + catch backend errors

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Every backend error (an API 500) quietly writes one row to a new `error_logs` table — capturing who, where, what, and when — without ever slowing down or breaking the user's request.

## Why
This is the foundation: once errors are being *stored*, everything else is just reading them. Nothing is visible on screen yet — but from this phase on, the log is filling with real data, so by the time the screen lands (Phase 2) there's history to look at.

## Changes
- **New table** `error_logs` in [backend/db/schema.ts](../../../backend/db/schema.ts) with the columns locked in Phase 0; generate the migration (`npm run db:generate`) and apply it to Neon per the Phase 0 sequence.
- **A small co-located writer** (mirrors [superadmin-audit.ts](../../../backend/api/middleware/superadmin-audit.ts)): a pure `errorLogEntry(...)` builder + an injectable sink `appendErrorLog(entry)`, so the logic is unit-tested without touching the database.
- **Wire the capture point:** in [v1-route.ts](../../../backend/api/middleware/v1-route.ts) where 5xx are already caught (`if (status >= 500) console.error(...)`), also write an error-log row. Do the same at the legacy 5xx catch in [backend/api/router.ts](../../../backend/api/router.ts). Pull who-from `RequestContext` identity (userId/orgId/email). **Keep the existing `console.error` in place** — the DB row is *added*, not a replacement, so if the database is ever down the error still leaves a trace in the host's platform logs (the backstop noted in PLAN.md).
- **Fire-and-forget + safe:** the write is awaited-but-swallowed — if logging itself fails, the user still gets their response. **Redact:** store identity + method + path + status + error code + message + stack only; never the request body, password, token, or cookie.
- **Tests first** (test-driven-development skill): the entry builder redacts correctly, tags `source: "api"`, and a thrown 500 produces exactly one row via a fake sink; a 4xx produces none.

## Not in this phase
- No screen, no nav item, no read endpoint (Phase 2).
- No browser-side capture (Phase 3).
- No 4xx capture, no purge/retention (Phase 4).

## Done when
- [ ] `error_logs` table exists live on Neon (migration applied).
- [ ] A forced API 500 writes exactly one row with the right who/where/what; a 4xx writes none.
- [ ] The stored row contains no secret (no body, password, token, cookie).
- [ ] Logging failure can't break a response (proven by a test with a throwing sink).
- [ ] `npm test` green, typecheck clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Phase 2 waits for your green light. (No screen yet — we read the table directly to prove it works; I'll show you the row.)
1. **A real error gets recorded** — trigger a known failure (e.g. open a run whose log is missing, or the dev "force error" path). I show you the new database row: your name/email, the route, the message, the time. You should recognise the error. ❌ Not OK if nothing was written.
2. **Normal use writes nothing** — do a couple of ordinary actions that succeed (open a page, submit an answer). No new rows appear. ❌ Not OK if success is logged as an error.
3. **A "not allowed" (4xx) isn't treated as a crash** — hit a blocked/invalid action. No error-log row. ❌ Not OK if ordinary validation clutters the log.
4. **Nothing broke for the user** — during all of the above the app behaved normally; no slowdowns, no new failures caused by the logging itself. ❌ Not OK if logging made anything worse.
