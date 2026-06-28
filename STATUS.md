# STATUS — where we are right now

**This is the live tracker for the phase plan we're actively working through.**
One place. Always current. I update it the moment a phase starts or gets your green light — you never have to ask.
For the big-picture feature board, see [SERO_BOARD.md](SERO_BOARD.md). For full detail, open the plan linked below.

---

## ▶ Your move

**Phase 004 is BUILT — every build step + the test tree are done and free-verified.** All 21 sessions routes are
in clean layers (S0→S4), the shared derivations are relocated, and the mirrored integration test tree is in place.
`backend/api/handlers/` now holds only the shared `stream-helper.ts`. The app behaves identically (proven by 46/46
tests + $0 byte-identical boot-diffs on every pass).

**The one remaining gate is yours — the owner-walk.** I don't self-certify a phase done. To sign off Phase 004:
- **Walk the QA** (free parts): start a 1:1, drive a turn, step back, save a note, finish to a briefing — everything
  reads/persists exactly as before. And the architecture check: you can describe swapping a repo's storage (the
  `SessionsRepo` seam) with no service logic change.
- **Optional, paid:** the S3/S4 AI walks (suggest-answers, the live streams) each cost one model call — exercised
  naturally during a real run, on your explicit go (within the $3 Phase-004 budget).
- **Say "approved"** → I tick the phase ✅, flip the build-plan badge to done, move the folder to `docs/todo/done/`,
  update the Prototype→Production `PROGRESS.md` (004 → done), and **Phase 005 opens.**

- Last updated: 2026-06-28
- Baseline / final: `npm test` → **46/46 passed** (free, offline) ✅ · typecheck clean

> Note: STATUS.md was pointing at the parked "Briefing readability P0" side-plan; I've repointed it to the
> plan we're actually building (Phase 004). The briefing plan is still scaffolded and waiting whenever you want it.

---

## Active plan: Backend API v1 (Prototype → Production · Phase 004)

📄 [docs/todo/backend-api-v1/PLAN.md](docs/todo/backend-api-v1/PLAN.md) · sub-plan [sessions-subphase.md](docs/todo/backend-api-v1/sessions-subphase.md)
**Goal:** reshape the backend into clean layers behind a versioned `/api/v1/` — controller → service → repo. Same behaviour, better structure.

The final domain, **`sessions`** (the live 1:1 runner), was converted in safe passes S0→S4 — all done.

### The full build — all done, free-verified, committed
- [x] **Step 1** — the `/api/v1/` service contract (decisions D1–D5 locked) ✅
- [x] **Step 2** — shared plumbing (one error shape, request/identity, auth slot) ✅
- [x] **Step 3** — 8 safe domains + `runs` + `suggest-fix` layered ✅
- [x] **Step 3 · sessions** S0 seam → S1 reads → S2 writes → S3 AI JSON → S4 streams ✅
  - [x] S4 streams: `focus-points` · `preparation` · `bank` · `evaluation` · `plan` (the big one) ✅
- [x] **Cleanup** — `snapshot` / `inferStage` / `summarizeAxes` relocated to `session-views.ts` ✅
- [x] **Step 4** — mirrored integration test tree (`backend/tests/<domain>/`) ✅
- [ ] **Phase 004 owner-walk → "approved"** → then ✅, folder moves to `done/`, PROGRESS.md → done, **Phase 005 opens**

> Paid walks for the AI routes (S3/S4) are **deferred** — structure is proven free; one live model call exercises
> each naturally during a real run, on your explicit go (covered by the $3 Phase-004 budget).
> Build-plan badge (`admin/src/stages/checklist.js`) stays `doing` until you approve — then I flip it to `done`.

---

## How to read the boxes
`⬜ not started` · `🔨 in progress` · `✅ done (you tested + said go)`
A pass isn't ✅ until **you** walk its QA and green-light it — I never self-certify. Free-verified + committed means
the structure is proven offline and saved; the optional paid walk is yours to trigger.
