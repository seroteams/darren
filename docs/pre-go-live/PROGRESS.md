# Pre-go-live — PROGRESS (living log)

**This is the single source of truth for where the pre-go-live track is.** The agent reads it on every
"what next?" and updates it after every action. The [OVERVIEW](OVERVIEW.md) is the fixed playbook; this
file is what changes.

Status words: `not-started` (not broken down) · `planned` · `in-progress` · `awaiting-qa` · `done`.

---

## Active phase

**Pre-go-live BUILD complete; sign-offs closing out — PG1–PG7 ✅ signed off · PG8 ✅ closed 2026-07-04 (Carl's call, read-only walk skipped) · PG9 built, awaiting Carl's walk (or a "close pg9").**
The whole 9-phase pre-go-live track is **built**: manager Runs + reopen + rate, auto-built Team, person page with
"Since last time", the superadmin gate + Registered screen + user drilldown (incl. open-a-briefing), and the
Tidy-up (merge/rename/roll-ups). Next: the alpha **safety gate** (AG1 — before widening past 2–3 managers)
and any parked plans Carl picks up. **Continuity is HARD-PARKED by Carl — do not build.**

---

_Phase detail below is kept as the historical record._

**Phase 008 — Admin: user → teams → runs (the drilldown) — ✅ done (signed off 2026-07-04). Built end-to-end;
Steps 01–02 signed off, Step 03 built + approved.**

From the Registered screen, click a user → see their people (reuse PG4 grouping) + their runs with ratings
(PG1/PG3), open any run read-only. Composes existing pieces behind the PG6 superadmin gate.

PG8 steps:
- [x] **01 — Per-user runs read (backend)** — **built + signed off.** Superadmin-only
  `GET /api/v1/admin/users/:id/runs` (org-unfenced, by userId) → `userRuns()` newest-first with ratings.
  (Route-bug caught + fixed + guarded during QA — see the log.)
- [x] **02 — The drilldown screen** — **built + signed off.** `admin-user-detail.ts` at `/admin/users/:id`;
  Registered rows drill in; reuses PG4 grouping + PG1 rows + PG3 badges; superadmin-only. Carl walked it
  ("I have clicked through — done").
- [x] **03 — Open a briefing read-only** — **built, awaiting final walk.** Unfenced `superadminRunView(id)`
  → repo `readRun` → service `runDetail` → controller (404 on null) → gated regex route
  `GET /api/v1/admin/runs/:id`. Frontend: shared `ui/briefing-view.ts` (the PG2 renderer, extracted so
  run-detail and this reuse one copy — no drift) + `getAdminRun` + drilldown rows open the read-only
  briefing with a back. 58/58, typecheck + build green; route verified live (401-gates). **Final walk:** as
  superadmin, open a user → click a 1:1 → its briefing shows read-only → back.
- [ ] **99 — QA sign-off** ([99-qa-signoff.md](008-admin-user-drilldown/99-qa-signoff.md)) — Step-03 walk
  then close PG8.

Next: Carl walks the Step-03 briefing open → PG8 ✅ → break down PG9 (roster + polish).

**Phase 007 — Admin: who's registered — ✅ `done` (signed off + committed 2026-07-04, `c95a0052` +
`a1781799`).** Carl green-lit both steps ("go for it now"). The **Registered** superadmin screen is live:
every alpha company + its people with the return-visit signal (run counts / last-active / this-week /
last-week) + the alpha-wide ★ rating summary; nav item superadmin-only via an `isSuperadmin` boolean on
`/auth/me`, backend 403 the real wall.

