# SERO BOARD — the single source of truth

**This is the only active board.** Every other planning file is either done, parked, or points here.
Created 2026-06-12. Driver: Carl. Update this file the moment work lands — not the old plans.

Standing constraints (from CLAUDE.md):
- **No paid runs without a yes.** Anything hitting the OpenAI API needs Carl's explicit per-run go-ahead with a cost stated first (~$0.35/pipeline run, ~$3 full gate). Smallest thing that proves the point: `node scripts/gate.js --only <case>`.
- **No silent masking.** Surface raw model output; gate and flag, never rewrite.
- **One phase at a time** (Darren Method) — product owner green-lights before the next phase.

---

## 1. Now — open work

> **Stage: VALIDATION.** The one thing only Carl can do: **name the 3 corridor managers + flip Render to paid → start the corridor test.** Everything below is either the internal Monthly Check-in build (conscious pre-Gate-1 exception) or supporting polish. Pass bar = 2 of 3 managers prep a 2nd 1:1 *unprompted* in ~2 weeks. No nudge features until that gate passes.

**The 5 in-flight tracks (one phase at a time; Carl green-lights before each next). Full per-track status → [STATUS.md](STATUS.md).**

| Track | State |
|---|---|
| **[monthly-checkin](docs/plans/doing/monthly-one-on-one/plan.md)** — guided "Monthly Check-in", a 2nd kind of 1:1 (the main line) | P1 of 7 ✅ green-lit 2026-07-13 (card + 7-stage runner + auto-save/resume, `work/monthly-checkin`). P2 next: real per-person trackers + side panels. |
| **[promises-loop](docs/plans/doing/promises-loop/plan.md)** — lock in agreed actions, close them off next time | P1 ✅ green-lit 2026-07-12. P2 (card zero) next. |
| **[admin-live-deploy](docs/plans/doing/admin-live-deploy/plan.md)** — ship the admin console to live + founder pulse | P1 ✅ green-lit 2026-07-12. P2+P3 built, awaiting Carl's walk. |
| **[manager-workspace-prototype](docs/plans/doing/manager-workspace-prototype/plan.md)** — a `/test` walkable manager-loop concept | P1 🔨 built (mock-only). Awaiting walk. |
| **[ux-audit-fixes](docs/plans/doing/ux-audit-fixes/plan.md)** — fix every defect from the 2026-07-15 UX audit | 🆕 folder created 2026-07-15, 5 phases scoped. Awaiting Carl's read-through + green-light. |

The Monthly Check-in un-park (2026-07-12): Carl overrode the Gate-1 park after approving the `/test` prototype ("okay i really like it"); the plan absorbed his walk feedback (no Prep stage, side panels, sequential feedback, ONE AI call, member request/goal writes as Phase 7). Internal-admin only, so it can't touch the corridor metric.

---

## Recently shipped (all closed → [docs/plans/done/](docs/plans/done/))

The record; git history + each `done/` folder hold the detail. Newest first.

