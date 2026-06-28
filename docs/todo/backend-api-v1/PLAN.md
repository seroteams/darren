# Backend API v1 (Prototype → Production · Phase 004)

**Goal:** Reshape the backend into clean layers behind a **versioned API** — slim controller →
service → co-located repo — so it can grow without becoming spaghetti. **The product does exactly
what it does today;** this is structure, not features.
**Driver:** Carl
**Created:** 2026-06-27
**Tracks:** the bigger plan in
[../../prototype-to-production/004-backend-api-scaffold/00-phase-overview.md](../../prototype-to-production/004-backend-api-scaffold/00-phase-overview.md).
When this is done + approved, update that effort's `PROGRESS.md` (Phase 004 → `done`).

## Done means
- Every route lives under **`/api/v1/`** and follows the REST verb/status conventions.
- The layers are real: **controllers are thin** (HTTP in/out), **services hold the logic** (never
  touch req/res), **repos own data access** (file-backed now, swappable later).
- **Each service's test is committed _before_ its implementation** (TDD red → green).
- Tests **mirror the system** — unit beside the code, integration/e2e in a `tests/` tree shaped like
  the domains. Not one flat folder.
- `npm test` green; the app + CLI behave **identically** to before.
- **Owner-walked:** Carl can describe swapping a repo's storage with no logic change, and the routes
  respond in the contracted shape.

**Out of scope (park it):** no real auth yet (just the slot), no database yet (keep current
file storage behind the repo seam), no new product features, no UI redesign. Structure only.

## The steps
| # | Step | What it lands | Status |
|---|---|---|---|
| 1 | **Draw the menu of services** | The written `/api/v1/` contract — every route, request + response shape, the error format, the identity/auth slot. Decisions D1–D5 locked. | ✅ |
| 2 | Build the shared plumbing | Middleware every request flows through: one error shape, request/identity context, an auth placeholder slot. `npm test` covers the error shape. | ✅ |
| 3 | Build each service in clean layers (TDD) | Per-domain controller → service → repo, **test-first**. Repos file-backed; storage swappable without touching the service. | ⬜ |
| 4 | Lay out the mirrored test rooms | Unit tests beside the code; integration/e2e in a `tests/` tree shaped like the domains. | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested + Carl-approved)

> Detailed `phase-2/3/4.md` step files (each ending in owner QA scenarios) get written **after** Carl
> approves the step-1 contract — same as Phase 003, so we don't guess the shape before the menu is locked.

## Current state

