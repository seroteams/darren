# Sero — Feature Inventory

> **Snapshot date:** 2026-06-01
> **Repo:** `darren` (private, Node.js)
> **Scope of this doc:** Every shipped feature, content asset, and code module of Sero — a 1:1 prep assistant for managers. CLI + web app, shared core. Written to be readable by an LLM (Gemini, etc.) reasoning about the system end-to-end.

---

## 1. Product, one paragraph

Sero is a manager-facing tool that turns a sparse pre-meeting note ("they've been quiet lately", "we have a perf review") into a structured 1:1: it picks focus points, drafts a briefing, generates a question bank, asks the questions live (CLI or web), scores each answer against a four-axis state model, replans the queue after every turn, then produces a post-meeting briefing the manager can act on. The manager asks each question aloud and captures the reply as their own **shorthand note** — terse, third-person ("Checks main screens, skips edge cases"), not a verbatim transcript. The scorer and briefing read these notes as the report's signal, recorded by the manager. Two surfaces — a Node CLI and a Vite/React web app — share the same core pipeline (`src/*`), prompts (`prompts/*`), question content (`questions/*`), and run logs (`logs/<month>/<run-id>/`).

---

## 2. Surfaces

### 2.1 CLI (`cli.js`)
- Single-process linear pipeline. Interactive prompts via `src/ask.js`.
- Recent runs picker on launch (view / delete, last 3).
- Pipeline-delta banner ("X content, Y engine, model swap") vs previous run.
- "What's new" footer pulled from `notes/whats-new.md` (file optional).
- Cost summary written to session dir at end of run.
- Final run-rating prompt (`src/cli/run-rating.js`) — captures user's per-run rating.
- Lexicon review step at end of run if scenario qualifies (design / lead / growth).

Run: `npm run cli` or `node cli.js`.

### 2.2 Web app
- Vite frontend (`frontend/client/`) + Node HTTP API (`frontend/server/`).
- Concurrent dev: `npm run dev` → API on `:3001`, web on `:3000`.
- Production: `npm start` (single port `:3000`, serves built client from `frontend/client/dist/`).
- SSE-streamed AI stages (`/api/*/stream` endpoints) so the user sees the model thinking.
- State persistence (`frontend/server/session-persistence.js`) — sessions survive restarts.
- Rate limiting: 5 new sessions per IP per 60 s; max 50 concurrent sessions.
- Same-origin guard on POSTs (localhost-only).
- Stages rendered as discrete pages: intake → focus-points → preparation → bank → questioning → eval → briefing → lexicon-review.
- Live notes panel during questioning (capture observations tied to question alias + stem).
- Dev badge (`frontend/client/src/ui/dev-badge.js`) shown in non-prod.
- Session topbar (`session-topbar.js`) — name / meeting type / progress.
- Pipeline changelog modal (`pipeline-changelog.js`) — shows what's changed since last run.

---

## 3. The Pipeline (six stages)

Every run goes through these in order. Each stage logs `inputs.json`, `prompt.md`, `response.json` to its own subdir under `logs/<month>/<run-id>/`.

### Stage 0 — Intake
- Inputs: name, role, seniority, meeting type (5 one-on-one types), free-text manager notes.
- No AI call. Just collected and threaded forward.

### Stage 1 — Focus points (`src/generate.js`, `prompts/generate-focus-points.md`)
- Model: `gpt-4o`.
- Input: intake + a 24-entry focus-point **catalogue** (workload, priorities, blockers, energy, team_connection, growth, feedback, recognition, role_clarity, manager_support, quality, speed, ownership, communication, reliability, judgment, collaboration, impact, decision_making_speed, technical_problem_solving, stakeholder_engagement, delegation, cross_team_alignment, risk_assessment).
- Output: 2–5 focus points with `id`, tailored `label` (topic phrase, never a question), `reason` (different shape rules for `signal` vs `best_practice`), `source` (`signal` | `best_practice`).
- Rules enforced in prompt: label-shape gate (no question-word starts), banned-phrase list ("standard anchor", "hygiene", "pulse check", etc.), reason-shape rule (best_practice reasons must start with `Whether `, `How they're `, `What `, or `If `), signal-honesty (notes with content must produce ≥1 signal point).

