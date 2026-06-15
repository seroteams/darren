# SERO BOARD — the single source of truth

**This is the only active board.** Every other planning file is either done, parked, or points here.
Created 2026-06-12. Driver: Carl. Update this file the moment work lands — not the old plans.

**Direction (long-range):** [docs/ROADMAP.md](docs/ROADMAP.md) — milestones and where this is headed.
This board is tactical; the **Next** column below is fed from the roadmap's current milestone.

Standing constraints (from CLAUDE.md):
- **No paid runs without a yes.** Anything hitting the OpenAI API needs Carl's explicit per-run go-ahead with a cost stated first (~$0.35/pipeline run, ~$3 full gate). Smallest thing that proves the point: `node scripts/gate.js --only <case>`.
- **No silent masking.** Surface raw model output; gate and flag, never rewrite.
- **One phase at a time** (Darren Method) — product owner green-lights before the next phase.

---

## 1. Now — open work

The Now column was product-owner-walked and signed off green on 2026-06-15. Completed items have
been cleared off this board to keep it focused on what's left; the full history lives in each
plan's git log. What remains:

| Item | State | Next step |
|---|---|---|
| **jun11-demo-fixes Phase 4** — back navigation ([plan](docs/todo/jun11-demo-fixes/PLAN.md)) | 🔨 built + offline-verified | Carl walks scenarios 1–7 (needs one live run ~$0.35) → close out |
| **onepage-run Phases 4+5** — inline briefing + polish ([plan](docs/todo/onepage-run/PLAN.md)) | 🔨 built + offline-verified | Carl walks the flow (needs one live run ~$0.35) → close out |

Both above are code-complete and offline-verified (`npm test` 28/28, replay 7/7);
the only thing left is Carl's live click-through, which costs API. A single
one-page run with a Back step could bless both at once.

Two small items were deliberately deferred (see engine-trust-gates → Parked): the
`UNGROUNDED_MEANING` check and the Phase 5 `--update-baseline` re-run.

Closed out 2026-06-16: **job-lexicons** and **arc-editor** (both → `docs/todo/done/`).

## 2. Next — after Now is green

| Item | Scope |
|---|---|
| **Next-stage build** ([spec](docs/todo/next-stage/PLAN.md)) | 8 phases. **Phase 1 (Contracts) ✅ done 2026-06-16** ([docs/contracts.md](docs/contracts.md)). Remaining: session continuity (persistence) → briefing fallback → issue pills/observed shift → prep quality → prep timeline UI → live runner polish → summary/follow-up. One phase at a time; Phase 2 next. Phases 3 (fallback) is offline-safe; 4–8 need live runs/UI QA. |

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

## 5. Done

Completed work has been cleared from this board. The record lives in git history,
[docs/todo/done/](docs/todo/done/), and [plans/done/](plans/done/).

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
