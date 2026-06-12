# SERO BOARD — the single source of truth

**This is the only active board.** Every other planning file is either done, parked, or points here.
Created 2026-06-12. Driver: Carl. Update this file the moment work lands — not the old plans.

Standing constraints (from CLAUDE.md):
- **No paid runs without a yes.** Anything hitting the OpenAI API needs Carl's explicit per-run go-ahead with a cost stated first (~$0.35/pipeline run, ~$3 full gate). Smallest thing that proves the point: `node scripts/gate.js --only <case>`.
- **No silent masking.** Surface raw model output; gate and flag, never rewrite.
- **One phase at a time** (Darren Method) — product owner green-lights before the next phase.

---

## 1. Now — finish in-flight work, no new build until green

| Item | State | Next step |
|---|---|---|
| **Top up OpenAI credit + cheap gate re-check** | Credit exhausted ~19:10 on 2026-06-12 (see [audit note](docs/todo/cleanup-board/audit-note.md)) | Carl tops up → `node scripts/gate.js --only <case>` (~$0.35) to confirm all green |
| **engine-trust-gates Phases 1–3** ([plan](docs/todo/engine-trust-gates/PLAN.md)) | Committed (`ee018b5`, `bb49e7c`, `cd581a7`) and machine-verified by the GREEN 19:08 gate (8/8 PASS) | Carl product-owner walkthrough of the phase scenarios |
| **engine-trust-gates Phases 4–6** (relational-arc gate at question layer; axis accumulation; briefing confidence honesty) | Not started | Start after Phases 1–3 walkthrough |
| **role-profiles Phases 2–4** ([plan](docs/todo/role-profiles/PLAN.md)) | Built, machine-verified | Carl product-owner walkthrough of the scenarios |
| **jun11-demo-fixes Phase 4** — back navigation in live Q&A ([plan](docs/todo/jun11-demo-fixes/PLAN.md)) | Not started (Phases 1–3 done & committed) | Build after Phases 1–3 sign-off |
| **cleanup-board** (this consolidation) ([plan](docs/todo/cleanup-board/PLAN.md)) | Phase 2 in progress | Phases 3–5: banners, next-stage spec, close out |

## 2. Next — after Now is green

| Item | Scope |
|---|---|
| **Next-stage build** ([spec](docs/todo/next-stage/PLAN.md) — written in cleanup Phase 4) | 8 phases, hardening + gap-fill of the existing app: contracts → session continuity (persistence) → briefing fallback → issue pills/observed shift → prep quality → prep timeline UI → live runner polish → summary/follow-up. Nothing here starts while Now isn't green. |
| **verdicts-june-07** ([plan](docs/todo/verdicts-june-07/PLAN.md)) | 3 phases: honest arc stages in scripted runs, reword 3 clunky questions, briefing language fit. Real output quality — kept. |

## 3. Parked — good ideas, not now

- **person-profiles feature** ([plan](docs/todo/person-profiles/PLAN.md)) — per-person history pages + "how to help them" synthesis. Parked: manager-first MVP needs no history analytics. (The scripted-persona QA *runs* stay — they're test infrastructure, not this feature.)
- **inbox-review-june-10** ([plan](docs/todo/inbox-review-june-10/PLAN.md)) — library-as-inbox review tooling. Revisit after the next build stage.
- **Executive dashboards** — too early, risks HR creep.
- **Benchmarking** — needs data volume and a trust model first.
- **Relationship visualisations** — interesting, not core.
- **Sentiment trend graphs** — could feel surveillance-heavy.

## 4. Cut — not happening in this direction

- **Product persona work** (anything beyond role-profiles). Role-profiles itself is role *context*, stays active in Now.
- **Historical analytics** — replaced by **session continuity**: session-level history only (save/resume a run's stages, see past sessions for context). **No dashboards, no trends, no HR analytics.** That's the whole scope.
- **Generic coaching toolbox** — Sero preps real 1:1s; it is not a content library.

## 5. Done / committed

- **engine-trust-gates Phases 1–3** — session-isolated question pool, honest thread-follow stems, planner grounding gate (`ee018b5`, `bb49e7c`, `cd581a7` + churn commit `9936c89`). Validated by green gate 2026-06-12 19:08 (8/8).
- **jun11-demo-fixes Phases 1–3** — question integrity gate, brief wording, live scores (`5763b7e`, `91db38d`, `023a82c`), live-verified on the Machar session.
- **role-profiles Phase 1** — core module + prompt + cache, green-lit 2026-06-11.
- **Root [PLAN.md](PLAN.md)** — all 14 rows done; kept as archive.
- **[plans/log-fix-audit.md](plans/log-fix-audit.md)** — 100 issues, 93 done, 0 open; reference only.
- Older finished work: [docs/todo/done/](docs/todo/done/) and [plans/done/](plans/done/).

---

## Repo state (audited 2026-06-12, late evening)

`git status` is clean (only this cleanup's folder is new). The evening's ~560-file churn was all engine-trust-gates work, now committed — full mapping in the [audit note](docs/todo/cleanup-board/audit-note.md). Two old stashes exist (`cleanup/remove-dead-ai-handoff-core`, `design-system-foundation`) — **do not pop**. `logs/**` is gitignored apart from a May keep-set.

**Gate status:** the code is green — last completed gate **PASSED 8/8** (2026-06-12 19:08, [result](logs/gate/2026-06-12T12-08-46-558Z/result.json)). The later 19:18 run **errored because API credit ran out**, not from a regression: all 18 attempts died at the first OpenAI call, $0 spent ([result](logs/gate/2026-06-12T12-18-27-732Z/result.json)). Re-check after top-up with `gate --only <case>` (~$0.35).

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
