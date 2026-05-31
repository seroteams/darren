# Focus-points page — selectability + label drift

## Context

The "Something feels off" focus-points stage (and every other meeting-type variant of it) currently has two problems visible in the UI:

1. **The list isn't interactive.** Each item renders as a static div. Users can't pick which focus points carry forward into "Prepare for this 1:1." CSS for a selectable state was already prepared in [design.css:1062-1092](frontend/client/src/styles/design.css#L1062-L1092) (`.focus-point--selectable`, `.focus-point__check`, `.is-selected`), but the markup and event handlers were never wired up.

2. **The labels don't read like focus points.** In the screenshot, item labels are full questions phrased at the report ("What's affecting your energy levels lately?", "How's your connection with the team right now?"). The prompt at [prompts/generate-focus-points.md:20](prompts/generate-focus-points.md#L20) explicitly requires labels to be **topic phrases a manager would say out loud** (e.g. "Motivation and pace vs three months ago.", "Late nights — push, overload, or preference?"). The model is drifting toward question-shaped labels despite the existing guard rails.

Both were deferred — bring them back next session.

## Open decisions (need user input before implementing)

These were asked but deferred to next session:

1. **Selection model** — three candidates:
   - (a) All selected by default; user deselects unwanted ones; `Prepare for this 1:1` uses only selected.
   - (b) None selected; user picks; CTA disabled until ≥1 selected.
   - (c) All selected + no enforcement; selection is visual only for now (CTA always proceeds with all 5).
2. **Label fix** — two candidates:
   - (a) Tighten the prompt; concept stays "focus points = topics."
   - (b) Rename the concept to "questions" throughout UI + code + prompt.

Ask the user to pick before coding.

## Recommended approach (pending those decisions)

### Part A — Wire selection into the focus-points stage

**Single file:** [frontend/client/src/stages/focus-points.js](frontend/client/src/stages/focus-points.js)

1. In `renderResult` (line 45), replace the static `.focus-point` div with a `<button>` carrying class `focus-point focus-point--selectable` and a third grid column for the check icon:
   ```html
   <button type="button" class="focus-point focus-point--selectable is-selected" data-fp-id="${fp.id}">
     <div class="focus-point__num">${i + 1}</div>
     <div class="focus-point__body">…</div>
     <div class="focus-point__check">✓</div>
   </button>
   ```
   Default state depends on decision #1 above.

2. Track selection in a local `Set<string>` keyed by `fp.id`. On click, toggle the id in the set + toggle `is-selected` class on the button.

3. Persist selection so it survives `Regenerate` / stage re-entry only if needed; otherwise local is fine. **Do not** push selection into the global `store` unless the downstream stage needs it (see step 4).

4. On `js-continue` click (line 101), decide whether to:
   - Persist `store.selectedFocusPointIds` (new field in [state.js:14-29](frontend/client/src/state.js#L14-L29)) so the PREPARATION stage can filter, **or**
   - Filter `store.focusPoints` in place to just the selected entries before `setState({ stage: STAGES.PREPARATION })`.
   The simpler choice is in-place filter — fewer touch points downstream. Verify nothing else in the app reads `store.focusPoints` expecting the full list (grep `store.focusPoints` / `focusPoints` references in `frontend/client/src/` — already known consumers: this file, [state.js](frontend/client/src/state.js), [main.js](frontend/client/src/main.js)).

5. CTA enablement: if decision (b) wins, add a `disabled` attribute to `.js-continue` when set is empty; also gate the Enter-key shortcut at line 84.

6. Add a one-line hint above the list (style already exists: `.focus-select-hint` at [design.css:1095-1100](frontend/client/src/styles/design.css#L1095-L1100)) — text depends on decision #1.

7. Keep `revealSequence` working: the `<button>` swap shouldn't change reveal targets.

**No CSS changes needed** — `.focus-point--selectable`, `.focus-point__check`, `.is-selected` are already defined.

### Part B — Fix label drift

The drift to question-form is happening despite existing guard rails in the prompt. Two paths depending on decision #2.

**(a) Keep "focus points = topics" — tighten the prompt**

Single file: [prompts/generate-focus-points.md](prompts/generate-focus-points.md)

- The current `<output_contract>` (line 18-22) and `<quality_gate>` (line 79-98) already forbid this. Drift means examples aren't being weighted enough. Concrete tightening moves:
  1. Add an explicit anti-example block right after `<output_contract>`: show 3 bad question-form labels alongside their topic-form rewrites. The model can't ignore an inline "WRONG → RIGHT" table.
  2. Add a hard rule to `<rules>` (line 100-106): "Never end a `label` with `?`. Never start a `label` with a question word (What/How/Why/When/Where/Is/Are/Do/Does/Can/Could/Would/Should)."
  3. Add a `label` shape gate to `<quality_gate>` step 3.

Server-side safety net (optional, in [src/generate.js](src/generate.js) where `generateFocusPoints` lives): regex check on returned labels; if a label ends with `?` or starts with a question word, log a warning and either retry once or strip/rewrite. Light touch — preserve current behavior if no violation.

**(b) Rename to "questions"**

Renames across UI, code, and prompt. Touch points:
- [prompts/generate-focus-points.md](prompts/generate-focus-points.md) — overhaul to ask for questions phrased to the report; rewrite all 4 examples.
- [src/generate.js](src/generate.js) — rename `generateFocusPoints` → `generateQuestions` (or similar); rename `focus_points` field in response.
- [frontend/server/handlers/focus-points.js](frontend/server/handlers/focus-points.js) — rename file + endpoint + payload key.
- [frontend/client/src/stages/focus-points.js](frontend/client/src/stages/focus-points.js) — rename file, CSS class prefix `focus-point` → `question`, SSE URL.
- [frontend/client/src/state.js](frontend/client/src/state.js) — `focusPoints` → `questions`.
- [frontend/client/src/styles/design.css:1062-1092](frontend/client/src/styles/design.css#L1062-L1092) — rename selectors.
- [src/question-generator.js](src/question-generator.js), [src/preparation.js](src/preparation.js), `STAGES.FOCUS_POINTS` constant — check for downstream consumers.
- `notes/`, `prompts/`, log directory names — search-and-replace where helpful.

This is the bigger change; only do it if the user genuinely concludes the concept is "questions" not "topics." The prompt's whole epistemic stance (observation → pattern → hypothesis; hedged interpretation; topics not diagnoses) is structured around topics — questions-to-the-report is a different product shape.

## Critical files

- [frontend/client/src/stages/focus-points.js](frontend/client/src/stages/focus-points.js) — render + interaction
- [frontend/client/src/styles/design.css](frontend/client/src/styles/design.css) — selectable styles already in place
- [frontend/client/src/state.js](frontend/client/src/state.js) — may need `selectedFocusPointIds`
- [prompts/generate-focus-points.md](prompts/generate-focus-points.md) — label drift fix
- [src/generate.js](src/generate.js) — generation entry point (path for Part B rename or for the optional regex safety net)
- [frontend/server/handlers/focus-points.js](frontend/server/handlers/focus-points.js) — endpoint
- [src/question-generator.js](src/question-generator.js), [src/preparation.js](src/preparation.js) — downstream consumers (verify reads of `focusPoints` if filtering in place)

## Verification

1. **Selection UI** — `npm run dev` (or whatever launches the frontend), walk a session up through the focus-points stage. Click each item: class toggles, check icon swaps state. Enter-key shortcut respects CTA enablement (if gated). Regenerate preserves or resets per spec.
2. **Downstream filter** — confirm PREPARATION/BANK/QUESTIONING stages render correctly when only a subset of focus points is selected.
3. **Label drift fix** — regenerate at least 3 sessions across meeting types ("Something feels off", "Bi-weekly check-in", "Performance & feedback") and confirm no label ends with `?` or starts with a question word. Save sample outputs.
4. **Rename (if Part B)** — full-text search for `focus_point`, `focusPoint`, `FOCUS_POINT` across the repo after rename; check the dev server boots, SSE stream connects, all stages still transition.
