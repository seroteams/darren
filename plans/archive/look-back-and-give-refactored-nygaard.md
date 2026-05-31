# Status — Meeting-type arcs + thread-follow

## Context

You asked for a look-back: are the arcs in, and is this ready for you to drive a live test? Short answer: **yes, ship it to your browser and walk through one.** Everything from the [meeting-type arcs plan](you-know-this-is-partitioned-quasar.md) is on disk. The only thing not yet exercised is a full end-to-end live session — the most recent log ([logs/2026_May14_23-56-c84d2bd2](logs/2026_May14_23-56-c84d2bd2)) stopped at preparation, so the planner with arcs+thread-follow hasn't actually been driven through a real questioning loop yet.

## What's landed

### Arcs data layer
- [src/meeting-arcs.js](src/meeting-arcs.js) — all four arcs with stages, intents, target_questions, tone_register, anti_patterns. Exports `getArc()` and `listStageIds()`.
  - Bi-weekly: `pulse → friction → momentum → lift`
  - Performance: `self_read → evidence → gap_naming → cause → commit`
  - Growth: `anchor → aspiration → gap → investment → commitment`
  - Off: `landing → observation → underneath → support`

### Prompts arc-aware
- [prompts/generate-questions.md](prompts/generate-questions.md) — `<meeting_arc>` section, `stage` required in output, axis coverage demoted to consequence-of-arc, tone register declared to override `<question_craft>` rewrites.
- [prompts/plan-turn.md](prompts/plan-turn.md) — `<thread_follow_rule>` added near the top; `Arc position` rule replaced; "Prefer keeping" carries explicit exception for thread-follow; final-turn closer rule now references arc's final-stage register.

### Code wiring
- [src/question-generator.js](src/question-generator.js) — injects `MEETING_ARC_JSON` / `TONE_REGISTER` / `ANTI_PATTERNS_JSON`; `stage` in schema + persistence.
- [src/queue-manager.js](src/queue-manager.js) — injects arc placeholders + `CURRENT_STAGE_HINT` derived from `lastQuestion.stage`; `stage` carried through `reconcileQueue`; `isUnchanged` ignores `stage` re-tags.
- [src/questions.js](src/questions.js) — `stage` in `FIELD_ORDER`.

### Data backfill
- [questions/_intro/](questions/_intro/) — all **12** intro YAMLs tagged with `stage`.
- [questions/_openers.json](questions/_openers.json) — all **20** openers tagged.
- [questions/_seed/](questions/_seed/) — verify on read; tag any missing.

### Verification artefacts
- [probe-plan-turn-ab.js](probe-plan-turn-ab.js) exists; latest run [logs/probe-plan-turn-2026-05-15T02-20-00.json](logs/probe-plan-turn-2026-05-15T02-20-00.json) confirms the bug-repro is fixed:
  - Control (variant A) served `q_role_expectations` — the original drift.
  - Variant B drilled on the thread: *"Head of department — what is it about that role that pulls you? Is it the scope, the people, the title, or something else?"* with `stage: "aspiration"`.

## What's NOT yet done

- **No full live session has been run since arcs landed.** Latest log stops at preparation. Nothing in `logs/` shows a complete 8-turn run with `stage` on each turn.
- One thing to watch in the probe output: `new_queue` came back with **only 1 item** (the thread-follow) — the arc continuation wasn't re-emitted. The probe also reported `dropped item with empty axis_effects` for four items. This may be a probe-script artefact, or the planner is genuinely truncating the queue when a thread fires. Worth eyeballing on the first real run — if turn 5 fires the thread-follow but the queue collapses to length 1, the next turn's planner has nothing to dedup against and could go off-arc.

## Ready-to-test checklist

1. `npm run dev` and walk a **Growth & career plan** session. At turn 4, give an aspirational thread answer (e.g. "head of department?" or "I want to lead a team"). Expect turn 5's question to **name your phrase verbatim** and drill on it. Confirm `stage` is set on every question in the saved turn files.
2. Repeat for **Bi-weekly check-in** — confirm tone reads casual, not HR-form. Arc should move `pulse → friction → momentum → lift`.
3. Repeat for **Performance & feedback** — direct register, closer demands a concrete commitment.
4. Repeat for **Something feels off** — observation-first opener, no diagnosis.
5. Throughout: open the saved `NN-turn.json` files and confirm `stage` and `axis_effects` are both populated, and that the queue retains arc continuation after a thread-follow fires (i.e. queue is not collapsed to length 1).

## What to flag back to me if you see it

- Thread-follow doesn't fire on an obvious thread (named role, project, person) → tighten the `<thread_follow_rule>` trigger list in [prompts/plan-turn.md](prompts/plan-turn.md).
- Tone drifts back to HR-form despite the tone register → either the register isn't being read, or `<question_craft>` is winning the override. Likely a prompt-ordering tweak.
- Queue collapses after thread-follow → fix in [src/queue-manager.js](src/queue-manager.js) `reconcileQueue` or in the planner prompt's `new_queue` instruction.
- Final turn isn't a stage-appropriate closer → revisit final-turn rule in [prompts/plan-turn.md](prompts/plan-turn.md).
