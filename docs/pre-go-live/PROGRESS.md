# Pre-go-live — PROGRESS (living log)

**This is the single source of truth for where the pre-go-live track is.** The agent reads it on every
"what next?" and updates it after every action. The [OVERVIEW](OVERVIEW.md) is the fixed playbook; this
file is what changes.

Status words: `not-started` (not broken down) · `planned` · `in-progress` · `awaiting-qa` · `done`.

---

## Active phase

**→ Phase 003 — Rate a 1:1 — `not-started`**

**Phase 002 ✅ signed off (Carl walked it live, 2026-07-01) + committed.** Next action for the agent:
**break Phase 003 down** into step files (`01-….md` …) + `99-qa-signoff.md`. Do not start coding until
Carl green-lights the breakdown.

Phase 002 (done) steps:
- [x] **01 — API client** — `getMyRun(id)` → `GET /api/v1/runs/mine/:id` in `shared/api.js`.
- [x] **02 — Detail stage** — new `admin/src/stages/run-detail.ts` at `/runs/:id` (member stage
  `RUN_DETAIL` + `myRunId`); state/router/main plumbing (parse, boot, popstate); read-only briefing
  render (What stood out / understood / honest read / what to do next / reminders), loading / error /
  not-found states, every value escaped.
- [x] **03 — Wire rows** — Runs rows are now keyboard-operable `<button>`s that open the detail;
  `.runs-list__row` style added.
- [x] **99 — QA sign-off** — Carl walked it (member login, seeded runs): list → click Priya → read-only
  briefing opened; foreign id → 404. ✅ green-lit.

Verified (free): `npm test` 53/53 · `npm run typecheck` clean. Live (real app, stubbed run):
`/runs/r1` routes to the detail, subtitle + all five briefing sections render, `<it>` escaped, no console
errors; a bad/foreign id → the "couldn't open" card (404 fence). Phase 001 (done) below.

**Also in the tree (bundled with PG2, will commit together): `cloneRun` — a dev-only QA-helper.**
Admin-guarded (`requireAdmin`) "prefill a run" tool: `GET /api/v1/runs/clonable` + `POST
/api/v1/runs/clone` (origin-checked) clone a finished run into a fresh one owned by the caller, so a
manager has *owned* test runs to walk the 001/002 QA (the userId-attribution cutover makes older runs
invisible). Not a pre-go-live phase feature — accepted 2026-07-01 (Carl, option A) as test-data scaffolding.
Carve-out: it's admin-only and dev-only; keep it out of the member surface. (Momentary typecheck gap — the
`RunsRepo` mock lacked `cloneRun` — was closed; tree is green again.)

## Phase board

| # | Phase | Status |
|---|---|---|
| 001 | Manager Runs list | ✅ done (signed off + committed) |
| 002 | Reopen a run | ✅ done (signed off + committed) |
| 003 | Rate a 1:1 | not-started |
| 004 | Team — auto-built people | not-started |
| 005 | Person detail | not-started |
| 006 | Superadmin gate (backend) | not-started |
| 007 | Admin: who's registered | not-started |
| 008 | Admin: user → teams → runs | not-started |
| 009 | Roster + polish | not-started |

## Baseline (fill in before touching code in a phase)
- **2026-07-01 — Phase 001 baseline (free checks, no OpenAI):** `npm test` **53/53 passed**,
  `npm run typecheck` **clean**. (Up from the 52/52 last-known-good — suite has grown.) This is the
  green line Phase 001 work is measured against.

## Decisions
- **2026-07-01 — Track created.** Pre-go-live scaffolded as a sibling to prototype-to-production, 9 phases.
  Supersedes the deferred member-nav Phase 2 (real Runs) and 009's deferred "real Team content" — both are
  folded in here so the trackers don't multiply.
- **2026-07-01 — Team = auto-built from past 1:1s** (group by person). Explicit roster / merge is Phase 009.
- **2026-07-01 — Rating = 1–5 stars "How useful?" + optional note**, editable; stored as a `rating.json`
  sidecar in the run folder (no DB migration for the alpha). Carl sees all ratings.
- **2026-07-01 — Admin view = cross-company superadmin**, gated to Carl's account only, read-only. The one
  intentional wall-crossing (Phases 006–008); the per-company fence stays intact for everyone else.

## Decisions (from the CTO review, 2026-07-01)
- **Keep the `rating.json` sidecar — do NOT add DB columns/backfill for the alpha.** Senior panel overruled
  the "add `user_id`/`rating`/`person_key` columns" recommendation: the `runs` DB table is a stub off the
  run write-path, the superadmin view loops the real `organizations`/`users` tables + reuses the per-org run
  walk, and reading a few dozen rating files is trivial at alpha scale. The DB-column move is the **parked
  scale-up trigger** below, not now. (Carve-out kept: the sidecar write must be **atomic** — temp + rename.)