### Stage 1b — Preparation briefing (`src/preparation.js`, `prompts/preparation.md`)
- Model: `gpt-4o`.
- Produces a manager briefing: `coreIssue` (one sentence), `openingQuestion`, `listenFor` (3 behavioural tells starting "whether" or "if they"), `avoid` (2 "do not" items), `goodOutcome` (one sentence, level-specific), `suggestedAction` ("Before the 1:1" or "During the 1:1").
- **Validator** (`validateBrief` in `src/preparation.js`): C1 non-accusatory opener, C2 private-concern reframe, C3 listenFor behavioural cues, C4 goodOutcome level-specific, C5 suggestedAction pre/in-meeting (no post-meeting follow-up), role-awareness, meeting-type awareness, generic-opener block, length checks, clinical-language safety check.
- **As of 2026-05-27:** if validator fails, the stage retries once with the issue list injected into the prompt. Takes the retry if it passes or reduces issue count. Logs `attempts` field.

### Stage 2 — Question bank (`src/question-generator.js`, `prompts/generate-questions.md`)
- Model: `gpt-4o`.
- Generates 8–12 candidate questions tailored to the person, meeting arc, and focus points.
- Each question carries: `label`, `name` (one probe, no compound), `description`, `purpose` (`wellbeing` | `topic` | `competency`), `stage` (id from meeting arc), `axis_effects` (1–3 axes, deltas in {-3, -1, 1, 3}).
- **Note classification** built into prompt: every note item is classified as `observable`, `manager_planned_unannounced`, or `private_manager_assessment`. Only `observable` may be directly referenced in questions.
- Opening-question rule: first item must be a safe context-setting opener.
- Closing-question rule: last item is the designated closer, drives commitment.
- **Persona-grounding rule** (added May 24 batch): ≥50 % of questions must reference something specific to the person.
- 15-row weak/sharp rewrite table inside the prompt to bias question craft.
- Falls back to a non-AI bank generator if model returns invalid JSON (`generateBankWithFallback`).

