# Phase 1 — Persona-run job service (free)

**Part of:** [PLAN.md](plan.md) · **Status:** ✅ done 2026-07-05 — walk delegated to Claude by Carl ("you test it for me"); all scenarios passed live; committed `e148db2a`

## Goal
The API gets a "start a persona run" door and a "how's it going" window — with all the guard rails — before any real engine work is wired in.

## Changes
- New backend service `backend/api/services/persona-runs/` (TypeScript, test-first):
  - `persona-runs.controller.ts` — thin: parse request, admin guard, map service results to 202/400/404/409.
  - `persona-runs.service.ts` + `.test.ts` — in-memory job state (`idle/running/done/failed`), validation (persona exists + has a script, API key present), **single active slot** — a second start while one runs gets a 409 (this is the cost backstop).
  - The actual runner is a stub injected into the service in this phase (so everything tests offline, no OpenAI).
- Routes in [server.ts](../../../../backend/api/server.ts): `POST /api/v1/persona-runs` and `GET /api/v1/persona-runs/current` (adminV1 + originOk, same pattern as the other admin routes).
- [run-history.ts](../../../../backend/engine/run-history.ts): `listFinishedRuns()` rows gain `personaId` + `mode` (read from saved state) + test — so the hub can later group runs by persona.

## Not in this phase
- The real runner (Phase 2). The service runs a fake that just flips job states.
- Any UI (Phase 3).

## Done when
- [x] `npm test` all green, including the new mirrored tests (new tests 21/21; the one suite fail was Carl's unrelated in-flight universe WIP)
- [x] `npm run typecheck` clean
- [x] Product owner has tested the scenarios below and said go — **Carl delegated the walk to Claude 2026-07-05 ("YOU TEST IT FOR ME"); all scenarios verified live** (see PLAN.md "Current state" for the transcript summary)

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light. (This phase is backend-only, so the walk is two commands — I'll have them ready to paste.)
1. **Tests green** — run `npm test`. You should see all tests passing, more tests than the current baseline. ❌ Not OK if anything fails that passed in the baseline.
2. **The guard rails answer correctly** — I'll give you 3 paste-ready commands: start with a made-up persona → polite "not found" error; check status when nothing runs → "idle"; (with the fake runner) start twice quickly → the second one refused with "a run is already going". ❌ Not OK if the second start is accepted.
3. **No money spent** — nothing in this phase calls OpenAI. The API key isn't touched. You should see $0 on the OpenAI dashboard from this.
