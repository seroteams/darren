# Phase 3 — Slim the admin app

**Part of:** [PLAN.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-08
Carl walked the 5 scenarios and green-lit ("A"). Build + proof detail below.

## The shape Carl picked (option A, 2026-07-08)
The original phase text said "remove the prep flow from admin" — but scoping found the internal QA
tools ride that flow (the persona bench starts scripted runs that play out through intake →
interview → briefing on :3000). Carl confirmed he QA-runs on :3000, so:

| Admin keeps | Shared (one source, both import) | Customer-only (moved to `frontend/src/stages/`) |
|---|---|---|
| Internal tools, superadmin screens, the **run lane** (START+bench, intake, flow), lexicon review | login, register, prep-flow stages, review-run, runs/run-detail, privacy/about/feedback | **welcome** (+its test), **join**, **team**, **person-detail**, **member-home** |

## 🔨 BUILT 2026-07-08 ($0)
- **F-005 fixed for real:** `start.js` split into [start-core.js](../../../admin/src/stages/start-core.js)
  (the whole dashboard, benchless — header keys on bench presence, not role) + `start.js` (core + the
  bench, admin app only). The customer app imports the core; **grep of the customer bundle: zero bench/
  persona code**. Proven live: internal admin on the customer app gets a clean start (with a working
  "Start a new session"); same user on the admin app gets the bench (12 personas loaded, button armed).
- **5 files physically moved** (`git mv`, imports rewritten): welcome.ts + welcome.test.ts, join.js,
  team.ts, person-detail.ts, member-home.js → `frontend/src/stages/`. The test runner now also collects
  `frontend/src/**/*.test.ts`, and a new [frontend/src/router.test.ts](../../../frontend/src/router.test.ts)
  locks the customer walls (welcome at `/`, join routing, guest lane, member only-runs).
- **Admin slimmed:** WELCOME/JOIN/TEAM/PERSON_DETAIL out of admin's map/router/nav; logged-out on the
  admin app → **login** (the guest front door lives in the customer app); manager rail on admin =
  Home · New 1:1 · Past 1:1s (no Team); `/team` and `/join/:x` no longer resolve there. Admin's router
  test updated to assert the new boundary.
- **TypeScript:** `frontend/` got its own browser tsconfig (mirror of admin's) + `npm run typecheck:customer`;
  the root config is Node-only again.
- **Deliberately NOT touched:** `login.js` — another session is actively editing it (guest-claim work).
  So members still land on MEMBER_HOME after login, and admin keeps a MEMBER_HOME map entry
  (cross-importing the moved file). **Parked tidy:** point login's member landing at Past 1:1s
  (one line), then drop MEMBER_HOME from admin — do it when login.js is free.

## Proof (all free, $0)
`npm test` **97/97** (was 96 — customer router test added, welcome test moved and still collected) ·
all three typechecks clean (root / admin / customer) · both builds ✓ ·
customer bundle: 0 hits for bench/persona/internal-tool code · admin bundle: 0 hits for welcome/join
screens · live-driven on scratch servers: admin :3083 (full rail, bench live, /team+/universe checks),
customer :3085 (manager rail, clean start, Team + join screens render from their new home).

## ⚠️ Environment note from verification (NOT this phase's doing)
Your long-running dev API on :3001 stopped answering DB-backed routes (`/auth/me` hangs; `/health`
still 200) — a fresh API answers instantly, so it's a wedged process, likely a stale Neon connection
after today's DB work. **Restart your dev API (`npm run dev`) before walking.** Fallback pair left
running: API :3081 + customer :3085.

## Done when
- [x] The admin app still shows and runs every internal tool (incl. the persona bench).
- [x] The admin app no longer serves the customer shell (welcome/join/team/person pages).
- [x] The customer bundle carries zero bench/persona/internal-tool code (grep).
- [x] `npm test` + all typechecks clean; no dead imports left by the removal.
- [x] Product owner has tested the scenarios below and said go. (Green-lit 2026-07-08.)

## Test scenarios — for the product owner (~4 min, all free)
1. **Bench alive on admin** — :3000 (after API restart), log in as yourself: Start page shows the
   Demo persona bench, personas load, Universe/Library/Tasks all present. ❌ Not OK if the bench is gone.
2. **Customer start is clean** — :3002, log in as any role: Start page has NO bench — just
   "Start a new session" + "One-page run" + recent sessions. ❌ Not OK if bench controls appear.
3. **Customer shell gone from admin** — on :3000 type `/team` → you land back on Home; the manager
   rail shows no Team. ❌ Not OK if the Team screen renders there.
4. **Customer app still whole** — on :3002: Team renders, `/join/test123` shows the join screen,
   logged-out gets the welcome door (private window). ❌ Not OK if any customer screen broke.
5. **The run lane still works on admin** — on :3000 press the bench's "Continue to setup" (no persona
   picked): the intake screen opens; type a name, then abandon. ❌ Not OK if it errors. (Stay in
   intake — picking a persona and starting fires the paid pipeline; intake alone is $0.)
