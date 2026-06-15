# SERO BOARD — the single source of truth

**This is the only active board.** Every other planning file is either done, parked, or points here.
Created 2026-06-12. Driver: Carl. Update this file the moment work lands — not the old plans.

Standing constraints (from CLAUDE.md):
- **No paid runs without a yes.** Anything hitting the OpenAI API needs Carl's explicit per-run go-ahead with a cost stated first (~$0.35/pipeline run, ~$3 full gate). Smallest thing that proves the point: `node scripts/gate.js --only <case>`.
- **No silent masking.** Surface raw model output; gate and flag, never rewrite.
- **One phase at a time** (Darren Method) — product owner green-lights before the next phase.

---

## 1. Now — ✅ GREEN (signed off 2026-06-15)

The whole Now column was product-owner-walked and signed off on 2026-06-15 (Carl + Claude;
session spend ~$0.35 — one live `leak-devon` gate PASS). Everything below is verified; only two
small, deliberately-deferred items remain.

| Item | State | Next step |
|---|---|---|
| **OpenAI credit** | Working (live `leak-devon` gate ran clean 2026-06-15) | — |
| **engine-trust-gates Phases 1–6** ([plan](docs/todo/engine-trust-gates/PLAN.md)) | ✅ Signed off — live `leak-devon` PASS + Phase 5 ratified via live `growth-ahmed` (axes accumulate, 0 regressed) + all gates green in 26/26 offline | done |
| **role-profiles Phases 2–4** ([plan](docs/todo/role-profiles/PLAN.md)) | ✅ Signed off — cached-second-run proven live + offline; block in all 5 stages; focus-arc gate green | done |
| **jun11-demo-fixes Phases 1–3** ([plan](docs/todo/jun11-demo-fixes/PLAN.md)) | ✅ Signed off — prior Machar gate PASS + offline gates green | done |
| **jun11-demo-fixes Phase 4** — back navigation | 🔨 not started (now **unblocked**) | net-new; build when ready |

**Feature folders (built since the board, all signed off 2026-06-15):** arc-editor (edit/save
meeting arcs, 5/5 live) · role-vocab-groups (grouped vocab, moved to done/) · job-lexicons (your
words reach the run) · regression-replay (7/7 + in-app screen) · onepage-run glossary (confirmed
in a live run). See Section 5.

## 2. Next — after Now is green

| Item | Scope |
|---|---|
| **Next-stage build** ([spec](docs/todo/next-stage/PLAN.md) — written in cleanup Phase 4) | 8 phases, hardening + gap-fill of the existing app: contracts → session continuity (persistence) → briefing fallback → issue pills/observed shift → prep quality → prep timeline UI → live runner polish → summary/follow-up. **Now is green — this is unblocked.** |

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

**Signed off 2026-06-15 (full QA pass — Carl + Claude):**
- **verdicts-june-07 (all 3 phases)** — honest arc stages (verified on real runs), `v2-plain` question rewording + prompt avoid-list, briefing jargon ban + meeting-type voice. Found already-implemented in the engine work; verified + closed. Folder → [done/](docs/todo/done/verdicts-june-07/PLAN.md).
- **engine-trust-gates Phases 1–6 (all)** — live `leak-devon` gate PASS + Phase 5 ratified via live `growth-ahmed` (axes accumulate correctly, 0 regressed vs baseline) + all trust gates green in the 26/26 offline suite.
- **role-profiles Phases 2–4** — cached-second-run proven live (onepage run) + offline; `{{ROLE_PROFILE_BLOCK}}` in all 5 stages; `FOCUS_ARC_LEAK` green.
- **jun11-demo-fixes Phases 1–3** — question integrity, name-not-title/jargon guard, live score bars; prior Machar gate PASS + offline gates green. (Phase 4 back-nav now unblocked.)
- **arc-editor Phases 1–3** — in-app meeting-arc editor (edit/save to overlay, reset, orphan warning); 5/5 scenarios verified live.
- **role-vocab-groups Phases 1–4** — grouped modern role vocabulary across all 18 profiles; matrix verified; folder moved to [done/](docs/todo/done/role-vocab-groups/PLAN.md).
- **job-lexicons Phases 1–3** — browse + add-your-own words + words reach the live run (the "Sprint" word confirmed in a real 1:1).
- **regression-replay Phases 1–3** — free offline replay (7/7), auto-run in `npm test`, in-app Regression screen + Personas page.
- **onepage-run Phase 6** — "language of this role" glossary renders between prep and interview (confirmed in a live one-page run).

- **cleanup-board (2026-06-12)** — this board created, old plans repointed, next-stage spec written ([archive](docs/todo/done/cleanup-board/PLAN.md)).
- **engine-trust-gates Phases 1–3** — session-isolated question pool, honest thread-follow stems, planner grounding gate (`ee018b5`, `bb49e7c`, `cd581a7` + churn commit `9936c89`). Validated by green gate 2026-06-12 19:08 (8/8).
- **jun11-demo-fixes Phases 1–3** — question integrity gate, brief wording, live scores (`5763b7e`, `91db38d`, `023a82c`), live-verified on the Machar session.
- **role-profiles Phase 1** — core module + prompt + cache, green-lit 2026-06-11.
- **Root [PLAN.md](PLAN.md)** — all 14 rows done; kept as archive.
- **[plans/log-fix-audit.md](plans/log-fix-audit.md)** — 100 issues, 93 done, 0 open; reference only.
- Older finished work: [docs/todo/done/](docs/todo/done/) and [plans/done/](plans/done/).

---

## Repo state (audited 2026-06-15)

The in-flight work (arc-editor, role-vocab-groups, role-profiles, lexicons, meeting arcs) was
swept into commit `7b8921a` by the environment's auto-commit/push automation, then pushed — so the
working tree is clean and `main` is up to date with origin. Three old stashes exist
(`cleanup/remove-dead-ai-handoff-core`, `design-system-foundation`, + a WIP CSS/HTML cleanup) —
**do not pop**. `logs/**` is gitignored apart from a May keep-set.

**Test status:** `npm test` **26/26** green; `npm run replay` **7/7** ($0). Live `leak-devon` gate
**PASSED** 2026-06-15 ([result](logs/gate/2026-06-15T01-54-32-606Z/result.json)). The Now column is
green. Note: an auto-commit/push automation is active in this environment — "committed" no longer
implies "signed off"; sign-off is tracked per-phase in each PLAN.md and Section 5 above.

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
