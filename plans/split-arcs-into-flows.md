# Plan — Split into self-contained 1:1 Types

> **Version:** v7 — **Phase 0 + 1 + 2 BUILT ✅ · add-path proven (5 Types live)**
> **Caveman summary:** Today 4 "arcs" = 4 rows of data feeding 1 shared pipeline. Goal = make each one its own **1:1 Type**: a self-contained folder that can diverge on prompts, scoring weights, planner rules, and stage shape — and that new Types can be added cheaply. This plan = architecture blueprint only, no code.
> **Scope confirmed with user:** divergence allowed on ALL of {prompts, scoring weights, planner rules, stage/budget shape}. Step size = **plan architecture only**.
>
> **Decisions locked:**
> 1. **Axes stay global** — 4 axes (wellbeing/engagement/clarity/growth) for all Types. No per-Type axis set. Per-Type scoring *weights* allowed later.
> 2. **Growth eval = fork** — Growth gets its own `final-evaluation.md`; shared prompt drops the Growth `if`. (Phase 1.)
> 3. **Frontend axis question dropped** — moot once axes are global.
> 4. **Naming = "1:1 Type"** — product + new-code term. ONE word: **Type** (retires "arc" and "flow"). The existing `meetingType` field key is kept as a compat alias through Phase 0 to protect byte-identical golden replay; a full identifier rename (`meetingType`→`oneOnOneType`) is a later optional cleanup phase, not Phase 0.
> 5. **Two product goals drive the shape:** (A) improve each Type in isolation, (B) add new Types cheaply. See "Adding a new 1:1 Type" below.

### Changelog
- **v1** (2026-05-30) — initial blueprint. +213 / -0.
- **v2** (2026-05-31) — resolved 3 open questions. +18 / -10. Axes global; Growth eval forks; frontend question dropped.
- **v3** (2026-05-31) — renamed concept to **1:1 Type** (retire arc/flow → one word "Type"). +40 / -28. Added "Adding a new 1:1 Type" recipe + extensibility goal. `meetingType` key kept as Phase-0 alias; full rename deferred to optional cleanup phase.
- **v4** (2026-05-31) — **Phase 0 BUILT.** +~180 / -170 (mostly data moved, not added). Created `src/one-on-one-types/` (registry `index.js`, `_shared/prompts.js`, 4 `<slug>/type.js` data homes); collapsed `src/meeting-arcs.js` to a 6-line back-compat shim re-exporting from the registry. Verified: getArc/listStageIds/MEETING_ARCS byte-identical (shapes, order, error message); all 5 consumers load; `test-opener-routing` PASS. Deferred `_shared/{scoring,planner,axes}.js` to their real phases (no speculative slots). Phase 1 next.
- **v7** (2026-05-31) — **Add-path proven: 5th 1:1 Type "Onboarding check-in" stood up via the recipe.** +~55 / -2. Added a `MEETING_TYPES` picker row; created `src/one-on-one-types/onboarding/type.js` (slug `onboarding_check_in`; stages settling→orientation→blockers→connection; inherits all shared prompts); registered one line in `index.js`. **Zero runner edits, zero prompt edits.** Verified: registry + picker both = 5; resolves by label/slug/picker-index; `slugify(label)` matches slug so opener resolves; opener picks a generic `stage:null` opener (no crash); missing `_intro/<slug>/` dir → empty queue (safe, no crash); `promptFor` all-shared for the new Type; the other 4 Types byte-identical; `test-opener-routing` PASS. Live AI run not executed (needs network/cost) — cold-start resolution path verified structurally. Follow-up (optional, content): add Type-specific openers + `_intro/onboarding_check_in/` seeds for production polish.
- **v6** (2026-05-31) — **Phase 2 BUILT (prompt spine wired for all 6 stages).** +~35 / -25. Added `promptFor(meetingType, slot)` to the registry (safe shared fallback). Wired all remaining stage runners to resolve their prompt per-Type via `promptFor`: `preparation.js` (preparation), `generate.js` (focusPoints; template read moved module-load → per-call), `question-generator.js` (questionBank), `queue-manager.js` (planTurn), `lexicon/review-core.js` (lexicon); `reviewer.js` switched from direct `getType` to `promptFor`. Removed the orphaned `PROMPT_PATH`/`ROOT`/`path` constants each change left behind (incl. dead `PROMPT_PATH` export in review-core). Verified byte-identical: `promptFor` returns the original shared prompt for every (Type, slot) except Growth/evaluation; unknown/missing Type falls back to shared; all 6 runners + handlers load; focus-points & preparation per-call reads fire; `test-opener-routing` PASS. **Forking any stage for any Type is now a zero-code file drop.**
- **v5** (2026-05-31) — **Phase 1 BUILT (Growth eval fork).** +~290 / -4. Created `src/one-on-one-types/growth/prompts/final-evaluation.md` (shared prompt + 4 Growth next-plan bullets baked in unconditional); removed those 4 conditional bullets from shared `prompts/final-evaluation.md`; `growth/type.js` overrides `prompts.evaluation`; `reviewer.js` now resolves the eval prompt via `getType(ctx.meetingType).prompts.evaluation` (dropped fixed `PROMPT_PATH`/`ROOT`/`path` orphans). Verified: Growth prompt contains the mandate, non-Growth does not; reviewer + evaluation handler load; `test-opener-routing` PASS. First real per-Type divergence — fork-resolution path proven.

