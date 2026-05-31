# Auto-eval sweep harness across all 5 meeting types

**Version:** v1
**Caveman version:** full
**Created:** 2026-05-31

## Caveman version

Build LLM-judge sweep so Claude runs testing, user reads 1-page digest. Fill onboarding persona gap (0 today). 15 personas = 3 × 5 types. Run sweep in background while user out. Leave `DIGEST.md` + `report.json` + run trail.

## Changelog

- v1 (2026-05-31): Initial plan. Personas + judge + sweep + autonomous run.

---

## Context

User can't manually test all 5 meeting types by hand — too much volume. Wants to offload testing to Claude: Claude runs, user reads verdicts. User is leaving now and asked for the work done autonomously with a trail + report on return.

Infra already exists and is reused, not rebuilt:
- [smoke-test.js](smoke-test.js) — full 5-stage pipeline per persona, canned answers via stdin, no human needed.
- [scripts/batch-m2-verify.js](scripts/batch-m2-verify.js) — live sweep of personas + scoring + JSON report. Skeleton of the rig.
- [scenarios/batch/](scenarios/batch) — 10 personas, but only cover 4 of 5 types.
- [src/reviewer.js](src/reviewer.js) — the `chat()` / `getModel()` / `parseAIJson()` AI-call pattern the judge will copy.
- [src/meeting-arcs.js](src/meeting-arcs.js) — the 5 arc definitions → source for the 5 judge rubrics.

**Two real gaps** (not plumbing):
1. **Coverage:** "Onboarding check-in" has **0** personas. Whatever changes, onboarding goes untested. Counts today: bi-weekly 3, perf 3, growth 2, off 2, onboarding 0.
2. **Signal:** current scoring is blind regex (keyword overlap, word-match, non-zero delta). Can't judge whether a question lands, tone fits the arc, or the brief is useful — exactly the human judgment worth offloading to an LLM judge.

**Outcome:** a single command (`node scripts/sweep.js --live`) that runs 15 personas across all 5 types, scores each with heuristics + an arc-aware LLM judge, and emits a one-page `DIGEST.md` the user reads in 2 minutes.

---

## Plan

### Step 1 — Fill persona coverage to 3 × 5 = 15

Add 5 new persona files in [scenarios/batch/](scenarios/batch), matching the exact existing shape (`name`, `role`, `seniority`, `meeting_type`, `manager_notes`, `answers[8-9]`) seen in [james-something-feels-off.json](scenarios/batch/james-something-feels-off.json) and [priya-biweekly-checkin.json](scenarios/batch/priya-biweekly-checkin.json):

- **3 × Onboarding check-in** (new joiner, 2-4 weeks in; vary: settling-well, quietly-struggling, unclear-on-scope)
- **1 × Growth & career plan** (brings growth 2 → 3)
- **1 × Something feels off** (brings off 2 → 3)

`meeting_type` strings must match [src/meeting-arcs.js](src/meeting-arcs.js) labels exactly. `answers` written to exercise the arc stages (e.g. onboarding: settling → clarity → blockers → support).

Update [scenarios/batch/_index.json](scenarios/batch/_index.json) and [scenarios/batch/README.md](scenarios/batch/README.md) mapping (new personas have no pinned `run_id` — mark `"run_id": null`).

→ verify: each new file parses; `node smoke-test.js scenarios/batch/<new>.json` reaches stage 5 (unit checks + E2E pass).

### Step 2 — Arc-aware LLM judge

New `src/judge.js`, copying the call shape from [src/reviewer.js](src/reviewer.js) (`chat({ messages, model, responseFormat:{type:"json_object"}, session, stage:"judge" })`, `getModel("judge")`, `parseAIJson`).

- New prompt `prompts/judge-session.md`: takes meeting type, persona, the arc (from [src/meeting-arcs.js](src/meeting-arcs.js) ARCS), transcript, and final brief. Returns strict JSON:
  ```json
  { "scores": { "arc_fit":0-1, "question_quality":0-1, "brief_usefulness":0-1, "tone_fit":0-1 },
    "verdict": "pass" | "flag",
    "one_line": "<single sentence: worst weakness or 'clean'>" }
  ```
- Rubric is arc-driven: judge is told the expected stages for that type and asked whether the session actually moved through them.
- Add `"judge"` model key to [config/models.json](config/models.json) (default: same strong model as `evaluation`).

→ verify: `node -e` smoke calling `judge()` on one existing recorded session dir returns valid JSON with all 4 scores + verdict.

### Step 3 — One-command sweep + digest

New `scripts/sweep.js`, reusing `runSmoke()` / `scanSessions()` / `loadJson()` / `scoreSessionDir()` patterns from [scripts/batch-m2-verify.js](scripts/batch-m2-verify.js):

- Runs all 15 personas via `smoke-test.js` child process (offline-discover mode also supported, like m2).
- For each: keep existing heuristic scores **and** call `judge()`.
- Emits two artifacts in a timestamped dir `logs/sweeps/<date>/`:
  - `report.json` — full per-persona scores (heuristic + judge), session paths, costs.
  - `DIGEST.md` — the 1-page the user reads: per-type pass/flag table, overall, and the worst 1-2 sessions **with the judge's one-liner + a 3-turn transcript excerpt quoted inline** so no transcript-hunting needed.

→ verify: `DIGEST.md` renders a per-type table covering all 5 types; every flagged row links to its session dir.

### Step 4 — Run it autonomously + leave the trail (while user is out)

Once approved, execute end-to-end without pausing (per [[feedback_no_mid_run_questions]] — no mid-run questions):

1. Run `node scripts/sweep.js --live` in **background** (~20 min for 15 live personas; backgroundable).
2. On completion, read `DIGEST.md`, sanity-check the judge against 2-3 transcripts myself (the trust-window spot-check), and note any judge mistakes inline.
3. Write a top-level **`SWEEP-REPORT.md`** at repo root summarizing for the user's return:
   - What was built (files added).
   - Sweep result: per-type pass/flag, overall, biggest weakness found.
   - My spot-check of the judge: do I trust its scores? where did it miss?
   - Recommended next 1-2 fixes, ranked.
4. Leave all WIP **uncommitted** on the current branch (`refactor/one-on-one-types`) — do not commit/push (per [[feedback_plan_location]] / surgical defaults; user reviews first).

---

## Files

| Action | Path |
|---|---|
| add | `scenarios/batch/*-onboarding-checkin.json` ×3, +1 growth, +1 off |
| edit | `scenarios/batch/_index.json`, `scenarios/batch/README.md` |
| add | `src/judge.js`, `prompts/judge-session.md` |
| edit | `config/models.json` (add `judge` key) |
| add | `scripts/sweep.js` |
| add | `SWEEP-REPORT.md` (repo root, the deliverable for user's return) |

No existing pipeline/runtime code is touched — judge + sweep are additive, read-only against the running app.

## Verification

- `node smoke-test.js scenarios/batch/<each-new-persona>.json` → stage-5 reach, all checks pass.
- `node scripts/sweep.js --live` → 15/15 run, `report.json` + `DIGEST.md` written, all 5 types present.
- Manual: open `DIGEST.md` → readable in <2 min, flagged rows quote their evidence inline.
- Trust check: I read 2-3 full transcripts vs the judge's verdict and record agreement in `SWEEP-REPORT.md`.

## Open items deferred (not this run)

- Wire sweep into a `/loop` or scheduled cadence — only after user trusts the judge.
- Pin any new bad runs as regression fixtures (`scripts/generate-m3-regression.js` pattern) — after user picks which.
