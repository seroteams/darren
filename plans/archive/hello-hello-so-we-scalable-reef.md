# Plan — Integrate `batch-data.zip` learnings into local repo

**Version:** 2
**Caveman:** full
**Changelog:**
- v1 (initial): +130 / -0
- v2 (user answers): +24 / -32. Archive path → `logs/may/2026_May24_batch/`. Scope expanded: apply evolved prompts this turn ("just use it"). Open questions removed.

---

## Context

`batch-data.zip` (at repo root) was produced on the work computer by an automated eval+self-edit harness. It ran **26 simulated 1:1s across 2 batches**, scored each on 14 quality dimensions, and applied **4 auto-edits** to `prompts/generate-questions.md` and `prompts/plan-turn.md`. Total spend $12.61 — non-trivial.

The zip is the *only* artifact of that run. Nothing has been pulled into this repo yet. We want to:
1. Preserve raw data so heavy-ops can mine it later.
2. Surface the headline failure modes (the *what changed and why* signal).
3. Decide whether/how to adopt the evolved prompts — without blindly overwriting.

This machine is **light-ops** per `HANDOFF.md`. Prompt engineering is explicitly heavy-ops. So this plan only covers the **mechanical / advisory** parts; prompt adoption itself is deferred.

---

## What's in the zip

| File | Size | Purpose |
|---|---|---|
| `REPORT.md` | 2 KB | Human summary: scores, worst dimensions, edits applied. |
| `quality-report.json` | 11 KB | Machine version of same, with worst-case run IDs. |
| `run-outputs.json` | 322 KB | Array of 26 full run logs (stages, scores, costs). The mineable corpus. |
| `generate-questions.md` | 19.7 KB | **Evolved** prompt after 2 auto-edits. (Repo current: 19.3 KB.) |
| `plan-turn.md` | 30.5 KB | **Evolved** prompt after 2 auto-edits. (Repo current: 30.0 KB.) |

## Headline findings (from `REPORT.md`)

- Overall score trend: **0.820 → 0.839** across the 2 batches.
- Three weak dimensions worth attention:
  - **`question_specificity`** mean 0.094 — questions almost never mention the persona by name/role. Worst offenders: Priya, Tom, Maria, James (multiple runs scored 0).
  - **`plan_thread_follow`** mean 0.308 — planner rarely picks up threads from prior answers.
  - **`plan_delta_accuracy`** mean 0.595 — axis-delta scoring agrees with rubric only ~6/10.
- The auto-editor cited specific failing `run_id`s when applying each edit — those IDs are the breadcrumb trail back into `run-outputs.json`.

## Recommended approach (suggestions, not directives)

### Step 1 — Archive raw data into `logs/may/2026_May24_batch/`

```
logs/may/2026_May24_batch/
  REPORT.md
  quality-report.json
  run-outputs.json
  prompts-evolved/
    generate-questions.md
    plan-turn.md
  README.md   ← pointer: aggregate (not single-run); 26 runs, score 0.820→0.839, 4 prompt edits applied
```

Path chosen by user. Note: `reviewrun` skill expects single-run shape (focus-points/question-bank/transcript). This dir is aggregate — the `README.md` flags that so `reviewrun` doesn't try to digest it.

Cost: ~350 KB to git. Same scale as committed logs.

### Step 2 — Generate side-by-side diff for the record

`git diff --no-index prompts/generate-questions.md logs/may/2026_May24_batch/prompts-evolved/generate-questions.md` (same for `plan-turn.md`) → write to `logs/may/2026_May24_batch/EVOLVED-DIFF.md`. Captures *what* changed for future reference.

### Step 3 — Apply evolved prompts (per user "just use it")

Copy the evolved versions over the live prompts:

- `prompts/generate-questions.md` ← `logs/may/2026_May24_batch/prompts-evolved/generate-questions.md`
- `prompts/plan-turn.md` ← `logs/may/2026_May24_batch/prompts-evolved/plan-turn.md`

**Risk acknowledged**: this normally falls under heavy-ops (prompt engineering). User has explicitly directed it. Mitigations:
- The EVOLVED-DIFF.md from Step 2 is the audit trail.
- `PLAN.md` open feedback items 5 + 6 also target `plan-turn.md` — heavy-ops still needs to layer those on top later. Add a note to that workstream so the auto-edits are not silently overwritten when heavy-ops next touches the file.
- One commit per file (`prompts: apply evolved generate-questions.md from batch run` / `…plan-turn.md`) so revert is a single `git revert` away if heavy-ops disagrees.

### Step 4 — Update `PLAN.md`

Add workstream:

```
## Adopt batch-run learnings (May 24)
- Owner: heavy-ops
- Status: review
- Last touched: 2026-05-24, light-ops
- Next step: heavy-ops to (a) review applied prompt edits against open feedback items 5+6, (b) decide whether worst-case runs become regression scenarios under scenarios/regression/.
- Notes: archive at logs/may/2026_May24_batch/. EVOLVED-DIFF.md shows exact prompt changes. Worst dimensions: question_specificity 0.094, plan_thread_follow 0.308, plan_delta_accuracy 0.595.
```

## Files involved

- **Read-only**: `batch-data.zip`, `HANDOFF.md`.
- **New**: `logs/may/2026_May24_batch/**` (5 extracted files + README + EVOLVED-DIFF).
- **Modified**: `prompts/generate-questions.md`, `prompts/plan-turn.md`, `PLAN.md`.

## Commit sequence

1. `eval: archive May 24 batch run (26 runs, 0.820→0.839)` — adds `logs/may/2026_May24_batch/`.
2. `prompts: apply evolved generate-questions.md from batch run` — overwrites the one file.
3. `prompts: apply evolved plan-turn.md from batch run` — overwrites the one file.
4. `plan: track batch-run adoption for heavy-ops review` — `PLAN.md` workstream entry.

Per-file commits so any single change can be reverted independently.

## Verification

- `logs/may/2026_May24_batch/REPORT.md` opens and is readable.
- `EVOLVED-DIFF.md` shows non-trivial hunks (if it's empty, the auto-edits were no-ops and the user should know — flag it before applying).
- `git diff HEAD~3 HEAD -- prompts/` shows only the two prompt files changed.
- `PLAN.md` lists the new heavy-ops workstream.
- `batch-data.zip` is left in place at repo root (not deleted) until user confirms; can be `.gitignore`d or removed after.
