# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.

---

## ▶ Your move

**Phase 004 · sessions S4 — `evaluation` stream is DONE** (4th of 5 streams), free-verified + committed.
Two ways forward, your call:
- **Say "go"** → I convert the **last** stream, `plan` (the big one — ~300 lines, manages its own SSE).
- **Walk the evaluation QA** (optional, costs one model call): finish a real 1:1 → the final briefing generates exactly as before. Structure is already proven free.

- Last updated: 2026-06-28
- Baseline: `npm test` → **46/46 passed** (free, offline) ✅

> Note: STATUS.md was pointing at the parked "Briefing readability P0" side-plan; I've repointed it to the
> plan we're actually building (Phase 004). The briefing plan is still scaffolded and waiting whenever you want it.

---

## Active plan: Backend API v1 (Prototype → Production · Phase 004)

📄 [docs/todo/backend-api-v1/PLAN.md](docs/todo/backend-api-v1/PLAN.md) · sub-plan [sessions-subphase.md](docs/todo/backend-api-v1/sessions-subphase.md)
**Goal:** reshape the backend into clean layers behind a versioned `/api/v1/` — controller → service → repo. Same behaviour, better structure.

We're deep in the final domain, **`sessions`** (the live 1:1 runner), converted in safe passes S0→S4. S0–S3 are ✅. We're in **S4 — the 5 SSE streams**, one stream per pass.

### S4 — SSE streams (one at a time)
- [x] `focus-points` stream ✅
- [x] `preparation` stream ✅
- [x] `bank` stream ✅
- [x] `evaluation` stream ✅ — **just landed** (controller `evaluationStream` + `kickLexiconReview`; legacy `/api/evaluation/stream` repointed + new v1 `/api/v1/sessions/:id/evaluation/stream`; handler deleted; manifest folded). `npm test` 46/46, typecheck clean, $0 boot-diff legacy==v1 byte-identical.
- [ ] `plan` stream ⬜ **next — the big one** (~300 lines, no `runStage`, manages its own SSE)

### After S4
- [ ] End-of-sessions cleanup — relocate `snapshot` / `inferStage` / `summarizeAxes` to their layered home
- [ ] **Step 4** — the mirrored integration/e2e test tree
- [ ] **Phase 004 owner-walk → green light** → then Phase 004 is ✅ and **Phase 005 can start** (not before)

> Paid walks for the AI streams (S3/S4) are **deferred** — structure is proven free; one live model call exercises
> each naturally during a real run, on your explicit go (covered by the $3 Phase-004 budget).

---

## How to read the boxes
`⬜ not started` · `🔨 in progress` · `✅ done (you tested + said go)`
A pass isn't ✅ until **you** walk its QA and green-light it — I never self-certify. Free-verified + committed means
the structure is proven offline and saved; the optional paid walk is yours to trigger.
