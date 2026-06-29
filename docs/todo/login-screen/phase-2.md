# Phase 2 — Re-point console data to the org (real isolation)

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 in progress (approach A chosen 2026-06-29)

## Goal
Switch the console off the shared pre-auth placeholder org and onto the logged-in company's fenced data, so two companies cannot see each other's sessions or runs in the UI.

## Verification result (2026-06-29) — the fence is NOT in place; bigger than "a small fix"
Read-only check done before any client change. Findings:
- **Generic v1 routes share the legacy controllers and are not org-fenced.** `runs.recent/finished/full/…`
  ([runs.controller.ts](../../../backend/api/services/runs/runs.controller.ts)) take **no identity** —
  they call `service.recent(...)` over the **file-based** run-history engine ([runs.repo.ts](../../../backend/api/services/runs/runs.repo.ts) → `fileRunsRepo` → `listRecentRuns`), which has **no org concept at all**. Every company would see every run.
- **Sessions are stamped with the placeholder org.** The pg session store hardcodes `DEFAULT_ORG_ID`
  ([sessions-store.ts:20](../../../backend/db/sessions-store.ts)); session reads resolve by id with no org-ownership check.
- **Only `/auth/me/runs` is truly fenced** — it derives `orgId` from the cookie and reads a **different,
  sparse** Postgres `runs` table ([org-data.repo.ts](../../../backend/api/services/auth/org-data.repo.ts): id/label/status/logDir) via `listMyRuns`. The console's runs UI needs far more than that table holds.
- **Conclusion:** a client path-swap alone gives **zero isolation**. Real backend work is required first, and
  there's a genuine design fork (below) on how the **file-based** run-history gets fenced. Flagged for Carl's
  direction before any code (engine-honesty + one-phase-at-a-time).

### Design fork for the runs store (needs Carl's pick)
- **A — tag file-runs with orgId + filter:** record the creating company's `orgId` in each run dir/manifest, then
  fence `listRecentRuns`/lookups by it. Keeps the rich file-based UI; touches the run-history engine + every runs read.
- **B — move runs onto the org-fenced Postgres `runs` table:** make the console read the already-fenced store, and
  enrich that table to carry what the UI shows. Cleaner long-term, larger migration of the runs UI.
- **C — minimal sessions-only fence this phase:** fence sessions by real `orgId` now (stamp on create, check on read),
  and defer runs-history fencing to its own phase. Smaller, honest, but leaves runs cross-visible until then.

## Chosen approach: **A — tag file-runs by company** (Carl, 2026-06-29)
Keep today's rich file-based runs UI; record the creating company's `orgId` on each run and fence every
runs read by it. Sub-steps (test-first, in order):
1. **Stamp the real `orgId` on session creation** — thread the request identity's `orgId` into
   `sessions.start`, store it on the session state (so it serializes to `session-state.json` on disk **and**
   the PG `sessions.orgId` column, replacing the hardcoded `DEFAULT_ORG_ID`). Anonymous/legacy → `DEFAULT`.
2. **Fence the run-history engine by `orgId`** — add **optional** `orgId` filtering to
   [run-history.ts](../../../backend/engine/run-history.ts) (`walkRuns`/`listRecent`/`listFinished`/`findRunDir`/`summarize`/`compare`/`readRunStages`/`delete`/`setArchived`): when an `orgId` is given, only runs whose `state.orgId` matches are visible, and a by-id read of another org's run returns `null` → 404. No `orgId` = unfiltered, so CLI/gate/replay are untouched.
3. **Thread `orgId` through the runs + sessions controllers** — build identity from the cookie and pass `orgId`
   down on the **v1** routes. Legacy `/api/` routes stay pinned to `DEFAULT` (the client is leaving them).
4. **Migrate the client** to the org-fenced v1 routes (below).
5. **Prove the wall offline** — pure isolation tests (mirroring `listMyRuns`' test): company A can't list or
   open company B's runs/sessions. `npm test` + `npm run typecheck` green before Carl's QA walk.

### Step 4 detail — client migration
- **Migrate the client** — rewrite each [admin/src/api.js](../../../admin/src/api.js) data function from the legacy `/api/` shape to the v1 shape. Main mechanical change: **id-in-path** instead of `?s=<id>` / body `sessionId`:
  - `startSession` → `POST /api/v1/sessions`
  - `getSession`/`getQuestion`/`getRoleProfile`/`suggestAnswers`/`getStagePreview` → `GET /api/v1/sessions/:id/…`
  - `submitAnswer`/`goBack`/`postNote`/`setAgendaCovered`/`setSelectedFocus`/`postVerdict`/lexicon decisions → `POST /api/v1/sessions/:id/…`
  - SSE streams (`focus-points`/`plan`/`bank`/`evaluation`/`preparation`) → `GET /api/v1/sessions/:id/<name>/stream`
  - runs history/overview/full/stages/review/archive/delete → `/api/v1/runs/…`
  - arcs, role-lexicons, regression, pipeline, suggest-fix, library → their `/api/v1/` paths
  Update call sites where a signature changes (id now a path segment).

## Not in this phase
- No new features on the v1 endpoints beyond what's needed for parity with today's console.
- Org-name display stays parked.

## Done when
- [ ] `npm test` and `npm run typecheck` green.
- [ ] The two-company isolation walk below passes live.
- [ ] Product owner has tested the scenarios and said go.

## Test scenarios — for the product owner
Walk these yourself. Phase closes on your green light.
1. **Company A runs** — log in as Company A, run/save a session. ❌ Not OK if the session won't start or save.
2. **Company B runs** — register Company B, run a session. ❌ Not OK if it errors.
3. **A is fenced** — back as Company A, look at recent runs. You should see only A's. ❌ Not OK if B's runs show.
4. **B is fenced** — as Company B, look at recent runs. You should see only B's. ❌ Not OK if A's runs show.
5. **No cross-open** — as A, try to open one of B's runs by id. You should be refused / not-found. ❌ Not OK if it opens.
