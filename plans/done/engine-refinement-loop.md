# Plan: Engine refinement → main build loop
**Version:** v2

## Caveman version

Goal: **every run proves your prompt notes still hold.** Edit prompt → run → see green/red on each rule you wrote. No git, no merging — just signal that intent survived.

Core idea: **notes-as-assertions.** Next to each prompt, a `notes.yaml` lists what the output must do (quote transcript, 3–5 actions, no generic headline, axes within range). Every run scores each rule. Report shows pass/fail per scenario per rule.

6 steps:

1. **Prompt version stamp** — hash of prompt file written into each `inputs.json` so report knows which version ran.
2. **`notes.yaml` per prompt** — your intent in plain rules. Lives next to prompt.
3. **Rule runner** — after each scenario, evaluate every rule against output. Cheap rules (regex, JSON shape, length) run free; subjective rules (`must quote transcript`) call Haiku judge.
4. **Matrix runner (`npm run eval`)** — all scenarios × current prompts → one report. Per-rule pass/fail grid.
5. **A/B variant slot** — `prompts/X.candidate.md` runs alongside main. Report shows both columns.
6. **Promotion script** — `npm run promote <name>` swaps candidate into main, archives old.

Final loop:

```
edit prompts/X.md (or X.candidate.md)
edit prompts/X.notes.yaml   ← add new rule for new intent
npm run eval
→ green: ship (or promote)
→ red: see which rule broke, iterate
```

Top 3 ROI: steps 1, 2, 3. Build those first. Rest = sugar on top.

## Changelog

- v2: Dropped git step. Reframed around notes-as-assertions per-run verification. Renumbered steps. (+38 / -39 lines)
- v1: Initial plan (+62 / -0 lines)

---

## Detailed plan

### Step 1 — Prompt version stamping
- New util `src/prompt-version.js`:
  - `loadPrompt(name)` → `{ text, version }` where version = first 8 chars of `sha256(text)`.
- Each stage that calls a prompt writes `prompt_version` into `inputs.json`.
- `session.logStage` accepts and persists it.
- Cost: ~30 min.

### Step 2 — `notes.yaml` per prompt
- New file per prompt: `prompts/<name>.notes.yaml`.
- Schema:
  ```yaml
  rules:
    - id: headline_not_generic
      type: regex_not
      field: headline
      pattern: "^(Great|Good|Productive) (chat|meeting|1:1)"
      reason: "Headline must be specific, not boilerplate"

    - id: action_count
      type: count_range
      field: next_actions
      min: 2
      max: 5

    - id: axes_in_range
      type: axes_bounds
      bounds:
        wellbeing: [1, 5]
        engagement: [1, 5]
        clarity:    [1, 5]
        growth:     [1, 5]

    - id: must_quote_transcript
      type: judge
      rubric: "brutal_truth_employee must contain a direct quote from the transcript"

    - id: actions_have_when
      type: every_has_field
      field: next_actions
      required: [when, action]
  ```
- One file per prompt. Plain text. Easy to add rules as you refine.
- Cost: ~30 min schema + 1 hr seeding rules for `final-evaluation.md`.

### Step 3 — Rule runner
- New `src/rules.js`:
  - Each rule `type` has a checker fn: `regex_not`, `count_range`, `axes_bounds`, `every_has_field`, `length_range`, `json_valid`, `judge`.
  - Cheap checkers run in-process, instant.
  - `judge` checker calls Haiku with rubric + output snippet → returns pass/fail + brief reason.
- Returns array of `{ rule_id, pass, reason? }`.
- Hook into smoke test: after stage 5, load `prompts/final-evaluation.notes.yaml`, run rules against briefing, print pass/fail table.
- Cost: ~3 hr (5 checker types + judge wiring + table render).

### Step 4 — Matrix runner
- `npm run eval`:
  - Walks `scenarios/*.json`, runs full pipeline each.
  - For each scenario, collects rule results from every stage that has a `notes.yaml`.
  - Writes `eval-runs/<timestamp>-<prompt-versions>/report.json` + `report.md`.
  - `report.md` shape:
    ```
    Scenario × Rule grid
                              001-priya  002-junior  003-carl
    headline_not_generic         ✓          ✓          ✗
    action_count                 ✓          ✓          ✓
    axes_in_range                ✓          ✗          ✓
    must_quote_transcript        ✓          ✓          ✓
    ```
- Cost: ~2 hr.

### Step 5 — A/B variant slot
- Convention: `prompts/<name>.md` = main, `prompts/<name>.candidate.md` = experiment.
- `loadPrompt(name, variant?)` returns candidate when `variant === "candidate"` and file exists.
- `npm run eval -- --variant candidate` flag.
- Report shows two columns per scenario: main / candidate. Diff highlighted.
- Cost: ~1 hr.

### Step 6 — Promotion script
- `npm run promote <prompt-name>`:
  - Move current `prompts/<name>.md` → `prompts/_archive/<name>-<sha>.md`.
  - Rename `<name>.candidate.md` → `<name>.md`.
  - `notes.yaml` stays in place (rules apply to whichever version is main).
- Cost: ~30 min.

### Order to ship

1. Step 1 (version stamp) — same day.
2. Step 2 (notes.yaml seeded for `final-evaluation`) — same day.
3. Step 3 (rule runner, cheap checkers only — defer judge) — next session.
4. Step 4 (matrix runner) — when manual single-scenario feels slow.
5. Step 3 part 2 (judge checker) — once you have ≥1 subjective rule that matters.
6. Step 5 (A/B slot) — first real prompt rewrite.
7. Step 6 (promote) — once A/B is regular.

### Risks / open questions

- Rule false-positives: subjective rules will fire wrong sometimes. Mitigate by keeping the rubric specific and limiting `judge` rules to 2–3 per prompt.
- Judge cost: Haiku is cheap but per-scenario-per-rule adds up. Run judge only in matrix runs, not every single-scenario debug run.
- Rule rot: rules can drift from prompt. Convention — when you edit a prompt, glance at the rules file. Same dir, same name, hard to miss.
- No git means no rollback on accidental prompt edits. `_archive/` from step 6 is the safety net; copy to it before any risky edit.