| When | Track | One line |
|---|---|---|
| 2026-07-14 | [team-access-redesign](docs/plans/done/team-access-redesign/plan.md) | Confusing two-mode Team screen → one list, access visible + given in one sheet. Merged to `main`, live. |
| 2026-07-12 | [past-1on1-view](docs/plans/done/past-1on1-view/plan.md) | Manager's "Past 1:1" is now a clear 3-tab view (Overview / Briefing / Answers). |
| 2026-07-12 | [focus-freshness](docs/plans/done/focus-freshness/plan.md) | Repeat 1:1s stop suggesting the same topics — first retention lever at the validation metric. |
| 2026-07-12 | [forgot-password](docs/plans/done/forgot-password/plan.md) | One shared reset flow for managers, members + admin. Live. |
| 2026-07-11 | mobile-ux | The whole product works on a phone (Carl walked it: "looks ok"). PR #11, live. Ad-hoc track, record in STATUS history. |
| 2026-07-11 | [validation-kit](docs/plans/done/validation-kit/plan.md) | The corridor-test kit — see who came back, testers succeed without Carl, one-tap verdict. 6 phases. |
| 2026-07-11 | [transactional-email](docs/plans/done/transactional-email/plan.md) | Sero can send email (signup alerts, invite links, join alerts). Live on seroapp.com. |
| 2026-07-11 | [universe-monitoring](docs/plans/done/universe-monitoring/plan.md) | The Universe map became a monitoring tool (return glow, health, cost per run). 5 phases. |
| 2026-07-11 | [thread-follow](docs/plans/done/thread-follow/plan.md) | The engine follows the person's answer, not just its queue. `plan_thread_follow` 0.125 → 0.43. |
| 2026-07-10 | [engine-hardening](docs/plans/done/engine-hardening/plan.md) | Robustness wins from old-Sero RUNNER.md — latency capture, concurrency cap + breaker, grounding checks. |
| 2026-07-09 | [postgres-runtime-data](docs/plans/done/postgres-runtime-data/plan.md) | Postgres is the single store, live + local; a live 1:1 writes zero files. All 7 phases. |
| 2026-07-09 | [user-management](docs/plans/done/user-management/plan.md) | Superadmin fully manages testers (table · role · deactivate · delete). Phases 1–4; P5 parked. |
| 2026-07-09 | [guest-run](docs/plans/done/guest-run/plan.md) | Try Sero with no account, save at the end. 4 phases. |
| 2026-07-08 | [render-deploy](docs/plans/done/render-deploy/plan.md) | **Sero went LIVE** at sero-obwq.onrender.com. `/commit` + `/release` are the two-word workflow. |
| 2026-07-08 | [frontend-admin-split](docs/plans/done/frontend-admin-split/plan.md) | Customer app is its own app; the admin console never ships. |
| 2026-07-08 | [agent-native](docs/plans/done/agent-native/plan.md) | Codebase is agent-native — offline cassette replay, true maps, decision tables. |
| 2026-07-08 | [engine-improvements](docs/plans/done/engine-improvements/plan.md) | Back-catalogue read → one real fix (smoke gate was blind to the honesty fields). |
| 2026-07-08 | [manager-ready](docs/plans/done/manager-ready/plan.md) | The paying customer's clean rail + the Figma design polish. |
| 2026-07-08 | [hide-ai-words](docs/plans/done/hide-ai-words/plan.md) | Managers can hide / restore the AI's role words (engine never rewritten). |
| 2026-07-08 | [feedback-inbox](docs/plans/done/feedback-inbox/plan.md) | In-app feedback inbox + per-row delete. |
| 2026-07-08 | [plan-turn-runner-gates](docs/plans/done/plan-turn-runner-gates/plan.md) | plan-turn mechanical rules promoted from "asked to obey" to "runner enforces". |
| 2026-07-08 | [pre-go-live](docs/plans/done/pre-go-live/overview.md) | The alpha-worthy manager tool — Runs, reopen, ratings, Team, person detail, superadmin. 9/9. |
| 2026-07-07 | [cto-check-july](docs/plans/done/cto-check-july/README.md) | Did thin manager input give a good brief? Answer: yes (brief 🟢 summary 🟢 questions 🟢). |
| 2026-07-06 | [people-roster](docs/plans/done/people-roster/plan.md) | Managers formally have members; 1:1s owned by that pair. |
| 2026-07-05 | [design-system](docs/plans/done/design-system/plan.md) | The Sero look codified — Flowbite + Carl's tokens + a root `DESIGN.md` 10-rule checklist. |

Older closed tracks (auth, monorepo, TypeScript conversion, etc.) live in [docs/plans/done/](docs/plans/done/) and [docs/archive/](docs/archive/).

## 2. Next — after Now is green

### ✔ Monthly 1:1 guided runner → UN-PARKED 2026-07-12 as "Monthly Check-in"
Moved to Section 1 (Now). Carl overrode the Gate-1 park after approving the `/test` prototype; the plan
absorbed his walk feedback (no Prep stage, side panels, sequential feedback, ONE AI call, member
request/goal writes as Phase 7). Live plan: [docs/plans/doing/monthly-one-on-one/](docs/plans/doing/monthly-one-on-one/plan.md).

### Code-health tracks (from the 2026-07-09 CTO deep audit)

The full four-corner audit (engine · api+db · web apps · scripts) found the codebase **healthy** —
strict TS in engine+backend, clean layer boundaries, no dead routes, no unused deps, indexes match
queries, tests 109/109. Quick wins were done same-day (dead code/asset removed, live deploy 1.9MB→1.2MB
via no public sourcemaps, `frontend/dist` untracked; commit `41c420d5`), and a safe backend speed batch
landed (parallel boot-cache warm, batched recent-runs artifact read, deduped client-IP; `93258629`,
proven against real Neon). The remaining debt is three deliberately-scheduled tracks — Carl's call
2026-07-09, run one at a time AFTER testers are on live:

| Track | What | Size | Notes |
|---|---|---|---|
| **shared-folder-split** | End the tangled cross-import — the customer app reaches into `admin/src` for 33 modules and `admin/src/main.js` imports `frontend`'s member-home back. Lift the ~30 co-used stages+ui into a top-level `shared/`, one router + one nav. | L | Biggest long-term clarity win; the two apps' bidirectional dependency is the real structural debt. |
| **admin-typescript** | Convert the ~55 remaining plain-`.js` files in `admin/src` to strict TS (engine+backend already 100%; the `.ts` neighbours prove the migration is half-done). | L | House-rule compliance; do incrementally, file-by-file with tests. |
| **split-giant-files** | Break up the 700–916-line multi-concern files: `reviewer.ts` (916), `role-profile.ts` (748), `run-history.ts` (733), `runs-store.ts` (731), `sessions.service.ts` (712), the 5 big admin stage files. Also **fold in the two deferred DB speed-ups** — narrow the superadmin/guest list queries off the full `state` jsonb onto the indexed columns, and de-N+1 `pgFindLatestRunWithLock` — since they live in `runs-store.ts` and are safest done with its restructure (near-zero payoff at alpha scale, real risk in the fence file, so NOT bolted on now). | L | Split view/data/handlers per module; parity test is the safety net for `runs-store`. |

