# Phase 1 — Backend: claim endpoint + daily guest cap

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨

## Goal
The backend can hand a finished ownerless run to a logged-in account (claim), and guest starts are capped per day so strangers can't spend the OpenAI budget.

## Changes
- **New** `backend/api/services/sessions/guest-cap.ts` (+ mirrored test): file-backed daily counter at `content/data/guest-cap.json` `{date (UTC), count}` — survives server restarts. Env `GUEST_RUNS_PER_DAY`, default 10.
- `backend/api/services/sessions/sessions.controller.ts`: enforce the cap in `start()` right after `callerFence`, only for anonymous callers (`orgId===null && userId===null`). Over cap → 429 with plain message: *"Today's free tries are used up — please come back tomorrow."* New `claim` handler with `requireAuth` (any role).
- `backend/api/services/sessions/sessions.service.ts` (+ test): new `claim(id, orgId, userId)` — resolves via `repo.get(id)` directly (documented one-off fence-crossing; an org-ful caller would 404 an ownerless session through `requireExisting`). Unknown id → 404 · owned by someone else → 404 (same answer as unknown, anti-probing) · already mine → 200 idempotent · ownerless → stamp `orgId`/`userId`, `repo.persist()`, 200.
- `backend/api/server.ts`: one route — `POST /api/v1/sessions/:id/claim` (`v1Route` + `originOk`). Keep the hunk minimal (file is contended by parallel sessions).
- `SERO_BOARD.md`: the explicit reversal note on "anonymous-start: close before widening".

## Not in this phase
- Any frontend (guest link, save card, admin screen) — Phases 2–4.
- No paid runs. All QA here is $0.

## Done when
- [ ] Tests written first, then green: claim (ownerless→stamped+persisted · other-owner→404 · same-owner→idempotent · unknown→404); cap (UTC day rollover · limit hit · restart persistence · env default 10).
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Product owner has walked the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself (I'll drive the commands, you check what comes back). All free — the AI key stays unset so no run costs anything. Next phase waits for your green light.

1. **The cap actually stops a stranger** — I set the daily limit to 1 and start two guest runs. The first starts fine; the second is refused with exactly: *"Today's free tries are used up — please come back tomorrow."* ❌ Not OK if the second one starts, or the message is technical gibberish.
2. **You are never capped** — logged in as you, starting runs still works even when the guest cap is used up. ❌ Not OK if a logged-in start gets the "come back tomorrow" message.
3. **Claiming hands the run over** — a test guest run is claimed by a dev account; you then see that run listed under that account (User management → the account shows 1 run / it's in their Past 1:1s). ❌ Not OK if the run stays ownerless or shows under anyone else.
4. **Nobody can steal a run** — a *different* account tries to claim the same run and gets a plain "not found". ❌ Not OK if account B can claim or even see account A's run.
5. **Restarting doesn't reset the budget** — cap at 1, one guest start, restart the API, try another guest start: still refused today. ❌ Not OK if the restart hands out a fresh budget.