- **Continuity "Since last time" (minimal) added to Phase 005.** The one make-or-break UX fix: surface the
  most recent run's `next_actions` + `watch_for` on the person page (data already in the payload — near
  free). This is a *minimal slice* of the deferred "remembering", NOT the full cross-session system.
  **Awaiting Carl's nod** — he can park even this slice.
- **In-flow rating (Phase 003):** a gentle one-tap rating at the **end of a 1:1** (+ Skip), not only on the
  reopened detail — else adoption craters and Carl's honest signal dries up. No "X unrated" nag ever.
- **Team is primary; "Runs" → "Past 1:1s" (Phase 004):** person-centric is the return-visit mental model;
  the flat list is the secondary "all activity" view.
- **Each phase owns its loading/empty/error states** (OVERVIEW standing expectations); Phase 009 shrinks to
  merge + roll-ups. Manual roster, search/filter, and trend sparkline are **parked** (scope-creep for a 2–3
  manager alpha).
- **Superadmin security must-haves (Phase 006):** email resolved server-side from the authenticated userId
  (never client input); structurally read-only module (GET-only, no write imports); one-line access audit;
  403 tests with `DEV_AUTOLOGIN` off; dev side-door can never match the allowlist.

## Before we widen past 2–3 friendly managers (inherited conditions — do not lose)
- **Human-expert security review** (deferred in 009) **must explicitly cover the new superadmin
  wall-crossing** — the waiver was written for the existing fence, which had no cross-tenant key.
- **Close the anonymous session-start route** (`POST /api/v1/sessions`) — the 009 "before widening" gate.
- **Update the privacy note** to disclose that ratings (incl. the free-text note) are stored, and that an
  internal Sero admin can view a company's users/teams/runs across companies. Tell the alpha managers
  before their staff data is viewable.
- **Classify the rating note as a private manager field** (like `brutal_truth_manager`): never in any
  employee-facing/shared surface, never logged; add `**/rating.json` to `.gitignore` belt-and-braces.

## Parked (don't expand the current step — capture here)
- Manual people roster ("add a person ahead of time"), search/filter on Team/Runs, trend sparkline/charts —
  all post-alpha (build only if a real manager asks).
- Promote person-grouping to a server `GET /api/v1/team` endpoint if client-side grouping outgrows the payload.
- Move ratings from a sidecar file to a DB column (with a `runs.user_id` column + backfill) once the alpha
  grows past a handful of managers and cross-org aggregates need SQL.

## Activity log
- **2026-07-01** — Track scaffolded: README, OVERVIEW, PROGRESS, and the nine `00-phase-overview.md`
  files created. Phase 001 not yet broken down.
- **2026-07-01** — Baseline recorded (`npm test` 53/53, typecheck clean). **Phase 001 broken down**
  into 2 build steps + QA (`01-api-client.md`, `02-render-runs-list.md`, `99-qa-signoff.md`); status
  → `planned`. Confirmed the endpoint + fence already exist (`runs.mine` → `myFinished` →
  `listFinishedRunsForMember`), so 001 is pure front-end wiring — no backend change. **Flagged:** the
  nav relabel "Runs → Past 1:1s" is left to Phase 004 (per the CTO decision), not done in 001, to
  avoid the overview's Note and the CTO decision fighting. No code touched yet. Next: `what next?` → do
  Step 01.
- **2026-07-01** — **Step 01 done.** Added `listMyRuns()` (→ `GET /api/v1/runs/mine`) beside the
  other run calls in `shared/api.js`. Free checks green: `npm run typecheck` clean, `npm test` 53/53.
  Phase status → `in-progress`. Next: Step 02 (render the list in `runs.ts`).
- **2026-07-01** — CTO-level review run (standard team of 4 → senior panel of 2). Applied the agreed
  minimal edit set to OVERVIEW + phases 001–007 & 009 (security, in-flow rating, continuity, Team-primary,
  per-phase states, telemetry). Plan judged right-sized (not verbose); gaps were *aspects*, now closed.
  Next: `what next?` → break down Phase 001.
- **2026-07-01** — **Reconciled state.** Found the tree had advanced past this session: PG1 done +
  committed (`3cc5ef9d`), PG2 (reopen a run) built + `awaiting-qa`, plus an off-plan admin-only
  `cloneRun` QA-helper that had briefly broken typecheck (mock repo missing `cloneRun`) — since closed;
  tree green (`npm test` 53/53, typecheck clean). Carl chose to keep `cloneRun` (option A); logged it.
- **2026-07-01** — **Phase 002 signed off + committed.** Set up a live walk: seeded 3 member-owned
  finished runs (Priya / Marco / Ade, in `logs/` which is gitignored) for `member@seroteams.com`, ran
  API 3001 + Vite 3000, confirmed the chain (login → list newest-first → click → read-only briefing;
  foreign id → 404). Carl walked it and green-lit. Committed PG2 + `cloneRun`. Next: break down Phase 003.
