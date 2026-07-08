# Phase 004 — handover (for a fresh chat)

**Read this + [PLAN.md](plan.md) ("Current state" is the live log, newest first) +
[sessions-subphase.md](sessions-subphase.md). Then continue.**

Date: 2026-06-28. Branch: `main`. **Committed locally; NOT pushed this session** (the prior handover assumed
push-per-pass; this session stayed local per the standing "work locally" rule — offer to `git push origin main`
if Carl wants phone review).
Latest commits (this session, newest first): `38229a57` (Step 4 test tree) · `60f1299b` (cleanup: derivations) ·
`04a9f248` (S4 plan) · `3ece6e1f` (S4 evaluation) · then `c654e485`/`6ccad211` (S4 bank) earlier.
(Untracked `content/questions/_runtime/*`, `role-profiles/*`, `docs/archive/plans/briefing-readability-p0/` are
**pre-existing, unrelated** to this phase — leave them alone; there's a standing rule against touching the
questions artifacts.)

## Where we are
Phase 004 = reshape the backend into clean layers (thin controller → service → co-located repo) behind a
versioned `/api/v1/`. **Behaviour-identical — structure only, no features.** **BUILT — 100% of the work done +
free-verified. Only the owner-walk sign-off remains** (Carl's gate; not self-certified).

- **Step 1 (contract)** ✅ · **Step 2 (shared plumbing)** ✅
- **Step 3 (convert every domain, TDD)** ✅* — all 9 safe domains + the risky **`sessions`** (21 routes) via
  S0–S4: **S0** seam · **S1** 5 reads · **S2** 8 writes · **S3** 2 AI JSON · **S4** all 5 SSE streams
  (`focus-points`/`preparation`/`bank`/`evaluation`/`plan`). `handlers/` now holds **only** `stream-helper.ts`.
- **End-of-sessions cleanup** ✅* — `snapshot`/`inferStage`/`summarizeAxes` relocated to the co-located
  `services/sessions/session-views.ts`. (`buildPreparationInputs` was already relocated in S1b/S4.)
- **Step 4 (mirrored test tree)** ✅* — integration tests live in `backend/tests/<domain>/`; runner
  auto-discovers them; `backend/tests/README.md` documents the convention.

*= built + free-verified; flips to a hard ✅ on Carl's owner-walk approval.

## NEXT — the owner-walk (Carl), then close-out
**No build work left.** The only remaining gate is Carl's sign-off:
1. **Walk the QA** (free): run a real 1:1 — start, answer, step back, save a note, mark the agenda, pick focus
   points, finish to a briefing — each reads/persists exactly as before; bad origin still 403, rapid starts 429.
2. **Architecture check:** describe swapping a repo's storage (the `SessionsRepo` seam) for a fake/DB — no
   service logic changes; routes still respond in the contracted shape.
3. **Optional, paid:** the S3/S4 AI walks (suggest-answers + the live streams) — one model call each, within the
   $3 budget, exercised naturally during the real run above.

On Carl's **"approved"**: mark the phase ✅, flip the build-plan badge (`admin/src/stages/checklist.js`) to done,
move this folder to `docs/archive/done/`, set the Prototype→Production `PROGRESS.md` (Phase 004 → done) — **then
Phase 005 opens.**

## How to work (non-negotiable)
- **Darren Method, one pass per walk.** Carl has been saying "go ahead / continue" to batch + commit on free
  checks — but he green-lights direction. Build → self-verify FREE → commit locally → **push** (he reviews on
  his phone; `git push origin main`, no PR — he dislikes PR/CI noise).
- **TDD:** co-located `*.service.test.ts` written **before** the impl (red → green). New code is TS, strict.
  *Exception:* SSE streams have no pure service-level logic to unit-test (the orchestration is the shared
  `runStage`) — verify those by typecheck + the $0 SSE boot-diff instead. Don't fabricate a meaningless test.
- **No banned constructs:** no `any` / `as` cast / `@ts-ignore` / non-null `!` (use the `isObjectRecord`/
  `asRecord` guard pattern). Grep touched files before committing.
- **Money — $3 TOTAL CAP (Carl, 2026-06-28):** OpenAI spend is now OK **up to $3 total** for Phase 004's paid
  walks (no longer per-run yes) — but **track cumulative spend and stop at $3**, and run the **smallest thing
  that proves the point**: `node scripts/gate.js --only <case>` (~$0.35) runs the whole pipeline once, so a
  single live run confirms several converted stages at once. Don't burn the budget on repeats or the full
  8-case sweep. AI routes + streams are structure-only with the model behind an injected boundary, so the paid
  walk just confirms live generation matches.

## The pattern to copy
- **Reference layered domain:** `backend/api/services/runs/` (repo = storage seam, service = logic throwing
  shared `HttpError` factories from `middleware/http-error.ts`, controller = thin). Wiring in `server.ts`.
- **Sessions specifics:**
  - **id resolution (D4):** v1 takes the id in the PATH (`/api/v1/sessions/:id/…`); legacy keeps `?s=` (reads)
    / `body.sessionId` (writes). The controller resolves it: `sessionId(c)` = `c.params.id || c.query.s` (reads);
    `writeId(c, body)` = `c.params.id || body.sessionId` (writes). The service takes the resolved string.
  - **Injected boundaries:** `createSessionsService(repo, deps)` where `deps = { prewarm?, draftAnswers?,
    reviewLexicon? }`. The model lives behind these (controller wires the real engine fn) so the service is
    unit-testable with no model call. Add a new boundary to `SessionsDeps` for any new AI call.
  - **Streams:** manage their own response → **NO `v1Route`** (like `library`). Resolve the session via
    `service.require(id)` (throws 404 before the stream opens). Use the shared `runStage` from
    `handlers/stream-helper.ts` (keep it there). v1 route = the path with no `v1Route` wrapper, so a thrown
    error renders flat (same as legacy) — that's fine for streams.
- **Pipeline-lock manifest (`backend/engine/pipeline-lock.ts` `PATH_META`):** when a JSON-route handler is
  deleted, its logic moved into `sessions.service.ts` (already tracked "Sessions") → drop the handler entry
  with a note. When a **stream** handler is deleted, just drop its entry — the real stage engine
  (`generate.ts`/`preparation.ts`/`question-generator.ts`/`queue-manager.ts`/`reviewer.ts`) is already tracked.

## Verify each pass (all FREE)
1. `npm test` (currently **46/46**: 27 offline + 16 co-located + 3 integration) · 2. `npm run typecheck` ·
   3. banned-construct grep on touched files.
4. **$0 live boot-diff — the key trick:** boot with **`OPENAI_API_KEY=` (empty/unset)** so any AI pre-warm /
   model call fails fast and is swallowed (no billable request), then `curl`/`fetch` the v1 path vs the legacy
   route and compare. This lets you diff even AI routes (degrade/error paths) + streams (`thinking → error`
   sequence) for **$0**. Boot: `OPENAI_API_KEY= API_PORT=3999 node backend/api/server.ts`; wait via
   `curl --retry --retry-connrefused`; stop the server after. (Do NOT `node -e require` `scripts/gate.js` — it
   runs on import.) The **real success walk** (answers/candidates/streams actually generating) is one paid
   model call — now covered by the **$3 total budget** above; batch it (one live run proves several converted
   stages) and track spend.

## Behaviour-identical contract (verified each pass)
- Legacy `/api/…` routes keep their old **status + flat `{error: string}`** body — the admin is unaffected
  (it branches on **status only**; verified in `admin/src/api.js`, whose `json()` only uses `body.error` as a
  message string). v1 routes use the shared envelope `{error:{code,message}}` — **except streams** (no
  `v1Route` → flat).
- Several unknown-session 404 bodies were **normalised** to `Unknown session: <id>` (was "session not found"
  etc.). Safe + accepted (status-only branching). Success bodies are byte-identical.
