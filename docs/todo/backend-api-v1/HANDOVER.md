# Phase 004 — handover (for a fresh chat)

**Read this + [PLAN.md](PLAN.md) ("Current state" is the live log, newest first) +
[sessions-subphase.md](sessions-subphase.md). Then continue.**

Date: 2026-06-28. Branch: `main`. **Tree is clean and pushed** — `main` is in sync with `origin/main`.
Latest commits: `feb8ae5b` (S4 focus-points) · `5a5fe7ab` (S3) · `1189bb82` (S2b) · `5e22b386` (S2a).
(Untracked `content/questions/_runtime/*`, `role-profiles/*`, `docs/todo/briefing-readability-p0/` are
**pre-existing, unrelated** to this phase — leave them alone; there's a standing rule against touching the
questions artifacts.)

## Where we are
Phase 004 = reshape the backend into clean layers (thin controller → service → co-located repo) behind a
versioned `/api/v1/`. **Behaviour-identical — structure only, no features.** ~**85% done.**

- **Step 1 (contract)** ✅ · **Step 2 (shared plumbing)** ✅
- **Step 3 (convert every domain, TDD)** 🔨 — all **9 safe domains done** + the risky **`sessions`** domain
  (21 routes) nearly done via sub-passes S0–S4:
  - **S0** ✅ store seam · **S1** ✅ 5 free reads · **S2** ✅ 8 non-AI writes (S2a `start` + S2b the other 7)
  - **S3** ✅ 2 AI JSON routes (`suggest-answers`, `lexicon/candidates`) — model behind an injected boundary,
    structure-only, **paid walk deferred**
  - **S4** 🔨 5 SSE streams — **`focus-points` ✅ done (the pattern)**; **4 to go**: `preparation`, `bank`,
    `plan`, `evaluation`
- **Step 4 (mirrored integration/e2e test tree)** ⬜ not started.

## NEXT — finish S4 (4 streams), then cleanup, then Step 4
**Recommended order: `preparation` → `bank` → `evaluation` → `plan` (last, on its own — the riskiest).**
The streams vary a lot (this is why the locked plan says "one stream first, then the rest"):
| Stream | Notes |
|---|---|
| `preparation` | Uses `runStage`. **Also relocate the pure `buildPreparationInputs`** — the sessions service already imports it from `handlers/preparation.ts` for the preview (S1b). Move it to its final home (a co-located pure helper, like `notes-format.ts`) so the service stops importing a handler. Has a 409 "Focus points not ready" pre-check (keep that exact message). |
| `bank` | Uses `runStage`. Complex `produce`: scripted-lane (load persona → `scriptedQuestions`) vs live bank generation + queue assembly + reserved closer. 409 "focus points not ready" pre-check. |
| `evaluation` | Uses `runStage`. Plus a fire-and-forget `kickLexiconReview` side-effect. Imports `formatNotesForEvaluation` from `services/sessions/notes-format.ts` (already relocated in S2b). |
| `plan` | **THE BIG ONE — ~300 lines, does NOT use `runStage`.** Manages its own SSE: idempotent per-turn replay, back-nav snapshot capture, `planTurn`, agenda carry-forward, closer force-insert, seed overflow, filesystem turn logs. Give it its own pass + extra care. |

**Then — end-of-sessions cleanup:** relocate the pure view helpers still living in `sessions.ts`
(`snapshot`/`inferStage`/`summarizeAxes`) + `buildPreparationInputs` to their layered homes (one safe move,
not per-route). When done, **`handlers/` should hold ONLY `stream-helper.ts`** (a shared helper, not a route).
**Then Step 4** — the mirrored test tree.

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
1. `npm test` (currently **45/45 files**) · 2. `npm run typecheck` · 3. banned-construct grep on touched files.
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
