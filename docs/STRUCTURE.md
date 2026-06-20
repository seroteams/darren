# Repo structure — what every folder is for

A one-line map of the repo, with **lifecycle** so it's clear what's live code, what's
just reference, and what's generated (and therefore safe to delete/rebuild).

**Start here for current work:** [`SERO_BOARD.md`](../SERO_BOARD.md) — the single live board.

## Top-level folders

| Path | What lives here | Lifecycle |
|---|---|---|
| `src/` | Pipeline core — generate, prep, queue, eval, lexicon, one-on-one types | **live code** |
| `frontend/client/` | Web UI (Vue SPA), one module per pipeline stage | **live code** |
| `frontend/server/` | HTTP API + session persistence | **live code** |
| `prompts/` | Stage prompt templates (`.md` + `.notes.yaml`) — what we tell the LLM | **live config** |
| `questions/` | Question bank (`q_*.yaml`), indexed by `_index.json` (being grouped into `stage_*/` subfolders) | **curated data** |
| `lexicons/` | Role wording — canonical role folders, `_candidates/` review queue, `_suggested/` auto-gen | **data + pipeline** |
| `config/` | Static, human-edited settings — `models.json`, persona bench | **committed config** |
| `data/` | Runtime state/artifacts — arc overlays, cached role profiles, `people/` | **runtime (some generated)** |
| `evals/` | Engine-correctness checks — `trust-checks.js`, golden/fixtures/replay | **live test code** |
| `scenarios/` | Persona input fixtures — the fake notes/people fed into a run | **test fixtures** |
| `scripts/` | Runners + verification — `gate.js`, `sweep.js`, `eval.js`, `replay-*`, `test-*.js` | **tooling** |
| `prompts/` … `notes/` | `notes/` = optional CLI banner copy (`whats-new.md`) | **content** |
| `logs/` | Run artifacts — mostly git-ignored; only `logs/may/` is the kept baseline | **generated (mostly untracked)** |
| `plans/` | Archived specs, audit tracker, feature inventory, `PLAN-archive.md` | **archive (reference only)** |
| `docs/` | Technical docs (`contracts`, `GUARDRAILS`, `darren`, how-it-works) + `todo/` + screenshots | **docs (live)** |
| `docs/todo/` | Active Darren-Method work — one folder per workstream; finished ones move to `docs/todo/done/` | **active work** |

## Root files worth knowing

| File | What |
|---|---|
| `SERO_BOARD.md` | **The live board** — what's in flight now. Start here. |
| `CLAUDE.md` | Standing behavioural rules for this repo |
| `README.md` | Quick start + short repo map |
| `cli.js` | CLI entry point |
| `smoke-test.js` | Full 5-stage smoke run |
| `axes.json` / `focus-points.json` | Engine config data (referenced by path — leave in root) |

## The look-alikes (what actually differs)

- **`scenarios/` vs `evals/`** — `scenarios/` holds the *inputs* (fake notes/people to
  feed a run); `evals/` holds the *checks* that judge whether the output is correct.
- **`config/` vs `data/`** — `config/` is static, human-edited settings you commit;
  `data/` is runtime state, often generated/rebuilt (some of it git-ignored).
- **`plans/` vs `docs/todo/` vs `SERO_BOARD.md`** — `plans/` is *archived* history
  (done, reference only); `docs/todo/` is *active* in-flight work; `SERO_BOARD.md` is
  the single board that says what's active right now. If in doubt, read the board.
- **`prompts/` vs `config/`** — `prompts/` is what we tell the model (templates);
  `config/` is which models/personas and numeric settings.

## Cleanup levers (why the big folders are big on purpose)

- **`logs/` grows fast** — it's mostly git-ignored; prune old runs with
  `node scripts/purge-logs.js`. Only `logs/may/` is tracked, as the regression baseline.
- **`questions/` is ~4k files by design** — indexed by `_index.json` (and being grouped
  into `stage_*/` subfolders); rebuild after adding/moving any with `npm run rebuild-question-index`.