Also parked from the audit (small, do anytime): compress the 5 login hero JPGs (~450KB→~100KB) · a `content/questions/_runtime/**` gitignore rule so generated questions stop cluttering `git status` (must NOT hide authored banks) · parallelize the 64s test runner.

| Item | Scope |
|---|---|
| **Next-stage build** | **✅ ALL 8 PHASES DONE 2026-06-16** → `done/`. Hardening core (contracts, persistence/resume, deterministic fallback) + feature passes (issue pills + observed shift, prep quality, prep timeline UI, runner polish, shared/private split). One carve-out — cross-session follow-up auto-injection — **un-parked 2026-06-21**, later built as the continuity track and then **removed 2026-07-06** (see the active line above). |

## 2b. Pre-go-live (deferred to launch time)

Not for now — revisit when we're close to a release.

| Item | Why | Source |
|---|---|---|
| **Auth via Google/Microsoft SSO** — don't roll our own password/user handling | Avoids owning passwords + user management, which we shouldn't be doing ourselves | Darren (CTO) coaching, 2026-07-04 |
| **Searchable per-manager history** — move the past 1:1 runs + QA verdicts (`review.json`) off disk into the DB, queryable by the manager | The honest moat: after months, a manager's own searchable 1:1 history is something they'd lose by leaving (switching cost). NOT model-learning — stays inside the no-inference rule (their data, given back to them). A database itself is not a moat; this is. Best built *once real alpha users are generating history worth keeping* — don't reopen mid-alpha (the continuity/learning track ripped out 2026-07-06 was the *other*, fenced-off, kind of moat). | Carl "missing moats" deep-dive, 2026-07-07 |

## 3. Done

Completed work has been cleared from this board. The record lives in git history.

---

## Repo state (audited 2026-06-29)

Phases 001–006 are all closed and archived under `docs/plans/done/`; Phase 007 (login screen, folded into the admin console) is **done** — both phases committed, plan closed to `docs/plans/done/login-screen/`.
**There is no auto-commit/push automation** — commits are made explicitly. `main` is currently **ahead of
origin** (local-only by Carl's call for the ultra batch — pushing remains a deliberate manual step). The three
old stashes were archived as `archive/*` tags + dropped 2026-06-29; the stash list is clean — keep it clean.
`logs/**` is gitignored apart from a small May keep-set (de-identified — no real names or notes).

**Test status:** `npm test` **127/127** green, `npm run typecheck` clean, offline ($0). Live
gate/smoke/eval are PAID and need a per-run go-ahead. Sign-off is tracked per-phase in each PLAN.md,
`STATUS.md`, and Section 1 above.

## Trust boundary rules (what's enforced today)

Enforced in code by `evals/trust-checks.js` + `scripts/gate.js` (hard-fail on regression):

1. **Manager-only field:** `brutal_truth_manager` never appears in employee-facing/shared output. Everything else in the briefing is written as shareable.
2. **Private-note leak:** manager judgment markers from private notes (doubt, worry, flight risk, readiness…) must not surface verbatim in employee-facing briefing fields.
3. **No HR labels:** briefings hard-reject "flight risk", "doesn't care" and similar unless quoting the transcript.
4. **Cross-session leak:** a session must never serve vocabulary or questions from another session's run (session bank + `CROSS_SESSION_QUESTION_LEAK` check).
5. **Focus arc gate:** Bi-weekly and feels-off meetings exclude competency content — input filter + `FOCUS_ARC_LEAK`.
6. **No engine vocab in prose:** scaffolding terms (role_profile, known_challenges…) flagged if they leak into briefing text.
7. **Standing rule for future surfaces:** when shared/email/admin views exist, private manager notes never reach them. Access rules are part of the session-continuity build (Next).

## Engine quality checklist (what exists, one line each)

- **Regression gate** — `scripts/gate.js`: 8 golden scenarios through the live pipeline, deterministic trust checks vs baseline. *Costs ~$3 full / ~$0.35 single case — needs go-ahead.*
- **Smoke test** — `scripts/smoke-test.js`: full 5-stage run, log/transcript/briefing shape asserts. *Costs API — needs go-ahead.*
- **Schema validation** — every stage validates against its `RESPONSE_SCHEMA` before logging; `SCHEMA_INVALID` flags, never silent.
- **Deterministic fallbacks** — broken/leaky questions get a safe stem (`src/question-validator.js`); missing role profile gets a stated fallback block; closer failure logged, not masked. *Known hole: no briefing-generation fallback — in the next-stage spec.*
- **Free checks** — `npm test`, `node scripts/replay-scenario.js <id> --fixtures-only`, offline trust-check tests. Default to these.
