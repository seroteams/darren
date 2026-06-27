# Phase 004 — handover (for a fresh chat)

**Read this + [PLAN.md](PLAN.md) ("Current state" is the live log) + [sessions-subphase.md](sessions-subphase.md). Then continue.**

Date: 2026-06-28. Branch: `main`. Tree is clean — last commits:
`fa8ff571` (gate record) · `66e509f1` (S1a) · `910808c9` (S0).

## Where we are
Phase 004 = reshape the backend into clean layers (thin controller → service → co-located repo)
behind a versioned `/api/v1/`. **Behaviour-identical — structure only, no features.** ~**60% done**.

- **Step 1 (API contract)** ✅ · **Step 2 (shared plumbing)** ✅
- **Step 3 (convert every domain, TDD)** 🔨 — all **9 "safe" domains done + Carl-accepted**
  (catalog, role-lexicons, regression, pipeline, library, checks, arcs, lexicon, runs+suggest-fix).
  The risky **`sessions`** domain (live 1:1 runner, 21 routes) is mid-conversion via sub-passes S0–S4:
  - **S0** ✅ committed — the `SessionsRepo` storage seam + `createSessionsService` core.
  - **S1a** ✅ committed — 2 of 5 free reads converted: `GET /session` (snapshot) + `GET /lexicon/scope`.
    Live gate (`leak-devon`) PASSED after the refactor → no behaviour regression.
- **Step 4 (mirrored integration/e2e test tree)** ⬜ not started.

## ~~NEXT — S1b: the remaining 3 free reads~~ ✅ DONE 2026-06-28 (see PLAN.md "Current state" — awaiting Carl's walk). **NEXT is now S2 (non-AI writes).**
Converted these, **test-first**, one small seam each (they each pull in a 2nd store, unlike S1a):
| Route (legacy) | Old handler | Extra dependency |
|---|---|---|
| `GET /role-profile?s=` | `handlers/role-profile.ts` | role-profile cache read (`loadRoleProfile` + pure `effectiveTerminology`/`terminologyGroups`) |
| `GET /preview?s=` | `handlers/preview.ts` | prep assembler (`assemblePreparation(buildPreparationInputs(session))`, pure; 409 if focus points not ready) |
| `GET /question?s=` | `handlers/question.ts` | eligibility (pure) + **persist** (repo) + `appendEligibilityLog` (disk write side-effect) |

Then: **S2** non-AI writes · **S3** AI JSON routes (structure only, paid walk deferred) · **S4** SSE streams
(structure only, paid walk deferred) · **end-of-sessions cleanup** · **Step 4** test tree.

## How to work (non-negotiable)
- **Darren Method, one pass per walk.** Build a pass → self-verify free → commit → leave it walkable. Carl
  green-lights when he's back (he's authorised autonomous *building* on free checks for now).
- **TDD:** co-located `*.service.test.ts` written **before** the impl (red → green). New code is TS, strict.
- **Behaviour-identical:** legacy `/api/` aliases keep old status + success-body shape. v1 may use the
  shared error envelope `{error:{code,message}}`; legacy keeps `{error:string}` + same status. The admin
  branches on **status only** for these (verified in `admin/src/api.js`) — not-found body text was
  normalised to `Unknown session: <id>` and that's fine.
- **No banned constructs:** no `any` / `as` cast / `@ts-ignore` / non-null `!`.
- **Money — HARD STOP:** nothing that hits OpenAI without Carl's explicit per-run yes (~$0.35/case).
  Build AI routes with the model behind an injected boundary; **defer the paid walk** (like `suggest-fix`).

## The pattern to copy
- **Reference domain:** `backend/api/services/runs/` (repo = storage seam, service = logic throwing shared
  `HttpError` factories, controller = thin). Wiring lives in `backend/api/server.ts`.
- **Sessions specifics (decision D4):** v1 takes the id **in the path** (`/api/v1/sessions/:id/…`); legacy
  keeps `?s=`/body. `sessions.controller.ts` resolves `c.params.id || c.query.s`. See it for the pattern.
- **Pure view helpers** (`snapshot`/`inferStage`/`summarizeAxes`) still live in `sessions.ts` — the service
  imports them. **Relocate them to their layered home in ONE move during end-of-sessions cleanup**, not
  per-route (avoids repeatedly touching the critical store file).

## Verify each pass (all FREE)
1. `npm test` (currently **45/45**) · 2. `npm run typecheck` · 3. banned-construct grep on touched files.
4. **Byte-identical live diff ($0):** boot `API_PORT=3999 node backend/api/server.ts`, rehydrate a real
   on-disk session (ids are the `logs/<month>/<dir>` names, e.g. `2026_Jun02_21-31-d5ba01d7`), then
   `curl` the v1 path vs the legacy `?s=` route and `diff` — must be identical. Stop the server after.
   (Do NOT `node -e require` `scripts/gate.js` — it runs on import; invoke it as a script only.)