> ### ✅ 2026-06-28 — `sessions` **S1b DONE** (the remaining 3 free reads) — **Carl walked + approved** ("Yes — passed"); code committed `0e0bcf21`. **➡️ NEXT: S2 (non-AI writes, `start` leads).**
> Converted the last 3 of S1's 5 free reads — each pulls a 2nd store, unlike S1a — into the sessions
> service/controller, **test-first** (red → green):
> - `services/sessions/sessions.repo.ts` — broadened the seam from "the session record" to **the sessions
>   domain's data access**: added `loadRoleProfile(ctx)` (role-profile cache read) and
>   `appendEligibilityLog(dir, entries)` (per-session eligibility-log write, owns the filename). Storage
>   only; pure derivations still live in the service.
> - `services/sessions/sessions.service.ts` — added `roleProfile(id)` (seam read → pure
>   `effectiveTerminology`/`terminologyGroups`), `preview(id, stage?)` (resolve stage via pure `inferStage`
>   → a `PREVIEW_ASSEMBLERS` map; `PREPARATION` reuses `assemblePreparation(buildPreparationInputs(session))`
>   so the preview can't drift from what gets sent; throws shared `conflict` 409 when focus points aren't
>   ready), and `question(id)` (the serve-time eligibility gate — scripted = log-only, else
>   `dropIneligibleHeads` → `appendEligibilityLog` + `persist` through the seam — then the next-question /
>   done payload). All resolve via the S0 `require` (unknown id → shared 404).
> - `services/sessions/sessions.controller.ts` — 3 thin handlers; same `c.params.id || c.query.s` id resolve.
> - `sessions.service.test.ts` — **+11 cases (22 total)**: roleProfile (null / cached-doc / 404), preview
>   (unsupported stage / 409 not-ready / 404), question (next / reject→log+persist / scripted log-only /
>   done / 404). Zero disk, zero model (the doc fixture is crafted so `effectiveTerminology` reads no overlay).
> - **Wiring (`server.ts`):** v1 `GET /api/v1/sessions/:id/{role-profile,question,preview}` (v1Route, one
>   error shape) + legacy `/api/role-profile`, `/api/question`, `/api/preview` aliases on the same
>   controller (old `?s=`/`&stage=` shape — admin unaffected). Removed the 3 orphaned handlers
>   (`handlers/role-profile.ts`, `preview.ts`, `question.ts`).
> - **Fingerprint-manifest call (flag):** `handlers/question.ts` was the only converted handler tracked in
>   `pipeline-lock.ts` `PATH_META` (tier engine, the serve-time gate). Deleting it would silently drop that
>   logic from drift-tracking, so I **repointed it**: removed the `question.ts` entry and added
>   `backend/api/services/sessions/sessions.service.ts` (tier engine, label "Sessions"). The gate stays
>   tracked at its new home, and every future S2–S4 conversion's logic is now auto-covered (no further
>   manifest churn). This changes the pipeline-lock **engine hash** for new runs — accurate (the engine code
>   really did move), same kind of churn S1a already caused by editing `lexicon.ts`. Tell me if you'd rather
>   I'd kept finer per-route labels.
> - **Behaviour notes (flags):** the 200 success bodies are **byte-identical** (verified live, incl.
>   preview's real prep-payload). `question`/`preview` 404s were already `Unknown session: <id>` (via
>   `requireSession`) → identical. `role-profile`'s 404 body **normalises** from `session not found` to
>   `Unknown session: <id>`, and a *missing* id now 404s instead of 400 — both safe and the same accepted
>   S1a normalisation (admin's `getRoleProfile` only ever sends `?s=` and isn't the body; `getStagePreview`
>   branches on status 404/409 only). v1 error paths use the shared envelope, legacy stays flat `{error}`.
> - **Helper-relocation call (flag):** the service imports the pure `buildPreparationInputs` from
>   `handlers/preparation.ts` (a backwards-ish import). It relocates to its layered home when **preparation
>   converts in S4** — same "relocate in one move at end-of-sessions cleanup" rule as `snapshot`/`inferStage`.
> - **Verified (free):** `npm test` **45/45 files** (sessions file +11 cases), typecheck clean,
>   banned-construct grep clean. **Live boot diff (free, $0 — no model):** booted :3999, rehydrated real
>   on-disk sessions — `role-profile` / `question` / `preview` all **byte-identical** legacy-vs-v1 at 200
>   (BRIEFING `supported:false` *and* a PREPARATION session's full prep-payload); unknown id → **both 404**
>   (legacy flat, v1 enveloped). No model call needed.
>
> **S1b QA (walk for sign-off):** open a live run at the prep stage → the "language of this role" terminology
> (`GET /api/role-profile?s=…`), the current question (`GET /api/question?s=…`), and the prompt preview
> (`GET /api/preview?s=…`) all read exactly as before; nothing in the runner UI changes.
>
> **Remaining sessions passes:** **S2** non-AI writes (`start` leads) · **S3** AI JSON (structure free,
> paid walk deferred) · **S4** SSE streams (structure free, paid walk deferred) · end-of-sessions cleanup
> (relocate `snapshot`/`inferStage`/`summarizeAxes` + `buildPreparationInputs`; reconcile remaining manifest
> handler entries) · **Step 4** mirrored test tree.

> ### ✅ 2026-06-28 — live regression gate **PASSED** after the step-3 refactor (Carl-approved paid run)
> Ran one live gate case to confirm the whole Phase 004 step-3 layering (8 domains + sessions S0/S1a)
> didn't change live behaviour: `node scripts/gate.js --only leak-devon` → **PASS (1 ok / 0 regressed /
> 0 error)** ([result](../../../logs/gate/2026-06-27T17-49-36-023Z/result.json)). ~$0.35, on Carl's
> explicit go. The refactor is behaviour-identical end-to-end, not just in unit tests.
>
> ### ✅ 2026-06-28 — `sessions` **S1a DONE** (2 of 5 free reads) — Carl approved ("go for it") + committed `66e509f1`
> S0 committed (`910808c9`) on Carl's green light ("happy, keep moving"). Started S1 with the two reads
> that touch **only session state** (so they need nothing but the S0 seam) — the cleanest proof the seam
> drives real routes. Built **test-first** (red → green):
> - `services/sessions/sessions.service.ts` — added `getSnapshot(id)` (resolve via seam → pure `snapshot`)
>   and `lexiconScope(id)` (→ pure `shouldReview(ctx)`). Both reuse the S0 `require` (unknown id → 404).
> - `services/sessions/sessions.controller.ts` (new, thin) — resolves the id from `c.params.id` (v1 path)
>   **or** `c.query.s` (legacy), then calls the service. This id-resolution is the only wiring delta vs the
>   other domains (decision D4).
> - `sessions.service.test.ts` — +4 cases (11 total): snapshot/scope resolve through a fake store and
>   throw 404 for unknown ids. Zero disk, zero model.
> - **Wiring (`server.ts`):** v1 `GET /api/v1/sessions/:id` + `/api/v1/sessions/:id/lexicon/scope`
>   (v1Route, one error shape) + legacy `/api/session` & `/api/lexicon/scope` aliases on the same
>   controller (old `?s=` shape — admin unaffected). Retired the orphaned `handlers/rehydrate.ts`; dropped
>   `scope` from `handlers/lexicon.ts` (its `candidates`/`decisions` stay for S3).
> - **Behaviour note (flag):** the 200 success bodies are **byte-identical**. The not-found path stays
>   **404** but its body text normalises to the shared `Unknown session: <id>` (was `unknown session` /
>   `session not found`), and a *missing* id on legacy now 404s instead of 400. Both are **safe**: the admin
>   branches on these endpoints by **status only** (verified in `admin/src/api.js` — `getSession`/
>   `getLexiconScope` map any 404 → null/`{eligible:false}`), and it always sends `?s=`, so the 400 path is
>   unreachable. Same spirit as the earlier free renames.
> - **Helper-relocation call (flag):** I did **not** move `snapshot`/`inferStage`/`summarizeAxes` out of
>   `sessions.ts` yet — the service imports them. To avoid touching the critical store file once per route,
>   they relocate to their final layered home in **one safe move during the end-of-sessions cleanup** (when
>   no legacy handler imports them). Lower-risk than the per-route move I floated at S0.
> - **Verified (free):** `npm test` **45/45**, typecheck clean, banned-construct grep clean. Only the
>   `services/sessions/` folder + 3 small `server.ts`/`lexicon.ts` edits changed.
> - **Live boot diff (free, $0 — no model call):** booted the API on :3999, rehydrated a real on-disk
>   session (`2026_Jun02_21-31-d5ba01d7`). Legacy vs v1 **byte-identical** for both the snapshot and the
>   scope (`{eligible:false}`); unknown id → **both 404** (legacy flat `{error}`, v1 shared `{error:{code}}`).
>   Carl OK'd paid runs but none was needed — these reads don't touch the model.
> - **Remaining S1 reads:** `role-profile`, `preview`, `question` — each pulls in a 2nd store (role-profile
>   cache / prep assembler / eligibility-log write), so each gets its own small seam next. **Not committed —
>   awaiting your S1a walk.**
>
> **S1a QA (walk before commit):** open a live run → the snapshot (stage, axes, notes, agenda — `GET
> /api/session?s=…`) reads exactly as before; the lexicon eligibility (`GET /api/lexicon/scope?s=…`) reads
> as before (e.g. bi-weekly/feels-off → not eligible). Nothing in the runner UI changes.
>
> ### ✅ 2026-06-28 — `sessions` **S0 DONE** (the session-store seam) — Carl approved ("happy, keep moving") + committed `910808c9`
> First sub-pass of the `sessions` domain. **No routes moved** — the seam is defined so S1–S4 convert
> against a stable boundary. Built **test-first** (red → green):
> - `services/sessions/sessions.repo.ts` — the **`SessionsRepo`** storage seam (`get` / `create` / `drop`
>   / `persist`), `fileSessionsRepo` delegating to the existing `sessions.ts` store. A DB/Redis store can
>   replace it without touching a service.
> - `services/sessions/sessions.service.ts` — `createSessionsService(repo)` exposing the shared
>   session-resolution core (`get` / `require` / `create` / `drop` / `persist`). `require` is the layered
>   home of the old `requireSession`: unknown id → shared `notFound`, **message kept verbatim**
>   (`Unknown session: <id>`) so the legacy alias stays byte-identical when its route converts.
> - `services/sessions/sessions.service.test.ts` written **first** (7 cases, in-memory fake store) — proves
>   the swap: get/require(404)/create/drop/persist all drive through the seam with zero disk, zero model.
> - **Design call (flag for Carl):** the seam is **storage-only**. The shared *pure derivations*
>   (`snapshot` / `inferStage` / `summarizeAxes`) compute a view from a Session and touch no storage, so
>   they are **not** on the repo — they move into the service alongside their routes in S1
>   (`snapshot`→rehydrate, `inferStage`→preview). Keeps "repos own data access" honest. The sub-phase plan
>   listed `inferStage` under the seam; this realises the same intent one layer up. Tell me if you'd rather
>   bundle them onto the repo.
> - **Verified (free):** `npm test` **45/45** (+1 new file), typecheck clean, banned-construct grep clean.
>   `git status` shows only the new `services/sessions/` folder — `server.ts`, handlers, and `sessions.ts`
>   untouched, so the app + admin behave **identically** (the seam is unused until S1).
> - **Not committed — awaiting your S0 walk** (QA shape §F: "describe swapping the session store with a
>   fake — seam holds, no route behaviour changes"). On your green light I commit, then start **S1 (free
>   reads)**.
>
> ### 🔨 2026-06-27 — `sessions` sub-phase **PLANNED**, decisions locked (Carl)
> Carl chose **plan-first** for the risky `sessions` domain. Wrote
> [sessions-subphase.md](sessions-subphase.md): slices the 21 routes into **S0 → S4** (session-store
> seam first, then free reads → non-AI writes → AI JSON → SSE streams), safest-first, one pass per walk.
> **Decisions locked:** (1) v1 sessions take **id IN THE PATH** (`/api/v1/sessions/:id/…`, the contract's
> D4) — legacy `?s=`/body routes stay as-is so the admin is unaffected; the controller resolves the id
> from path (v1) or query/body (legacy). (2) **one pass per walk.** **Next: S0** — design the session-
> store seam + fakes (no routes moved), then walk. Awaiting Carl's go on S0.
>
> ### 🔨 2026-06-27 — STEP 3 — **safe set COMPLETE** (8 domains + suggest-fix), **Carl-accepted** ("move to next stage")
> **runs Pass B (`suggest-fix`)** done test-first + behaviour-identical, accepted on the free checks
> (its live, paid walk is deferred — see note):
> - `services/suggest-fix/` — `suggest-fix.repo.ts` (file reads: run dir + `session-state.json` + the
>   stage's prompt/response) → `suggest-fix.service.ts` (the 400/404/409 gates + input assembly, with the
>   **AI call as an injected `runFix` boundary**, 502 on failure) → `suggest-fix.controller.ts` (thin;
>   wires the engine fixer into the boundary). Co-located test written **first** (7 cases) exercises every
>   gate + the assembly **with zero disk and zero model calls**.
> - **Wiring:** v1 `POST /api/v1/suggest-fix` (v1Route, throws forbidden) + legacy `/api/suggest-fix`
>   alias. v1 mirrors today's path (runId in body; the contract's `/runs/:id/suggest-fix` is deferred
>   polish). Removed the orphaned `handlers/suggest-fix.ts`. 502 stays honest on legacy, masked on v1.
> - **Verified (free):** `npm test` **44/44**, typecheck clean, banned-construct grep clean.
> - **⚠️ Live walk deferred (money):** suggest-fix is the one runs route that calls the model. Structure
>   is proven free (unit tests + typecheck); exercising it end-to-end is **one fixer call (~$0.35)** — walk
>   it naturally next time a run is reviewed. No paid run without Carl's explicit yes.
>
> **All 8 safe domains + suggest-fix are now in clean layers** (catalog, role-lexicons, regression,
> pipeline, library, checks, arcs, lexicon, runs). The only handlers left in `backend/api/handlers/` are
> the **live `sessions` pipeline** (21 routes — start/answer/back, the 5 SSE streams, notes, verdict,
> per-session lexicon, preview, role-profile, rehydrate). **STOPPED here for Carl's steer on how to
> approach `sessions`** — it holds live in-memory state and is the heart of the product, so it gets its
> own sub-phase plan, not a quick pass. Step 4 (mirrored test tree) still follows.
>
> ### 🔨 2026-06-27 — STEP 3 IN PROGRESS — runs **Pass A** layered (8 of 9 routes), **Carl-approved**
> `runs` is the big domain (9 routes across 3 handler files) and one route (`suggest-fix`) calls the AI,
> so it's split: **Pass A = the 8 free, file-backed routes** (recent, finished, overview, full, stages,
> delete, archive, review). **Pass B = `suggest-fix`** (next — the AI route, model call as an injected
> boundary). Pass A done test-first + behaviour-identical, **Carl-approved** ("yes"):
> - `services/runs/` — `runs.repo.ts` (seam over the run-history engine + the `review.json` sidecar) →
>   `runs.service.ts` (logic: limit clamp + 6-field map, not-found gates, the full Run-Review marks
>   schema / note cap / `createdAt`-preserve / write-fail→honest-500) → `runs.controller.ts` (thin, 8
>   handlers). Co-located `runs.service.test.ts` written **first** (18 cases, fake repo).
> - **Wiring:** v1 `/api/v1/runs/*` via v1Route (mutating throw forbidden) + legacy `/api/runs/*` aliases
>   on the same controller. v1 **mirrors today's paths** (the contract's bare `/runs/:id` + `?status=`
>   merge are deferred polish; mirroring also dodges a `recent`-vs-`:id` route collision). The new
>   controller's `review` absorbed `review.ts`, so **both** orphaned handlers removed (`runs.ts`,
>   `review.ts`). A `review.json` write failure stays a 500 with its real message on legacy, masked on v1.
> - **Verified (free):** `npm test` **43/43**, typecheck clean, banned-construct grep clean.
> Now **43/43**. **Remaining: runs Pass B (`suggest-fix`).** Then the safe set is done → **STOP before the
> live `sessions` pipeline.**
>
> ### 🔨 2026-06-27 — STEP 3 IN PROGRESS — 8 of 9 safe domains layered (+ lexicon)
> **lexicon** (global word-promotion) done test-first + behaviour-identical, **Carl-approved**
> ("lets keep going"). A **partial extraction**: `handlers/lexicon.ts` held 5 handlers — only the 2
> global-promotion ones (`promotePending`/`promoteApply`) were the standalone `lexicon` domain; the 3
> per-session ones (`candidates`/`scope`/`decisions`, which hit `getSession` + the AI reviewer) **stay in
> the handler for the `sessions` phase**.
> - `services/lexicon/` — `lexicon.repo.ts` (seam over the promote-core engine) → `lexicon.service.ts`
>   (count + coerce + `{ ok, … }` wrap, storage-agnostic) → `lexicon.controller.ts` (thin). Co-located
>   `lexicon.service.test.ts` written **first** (3 cases, fake repo).
> - **Wiring:** v1 `GET /api/v1/lexicon/promotions/pending` + `POST /api/v1/lexicon/promotions`
>   (v1Route; POST throws forbidden) + legacy `/api/lexicon/promote/pending` + `/promote` aliases on the
>   new controller. v1 **nounifies** the collection (`promote`→`promotions`) — a shape-neutral free rename
>   (the contract's path), legacy unchanged so admin is unaffected. Trimmed the 2 orphaned fns + their
>   unused import from the handler.
> - **Verified (free):** `npm test` **42/42**, typecheck clean, banned-construct grep clean.
> Now **42/42**. **Remaining safe (1):** `runs`. **Then STOP before the live `sessions` pipeline.**
>
> ### 🔨 2026-06-27 — STEP 3 IN PROGRESS — 7 of 9 safe domains layered (+ arcs)
> **arcs** done test-first + behaviour-identical + `npm test` green, **Carl-approved** ("go for it"):
> - `services/arcs/` — `arcs.repo.ts` (the storage seam: type registry + arc-overlay engine —
>   `writeOverlay`/`removeOverlay`/`hasOverlay`/`diffStageIds`) → `arcs.service.ts` (all logic: serialise,
>   normalise, validate, the **orphan-confirm** decision; throws the shared `HttpError` factories, never
>   touches req/res or files) → `arcs.controller.ts` (thin). Co-located `arcs.service.test.ts` written
>   **first** (11 cases, fake repo) proves the logic runs with zero storage.
> - **Wiring:** v1 `GET /api/v1/arcs`, `POST /api/v1/arcs/:slug`, `POST /api/v1/arcs/:slug/reset`
>   (v1Route; mutating ones `throw forbidden`) + legacy `/api/arcs…` aliases on the same controller (old
>   shape). Removed the orphaned `handlers/arcs.ts`. v1 keeps today's POST verb (the contract's PATCH is
>   deferred polish, same call as role-lexicons).
> - **Verified (free):** `npm test` **41/41**, typecheck clean, banned-construct grep clean.
> Now **41/41**. **Remaining safe (2):** `lexicon`, `runs`. **Then stop before the live `sessions` pipeline.**
>
> ### 🔨 2026-06-27 — STEP 3 IN PROGRESS — 6 of 9 safe domains layered
> Added since the 3-domain mark, each test-first + behaviour-identical + `npm test` green:
> - **pipeline** (`043dc9b6`) — status branching behind a repo; fake repo exercises all 3 branches.
> - **library** (`c90730c8`) — pure path logic (incl. the traversal guard, now unit-tested) + fs repo;
>   file server, so no v1Route (manages its own responses).
> - **checks** (`ce2665d9`) — relocated the already-layered pair into `services/checks/` (git mv).
> Now **40/40** tests, typecheck clean. **Remaining safe (the bigger 3):** `arcs`, `lexicon`, `runs`.
> Then **stop before the live `sessions` pipeline**. The v1 URL-shape policy (mirror legacy under
> `/api/v1/`, defer REST polish) still stands.
>
> ### 🔨 2026-06-27 — STEP 3 IN PROGRESS — 3 of 9 safe domains layered (catalog, role-lexicons, regression)
> Carl approved the catalog pattern and said "go for it." Done + committed, each test-first +
> behaviour-identical + `npm test` green at each:
> - **catalog** (`9060123f`) — meeting-types + personas; repo seam proven via in-memory fake.
> - **role-lexicons** (`7de91fd8`) — list/add/remove over the role-profile engine (repo seam).
> - **regression** (`6eb200b6`) — compute-only; injected suite runner is the seam (no repo).
> Now 38/38 tests, typecheck clean. **Remaining safe:** `pipeline`, `library`, `checks` (relocate the
> already-layered pair), `arcs`, `lexicon`, `runs`. **Then stop before the live `sessions` pipeline.**
>
> **⚠️ Policy call I'm making (flag for Carl) — v1 URL shape:** to stay behaviour-identical and surgical,
> v1 routes **mirror the legacy request/response shapes under the `/api/v1/` prefix** (with free renames
> like `persona-bench` → `personas`). The contract's fuller REST polish — key-in-path
> (`/role-lexicons/:key/terms`), `DELETE` verbs, merging collections (`/runs?status=`) — **changes request
> shapes and adds dual-controller code for v1 routes nothing calls yet**, so I'm **deferring it** to a
> dedicated polish pass (its own decision at the phase walk). Tell me if you'd rather I do the full REST
> shapes now. The **layering** (the hard part) is identical either way, so this isn't rework.
>
> ### 🔨 2026-06-27 — catalog domain layered (proof of pattern)
> First domain converted to clean layers (decision D5), **test-first** (red → green):
> `backend/api/services/catalog/` — `catalog.repo.ts` (file storage, behind a `CatalogRepo`
> interface) → `catalog.service.ts` (`createCatalogService(repo)` — sort + meetingTypeIndex logic, never
> touches req/res or storage) → `catalog.controller.ts` (thin: call service, `c.json`). Plus
> `middleware/v1-route.ts` — wraps a controller so v1 errors use the one shape; legacy routes keep the old
> shape (D2). Co-located tests written **before** the code: `catalog.service.test.ts` (proves the
> **swap-storage seam** — an in-memory fake repo, zero service change) + `v1-route.test.ts`.
> - **Wiring (server.ts):** `GET /api/v1/meeting-types`, `GET /api/v1/personas` (v1 error shape) + the
>   legacy `/api/meeting-types`, `/api/persona-bench` aliases on the same controller (D1). Removed the two
>   now-orphaned handlers (`handlers/meeting-types.ts`, `handlers/persona-bench.ts` — only server.ts used them).
> - **Verified (free):** `npm test` **36/36**, `npm run typecheck` clean. Live boot on :3999 → v1 and legacy
>   responses **byte-identical** to before (diff clean for both meeting-types and personas).
> - **Not committed yet — awaiting your walk.** Then I continue step 3 domain by domain; I'll **stop again
>   before the live `sessions` pipeline** (the risky one).
>
> ### ✅ 2026-06-27 — STEP 2 DONE (shared plumbing) — Carl approved ("then lets go") + committed
> Carl walked the free checks and approved. Committed locally.
>
> ### 🔨 2026-06-27 — STEP 2 BUILT (shared plumbing) test-first
> New layer `backend/api/middleware/` (decision D5), built **test-first** (red → green):
> - **`http-error.ts`** — the one error shape `{ error: { code, message, details? } }`: an `HttpError`
>   class, `toErrorBody()`/`errorStatus()` (also map the existing `Object.assign(new Error,{status})`
>   throws to a code), and lean factory helpers (`badRequest`/`notFound`/`validationFailed`/…). 5xx are
>   masked to a generic message — the raw error is logged, never sent (engine honesty).
> - **`request-context.ts`** — `RequestIdentity { userId, orgId, roles }` + `anonymousIdentity()` +
>   `buildIdentity(req)` (anonymous now — the shape Phase 006's login check fills in).
> - **`require-auth.ts`** — the no-op login-check **slot** (never rejects in Phase 004).
> - Co-located tests `http-error.test.ts` + `request-context.test.ts` (`node:test`), written **before**
>   the code. Extended `scripts/run-tests.js` to discover co-located `backend/**/*.test.ts` so `npm test`
>   covers them (this also picked up the orphaned `clamp.test.ts`).
> - **Verified (free):** `npm test` **34/34** (was 31; +clamp +2 new), `npm run typecheck` clean, no
>   banned constructs (`any`/`as`/`@ts-ignore`/`!`). **Not committed yet — awaiting your walk.**
> - **Not touched:** the live router/handlers still emit the legacy `{ error: string }` shape; v1 routes
>   adopt `toErrorBody` in step 3 (keeps the admin unbroken — decision D2).
>
> **➡️ NEXT after your sign-off:** commit step 2, then step 3 — convert the first small domain
> (catalog or the existing `checks` pair) to controller → service → repo, test-first.
>
> ### ✅ 2026-06-27 — STEP 1 DONE (the service menu) — decisions D1–D5 locked by Carl ("choose the best")
> Carl delegated the five open decisions; I took the recommended low-risk/behaviour-identical option on
> each (D1 alias · D2 leave bodies · D3 pragmatic REST · D4 id-in-path · D5 services/ + middleware/ tree).
> The contract is now final and committed. **➡️ NEXT:** step 2 — build the shared plumbing (one error
> shape + request/identity context + no-op auth slot) **test-first**. Awaiting Carl's go before writing code.
>
> ### 🔨 2026-06-27 — STEP 1 DRAFTED (the service menu)
> Baseline before any work: **`npm test` 31/31 green** (free/offline). Note this is 31, not the 30/30
> in older docs — the untracked `checks` handler/service WIP (left over from Phase 003 sign-off) adds
> `test-checks-service.js`. Flagged, not folded in (see "Pre-existing in the tree" below).
>
> Wrote the **service menu / API contract** for review — no code touched:
> **[api-contract.md](api-contract.md)**. It covers: the `/api/v1/` versioning scheme, the one error
> shape, the success-response convention, the identity/context + auth slot, the **9 service domains**,
> and a route-by-route **current → v1** map (all 38 routes) with request/response shapes.
> **Five decisions need Carl's call** — listed at the top of the contract (versioning cutover vs alias,
> success envelope, how strict to push REST onto the SSE/RPC pipeline routes, session-id in path vs
> query, and where the new code lives). **Nothing is built until Carl approves the menu.**
>
> **➡️ NEXT:** Carl reviews [api-contract.md](api-contract.md) and answers the five decisions. Then I
> write the detailed phase-2/3/4 step files and start step 2 (shared plumbing) test-first.

## Pre-existing in the tree (flagged, not touched)
- **`checks` handler/service** — `backend/api/handlers/checks.ts`, `checks.service.ts`,
  `scripts/test-checks-service.js` are now **tracked/committed** (the auto-commit automation landed them
  since the session-start snapshot — the earlier "untracked" note was stale). They're a thin
  **controller → service** example for the Tasks-board "run free checks" button and happen to model the
  exact layering this phase wants — a natural first candidate to slot into the v1 structure in step 3.
- Other untracked/working-tree changes (admin stages, `content/questions/` artifacts, etc.) are
  unrelated to this phase — untouched.

## Parked
- Migrating the ~52 admin call-sites off the legacy `/api/` paths and removing the compat alias →
  a follow-up once v1 is in place (see decision D1 in the contract).
- Committing the pre-existing `checks` WIP as its own change → Carl's call.
