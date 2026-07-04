# SERO BOARD — the single source of truth

**This is the only active board.** Every other planning file is either done, parked, or points here.
Created 2026-06-12. Driver: Carl. Update this file the moment work lands — not the old plans.

Standing constraints (from CLAUDE.md):
- **No paid runs without a yes.** Anything hitting the OpenAI API needs Carl's explicit per-run go-ahead with a cost stated first (~$0.35/pipeline run, ~$3 full gate). Smallest thing that proves the point: `node scripts/gate.js --only <case>`.
- **No silent masking.** Surface raw model output; gate and flag, never rewrite.
- **One phase at a time** (Darren Method) — product owner green-lights before the next phase.

---

## 1. Now — open work

**▶ Active line: pre-go-live — a manager tool worth coming back to.** New track (2026-07-01), 9 phases,
one at a time: the manager's own **Runs** list + reopen, **rate a 1:1** (1–5★, Carl sees all), **Team**
auto-built from past 1:1s + person detail, and a **superadmin** read-only window on the whole alpha
(who's registered → their teams → their runs). Playbook
[docs/pre-go-live/OVERVIEW.md](docs/pre-go-live/OVERVIEW.md), live state
[docs/pre-go-live/PROGRESS.md](docs/pre-go-live/PROGRESS.md), tactical [STATUS.md](STATUS.md).
**Supersedes** the deferred member-nav Phase 2 and 009's deferred "real Team content" (folded in).
**PG1–PG6 ✅ done** (Runs list, reopen, rate a 1:1, Team auto-built + "Past 1:1s", the per-person page with
"Since last time" + "Prep next 1:1", and the read-only cross-company superadmin gate — all signed off,
committed to `main`). **PG7 (Admin: who's registered — the first superadmin screen) is next — not yet broken
down.** No paid runs.

**✅ Closed (2026-07-01): Phase 009 — Getting ready to share (real-data alpha).** Every actionable phase
done; hosting (2) + continuity (8) folded into the pre-go-live track above
([plan → done/](docs/todo/done/009-ready-to-share/PLAN.md), detail [STATUS.md](STATUS.md)).
- **Phase 1 (safety floor / execute 008) — ✅ signed off (2026-07-01, `e68c4c8c`):** data fenced by
  org+role, AI keys proven server-only (key-search zero-hits), DB audited + cleared of unfenced rows,
  anonymous-start path decided (kept open + walled for the alpha, close before widening). Human-expert
  security review **waived/deferred** for the small alpha (accepted risk — book before widening).
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
`docs/todo/done/`.** Phase 006 (Auth — the back-end front door) was the last to land: register/login
with hashed passwords, guarded pages, a hard-gated dev side-door, and signup that creates the company
with per-company data fencing. **Phase 007 — the login screen — is DONE (2026-06-29), folded into the
existing admin console (no separate app, decided with Carl):** Phase 1 (login gate + register/login/logout
screens + boot gate) and Phase 2 (data re-pointed to the logged-in company — runs fenced per company,
sessions stamped with their company) are both green-lit and committed; the plan is closed to
`docs/todo/done/login-screen/`. **The parked hardening follow-up is now DONE (auth-hardening, 2026-07-01):**
a post-007 health check confirmed two holes and both are shut — Phase 1 fences live sessions by company
(cross-company access → 404), Phase 2 requires login on the runs endpoints (anonymous → 401, was the legacy
unfenced list). Session *start* stays open to logged-out visitors by decision. Closed to
`docs/todo/done/auth-hardening/`. Live per-phase tracker:
[`STATUS.md`](STATUS.md); full phase list in the [tasks board](admin/src/stages/tasks.js).

**Separate engine/runner track — built earlier.** Most were folded into 009 Phase 4 (the QA pile) and
**signed off 2026-07-01**. [STATUS.md](STATUS.md) is the source of truth for these; the table below just
mirrors it:

| Feature | Folder | State |
|---|---|---|
| Briefing grounding fixes | `docs/todo/briefing-grounding-fixes/` | Phase 1 🟢 signed off (QA pile); Phases 2–4 not started |
| See-before-sent preview | `docs/todo/sent-preview/` | 🟢 signed off (QA pile, walked live) |
| Stage data tabs | `docs/todo/stage-data-tabs/` | 🟢 signed off (QA pile, walked live) |
| Todo-board rebuild | `docs/todo/todo-board-rebuild/` | 🟢 signed off (QA pile; "Run the free checks" button) |
| See-before-sent (live) | `docs/todo/see-before-sent/` | Built, still awaiting QA (not in the pile) |
| Briefing readability (P0) | `docs/todo/briefing-readability-p0/` | Scaffolded, parked |

The QA pile is cleared. The two still-open rows (see-before-sent live, briefing-readability P0) await a
Carl walk → green light → close out to `done/`.

Tests: `npm test` **52/52** (offline, $0) · `npm run typecheck` clean. Commits are made explicitly
(not automated); `main` is currently **ahead of origin** (local-only by Carl's call — nothing pushed).

## 2. Next — after Now is green

| Item | Scope |
|---|---|
| **Next-stage build** | **✅ ALL 8 PHASES DONE 2026-06-16** → `done/`. Hardening core (contracts, persistence/resume, deterministic fallback) + feature passes (issue pills + observed shift, prep quality, prep timeline UI, runner polish, shared/private split). One carve-out — cross-session follow-up auto-injection — **un-parked 2026-06-21** (now its own item below). |
| **Cross-session follow-up (continuity)** | **Un-parked 2026-06-21.** Carry prior-meeting context forward so meeting #2 reviews meeting #1's actions and commitments — the return-visit loop. Still needs person-profiles linking. *Why now:* three independent alpha-readiness research reports flagged the two-cycle return visit as central to proving willingness-to-pay — value shows on meeting #2, not #1. Not started. |

## 3. Done

Completed work has been cleared from this board. The record lives in git history.

---

## Repo state (audited 2026-06-29)

Phases 001–006 are all closed and archived under `docs/todo/done/`; Phase 007 (login screen, folded into the admin console) is **done** — both phases committed, plan closed to `docs/todo/done/login-screen/`.
**There is no auto-commit/push automation** — commits are made explicitly. `main` is currently **ahead of
origin** (local-only by Carl's call for the ultra batch — pushing remains a deliberate manual step). Three old
stashes exist (`cleanup/remove-dead-ai-handoff-core`, `design-system-foundation`, + a WIP CSS/HTML
cleanup) — **do not pop**. `logs/**` is gitignored apart from a small May keep-set (de-identified — no
real names or notes).

**Test status:** `npm test` **52/52** green, `npm run typecheck` clean, offline ($0). Live
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
