# SERO BOARD — the single source of truth

**This is the only active board.** Every other planning file is either done, parked, or points here.
Created 2026-06-12. Driver: Carl. Update this file the moment work lands — not the old plans.

Standing constraints (from CLAUDE.md):
- **No paid runs without a yes.** Anything hitting the OpenAI API needs Carl's explicit per-run go-ahead with a cost stated first (~$0.35/pipeline run, ~$3 full gate). Smallest thing that proves the point: `node scripts/gate.js --only <case>`.
- **No silent masking.** Surface raw model output; gate and flag, never rewrite.
- **One phase at a time** (Darren Method) — product owner green-lights before the next phase.

---

## 1. Now — open work

**Active build: Phase 005 — Postgres Foundation** (`docs/todo/postgres-foundation/`). Phase 004
(Backend API v1) was product-owner signed off 2026-06-28 and closed out to
`docs/todo/done/backend-api-v1/`. Phase 005 is **blocked on one decision — Drizzle vs Prisma**;
no database code lands until that's picked (plan Step 1). Live per-phase tracker: [`STATUS.md`](STATUS.md).

**Built earlier, still awaiting Carl's product-owner QA** — not signed off, don't treat as done:

| Feature | Folder | State |
|---|---|---|
| Briefing grounding fixes | `docs/todo/briefing-grounding-fixes/` | Phase 1 of 4 built; Phases 2–4 not started |
| See-before-sent preview | `docs/todo/sent-preview/` | Both phases built, awaiting QA |
| Stage data tabs | `docs/todo/stage-data-tabs/` | All 3 phases built, awaiting QA |
| See-before-sent (live) | `docs/todo/see-before-sent/` | Built, awaiting QA |
| Todo-board rebuild | `docs/todo/todo-board-rebuild/` | Built, awaiting QA |
| Briefing readability (P0) | `docs/todo/briefing-readability-p0/` | Scaffolded, awaiting your go |

None has been walked through its QA scenarios. Next action on each: *Carl walks the scenarios →
green light → close out to `done/`.* To see runner features live, restart `npm run dev` (your dev
server may be on old code).

Tests: `npm test` **46/46** (offline, $0). Commits are **local only** — `main` is ahead of origin
and nothing has been pushed; pushing is a deliberate manual step, not automated.

## 2. Next — after Now is green

| Item | Scope |
|---|---|
| **Next-stage build** | **✅ ALL 8 PHASES DONE 2026-06-16** → `done/`. Hardening core (contracts, persistence/resume, deterministic fallback) + feature passes (issue pills + observed shift, prep quality, prep timeline UI, runner polish, shared/private split). One carve-out — cross-session follow-up auto-injection — **un-parked 2026-06-21** (now its own item below). |
| **Cross-session follow-up (continuity)** | **Un-parked 2026-06-21.** Carry prior-meeting context forward so meeting #2 reviews meeting #1's actions and commitments — the return-visit loop. Still needs person-profiles linking. *Why now:* three independent alpha-readiness research reports flagged the two-cycle return visit as central to proving willingness-to-pay — value shows on meeting #2, not #1. Not started. |

## 3. Done

Completed work has been cleared from this board. The record lives in git history.

---

## Repo state (audited 2026-06-28)

Phase 004 is closed and archived (`docs/todo/done/backend-api-v1/`); Phase 005 (Postgres) is the
active plan. **There is no auto-commit/push automation** — earlier notes here assumed one; that was
wrong. Commits are made explicitly and are **local only** (`main` is ahead of origin; nothing is
pushed). Three old stashes exist (`cleanup/remove-dead-ai-handoff-core`, `design-system-foundation`,
+ a WIP CSS/HTML cleanup) — **do not pop**. `logs/**` is gitignored apart from a small May keep-set
(now de-identified — no real names or notes).

**Test status:** `npm test` **46/46** green, offline ($0). Live gate/smoke/eval are PAID and need a
per-run go-ahead. Sign-off is tracked per-phase in each PLAN.md, `STATUS.md`, and Section 1 above.

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
- **Smoke test** — `smoke-test.js`: full 5-stage run, log/transcript/briefing shape asserts. *Costs API — needs go-ahead.*
- **Schema validation** — every stage validates against its `RESPONSE_SCHEMA` before logging; `SCHEMA_INVALID` flags, never silent.
- **Deterministic fallbacks** — broken/leaky questions get a safe stem (`src/question-validator.js`); missing role profile gets a stated fallback block; closer failure logged, not masked. *Known hole: no briefing-generation fallback — in the next-stage spec.*
- **Free checks** — `npm test`, `node scripts/replay-scenario.js <id> --fixtures-only`, offline trust-check tests. Default to these.
