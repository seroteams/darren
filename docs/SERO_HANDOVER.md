# SERO — FULL HANDOVER (deep dive)

> **What this file is.** A single self-contained briefing about Sero — what it is, why it exists,
> how it's built, how we work on it, and exactly where things stand — written so that a Claude
> chat (or any collaborator) with **no access to the repo** can understand the whole project from
> this one document. Written 2026-07-05. If you're reading this inside the repo instead: the live
> trackers are [STATUS.md](../STATUS.md) (tactical) and [SERO_BOARD.md](../SERO_BOARD.md)
> (strategic) — this file is a snapshot, they are the truth.

---

## 1. What Sero is

**One line:** Sero is a manager-facing 1:1 prep tool — a manager types sparse notes about a
person, and an AI pipeline turns them into a structured, guided 1:1 meeting and a scored,
evidence-backed briefing afterwards.

**The flow a manager experiences:**
1. Pick a person and a meeting type (bi-weekly, performance, growth, feels-off, onboarding).
2. Jot rough notes ("been quiet lately, shipped the big migration, might be bored").
3. Sero picks 3–5 **focus points** worth covering, warms up with curated intro questions, then
   generates tailored questions and **re-plans after every answer** (which question next, what to
   skip, when to dig).
4. At the end it produces a **briefing**: 8 axes scored 0–10 with evidence and recommendations,
   plus the full transcript. The manager can rate the run (1–5★), reopen it later, and see each
   person's history build up over time.

**Who it's for:** managers running recurring 1:1s. In the app, `manager` = the end user,
`member` = the person being managed (they can log in too, with a slimmer view), `admin` = internal
(Carl). A separate **superadmin** allowlist (Carl's email) gives a read-only cross-company window.

**Who's who on the project:**
- **Carl** (carl@seroteams.com) — founder, product owner, sole driver. Not deeply technical; all
  communication with him is plain language, no jargon. He green-lights every phase personally.
- **The AI agent (Claude Code)** — does the building, in the repo nicknamed "darren", under
  strict working rules (section 8).

**Stage of life:** pre-alpha, not hosted. The plan is a small **alpha with 2–3 friendly
managers** using real (fenced, consented) data. Hosting is deliberately parked until Carl says go.

---

## 2. The aims — strategy and product theory

- **The core bet:** value shows up on the **return visit**, not the first run. A manager proves
  willingness-to-pay when they come back next week, find their people and past 1:1s waiting, and
  it helps them run the next conversation. Alpha-readiness research (3 reports, roadmap at
  `docs/sero-roadmap.html`) was blunt: a migration/first-run wow alone won't prove
  willingness-to-pay; the alpha layer + an eventual paid pilot will.
- **Consequence #1 — "pre-go-live" track (done):** the manager's own **Runs** list (reopen,
  rate), an auto-built **Team** (grouped from past 1:1s — zero data entry), per-person pages with
  "since last time" recaps, and a superadmin window so Carl can watch alpha adoption.