<details><summary>PG7 step detail (built full-scope per Carl's "go")</summary>

- [x] **01 — Enrich the registered data** — per-user `runCount` / `lastActiveAt` / `runsThisWeek` /
  `runsLastWeek` + a top-level alpha `summary` (avgStars / ratedCount / lowCount) on
  `GET /api/v1/admin/registered`; derivation in the service (`now` injected), read-only, no `password_hash`.
- [x] **02 — The "Registered" screen** — `admin-registered.ts` at `/admin/registered`; nav item gated by the
  `isSuperadmin` flag (cosmetic; backend 403 is the wall).
- [x] **99 — QA sign-off** — signed off 2026-07-04.

</details>

**Phase 006 — Superadmin gate — ✅ `done` (signed off + committed 2026-07-04).** Carl approved the security
shape + tests ("approved"). Backend-only, test-first (13 tests): `requireSuperadmin` guard reads the
server-resolved `identity.email` against `SUPERADMIN_EMAILS` (dev side-door can't pass); read-only-by-
construction `superadmin` service + guarded GET `/api/v1/admin/registered` (no `password_hash`); one audit
line per access (refused access not audited). 56/56, typecheck clean. **Carry-forward before the alpha
widens** (still open by design): human-expert review must cover this key · close anon `POST /api/v1/sessions`
· privacy-note disclosure.

Broken into 3 test-first steps + QA. Backend-only, no screen (PG7/PG8 build those). **Verified anchors while
breaking it down:** `RequestIdentity` **already** carries a server-resolved `email` (request-context.ts:16),
so the guard is a thin add, not plumbing; the guards live in `require-auth.ts` (mirror `requireAdmin`) and
the route wrapper in `admin-guard.ts` (mirror `requireAdminRoute`); `organizations`/`users` tables exist in
`schema.ts`; the dev side-door email is `dev@seroteams.com` (not Carl's), so it can't satisfy the allowlist.

PG6 steps:
- [x] **01 — Superadmin guard** ([01-superadmin-guard.md](006-superadmin-gate/01-superadmin-guard.md)) —
  **built test-first 2026-07-04.** `normalizeEmail` + `isSuperadminIdentity` + `requireSuperadmin` in
  `require-auth.ts` (allowlist parsed fresh from `SUPERADMIN_EMAILS`, reads server-resolved `identity.email`
  only); `requireSuperadminRoute` in new `superadmin-guard.ts` (mirrors `admin-guard.ts`, injectable lookup).
  8 tests written first (red) then green: normalize folds case/space + rejects empty, allowlisted passes,
  owner → 403, anonymous → 401, empty allowlist → nobody, **dev side-door → 403**. `npm test` 54/54,
  typecheck clean. No route wired yet (Step 02).
- [x] **02 — Cross-company read** ([02-cross-company-read.md](006-superadmin-gate/02-cross-company-read.md))
  — **built test-first 2026-07-04.** New `services/superadmin/` (repo = SELECT-only reads of
  `organizations`/`users`, **never** selects `password_hash`; service groups users under their company,
  oldest-first, owns the ordering; thin controller). `GET /api/v1/admin/registered` wired via
  `superadminV1 = v1Route(requireSuperadminRoute(h))` — GET-only, funnelled through the Step-01 guard.
  Service tests (fake repo, red→green): grouping/order correct, empty-company and no-companies cases, and
  **no `passwordHash`/`orgId` leak into the view**. `npm test` 55/55, typecheck clean. (Owner→403 /
  dev-side-door→403 proven in the Step-01 guard tests; GET-only = no mutating route registered.)
- [x] **03 — Audit line** ([03-audit-line.md](006-superadmin-gate/03-audit-line.md)) — **built test-first
  2026-07-04.** `superadmin-audit.ts`: pure `superadminAuditEntry` (at/userId/email/method/route, no secret)
  + `appendSuperadminAudit` (one JSONL line to gitignored `content/data/audit/`). Called from the
  `requireSuperadminRoute` funnel **after** the guard passes (sink injectable), so a 403 is never audited as
  success. Tests (red→green): an authorized access audits exactly once with the right entry; a refused access
  audits zero. Confirmed **hermetic** (no audit file written during `npm test`). 56/56, typecheck clean.
- [ ] **99 — QA sign-off** ([99-qa-signoff.md](006-superadmin-gate/99-qa-signoff.md)) — mostly test results
  + the security shape in plain words + the three carry-forward conditions before the alpha widens.

Next: `go` → build Step 01 (the guard, test-first).

**Phase 005 — Person detail — ✅ `done` (signed off + committed 2026-07-04).** Carl walked it ("looks good
commit"). Clicking a Team person opens their page: header summary, their 1:1s newest-first (each reopens
the PG2 read-only briefing), the "Since last time" recap (last meeting's agreed actions + watch-fors), and
"Prep your next 1:1 with <name>" seeding a fresh intake — all fenced to the manager's own runs, no OpenAI
call. Plus a mid-phase UI polish (elevated colour-coded recap, quiet log). Baseline + post green.

Broken into 3 build steps + QA. Clicking a person card (from the PG4 Team page) opens their page — all the
manager's 1:1s with that person, their rating history, and the minimal "since last time" (most-recent
`next_actions` + `watch_for`, already in the payload). Reuses `groupRunsByPerson`, the PG1 row, the PG2
detail, and the PG3 ratings — little new backend.

PG5 steps:
- [x] **01 — The person page** ([01-person-page.md](005-person-detail/01-person-page.md)) — **built
  2026-07-04.** New `PERSON_DETAIL` stage at `/team/:person` (state + router + main plumbing mirroring
  `RUN_DETAIL`); Team cards are now keyboard-operable buttons that open the person page; header summary
  (name · role · N meetings · last · avg) + her runs newest-first (with ★ badge); loading / error /
  not-found ("no 1:1s with this person yet") states. New shared `personKeyOf()` in `group-people.js` so
  the page filters runs on the exact same key the grouping uses (no drift). Rows are display-only — opening
  them is Step 03. No backend change (still `/runs/mine`). Typecheck clean, `npm test` 53/53.
- [x] **02 — "Since last time"** ([02-since-last-time.md](005-person-detail/02-since-last-time.md)) —
  **built 2026-07-04** (Carl chose to build, not park). A block at the top of the person page shows the
  most recent 1:1's agreed next-actions ("What you agreed") + watch-fors ("What to watch for"); hidden
  entirely when both are empty (no scaffolding). The list payload carries no briefing, so it fetches just
  that one run's detail (`getMyRun`) — **no OpenAI call**. Minimal slice of the deferred "remembering".
  Typecheck clean, `npm test` 53/53.
- [x] **03 — Open + prep next** ([03-open-and-prep.md](005-person-detail/03-open-and-prep.md)) — **built
  2026-07-04.** Each past-1:1 row is now a button that reopens the PG2 read-only detail; a primary "Prep
  your next 1:1 with <name>" button seeds a fresh intake with the person's name/role (intake reads
  `store.ctx`) and opens the form. **Money-path:** seeding + opening intake spends nothing; only running the
  full pipeline from there spends — flagged in QA. Typecheck clean, `npm test` 53/53.
- [x] **UI polish** (Carl asked mid-phase) — the person page got real hierarchy: "Since last time" is an
  elevated, colour-coded card (mint = agreed, gold = watch), a scannable stat line under the name, and the
  past 1:1s as a quiet dividered log. New scoped classes in `design.css`; 14px floor kept.
- [ ] **99 — QA sign-off** ([99-qa-signoff.md](005-person-detail/99-qa-signoff.md)) — **awaiting Carl's walk.**

Next: `go` → build Step 01 (the person page).

**Phase 004 — Team, auto-built — ✅ `done` (signed off + committed 2026-07-04).**
Carl walked the QA (`demo@sero.test`) — people grouped from `/runs/mine`, case/spacing duplicates merge,
single-meeting card reads "1 meeting · not yet rated", empty state for no runs, nav + page relabelled
"Past 1:1s". Baseline was green (`npm test` 53/53, typecheck clean).

PG4 steps:
- [x] **01 — Team page** ([01-team-auto-built.md](004-team-auto-built/01-team-auto-built.md)) — new shared
  helper `admin/src/ui/group-people.js` → `groupRunsByPerson(runs)` (normalized-name key so "Priya"/"priya"
  merge; rolls up count / last-met / avg stars + rated-count; sorted most-recent-met first; pure, reused by
  PG5). `team.ts` rewritten to fetch `listMyRuns()`, group, and render `.card-flat` cards with own
  loading / empty / error states, names escaped.
- [x] **02 — Relabel Runs → "Past 1:1s"** ([02-relabel-runs.md](004-team-auto-built/02-relabel-runs.md)) —
  nav + page now read "Past 1:1s" (`app-nav.js`, `runs.ts`); admin screens untouched. (Row → person
  click-through is **PG5**, intentionally not here.)
- [x] **99 — QA sign-off** ([99-qa-signoff.md](004-team-auto-built/99-qa-signoff.md)) — all 5 walk
  scenarios green; Carl green-lit 2026-07-04.

**Phase 003 — Rate a 1:1 — ✅ `done` (signed off 2026-07-03, committed `6ae77667`).**

All four build steps done, verified live, and committed + merged to `main` on Carl's "commit and move on".
(The parallel session's duplicate step files were consolidated into the coherent set below.)

PG3 steps:
- [x] **01 — Backend rating** ([01-backend-rating.md](003-rate-a-1-1/01-backend-rating.md)) — route
  `POST /api/v1/runs/mine/:id/rating`, `rateMine` (stars 1–5 number → 400, org+user fence → 404, note
  trim/cap, **atomic** `rating.json`), `rating` surfaced on list + detail payloads, 5 tests, gitignore.
- [x] **02 — Rate on the detail** ([02-rate-on-detail.md](003-rate-a-1-1/02-rate-on-detail.md)) — shared
  keyboard-operable star widget (`admin/src/ui/star-rating.js`) on `run-detail`; low score (≤2) reveals a
  "What missed?" note; persists (destination verified live).
- [x] **03 — Rate in-flow** ([03-in-flow-rating.md](003-rate-a-1-1/03-in-flow-rating.md)) — the same
  widget at the end of a 1:1 (`BRIEFING`) with a plain **Skip**; hidden for the scripted test lane; no nag.
- [x] **04 — List badge** ([04-list-badge.md](003-rate-a-1-1/04-list-badge.md)) — a compact ★N badge on
  rated Runs rows; unrated rows stay clean.
- [~] **99 — QA sign-off** ([99-qa-signoff.md](003-rate-a-1-1/99-qa-signoff.md)) — Carl tried it live
  (`demo@sero.test`) and said commit + move on; formal walk of every scenario still open if he wants it.

**Phase 002 ✅ signed off (Carl walked it live, 2026-07-01) + committed.**

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
| 003 | Rate a 1:1 | ✅ done (signed off + committed) |
| 004 | Team — auto-built people | ✅ done (signed off + committed) |
| 005 | Person detail | ✅ done (signed off + committed) |
| 006 | Superadmin gate (backend) | ✅ done (signed off + committed) |
| 007 | Admin: who's registered | ✅ done (signed off + committed) |
| 008 | Admin: user → teams → runs | ✅ done (signed off 2026-07-04) |
| 009 | Roster + polish | ✅ done (signed off 2026-07-04) |

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
- **2026-07-02** — **Phase 003 broken down** → 3 front-end steps (`01-rate-on-detail`, `02-rate-in-flow`,
  `03-list-badge`) + existing QA sheet; status → `planned`. On reading the code, found the **PG3 backend
  already built + green** (route/service/repo/tests/payload/gitignore all present; `npm test` 53/53,
  typecheck clean) — another parallel batch ran ahead, so the steps consume it rather than rebuild it.
  No new code written this turn. Next: `go` → Step 01 (client call + accessible star widget on run-detail).
- **2026-07-03** — **Phase 003 signed off + committed (`6ae77667`).** Carl tried it live (`demo@sero.test`)
  and said commit + move on; PG3 (rate a 1:1, end-to-end) landed on `main`.
- **2026-07-04** — **Phase 004 signed off + committed.** Built on a short-lived `fable-playground` branch
  (identical to `main`, no unique commits); Carl asked to drop that branch, so PG4's working-tree changes
  moved to `main` and the branch was deleted. Baseline free checks green (`npm test` 53/53, typecheck
  clean). Carl walked the PG4 QA (Team page groups people from `/runs/mine`, case/spacing merge, honest
  single-meeting + empty states, nav relabelled "Past 1:1s") and green-lit. Committed PG4; ticked STATUS +
  SERO_BOARD + build badges (PG3 3 steps + PG4 3 steps → done; corrected PG4 step-2 wording that had
  mis-bundled the PG5 person-link into PG4) + refreshed the how-it-works changelog. Next: `go` → break down
  Phase 005 (Person detail).
- **2026-07-04** — **Phase 005 built + signed off + committed.** Broke PG5 into 3 steps + QA, built them in
  sequence with Carl checking between: Step 01 person page (`4bad9961`, new `PERSON_DETAIL` stage at
  `/team/:person`, shared `personKeyOf` so the page filters on the same key the grouping uses), Step 02
  "Since last time" (`810f9b14`, fetches the latest run's detail — no OpenAI), a mid-phase UI polish Carl
  asked for (`81fa5adf`, elevated colour-coded recap + scannable header + quiet log), Step 03 open-a-run +
  prep-next (`99005e9e`, rows → PG2 detail, "Prep next 1:1" seeds intake — free until a full pipeline runs).
  Carl walked it ("looks good commit") → PG5 ✅. Ticked STATUS + SERO_BOARD + build badges (PG5 3 steps →
  done) + how-it-works changelog. Free checks green throughout (53/53, typecheck clean); no paid runs.
  Next: `go` → break down Phase 006 (superadmin gate).
- **2026-07-04** — **Phase 006 built + signed off + committed.** Broke PG6 into 3 test-first steps + QA,
  grounded against real symbols (found `RequestIdentity.email` is already server-resolved, so the guard was a
  thin add). Built test-first: Step 01 guard (`23b59a37`, `requireSuperadmin` + `requireSuperadminRoute`, 8
  tests incl. dev-side-door → 403), Step 02 cross-company read (`370cdc64`, read-only `superadmin`
  service/repo + guarded GET `/api/v1/admin/registered`, no `password_hash`), Step 03 audit line
  (`cbfe99c6`, one JSONL record per access, refused not audited, hermetic). Carl approved the security shape
  + tests ("approved") → PG6 ✅. Ticked STATUS + SERO_BOARD + build badges (PG6 2 chips → done) + changelog.
  56/56, typecheck clean; no paid runs. **Carry-forward before widening the alpha stays open by design.**
  Next: `go` → break down Phase 007 (who's registered — the first superadmin screen).
- **2026-07-04** — **Phase 007 Step 01 (backend enrichment) built — awaiting QA.** Carl picked the full
  return-visit signal ("go"). Test-first: added `listRunsForSuperadmin()` to run-history (walks all orgs via
  the existing `walkRuns`, finished runs only, attributes by `userId`, reads PG3 `ratingOf` stars) → repo
  `listRuns()` → the `superadmin` service now enriches each user with `runCount` / `lastActiveAt` /
  `runsThisWeek` / `runsLastWeek` (week buckets from an injected `now` so tests are deterministic) and folds
  every run's rating into a top-level `summary { avgStars, ratedCount, lowCount }`. 8 new assertions
  (bucketing, no-runs→zeros not omitted, unrated excluded, no `passwordHash`, avg rounding). Still behind
  `requireSuperadminRoute`, still read-only, no new tracking infra. 57/57 + typecheck green; no OpenAI.
  Next: Carl QA (backend only — read the test results) → Step 02, the screen.
- **2026-07-04** — **Phase 007 Step 02 (the screen) built — awaiting QA.** New admin stage
  `admin-registered.ts` at `/admin/registered`, wired via the 6-step pattern (state STAGE + router
  path/ADMIN_ONLY + main loader + app-nav link + `getRegistered()`). Shows the alpha rating summary + each
  company with its users (role, joined, run count, last-active, this-week/last-week) + loading/empty/error
  states; every value escaped, ≥14px, plain language. Nav visibility: `/auth/me` now returns a
  server-computed `isSuperadmin` boolean (reuses `isSuperadminIdentity`; allowlist never leaves the
  server), the nav item is `superadmin: true` and hidden unless the flag is set — cosmetic, the backend
  403 is still the wall (login.js + boot both hydrate the flag from me()). 57/57 + both typechecks + build
  green; live-checked a member does NOT see the item, no console errors. Full superadmin visual walk needs
  the API restarted with these changes (Carl's QA). No OpenAI. Next: Carl QA → PG7 ✅ → break down PG8.
- **2026-07-04** — **PG7 ✅ signed off ("go for it now").** Both steps green-lit + committed (`c95a0052`
  backend enrichment, `a1781799` the screen). Ticked STATUS + SERO_BOARD (PG1–PG7 done) + build badges (PG7
  3 steps → done). Moving to PG8. **PG8 Step 01 (backend per-user runs read) building** — a superadmin-only
  `GET /api/v1/admin/users/:id/runs` (cross-org, read-only) so the drilldown can show a user's own 1:1s +
  ratings; reuses the run walk, attributes by userId. Test-first.
- **2026-07-04** — **PG8 Step 01 (backend per-user runs read) built — awaiting QA.** Added
  `run-history.listFinishedRunsForUser(userId)` (mirrors the member read but org-unfenced, by userId) →
  repo `listRunsForUser()` → service `userRuns()` (newest-first) → controller + gated route
  `GET /api/v1/admin/users/:id/runs` (superadminV1, so it can't be added un-gated). 2 new service tests
  (ordering, unknown-user → empty). 57/57 + typecheck green; no OpenAI. Next: Carl QA (backend — read the
  results) → Step 02, the drilldown screen (people via PG4 grouping + runs), then Step 03 (open a briefing).
- **2026-07-04** — **PG8 Step 02 (drilldown screen) built — awaiting QA.** New admin stage
  `admin-user-detail.ts` at `/admin/users/:id`, wired via the 6-step pattern (state STAGE +
  `adminUserId`/`adminUserName` + router path/parse/ADMIN_ONLY + main loader + boot/popstate deep-link +
  `getUserRuns()`). Registered user rows are now buttons that drill in; the page reuses PG4
  `groupRunsByPerson` for the people list + PG1 rows / PG3 star badges for the 1:1s, with back +
  loading/empty/error; all escaped, ≥14px. Superadmin-only (ADMIN_USER in ADMIN_ONLY + backend 403).
  57/57 + both typechecks + build green; no OpenAI. Next: Carl QA (needs API restart for the live walk) →
  Step 03 (open a briefing read-only) closes PG8.
- **2026-07-04** — **PG8 QA found + fixed a route bug (`cec682e9`).** Setting up the live walk surfaced that
  Step 01's route was registered as the string `"/api/v1/admin/users/:id/runs"`, but `router.ts` matches
  string patterns **exactly** (only regex patterns extract `:id`), so every real user id **404'd** — the
  drilldown would have loaded no runs. Switched to the named-group regex the sibling routes use; verified
  live (now 401-gated for a real id, was 404). The 57/57 service tests missed it because they call the
  service directly, never the HTTP route. **Gap flagged:** no route-level wiring test exists — a follow-up.
  Visual superadmin walk still owed by Carl (needs his own `carl@seroteams.com` login; the dev side-door is
  non-superadmin by design). 57/57 + typecheck still green.
- **2026-07-04** — **PG8 Steps 01–02 signed off; Step 03 built (`e4ba1958`).** Carl walked the drilldown ("I
  have clicked through — done") → 01–02 ✅. Then built Step 03 test-first: unfenced `superadminRunView(id)`
  → repo `readRun` → service `runDetail` → controller (404 on null, ids can't be probed) → gated regex route
  `GET /api/v1/admin/runs/:id` (2 new service tests). Frontend: extracted the PG2 read-only briefing renderer
  into shared `admin/src/ui/briefing-view.ts` (run-detail now reuses it — kills the drift the file's own
  comment warned about), added `getAdminRun`, wired the drilldown 1:1 rows to open the briefing read-only
  with a back. 58/58 + typecheck + admin build green; new route verified live (401-gates, was 404). **Final
  walk (Step 03) owed by Carl.** Next: his walk → PG8 ✅ → PG9.
- **2026-07-04** — **PG9 (roster + polish) built end-to-end (`1f22f572`) — awaiting walk.** Store choice made
  (Carl's "do all"): a light per-manager **alias map** sidecar (`content/data/people-aliases/`, gitignored,
  atomic write) — no DB migration. Backend test-first (7 tests): `team.service` merge (folds keys, collapses
  chains, rejects self/cycle) + rename (sets/clears a display name on the canonical key) → fenced controller
  (login, own userId) → 3 routes (GET open + 2 origin-guarded POSTs), all verified live at 401. Frontend:
  `groupRunsByPerson` takes an optional alias map (backward-compatible) + new `canonicalKeyOf`; Team gains a
  **"Tidy up"** mode (Rename + "Merge into…" picker); the person page groups/filters on the canonical key so a
  merged person collects every folded-in 1:1. 60/60 + typecheck + build green. QA sheet written
  ([99-qa-signoff.md](009-roster-polish/99-qa-signoff.md)). **Walk owed by Carl** (merge/rename, and that it
  sticks after reload). With PG8's final walk, this closes the pre-go-live build.
- **2026-07-04** — **Closed the route-test gap (`2dd8722a`).** Added `backend/api/router.test.ts` driving the
  real `handle()`: a RegExp named-group route captures `:id`; an Express-style string `":id"` route does NOT
  match a real id (falls to 404) — the exact contract that let the PG8 bug through. Runner now 58/58 files,
  typecheck clean, pushed. **PG8 status: Steps 01–02 built + route bug fixed + guarded; only the visual
  superadmin walk (Carl) and Step 03 (open a briefing read-only) remain to close PG8.**
