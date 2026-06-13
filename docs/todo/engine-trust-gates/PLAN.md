# Engine trust gates — fix the five bugs from the 47-run library review

**Goal:** The five engine bugs that caused every Fix/Block verdict in the library review are gone: no cross-run question leaks, no garbled stems, no invented premises, no competency questions in relational arcs, and an axis layer that reads what was actually said — at the right confidence.
**Driver:** Carl (product owner)
**Created:** 2026-06-12

## Done means
- A persona sweep produces zero questions mentioning things this session never said (no "retry logic" to a designer, no invented "promotion decision").
- Thread-follow questions read like sentences, and the generic fallback never repeats in one session.
- Bi-weekly / "Something feels off" runs never serve a competency/readiness question.
- A scripted run about one topic ships axes that read that topic — not "didn't come up".
- A thin-signal run ships a modest read; "rushed handoffs and timelines" never appears unless someone said it.
- New trust-check gates (`CROSS_SESSION_QUESTION_LEAK`, `QUESTION_ARC_LEAK`, `AXIS_SILENT_SESSION`, `UNGROUNDED_PREMISE`, `UNGROUNDED_MEANING`, `RULE_ECHO_MEANING`) catch regressions from now on.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Session-isolate the question pool | "Retry logic" example replaced; runtime questions stop polluting `questions/`; pool filtered at load; API path gets a session bank; leak gate | ✅ |
| 2 | Honest thread-follow stems | Contiguous-quote mirror stems, validator backstop, queue-aware dedupe | ✅ |
| 3 | Grounding gate for planner questions | Planner questions must cite a premise from this session or be dropped (logged); grounding audit log-only in gate | ✅ |
| 4 | Relational-arc gate at the question layer | No competency questions generated, selected, or planner-added for Bi-weekly / feels-off; `QUESTION_ARC_LEAK` | 🔨 |
| 5 | Axis accumulation | Carried questions inherit axis signatures; scripted runs score; `AXIS_SILENT_SESSION`; one re-baseline | 🔨 |
| 6 | Briefing confidence honesty | Concentration guard in code; rule-echo ban in prompt + RULE_ECHO_MEANING flag/downgrade | 🔨 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Baseline (2026-06-12, before any change):** `npm run gate` PASS (8 ok / 0 regressed / 0 error, report logs/gate/2026-06-12T11-44-09-322Z), `npm run smoke` 29/29 passed. Nothing failing pre-work.

Phases 1–2 ✅ (gate-verified 8/8 each, committed). Phase 3 🔨: fully coded, offline suite 22/22, but the OpenAI quota ran out before its live gate — one approved `--only` case run is the remaining check. Phases 4–6 not started. NOTE: this session ran 3 full gates + 2 smokes before the cost rule was enforced — that spend is what exhausted the quota; future live runs need Carl's per-run go-ahead.

Phase 1 notes:
- plan.js already passed `sessionBank` (committed earlier) — that Phase 1 item was already done; the live web path was no longer the leak vector, the remaining vectors were the prompt example, the pool-root saves, and the default bank loader.
- `npm run rebuild-question-index` (--prune is built into the npm script) removed 290 exact-duplicate YAMLs (identical fingerprint, first alias kept — content preserved under the surviving alias).

## Standing constraints (apply to every phase)
- **No silent masking.** Never regex-rewrite model prose. Allowed: prompt changes, input filters, structural gates that downgrade machine-readable fields (read_status/confidence/evidence_basis) or drop/replace whole questions — always with a logged issue.
- **Never bulk-delete `questions/` YAMLs.** Filter at load time; redirect new writes.
- **Baseline before work, `--update-baseline` only in Phase 5** (and only after Carl ratifies the diffs).

## Parked
- ~~Add `axis_effects` to the persona bench scripts — only 30/85 script aliases resolve a signature.~~ **Mostly fixed 2026-06-13** (alias-bridge in `scriptSignature`, see [phase-5.md](phase-5.md) follow-up): 58/62 distinct aliases now resolve. Remaining 4 (`q_open_anything_to_cover`, `q_alignment_observed`, `q_handoff_observed`, `q_call_quality`) still carry no bank signature — give them one if their axes should move. Live re-run to confirm pending Carl's go-ahead.
- `UNGROUNDED_MEANING` check (Phase 6) — a `read` axis whose meaning shares no rare content with the transcript. Deferred: too false-positive-prone on legitimate paraphrase to ship without a live gate to tune against. Revisit once quota is back.
- Session-scoping note-derived `generated` bank questions too (they also embed run-specific premises — e.g. the `q_architecture_review_*` family). Phase 1 only fixes runtime artifacts.
- Promoting `UNGROUNDED_PREMISE` from WARN to hard fail once its false-positive rate is known.
- Prose-level evaluativeness detection for bank questions (beyond the `purpose` field).
- Reconciling the old in-app trust-fail mark on run Jun06 09-30 with the new "owned observation is OK" trust ruling.
- ~~Writing the 47 review verdicts into each run's `review.json`~~ — done 2026-06-12: 46 written (reviewer "claude", Carl's rulings applied; his own partial on Jun06 09-30 untouched). Library now shows 27 Keep / 20 Fix / 1 Block.