### Stage 3 — Live questioning (`src/queue-manager.js`, `prompts/plan-turn.md`)
- Model: `gpt-4o` (per turn).
- Budget: `INTRO_BUDGET = 4`, `DYNAMIC_BUDGET = 5` → `TOTAL_BUDGET = 9` questions/run. Defined in `frontend/server/sessions.js`; CLI imports same constants.
- The queue is seeded from the intro queue (`src/intro-queue.js`, `questions/_intro/<meeting-slug>/`) + the bank from stage 2.
- After every answer, **plan-turn** runs:
  1. Score the answer into axis deltas (signature-bound, magnitude-clamped to question's signature).
  2. Replan the remaining queue (modify / reorder / add / drop).
- Rules baked into the planner prompt (in `<decision_order>`): crisis override → broken session → final-turn enforcement → shallow-answer gate → deficiency-as-request → signature-bound scoring → dedup → thread-follow → arc planning → question craft.
- **Runtime computed signals** (passed into prompt by `queue-manager.js`): `consecutive_drill_count`, `arc_progress`, `remaining_stages`, `last_realized_deltas`, `consecutive_wellbeing_clarifier_count`, `off_arc_drill_count`, `is_final_turn`, `closer_alias`.
- **Hard caps in prompt:** drill cap (≥2 consecutive `planner_added` at same stage blocks more), wellbeing-clarifier cap (max 2 consecutive), off-arc tangent cap (max 1 per session), arc-stage budget rule (when `remaining_budget ≤ length(remaining_stages)`, must advance arc).
- **Defence in depth** in code: if answer is ≤2 tokens and non-empty, planner zeroes any positive axis deltas (`isShallowAnswer` in `queue-manager.js`). Floor is ≤2 (not ≤3) because notes are terse by design — a 3-token note still carries signal.
- Each turn logs `04-dynamic-answers/NN-turn.json` (question + answer + assessment + new_queue + axis_state snapshot).

### Stage 4 — Final evaluation (`src/reviewer.js`, `prompts/final-evaluation.md`)
- Model: `gpt-4o`.
- Input: full transcript, axis state, focus points, original notes.
- Output: `headline` (≤22 words), `summary_bullets` (2–3), `understanding_paragraph` (≤70 words), `axes` (one-line meaning per axis with magnitude-calibrated tone), `brutal_truth_employee` (with transcript quote), `brutal_truth_manager` (forward-coaching, never blame manager for Sero's question), `next_actions` (3, each `{when, action}`), `watch_for` (2 observable tells).
- **Read-quality gate** (added 2026-05-27, top of system prompt): computes `shallow_count` and `shallow_ratio` *before* drafting any field. If `shallow_count ≥ 3` OR `shallow_ratio ≥ 0.4`, branches into partial-read mode — the headline must lead with the read quality, not a content diagnosis.
- Calibration table: ±0–1 = "weak signal, not actionable"; ±2–4 = "watch over weeks"; ±5–7 = "real pattern, act"; ±8–10 = "defining signal".

### Stage 5 — Lexicon review (`src/lexicon-reviewer.js` → `src/lexicon/review-core.js`, `prompts/review-session-for-lexicon.md`)
- Model: `gpt-4o`.
- **Scoped:** only runs for `role_family = design`, `seniority = lead`, `meeting_type = growth` (see `src/lexicon.js` for scope keys).
- Reads the full session's transcript, bank, evaluation, plus the current canonical lexicon.
- Returns candidate `preferTerms`, `preferPhrases`, `avoidPhrases` to add to the lexicon for this scope.
- User picks accept/reject per candidate (CLI: `src/lexicon/cli-interactive.js`; Web: `/api/lexicon/candidates` + `/api/lexicon/decisions`).
- Accepted candidates appended to `lexicons/_candidates/<role-family>/<seniority>.yaml` via `appendCandidates` (`src/lexicon/candidates-io.js`).
- `scripts/promote-candidates.js` promotes candidates into canonical lexicon (`lexicons/<role-family>/<seniority>.yaml`).
- The lexicon biases question wording in stage 2 (preferred terms surface in the prompt via `<conversation_language>`).

---

## 4. Content assets

### 4.1 Meeting types (`src/meeting-types.js`)
Four types, each with badge, duration, description:
1. **Bi-weekly check-in** [Recommended] (15–20 min) — steady catch-ups.
2. **Performance & feedback** (20–30 min) — name a gap clearly.
3. **Growth & career plan** [New] (30–45 min) — plan what comes next.
4. **Something feels off** (20–30 min) — observation-first, opt-in.

### 4.2 Meeting arcs (`src/meeting-arcs.js`)
Each meeting type has a stage arc, a `tone_register`, and explicit `anti_patterns`. Used by the bank generator and the planner.

- **Bi-weekly check-in:** `pulse(1)` → `friction(2)` → `momentum(2)` → `lift(1)`. Tone: casual, peer-tempered.
- **Performance & feedback:** `self_read(1)` → `evidence(2)` → `gap_naming(2)` → `cause(2)` → `commit(1)`. Tone: direct, adult-to-adult.
- **Growth & career plan:** `anchor(2)` → `aspiration(2)` → `gap(2)` → `investment(2)` → `commitment(1)`. Tone: aspirational, forward-leaning.
- **Something feels off:** `landing(1)` → `observation(2)` → `underneath(2)` → `support(1)`. Tone: observation-first, low-pressure.

### 4.3 Axes (`axes.json`)
Four axes used for scoring and final read:
- **wellbeing** (seed -1) — energy, sustainability, stress.
- **engagement** (seed -1) — motivation, ownership.
- **clarity** (seed 0) — role clarity, priorities.
- **growth** (seed 0) — trajectory, stretch.

Scores clamp to [-10, +10]. Deltas snap to {-3, -1, 0, 1, 3}.

### 4.4 Question library (`questions/`)
- ~689 question YAMLs at top level + `_index.json` index.
- **`_openers.json`** — 12-ish opener questions (research-backed: Michael Bungay Stanier, Kim Scott, etc.) tagged with meeting-type compatibility.
- **`_intro/<meeting-slug>/`** — meeting-type-specific seed openers (e.g. `q_intro_biweekly_friction`, `q_intro_biweekly_pace`, `q_intro_agenda_check`).
- **`_seed/`** — 8 axis-anchored seed questions (clarity_priorities, clarity_success, engagement_interest, engagement_ownership, growth_feedback, growth_uncomfortable, wellbeing_recovery, wellbeing_sustain).
- Top-level `q_*.yaml` files — generated questions saved during prior runs (alias-deduplicated; `src/questions.js`).
- `scripts/rebuild-question-index.js --prune` regenerates `_index.json`.

### 4.5 Lexicon (`lexicons/`)
- Canonical preferred-terms / phrases per role-family + seniority.
- `lexicons/_candidates/*` — user-accepted candidates awaiting promotion.

### 4.6 Scenarios (`scenarios/`)
- Replayable manager+notes inputs for testing.
- `scenarios/regression/` — worst-case fixtures from batch runs.
- `scripts/replay-scenario.js` reruns scenarios end-to-end.

---

## 5. Prompts (`prompts/`)
Each is a single Markdown file with `{{PLACEHOLDER}}` substitution done by the calling Node module.

| File | Stage | Calls |
|------|-------|-------|
| `generate-focus-points.md` | Stage 1 | `src/generate.js` |
| `preparation.md` | Stage 1b | `src/preparation.js` |
| `generate-questions.md` | Stage 2 | `src/question-generator.js` |
| `plan-turn.md` | Stage 3 (per turn) | `src/queue-manager.js` |
| `final-evaluation.md` | Stage 4 | `src/reviewer.js` |
| `review-session-for-lexicon.md` | Stage 5 | `src/lexicon/review-core.js` |

All prompts return strict JSON; runner uses `parseAIJson` (`src/ai-client.js`) which tolerates fenced code blocks but enforces required keys.

---

## 6. Models config (`config/models.json`)
Per-stage override; falls through to `OPENAI_MODEL_<STAGE>` env → config file → `OPENAI_MODEL` env → `gpt-4o-mini` fallback. Current canon:

```json
{ "focus_points": "gpt-4o", "preparation": "gpt-4o", "bank": "gpt-4o", "planner": "gpt-4o", "evaluation": "gpt-4o" }
```

`src/models.js#allResolved()` reports the active per-stage model.

---

## 7. Storage and logging

### 7.1 Run logs (`logs/<month>/<run-id>/`)
Every run writes a self-contained dir. Structure:
```
logs/may/2026_May25_14-23-5252887f/
  axis-state.json          ← final axis snapshot
  transcript.json          ← question → answer flat list
  session-state.json       ← internal state at end
  pipeline-lock.json       ← snapshot of code/prompt versions
  notes.md                 ← live notes captured during questioning
  01-focus-points/   inputs.json prompt.md response.json
  01b-preparation/   inputs.json prompt.md response.json
  03-question-bank/  inputs.json prompt.md response.json
  04-dynamic-answers/01-turn.json … NN-turn.json
  05-evaluation/     inputs.json prompt.md response.json
```
- `src/session.js` owns directory creation + `logStage()` writer.
- `src/run-history.js` lists / summarises / deletes runs.

### 7.2 Pipeline lock (`src/pipeline-lock.js`)
On every run, hashes all prompt files, all `src/*.js` content modules, the active models config, and the git HEAD. Saves as `pipeline-lock.json`. The CLI startup banner diffs the latest run's lock vs current state and shows: content files changed, engine files changed, model swaps, git changes (with dirty flag). Frontend has the same via `GET /api/pipeline/status` and a changelog modal.

### 7.3 Cost tracking (`src/cost.js`)
Wraps every `callAI` to count tokens and dollar cost per stage. Final cost report written to `session-cost.txt` (CLI) and surfaced via API.

---

## 8. API surface (`frontend/server/`)

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET    | `/api/meeting-types` | `meeting-types.js` | Static list |
| POST   | `/api/start` | `start.js` | Create session, pick opener, load intro queue, kick off focus-points |
| GET    | `/api/session` | `rehydrate.js` | Resume mid-flight session |
| GET    | `/api/question` | `question.js` | Get next queued question |
| POST   | `/api/answer` | `answer.js` | Submit answer, triggers plan-turn |
| POST   | `/api/notes` | `notes.js` | Append live note (with question alias linkage) |
| GET    | `/api/runs/recent` | `runs.js` | List recent runs |
| GET    | `/api/runs/:id/overview` | `runs.js` | Summary for a run |
| DELETE | `/api/runs/:id` | `runs.js` | Delete a run |
| GET    | `/api/pipeline/status` | `pipeline.js` | Drift vs last run |
| GET    | `/api/pipeline/manifest` | `pipeline.js` | Full lock manifest |
| GET    | `/api/lexicon/candidates` | `lexicon.js` | Candidate list for review UI |
| POST   | `/api/lexicon/decisions` | `lexicon.js` | Commit accept/reject choices |
| GET    | `/api/focus-points/stream` | `focus-points.js` | SSE: focus-points stage |
| GET    | `/api/preparation/stream` | `preparation.js` | SSE: briefing stage |
| GET    | `/api/bank/stream` | `bank.js` | SSE: question-bank stage |
| GET    | `/api/plan/stream` | `plan.js` | SSE: plan-turn (per answer) |
| GET    | `/api/evaluation/stream` | `evaluation.js` | SSE: final evaluation |

Server lives in `frontend/server/server.js`. Router is a small hand-rolled regex matcher (`frontend/server/router.js`).

---

## 9. Web client structure (`frontend/client/src/`)

```
main.js          ← bootstraps app, owns top-level state via state.js
state.js         ← reducer-style store
api.js           ← fetch wrappers
sse.js           ← SSE consumer for streamed stages
stages/
  intake.js          ← name / role / meeting type / notes form
  start.js           ← landing + recent runs
  focus-points.js    ← user picks which to keep (starts unselected)
  preparation.js     ← briefing display
  bank.js            ← bank ready state
  questioning.js     ← live Q&A with axis bars + notes panel
  briefing.js        ← preparation briefing layout
  eval.js            ← final evaluation display
  lexicon-review.js  ← yes/no per candidate
  error.js           ← fail state
ui/
  axes.js                  ← live axis bar chart
  confirm.js               ← modal confirm
  dev-badge.js
  field.js                 ← form input
  notes-list.js            ← rendered notes
  notes-panel.js           ← live capture during questioning
  notes-panel-utils.js
  orb.js                   ← thinking indicator
  pipeline-changelog.js    ← drift modal
  reveal.js                ← reveal animation
  session-topbar.js
  shortcuts.js             ← keyboard shortcuts
styles/
  design.css               ← tailwind layer + tokens
```

### UI canon (locked patterns, May 2026 audit)
- One eyebrow + h1 per stage.
- Sentence-case button labels.
- Default CTA copy = "Continue".
- No "Sero · 1:1 prep" eyebrow.
- Focus-points list starts unselected (user opts items *in*).
- Axis bars seeded from `axes.json` (wellbeing/engagement -1, clarity/growth 0).

---

## 10. Notes panel (web only)
- Live capture during questioning stage.
- Each note tagged with question alias + question stem + timestamp.
- Persisted to `notes.md` in the run dir (rendered with `## <Section>` per question or stage).
- Surfaces in `reviewrun` digest and final evaluation context.

---

## 11. Tooling and scripts

| Script | Purpose |
|--------|---------|
| `scripts/rebuild-question-index.js --prune` | Regenerate `questions/_index.json`, drop orphans |
| `scripts/promote-candidates.js` | Promote `lexicons/_candidates/` into canonical |
| `scripts/replay-scenario.js` | Re-run a scenario end-to-end |
| `scripts/test-lexicon.js` | Lexicon-pipeline unit-ish test |
| `scripts/test-prep-role-diff.js` | Diff prep briefings across roles |
| `smoke-test.js` | End-to-end smoke (`npm run smoke`) |

---

## 12. Skills and workflow (developer-facing)

- `.claude/skills/reviewrun/SKILL.md` — `/reviewrun <run-dir>` command. Loads a single run log, dumps every stage's inputs/prompt/response verbatim, then primes a refinement discussion with per-note fixes, cross-stage signals, hypotheses, and sharpening questions.
- `PLAN.md` — workstream board at repo root.

---

## 13. Recent improvements (May 2026)

- **2026-05-23** — Logs tracked in git, full pipeline-lock manifesting.
- **2026-05-24** — Batch eval+self-edit run (26 runs, $12.61, score 0.820 → 0.839). Three prompt hunks applied: persona-grounding in `generate-questions.md`, thread-follow bias in `plan-turn.md`, anti-neutral-default in `plan-turn.md`.
- **2026-05-27** — `<read_quality_gate>` added at top of `final-evaluation.md` (forces shallow-count computation before any field). Preparation stage now retries once when validator fails.

---

## 14. Known open work (in `PLAN.md`)

- **Drill cap runtime enforcement** — `prompts/plan-turn.md` cap rule exists and runtime computes `consecutive_drill_count`, but the model has been ignoring the hard cap. Open decision on whether to enforce in `src/queue-manager.js`.
- **Lexicon empty-state UI** — when reviewer returns 0 candidates, the UI still shows the stage with "No lexicon candidates from this run." copy. User flagged this twice. Open decision: hide stage vs loosen filter vs copy fix.
- **Pipeline run review workflow** — `reviewrun` skill needs intent + output-format spec.

---

## 15. Tech stack

- **Runtime:** Node.js (no TypeScript). CommonJS modules.
- **Frontend build:** Vite 6, hand-rolled state, no React/Vue framework.
- **Styling:** Tailwind CSS 3 + custom design tokens (`frontend/client/src/styles/design.css`).
- **Fonts:** Inter Variable (`@fontsource-variable/inter`).
- **AI client:** OpenAI SDK via `src/ai-client.js` — wraps `callAI({system, user, schema, schemaName, temperature, model, costLabel})`. Schema enforced via JSON-schema response format.
- **YAML:** `yaml@^2.9.0` for question + lexicon files.
- **No DB.** Everything is filesystem-backed (logs, questions, lexicons, sessions).

---

## 16. How to run

```bash
# Environment
export OPENAI_API_KEY=sk-...        # required
export OPENAI_MODEL=gpt-4o          # optional override
export OPENAI_MODEL_PLANNER=...     # per-stage override

# CLI
npm run cli

# Web (dev — concurrently runs API + Vite)
npm run dev
# → API   http://localhost:3001
# → Web   http://localhost:3000

# Web (prod)
npm run build && npm start
# → http://localhost:3000

# Smoke
npm run smoke
```

---

## 17. File map (one-liner per module)

### `src/`
- `ai-client.js` — OpenAI wrapper + JSON parse helpers
- `ask.js` — readline-style prompter for CLI
- `axes.js` — load `axes.json`, init/serialize/summarize state
- `briefing.js` — render briefing for CLI display
- `cost.js` — token / dollar accounting
- `env.js` — `.env` loader
- `generate.js` — focus-points generator (Stage 1)
- `intro-queue.js` — load intro queue per meeting type
- `lexicon.js` — scope keys + canonical/candidate paths
- `lexicon-reviewer.js` — barrel re-export over `./lexicon/`
- `lexicon/cli-interactive.js` — CLI accept/reject loop
- `lexicon/review-core.js` — Stage 5 AI call
- `lexicon/candidates-io.js` — append candidates + trace I/O
- `lexicon/schema.js` — response schema
- `meeting-arcs.js` — arc definitions per meeting type
- `meeting-types.js` — 4 meeting-type list
- `models.js` — per-stage model resolution
- `opener.js` — pick an opener for a session
- `pipeline-lock.js` — hash + diff prompts/code/models/git
- `preparation.js` — Stage 1b briefing + validator + retry
- `question-generator.js` — Stage 2 bank with fallback
- `questions.js` — alias dedup, save/load question YAMLs
- `queue-manager.js` — Stage 3 plan-turn + signature-binding + runtime drill counters
- `reviewer.js` — Stage 4 final evaluation
- `run-history.js` — list / summarise / delete runs
- `session.js` — session dir, `logStage()` writer
- `ui.js` — chalk wrappers (bold/dim/cyan/yellow/red/HR/pad/withThinking)
- `cli/io.js` — JSON write helpers for CLI
- `cli/run-rating.js` — final 1-5 user rating
- `cli/stages/*` — CLI orchestrators per stage

### `frontend/server/`
- `server.js` — HTTP server, route registration, rate limit, origin guard
- `router.js` — hand-rolled regex router
- `static.js` — prod static file handler
- `sessions.js` — in-memory session map, sweep, budgets
- `session-persistence.js` — disk persistence so sessions survive restarts
- `sse.js` — SSE response helpers
- `handlers/*` — one per endpoint (see § 8)

---

## 18. Conventions to know if you're modifying this code

- **No comments in code** unless the *why* is non-obvious.
- **Plan files** under `plans/` carry a version number, Caveman summary, and changelog with line-counts.
- **Plans are suggestions, not directives** — write options + tradeoffs + open questions, not checklists.
- **Notes link to question content** — `question_alias` is the join key.
- **Briefing**: actions ("what to do next"), not "what to watch for" framings.