---

## Context

`getArc(meetingType)` in [src/meeting-arcs.js](src/meeting-arcs.js) returns one of 4 arc objects. Each carries only 4 fields: `slug`, `tone_register`, `arc[]` (stages), `anti_patterns[]`. Those fields are injected as `{{…}}` placeholders into a **single shared set of prompts** ([generate-questions.md](prompts/generate-questions.md), [plan-turn.md](prompts/plan-turn.md), [final-evaluation.md](prompts/final-evaluation.md), etc.) and executed by a **single shared set of stage runners** ([question-generator.js](src/question-generator.js), [queue-manager.js](src/queue-manager.js), [preparation.js](src/preparation.js), [reviewer.js](src/reviewer.js)).

What varies per Type today: tone, stage list, anti-patterns, focus-point proportion.
What is **identical** across all 4: the 4 axes, all scoring rules (signature binding, shallow gate, deficiency-as-request), all planner caps (drill/wellbeing/off-arc), wind-down, crisis override, thread-follow, closer-craft.

The user wants each one to become **its own 1:1 Type with its own way of working** — fork the shared mechanics per Type, not just the data — and wants **adding a new Type to be cheap**. This is an architectural change. "Start to break up" = design the seams first; build later.

**Intended outcome:** a Type abstraction where selecting a 1:1 Type resolves a self-contained definition that owns its prompts, scoring weights, planner rules, and stages — over a shared spine (session lifecycle, persistence, queueing, LLM transport) so divergence is opt-in, not duplicated, and a new Type is a folder + one registry line.

---

## Recommended architecture

### 1. The Type object (the new unit)

Each 1:1 Type is one object, resolved by a registry. Shape:

```
Type = {
  meta:          { slug, label, badge, duration, description },   // from meeting-types.js
  tone_register: string,
  stages:        [ { id, label, intent, target_questions } ],    // == today's arc[]
  anti_patterns: [ string ],
  prompts:       { preparation, focusPoints, questionBank, planTurn, evaluation, lexicon },
                                                                  // arc-local file if present, else _shared
  scoring:       { … weights / rule knobs },                     // PER-TYPE (NEW, optional)
  planner:       { drillCap, wellbeingCap, offArcCap, windDownTurns, threadFollow, … }, // PER-TYPE (NEW, optional)
}
```

`scoring`, `planner`, and forked `prompts` are the divergence surfaces. Anything a Type doesn't override inherits `_shared` = today's behavior.

