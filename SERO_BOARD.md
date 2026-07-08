# SERO BOARD — the single source of truth

**This is the only active board.** Every other planning file is either done, parked, or points here.
Created 2026-06-12. Driver: Carl. Update this file the moment work lands — not the old plans.

Standing constraints (from CLAUDE.md):
- **No paid runs without a yes.** Anything hitting the OpenAI API needs Carl's explicit per-run go-ahead with a cost stated first (~$0.35/pipeline run, ~$3 full gate). Smallest thing that proves the point: `node scripts/gate.js --only <case>`.
- **No silent masking.** Surface raw model output; gate and flag, never rewrite.
- **One phase at a time** (Darren Method) — product owner green-lights before the next phase.

---

## 1. Now — open work

**✅ Closed (2026-07-08): [agent-native](docs/plans/done/agent-native/plan.md) — the codebase is agent-native.**
From the principal-architect audit, all 5 phases green-lit in ONE day, **$0 total spend**: ② true agent maps
([engine-map.md](docs/reference/engine-map.md) + the rotten always-on `.cursor` rule rewritten) · ① **offline
cassette replay, the flagship** — any saved run folder replays the whole 5-stage pipeline through the real engine
(~5s, $0, no API key), and `repro-from-bundle` answers REPRODUCES: yes/no on a user's bug bundle · ③ Carl's three
recurring judgment calls as decision tables ([agent-decisions.md](docs/reference/agent-decisions.md); B2 + stonewall
stay his parked calls) · ④ web↔CLI orchestrator parity guarded by an offline test · ⑤ prompt↔gate couplings
registered + tested. Agents can now reproduce a bug, change code, and verify end-to-end for free — asking Carl
only for green lights and true product calls. Parked follow-ups in the plan. Not a feature; workshop tooling.

**✅ Closed (2026-07-07, risk closed 2026-07-08): [CTOCheckJuly](docs/plans/done/cto-check-july/README.md)** —
did *thin* manager input give a good brief, questions & summary? **Answer: YES** — brief 🟢 + summary 🟢 +
questions 🟢, all proven on the current model. The one deferred risk (vague-note fabrication in the question
stage) was re-tested 2026-07-08: focus-points → question-bank on "quiet in stand-ups", 3 runs → zero invented
facts. Not a feature. Folder → `docs/plans/done/cto-check-july/`. (Moat + learning-from-past-runs still parked.)

**▶ Active line: back to pre-go-live — getting to a live alpha.** The continuity / "moat" track was
**REMOVED 2026-07-06** at Carl's call ("this is not what I wanted at all — rip it all out"): both built
phases (① carry-forward pre-fill on prep · ② one-tap outcome capture) **and** the whole 8-phase plan were
pulled out cleanly. The **people-roster Phase 4 refactor** they'd been tangled with in the same merge was
**kept** — that stays. No continuity code or plan files remain; `npm test` + both typechecks green after
removal. Next real step: **close out pre-go-live PG9**, then the built-but-awaiting-walk tracks
(guest-run, feedback-inbox, manager-ready, frontend-admin-split).

**✅ Closed (2026-07-06): People roster — managers formally have members; 1:1s owned by that pair.**
Grew out of Carl's "members should only see their own 1:1s": the fence was already sound but
creator-based, and "1:1s about me" was impossible (people were free text). Now: a `people` table
(org+manager fenced, linkable to a user account) · every 1:1 stamps who it's ABOUT (old runs
backfilled) · New 1:1 starts from a **person picker** · Team groups by roster identity, Tidy-up
writes the roster · a **linked member's Home lists the 1:1s about them** — list-only (type ·
manager · date), privacy re-cut in the service per the no-inference ruling. All 5 phases green-lit
in 2 days, $0 spend. Plan → [done/](docs/plans/done/people-roster/plan.md). Parked there:
member detail view (`member-run-visibility`), invitations/email claim, alias retirement.

