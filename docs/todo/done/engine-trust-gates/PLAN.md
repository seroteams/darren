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

## Status
**✅ ALL 6 PHASES DONE + SIGNED OFF (2026-06-15).** Phase detail and sign-off evidence live in
git history. Folder ready to move to `docs/todo/done/`. Two follow-ups remain — see Parked.

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