**Axes are global.** All 4 axes apply to every Type — no per-Type `axes` field. `_shared/axes.js` is the single source. Per-Type *weights* may live in `scoring` later; the axis catalogue does not fork.

### 2. Directory layout — each folder IS a 1:1 Type

```
src/one-on-one-types/
  index.js                 — registry: getType(meetingType), listTypes(). Replaces getArc.
  _shared/                 — house defaults = today's behavior
    prompts/               — the 6 prompts, verbatim
    scoring.js             — default scoring knobs
    planner.js             — default caps / wind-down
    axes.js                — the global 4-axis catalogue
  bi-weekly/
    type.js                — overrides only (tone + stages + anti_patterns today)
  performance/
    type.js
  growth/
    type.js
    prompts/
      final-evaluation.md  — forked (Phase 1): owns the "name a concrete next move" rule
  feels-off/
    type.js
```

A folder holds only what differs. Empty slot = inherit `_shared`. That's why this is shared-by-default, fork-on-purpose — not 4× the work.

### 3. Registry + dispatch

- `getType(meetingType)` resolves label/slug → merged Type object (Type override ⊕ `_shared` default).
- Keep `getArc` / `listStageIds` as **thin shims** over `getType` during migration so the 5 current consumers keep working unchanged: [queue-manager.js](src/queue-manager.js), [opener.js](src/opener.js), [question-generator.js](src/question-generator.js), [src/cli/stages/question-bank.js](src/cli/stages/question-bank.js), [frontend/server/handlers/bank.js](frontend/server/handlers/bank.js).
- `meetingType` stays the selector key (Phase-0 alias). No sweeping identifier rename yet.

### 4. Stage runners take a Type, not hardcoded prompts

Refactor each runner to accept a resolved Type and read `type.prompts.X`, `type.scoring`, `type.planner` — instead of importing a fixed prompt path and hardcoding rule constants:

