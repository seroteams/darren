# SERO BOARD — the single source of truth

**This is the only active board.** Every other planning file is either done, parked, or points here.
Created 2026-06-12. Driver: Carl. Update this file the moment work lands — not the old plans.

Standing constraints (from CLAUDE.md):
- **No paid runs without a yes.** Anything hitting the OpenAI API needs Carl's explicit per-run go-ahead with a cost stated first (~$0.35/pipeline run, ~$3 full gate). Smallest thing that proves the point: `node scripts/gate.js --only <case>`.
- **No silent masking.** Surface raw model output; gate and flag, never rewrite.
- **One phase at a time** (Darren Method) — product owner green-lights before the next phase.

---

## 1. Now — open work

**Three features built and committed, all awaiting Carl's product-owner QA (2026-06-21).**
Code is in `main` and pushed (the auto-commit automation already committed them — so each PLAN's
"not committed yet" line is stale; they're committed, just not signed off). None has been walked
through its QA scenarios yet. Next action on each is *Carl walks the phase scenarios → green light → close out*.

| Feature | Folder | State | What it adds |
|---|---|---|---|
| **Briefing grounding fixes** | `docs/todo/briefing-grounding-fixes/` | Phase 1 of 4 built | Clarity stops flooring off one repeated theme (Maya run −9 → −5). Phases 2–4 not started. |
| **See-before-sent preview** | `docs/todo/sent-preview/` | Both phases built | Sent tab shows the exact AI payload *before* a stage runs (Preparation only), zero API calls. Byte-for-byte verified on a real run. |
| **Stage data tabs** | `docs/todo/stage-data-tabs/` | All 3 phases built | Right rail gains Notes·Sent·Reply tabs showing what each stage was fed + the raw reply. |

To see the runner features live: Carl's dev server may be running OLD code — restart `npm run dev` to pick up changes.

Earlier history: the Now column was product-owner-walked and signed off green on 2026-06-15;
completed items were cleared to keep this focused. Full history lives in each plan's git log.

Tests: `npm test` **30/30**, `npm run replay` **7/7** ($0), plus one live run that passed all
back-nav + briefing checks. Two items remain deliberately deferred (engine-trust-gates → Parked):
the `UNGROUNDED_MEANING` check and the Phase 5 `--update-baseline` re-run.

## 2. Next — after Now is green

| Item | Scope |
|---|---|
| **Next-stage build** | **✅ ALL 8 PHASES DONE 2026-06-16** → `done/`. Hardening core (contracts, persistence/resume, deterministic fallback) + feature passes (issue pills + observed shift, prep quality, prep timeline UI, runner polish, shared/private split). One carve-out parked: cross-session follow-up auto-injection (needs person-profiles linking). |

## 3. Done

Completed work has been cleared from this board. The record lives in git history.

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