- **Consequence #2 — continuity was built, then REMOVED at Carl's request (2026-07-06).** The
  cross-session loop (meeting #2 reviews meeting #1's action items) was once framed as the
  willingness-to-pay driver and was actually built (carry-forward pre-fill + outcome taps) — then
  Carl tore it all out: "this is not what I wanted at all." Do not rebuild it; do not re-pitch it
  unless he explicitly asks.
- **Engine honesty is a product value, not a nicety.** Raw model output is surfaced; problems are
  detected and flagged, never hidden by hardcoded rewrites. A low usefulness rating is
  *information we want*. This shows up everywhere: gates flag, they don't mask.
- **Calm, plain product.** The design North Star is "The Quiet Debrief" — a calm conversation
  written down, not a dashboard. Plain words everywhere, one accent colour, 14px text floor.

---

## 3. Architecture at a glance

**Stack:** Node.js + TypeScript (hand-rolled HTTP server, no Express), Postgres on **Neon**
(Drizzle ORM), OpenAI API for the engine (per-stage model mapping in `content/config/models.json`),
Vite single-page app for the web UI (no framework — hand-rolled router + reactive store).
Runs as **two interfaces over one engine**: a CLI (`backend/cli.ts`) and the web app.

```
Browser (admin/ Vite SPA :3000)
        │  JSON + SSE streams
backend/api/server.ts (:3001)  ── auth guard · org fence · error-log middleware
        │
Services → Repos (Postgres via Drizzle + disk state)
        │
backend/engine/  — the 5-stage pipeline (same code the CLI uses)
        │
   ┌────┴─────┬─────────────┬───────────────┐
 Neon        OpenAI       logs/ on disk   content/ (prompts, questions,
 (users,     (per-stage   (session state,  lexicons, config — all file-based)
 runs, auth) models)      full artifacts)
```

**Repo layout (top level):**

| Path | What |
|---|---|
| `backend/engine/` | Pipeline core — the 5 stages, AI client, role profiles, 1:1 type system, session disk I/O |
| `backend/api/` | HTTP API — ~50+ routes under `/api/v1/`, controllers → services → repos |
| `backend/db/` | Drizzle schema + migrations (Postgres/Neon) |
| `backend/cli.ts` | CLI entry — same 5 stages in a terminal |
| `admin/` | The web app (Vite SPA, ~36 screens — both the product UI and internal admin tooling) |
| `frontend/` | Placeholder for a future separate customer app (decided against for now — folded into admin) |
| `shared/api.js` | Thin fetch wrapper the SPA uses to talk to the API |
| `content/` | Product content as files: prompts, question bank, lexicons, config, runtime data |
| `scripts/` | Runners: gate, smoke, eval, sweep, replay, test runner |
| `evals/` | Trust checks, golden runs, fixtures |
| `logs/` | Run artifacts (git-ignored except a de-identified May keep-set used as regression baseline) |
| `docs/` | Docs, `todo/` (active work folders), `pre-go-live/`, archives |

---

## 4. The AI engine — the 5-stage pipeline

Each stage is one (or a loop of) OpenAI call(s). Prompts are plain `.md` templates in
`content/prompts/` filled at runtime (`fillPlaceholders` → `splitSystemUser`); models per stage
come from `content/config/models.json` (cheap/fast models for early stages, a stronger model for
the final briefing). Every stage validates the response against its schema before logging —
invalid output gets a `SCHEMA_INVALID` flag, never silent acceptance.

1. **Focus points** — manager's notes + person → 3–5 topics worth covering, chosen from a
   ~50-type catalogue (`content/focus-points.json`, plus the 21-entry relational-arc catalogue).
   Output: typed focus points with source, confidence, and reason.
2. **Preparation** — a short brief + 2–3 warm-up questions, drawn from **curated** intro sets per
   meeting type (`content/questions/_intro/<type>/` — intros are never generated).
3. **Question bank** — dynamic questions generated per focus point, with a fallback to seed
   questions if generation fails (`_seed/`). The full bank is ~4k YAML question files indexed by
   `_index.json` (rebuild via `npm run rebuild-question-index`).
4. **Planner (per turn)** — after **every answer**, `plan-turn` rescores and reorders the queue:
   which question next, what's answered, when a focus point is done. Includes budget tracking
   (intro + dynamic question budgets), must-ask delta gates, and focus-arc progress.
5. **Evaluation (briefing)** — full transcript → the manager's briefing: **8 axes**
   (`content/axes.json`) each scored 0–10 with evidence and a recommendation, post-processed with
   read-status/confidence metadata and run through rule-based golden checks.

**Supporting systems:**
- **Role profiles** — cached per title+seniority context (`content/data/role-profiles/`), built
  once by a dedicated prompt and injected into stages ("a Staff Engineer cares about…").
- **Lexicons** — per-discipline vocabulary (`content/lexicons/design/`, `engineering/`) with a
  discovery loop: candidate terms surfaced from sessions → human review → promotion to core.
  Managers can hide/restore AI words (engine-honest overlay — the raw output is preserved).
- **1:1 type system** — 5 pluggable meeting types under `backend/engine/one-on-one-types/`, each
  overriding prompts/arcs; **arc overlays** (`content/data/arc-overlays/`) let the UI tweak a
  type's arc without code.
- **The focus-arc gate** — bi-weekly and feels-off meetings must exclude competency content:
  enforced twice (an input filter *and* the `FOCUS_ARC_LEAK` trust check).
- **Deterministic fallbacks** — broken/leaky generated questions get a safe stem
  (question-validator); a missing role profile gets a stated fallback block; failures are logged,
  never masked. Known hole: no briefing-generation fallback yet.
- **Session identity & dedup** — session IDs are timestamp + 128-bit random (not guessable); a
  question de-duplication gate stops repeats; a session bank + `CROSS_SESSION_QUESTION_LEAK`
  check stops one session serving another session's vocabulary or questions.

**Logging — the audit trail for every run.** `logs/<month>/<sessionId>/` holds
`session-state.json` (live state, updated every turn), `transcript.json`, `axis-state.json`, and
per stage: `inputs.json`, `prompt.md`, `response.json` (**raw model output**), `final.json`
(**post-guard, what actually shipped**). When reviewing quality, judge `final.json`; when judging
the model, look at `response.json`. Per-run sidecars: `rating.json` (manager's stars),
`review.json` (QA verdicts).

**Trust boundary rules (enforced in code, `evals/trust-checks.js` + `scripts/gate.js`):**
1. `brutal_truth_manager` never appears in employee-facing/shared output.
2. Private-note manager judgments (doubt, flight risk, readiness…) must not surface verbatim.
3. No HR labels ("flight risk", "doesn't care") unless quoting the transcript.
4. No cross-session question/vocab leaks.
5. Focus-arc gate (above).
6. No engine vocabulary (role_profile, known_challenges…) leaking into briefing prose.
7. Standing: private manager notes never reach shared/email/admin surfaces.

---

## 5. Backend API and database

**Server:** `backend/api/server.ts`, hand-rolled routing, RESTful **`/api/v1/`** (one error shape
`{ error: string }`); legacy `/api/` aliases kept for backward compat. Slim controllers →
services → co-located repos; kebab-case files with role suffixes (`sessions.controller.ts`,
`sessions.service.ts`, `sessions.repo.ts`); tests mirror source. All boundary input (HTTP, disk,
model output) is `unknown`, narrowed with guard functions; output types are strict.

**Route groups (the shape of the API):**
- **Auth:** register / login / logout / me. Passwords hashed. Signup creates the company.
- **Sessions:** create, snapshot, answer, back, notes, focus-point selection, lexicon decisions —
  plus **SSE streams** for each generating stage (focus-points, preparation, bank, plan,
  evaluation) so the UI shows live progress.
- **Runs:** member's own (`/runs/mine`, reopen + rate) and admin views (recent, full, stages,
  review, archive, delete).
- **Team:** auto-built aliases per manager + merge/rename ("Tidy up").
- **Engine tooling:** persona-runs (run the whole engine on a scripted persona), regression,
  arcs, lexicon promotion, role-lexicons, suggest-answers.
- **Superadmin (`/api/v1/admin/*`):** registered companies + adoption stats, per-user drilldown,
  role change, deactivate/reactivate, error log. Server-resolved allowlist, read-only by
  construction where promised, every access audited, mutations origin-guarded.
- **Heartbeat:** `GET /api/v1/heartbeat` re-reads the repo per request so the in-app Guide page
  reflects reality instead of a hand-typed snapshot.

**Auth model:** cookie/token sessions in `auth_sessions`. Guard tiers: public → login-required →
admin (admin+manager get the console) → superadmin (`SUPERADMIN_EMAILS` allowlist — independent
of the role enum). A **dev side-door** exists for local one-click login and is hard-gated so it
can't pass in production. **Multi-tenant fence:** every request resolves `orgId` from the auth
session; cross-company access 404s/403s. The superadmin path is a separate, gated, audited
read-only window — not a loosening of the fence.

**Database (Neon Postgres, Drizzle):** `organizations`, `users` (role enum
admin/manager/member, `deactivatedAt` soft-delete), `auth_sessions`, `sessions` (jsonb state +
logDir link), `runs` (links to the log folder; note — **no userId column**: a run finds its owner
via `state.userId` on disk), `invitations`, `error_logs` (every API 5xx fire-and-forgets one
secret-safe row, tagged Local/Live). Schema rules: uuid PKs, snake_case plural tables,
timestamptz, jsonb for state, FK + index on every `*_id` and `org_id`. **Run artifacts stay on
disk** in `logs/` — the DB stores identity + pointers, the filesystem stores the content.

---

## 6. The web app (admin/ — one SPA, two audiences)

Vite SPA, hand-rolled path router (`admin/src/router.js`) + reactive store
(`admin/src/state.js`), talking to the API through `shared/api.js`. Dev ports: **:3000 Vite,
:3001 API** (under preview tools always run API on 3001 — PORT=3000 injection breaks `npm run
dev`). Prod: one Node server serves the built SPA + API on :3000.

~36 screens in three bands:
- **Product (manager/member):** Login/Register, member Home (first-run "how it works"), Team
  (auto-built, Tidy-up merge/rename), Person detail ("Since last time" + "Prep your next 1:1"),
  Runs list + read-only run detail with ★ rating, Privacy note, About, Feedback.
- **The run flow:** Intake → Focus points → Preparation → Bank → Questioning (turn-by-turn with
  the planner) → Evaluation → Briefing → Debrief — each generating step streamed over SSE.
- **Internal tooling (admin/superadmin):** Start, Compare runs, Library, Lexicon review, Role
  lexicons, Meeting arcs, Personas, Regression, Review-run (8-dimension verdict grid), Guide
  (heartbeat-live), Tasks board (the build-plan checklist — see §8), Universe (live pipeline
  map), Registered (superadmin adoption view), User management (roles, deactivate), Error log
  (superadmin).

**Design system (root `DESIGN.md` is law, auto-loaded every session):** Flowbite 2.5.2 shapes
wearing Sero tokens (`admin/src/styles/design.css`; visual sheet at
`admin/public/sero-flowbite/index.html`, in-app under Admin → Design system).
Ink #1f2a37 on page #f5fafd, white cards with 1px borders, **one sky-blue accent (#5aa9e6) per
screen**, coral/mint/gold/lavender semantics, Bricolage Grotesque display over Inter body,
radii 4px (controls) / 12px (cards), **14px text floor — nothing smaller, ever**, tokens-only (no
hex in screen files), every destructive action through the shared confirm dialog, phone width
must work with no page-level sideways scroll. Ten-rule "before you build" checklist in DESIGN.md.

---

## 7. Testing, quality, and the money rule

- **Free (default, $0):** `npm test` — hermetic offline suite, currently **65/65 green**;
  `npm run typecheck` (strict TS); `npm run build`;
  `node scripts/replay-scenario.js <id> --fixtures-only`.
- **Paid (hits OpenAI — NEVER without Carl's explicit per-run yes, cost stated first):**
  `npm run gate` (8 golden scenarios through the live pipeline + deterministic trust checks vs
  baseline, ~$3 full, ~$0.35 one case via `node scripts/gate.js --only <case>`), `npm run smoke`
  (full 5-stage E2E on a scenario), `npm run eval` (plan-turn rules + replay),
  `scripts/sweep.js` (persona bench). When approved, run the **smallest thing that proves the
  point**. ⚠️ `scripts/gate.js` executes on import — read/grep it, never `node -e require` it.
- **Test-first is house law:** red → green → refactor; no production code without a failing test
  first; tests mirror the source tree. All new code is strict TypeScript.
- **Verify the destination, not the code:** before claiming "saved/persisted", query the actual
  store (the Neon table, the file on disk) — never infer from routing logic.
- **Trust checks + golden set** (`evals/`) are the engine's regression net: deterministic
  assertions that can't be flipped by an LLM judge (the judge is advisory only).

---

## 8. How we work — the method and the standing rules

This project runs on discipline as much as code. If you're advising or continuing the work,
these rules are binding:

**The Darren Method (any multi-step change):** plan lives in `docs/todo/<slug>/` — a `PLAN.md`
overview + one file per phase, each phase ending with QA scenarios. **One phase at a time.**
Rituals: baseline first (run free checks before touching anything, so pre-existing failures
don't get blamed on new work) → build → offline-verify → **Carl walks the QA scenarios and
green-lights** (the agent never self-certifies "done") → commit on green light (local only, no
push unless asked) → next phase. Finished plans move to `docs/todo/done/`. Cut scope goes to a
"Parked" section, not into the current phase.

**Two trackers, nothing else is a status source** (`docs/TRACKERS.md` is the map):
- `STATUS.md` (root) — tactical: the "▶ Your move" banner, active phases, checkboxes. Updated at
  every phase boundary; Carl should never have to ask "where are we".
- `SERO_BOARD.md` (root) — strategic feature board.
- Everything else is a log (PROGRESS.md — append-only decisions), a feature (the /tasks board
  badges in `admin/src/stages/tasks.js`, whose `s` field drives the build-board and the "copy
  continue prompt"), or a story (`docs/sero-how-it-works.html`, the hand-refreshed founder
  changelog).

**"Check point"** — one word from Carl, two meanings: mid-work it means *save everything*
(commit the tree as a checkpoint, refresh STATUS.md, refresh the chat log); at the start of a
fresh session it means *restore* — read STATUS.md + PROGRESS + git log and give him the full
"where we are, your move" picture without being asked twice.

**Guardrails** (`docs/GUARDRAILS.md`): every request from Carl is checked against five drift
types — goal drift (features/polish over the goal), pace drift (jumping ahead / skipping QA),
honesty drift (flattery / hiding problems), money drift (paid runs), scope creep. If one fires,
the reply leads with a ⚠️ warning block. Advise, never block — Carl can always proceed.

**Communication with Carl:** plain language, short. Every agent reply opens with a slim
`📌 TITLE` line (his current ask) and ends with one bottom box — `🧭 ORIGINALLY` (the thread's
opening request, pinned) / `🔵 DOING` (what just happened) / `🔴 YOU` (his single move, or
lettered A/B/C options with a recommendation). At genuine forks: 2–4 options, one recommended.

**Other standing rules:** no silent masking (engine honesty, §2) · commits are explicit, never
assumed automated · work locally, no PR/CI noise · never bulk-delete untracked files in
`questions/` · `docs/chat-history/` + `scripts/chat-log.py` are local-only and git-ignored on
purpose (Carl's machine keeps a readable transcript of every session; refresh daily) · stash
list stays clean (old ones archived as tags 2026-06-29).

---

## 9. Where we are right now (2026-07-05)

**Big picture:** the engine works end-to-end; the app is multi-tenant, authenticated, and safe
for real staff data; the manager return-visit loop (runs, ratings, team, per-person history) is
built and signed off; Carl has a superadmin window on the alpha. **Not hosted yet** (parked by
Carl), no real alpha users yet. `npm test` 65/65, typecheck clean, `main` local-first (pushed to
origin 2026-07-04).

**Done and signed off (the spine, newest last):**
- Prototype→Production 001–006: TypeScript conversion, conventions, Postgres foundation, **Auth**
  (register/login, hashed passwords, guarded pages, dev side-door, signup-creates-company).
- 007 Login screen (folded into the one SPA — no separate customer app for now) + auth-hardening
  (sessions fenced by company; runs endpoints require login).
- 009 "ready to share": safety floor (data fenced org+role, AI keys server-only, DB audited),
  privacy note + consent, feedback + About, repo tidy, hermetic tests, newcomer docs. Hosting
  parked; continuity built then removed at Carl's request (2026-07-06).
- **Pre-go-live PG1–PG9** (the return-visit track): Runs list + reopen + 1–5★ rating, auto-built
  Team + person pages ("Since last time", "Prep your next 1:1"), superadmin gate + Registered
  screen + user→teams→runs drilldown. PG1–PG8 closed; PG9 (merge/rename Tidy-up) built, awaiting
  Carl's walk. Budget used ~$0.35 of a $3 OK.
- Roles rename owner/admin/member → **admin/manager/member**, migrated on live Neon.
- Cleanup-audit (all 4 phases, one day): 17 hidden type errors → 0, ~1,650 dead lines gone,
  tests 52→57 (now 65), proven by one paid gate case (PASS).
- Design-system Phase 1 (component sheet) green-lit; page-heartbeat Phase 1 (live Guide)
  green-lit; test-engine-hub Phase 1 (persona-run job service) walked via delegation, all
  scenarios passed live, $0.

**Built, awaiting Carl's QA walk (not self-certified):**
- **mobile-responsive Phase 1** — below 768px the nav rail becomes a slide-in drawer behind a ☰
  header; desktop untouched. Browser-verified at 375×812; not committed. (Track: all 38 screens,
  5 phases, no paid runs.)
- **design-system Phase 2** — root `DESIGN.md` auto-loads every session; walk = sheet looks
  right + a fresh agent mocks a screen that comes out Sero-styled unprompted.
- **error-log Phase 1** — `error_logs` live on Neon, every API 5xx records a row (verified by
  query); the superadmin screen is Phase 2, in progress (`admin/src/stages/admin-error-log.ts`
  scaffolding in the working tree).
- **user-management Phase 3** — deactivate/reactivate (kills live sessions immediately;
  guardrails: no self, no superadmin, not an org's last active lead; audited). Backend +
  frontend committed, awaiting walk. Phase 2 (change role) already verified end-to-end on Neon
  and closed.
- **PG9** (above).

**Queued next (on Carl's go):** page-heartbeat Phase 2 (Universe ring goes honest) ·
test-engine-hub Phase 2 (real engine runner, offline) · error-log Phase 2 (the screen) ·
mobile-responsive Phases 2–5 · user-management Phases 0/4/5.

**Parked (deliberately, do not restart unprompted):** hosting · planner-grounding ·
briefing-readability-p0 · run-qa-fixes phases 2–4 (need paid walks) · engine unit tests /
god-file splits / purge-guard follow-ups. (**Continuity/cross-session follow-up was built then
REMOVED at Carl's request 2026-07-06 — not parked, gone; don't rebuild or re-pitch unless he asks.**)

---

## 10. Glossary (project vocabulary)

- **Run / session** — one full 1:1 prep: notes in → briefing out. Session = live; run = finished.
- **Briefing** — the final 8-axis scored output the manager reads.
- **Focus point** — a topic the meeting should cover, typed against a catalogue.
- **Focus arc** — per-focus progress tracking across the conversation; also the gate that keeps
  competency content out of bi-weekly/feels-off meetings.
- **Walk** — Carl (or a delegated agent, when he says so) manually stepping through a phase's QA
  scenarios. Nothing is ✅ until walked and green-lit.
- **Gate** — `scripts/gate.js`, the paid 8-scenario regression harness with deterministic trust
  checks vs a pinned baseline.
- **Golden set** — pinned known-good runs used as the regression baseline.
- **Persona** — a scripted fake employee whose canned answers drive automated full-engine runs.
- **Superadmin** — Carl's allowlisted cross-company read-only view; independent of the role enum.
- **Side-door** — the dev-only one-click login, hard-gated off in production.
- **Darren Method** — the one-phase-at-a-time build discipline (§8).
- **Checkpoint** — save-everything snapshot, or restore-the-picture command (§8).
- **The two trackers** — STATUS.md (now) and SERO_BOARD.md (map); everything else is a log.
- **Universe / Guide / Tasks** — internal screens: live pipeline map, heartbeat-live app guide,
  and the build-plan board whose badges mirror real build status.

---

*End of handover. If you (the reader) are a Claude chat advising Carl: keep answers plain and
short, respect the money rule (nothing that spends without a stated cost + his yes), don't
suggest rebuilding continuity (he removed it 2026-07-06), and point him at STATUS.md for anything
time-sensitive — this file was true on 2026-07-05 (continuity note updated 2026-07-06) and the
project moves fast.*