- [src/question-generator.js](src/question-generator.js) → `type.prompts.questionBank`, `type.stages`.
- [src/queue-manager.js](src/queue-manager.js) → `type.prompts.planTurn`, `type.planner`, `type.scoring`.
- [src/preparation.js](src/preparation.js) → `type.prompts.preparation`.
- [src/reviewer.js](src/reviewer.js) → `type.prompts.evaluation` (Growth's forked eval resolves here).
- [src/lexicon-reviewer.js](src/lexicon-reviewer.js) → `type.prompts.lexicon`.

### 5. How each divergence surface forks

- **Prompts per Type** — `type.prompts.*` resolves to a Type-local file if present, else `_shared`. Forking = copy the shared prompt into `<type>/prompts/` and edit. **Growth's evaluation forks first (Phase 1):** `src/one-on-one-types/growth/prompts/final-evaluation.md` owns the "name a concrete next move + quote evidence" rule; shared prompt drops its Growth `if`. Anti-patterns stay `{{…}}`-injected from `type.anti_patterns` (no fork needed).
- **Scoring per Type** — `type.scoring` carries weights / rule knobs. Axes do NOT fork; emphasis is tuned via question generation + optional `scoring` weights.
- **Planner rules per Type** — split plan-turn's rules into (a) **numeric knobs** → `type.planner` injected as placeholders (drillCap, wellbeingCap, offArcCap, windDownTurns); (b) **prose rules** → Type-local `planTurn` prompt where genuinely different logic is needed. `_shared` keeps today's values so untouched Types behave identically.
- **Stage/budget shape** — already in `type.stages` (today's `arc[]`); no change beyond moving it into the Type.

---

## Adding a new 1:1 Type (extensibility goal B)

The recipe a builder follows to add, e.g., "Onboarding 30-day check":

1. Add one row to `MEETING_TYPES` ([src/meeting-types.js](src/meeting-types.js)) — label, badge, duration, description (drives the picker UI).
2. Create `src/one-on-one-types/onboarding/type.js` — spread `_shared`, set `tone_register`, `stages`, `anti_patterns`. That alone = a working Type on house prompts.
3. Register the folder in `src/one-on-one-types/index.js` (one line, or auto-discover by folder).
4. Fork only what needs to differ: drop a `prompts/<stage>.md`, a `scoring` block, or a `planner` block.
5. Verify: run one scenario through the full pipeline; confirm it pulls its own config and changes nothing else.

No core runner edits. No touching other Types. That is the test of the architecture: **a new Type is additive, never invasive.**

---

## Migration path (no behavior change until you choose to fork)

1. **Phase 0 — scaffold, byte-identical.** Build `src/one-on-one-types/index.js` + `_shared` holding today's prompts/scoring/planner/axes. Each `<type>/type.js` spreads `_shared` + today's data. Shim `getArc` over `getType`. Outcome: every assembled prompt identical to today.
2. **Phase 1 — fork Growth evaluation.** Copy `final-evaluation.md` into `growth/prompts/`, bake in the Growth-only rule, strip the `if` from the shared prompt. First real divergence; proves the fork-resolution path.
3. **Phase 2 — fork more prompts** for Types that need different prose.
4. **Phase 3 — per-Type planner rules + scoring weights.**
5. **(Optional later) — identifier rename** `meetingType`→`oneOnOneType` across code/handlers/prompts/logs, as its own task once the structure is proven.

Each phase is independently shippable and verifiable.

---

## Critical files

- New: `src/one-on-one-types/index.js`, `src/one-on-one-types/_shared/{prompts,scoring.js,planner.js,axes.js}`, `src/one-on-one-types/<type>/type.js`.
- Refactor (read Type instead of hardcoded): [src/question-generator.js](src/question-generator.js), [src/queue-manager.js](src/queue-manager.js), [src/preparation.js](src/preparation.js), [src/reviewer.js](src/reviewer.js), [src/lexicon-reviewer.js](src/lexicon-reviewer.js).
- Shim/replace: [src/meeting-arcs.js](src/meeting-arcs.js) (`getArc`→`getType`), keep [src/meeting-types.js](src/meeting-types.js) feeding `type.meta` + the picker.
- Consumers to verify unbroken: [opener.js](src/opener.js), [src/cli/stages/question-bank.js](src/cli/stages/question-bank.js), [frontend/server/handlers/bank.js](frontend/server/handlers/bank.js), [start.js](frontend/server/handlers/start.js), [answer.js](frontend/server/handlers/answer.js).

## Reuse (don't rebuild)

- `getArc` / `listStageIds` / `MEETING_ARCS` ([src/meeting-arcs.js](src/meeting-arcs.js)) — wrap, don't discard.
- `MEETING_TYPES` ([src/meeting-types.js](src/meeting-types.js)) — feeds `type.meta` and is the add-a-Type entry point.
- Existing prompt-placeholder substitution in the runners — reuse for `type.planner` knob injection.
- [scripts/replay-scenario.js](scripts/replay-scenario.js) + `batch-*-verify.js` + `logs/` run dirs — golden-replay harness for verification.

## Verification

- **Phase 0 (refactor safety):** golden replay. Run [scripts/replay-scenario.js](scripts/replay-scenario.js) against saved `logs/` runs before and after the registry refactor; assert assembled prompts and pipeline outputs are byte-identical. Same for `batch-m1/m2/m3-verify.js`.
- **Per-Type divergence (later phases):** run one scenario per Type through the full pipeline ([start.js](frontend/server/handlers/start.js) → bank → answer loop → evaluation); confirm each Type pulls its own prompt/scoring/planner config and that editing one Type's folder does not change another Type's output.
- **Add-a-Type:** stand up a throwaway 5th Type via the recipe above; confirm it runs end-to-end and leaves the other 4 byte-identical.
- **Regression:** `scripts/test-prep-role-diff.js`, `scripts/test-opener-routing.js`, `scripts/test-lexicon.js` still pass.