**✅ Closed (2026-07-05): Design system — Sero × Flowbite.** The Sero look (Flowbite 2.5.2 + Carl's
colours, straight from his Figma method) is now codified: a visual **component sheet**
(`admin/public/sero-flowbite/index.html`, in-app under Admin → Design system) + a root **`DESIGN.md`**
that auto-loads for every agent, every session — with a 10-rule "before you build" checklist. New and
touched screens follow it; **no bulk re-skin** (Carl's call). Plan → [done/](docs/plans/done/design-system/plan.md).

**▶ Active line: pre-go-live — a manager tool worth coming back to.** New track (2026-07-01), 9 phases,
one at a time: the manager's own **Runs** list + reopen, **rate a 1:1** (1–5★, Carl sees all), **Team**
auto-built from past 1:1s + person detail, and a **superadmin** read-only window on the whole alpha
(who's registered → their teams → their runs). Playbook
[docs/plans/doing/pre-go-live/overview.md](docs/plans/doing/pre-go-live/overview.md), live state
[docs/plans/doing/pre-go-live/progress.md](docs/plans/doing/pre-go-live/progress.md), tactical [STATUS.md](STATUS.md).
**Supersedes** the deferred member-nav Phase 2 and 009's deferred "real Team content" (folded in).
**PG1–PG7 ✅ done** (Runs list, reopen, rate a 1:1, Team auto-built + "Past 1:1s", the per-person page with
"Since last time" + "Prep next 1:1", the read-only cross-company superadmin gate, and the **Registered**
screen — every alpha company + people with the return-visit signal + rating summary, superadmin-only — all
signed off, committed to `main`). **PG8 (drilldown, incl. open-a-briefing read-only) ✅ closed 2026-07-04**
(Carl's call — read-only walk skipped; verification stands). **PG9 (merge duplicates + rename + roll-ups) is
built — awaiting Carl's walk** to close the pre-go-live build. Safety-gate progress this session: the privacy note now
discloses stored ratings + the superadmin cross-company view; run-qa C1 (tester-note leak) fixed. No hosting.

**✅ Closed (2026-07-01): Phase 009 — Getting ready to share (real-data alpha).** Every actionable phase
done; hosting (2) + continuity (8) folded into the pre-go-live track above
([plan → done/](docs/plans/done/009-ready-to-share/plan.md), detail [STATUS.md](STATUS.md)).
- **Phase 1 (safety floor / execute 008) — ✅ signed off (2026-07-01, `e68c4c8c`):** data fenced by
  org+role, AI keys proven server-only (key-search zero-hits), DB audited + cleared of unfenced rows,
  anonymous-start path decided (kept open + walled for the alpha, close before widening). Human-expert
  security review **waived/deferred** for the small alpha (accepted risk — book before widening).
  **Reversal (2026-07-05, guest-run):** "close before widening" is consciously reversed — anonymous start
  is now a product feature (guest try-out for invited demos, [docs/plans/doing/guest-run/](docs/plans/doing/guest-run/plan.md)).
  The front door followed (start-screen, ✅ closed 2026-07-06): `/` is a guest-first start screen for
  invited testers; login lives at `/login` ([plan → done/](docs/plans/done/start-screen/plan.md)).
  Compensating controls: shared daily start budget (`GUEST_RUNS_PER_DAY`, default 10) + the per-IP limit +
  claim-only-ownerless handover. Revisit the controls before a public try-it page.
- **Phase 4 (clear the QA pile) — ✅ done (2026-07-01):** all 9 built-but-un-QA'd features signed off or
  cut (repo-tidy P1/P2, frontend-admin-split P1, tracker-consolidation P1, member-nav P1, stage-data-tabs,
  sent-preview, todo-board-rebuild P3, briefing-grounding-fixes P1). Nothing half-built left on screen.
- **Phase 2 (hosted + spend-capped) — ⏸ PARKED by Carl (2026-07-01): not hosting yet.**
- **Phase 3 (privacy + first run) — ✅ done (2026-07-01, verified end-to-end, both roles).** Privacy note +
  consent, first-run guidance on member Home, real Team/Runs empty states, register landing fix.
- **Phase 5 (feedback + one-pager) — ✅ done (2026-07-01, verified end-to-end, test-first backend).**
  In-app feedback → local file (git-ignored) + an About one-pager, both in the nav footer.
- **Phases 6 (repo-tidy 3–4 + hermetic tests) & 7 (docs + newcomer README) — ✅ done (2026-07-01, walked +
  signed off):** `sessions.controller` split into focused files, `npm test` made hermetic, admin TypeScript
  pilot, tracker-consolidation + README two-source clarity.
- **Phase 8 (continuity / "remembering") — ⏸ deferred by Carl (2026-07-01):** "remembering and teams
  later" — folded into the pre-go-live track above. **Nothing live, no paid runs.** Detail in [STATUS.md](STATUS.md).

The auth history below is the foundation Phase 009 builds on.

**Phases 001–006 of the Prototype→Production line are all done, signed off, and closed to
`docs/plans/done/`.** Phase 006 (Auth — the back-end front door) was the last to land: register/login
with hashed passwords, guarded pages, a hard-gated dev side-door, and signup that creates the company
with per-company data fencing. **Phase 007 — the login screen — is DONE (2026-06-29), folded into the
existing admin console (no separate app, decided with Carl):** Phase 1 (login gate + register/login/logout
screens + boot gate) and Phase 2 (data re-pointed to the logged-in company — runs fenced per company,
sessions stamped with their company) are both green-lit and committed; the plan is closed to
`docs/plans/done/login-screen/`. **The parked hardening follow-up is now DONE (auth-hardening, 2026-07-01):**
a post-007 health check confirmed two holes and both are shut — Phase 1 fences live sessions by company
(cross-company access → 404), Phase 2 requires login on the runs endpoints (anonymous → 401, was the legacy
unfenced list). Session *start* stays open to logged-out visitors by decision. Closed to
`docs/plans/done/auth-hardening/`. Live per-phase tracker:
[`STATUS.md`](STATUS.md); full phase list in the [tasks board](admin/src/stages/tasks.js).

**Separate engine/runner track — built earlier.** Most were folded into 009 Phase 4 (the QA pile) and
**signed off 2026-07-01**. [STATUS.md](STATUS.md) is the source of truth for these; the table below just
mirrors it:

| Feature | Folder | State |
|---|---|---|
| Briefing grounding fixes | `docs/plans/done/briefing-grounding-fixes/` | Phase 1 🟢 signed off (QA pile); Phases 2–4 not started |
| See-before-sent preview | `docs/plans/done/sent-preview/` | ✅ archived to done/ 2026-07-05 (signed off 2026-07-01) |
| Stage data tabs | `docs/plans/done/stage-data-tabs/` | ✅ archived to done/ 2026-07-05 (signed off 2026-07-01) |
| Todo-board rebuild | `docs/plans/done/todo-board-rebuild/` | ✅ archived to done/ 2026-07-05 (signed off 2026-07-01; "Run the free checks" button) |
| See-before-sent (all-stage) | `docs/plans/done/see-before-sent/` | ✅ folded into sent-preview + archived 2026-07-04 (lost reorg code not rebuilt under this name) |
| Briefing readability (P0) | `docs/plans/future/briefing-readability-p0/` | Scaffolded, parked |

The QA pile is cleared and the three finished plans are archived. Still open here:
briefing-grounding-fixes (Phases 2–4 not started) and briefing-readability P0 (scaffolded, parked).

Tests: `npm test` **57/57** (offline, $0) · `npm run typecheck` clean. Commits are made explicitly
(not automated); `main` was **pushed to origin 2026-07-04** — local and origin are now in sync.

## 2. Next — after Now is green

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

**Test status:** `npm test` **57/57** green, `npm run typecheck` clean, offline ($0). Live
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
