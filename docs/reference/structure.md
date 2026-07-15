# Repo structure — what every folder is for

A one-line map of the repo, with **lifecycle** so it's clear what's live code, what's
just reference, and what's generated (and therefore safe to delete/rebuild).

**Start here for current work:** [`SERO_BOARD.md`](../../SERO_BOARD.md) — the single live board.
**How code is named + laid out:** [`CONVENTIONS.md`](CONVENTIONS.md) — one page, for anyone walking in.

> Layout note (Phase 001 reorg): everything now lives in five rooms — `backend/`
> (engine + API + CLI), `admin/` (the internal UI), `frontend/` (future customer app,
> placeholder), `content/` (all product content), and `docs/`. Tooling (`scripts/`,
> `evals/`, `logs/`) and root config stay at the root. Where content lives on disk is
> defined in one place: `backend/engine/paths.mts`.

## Top-level folders

| Path | What lives here | Lifecycle |
|---|---|---|
| `backend/engine/` | Pipeline core — generate, prep, queue, eval, lexicon, one-on-one types. `paths.mts` is the address book (one place defining where content lives) | **live code** |
| `backend/api/` | HTTP API + session persistence | **live code** |
| `backend/tests/` | Integration tests, mirroring the API service domains (`test-*.js`) | **live test code** |
| `backend/cli.ts` | CLI entry point | **live code** |
| `admin/` | Web UI (Vite SPA), one module per pipeline stage — the internal admin tool | **live code** |
| `frontend/` | Placeholder for the future customer app (Phase 007) — README only for now | **placeholder** |
| `content/prompts/` | Stage prompt templates (`.md` + `.notes.yaml`) — what we tell the LLM | **live config** |
| `content/questions/` | Question bank (`q_*.yaml`), indexed by `_index.json` | **curated data** |
| `content/lexicons/` | Role wording — canonical role folders, `_candidates/` review queue, `_suggested/` auto-gen | **data + pipeline** |
| `content/config/` | Static, human-edited settings — `models.json`, persona bench | **committed config** |
| `content/data/` | Runtime state/artifacts — arc overlays, cached role profiles, `people/` | **runtime (some generated)** |
| `content/scenarios/` | Persona input fixtures — the fake notes/people fed into a run | **test fixtures** |
| `content/notes/` | Optional CLI banner copy (`whats-new.md`) | **content** |
| `content/axes.json` / `content/focus-points.json` | Engine config data (read via the address book) | **committed config** |
| `evals/` | Engine-correctness checks — `trust-checks.js`, golden/fixtures/replay | **live test code** |
| `scripts/` | Runners + verification — `gate.js`, `sweep.js`, `eval.js`, `replay-*`, `test-*.js` | **tooling** |
| `logs/` | Run artifacts — mostly git-ignored; only `logs/may/` is the kept baseline | **generated (mostly untracked)** |
| `docs/` | Technical docs + `plans/` (all plan work) + `reference/` (rulebooks) + `reports/` + `archive/` (misc old artifacts) | **docs (live)** |
| `docs/plans/` | **All plan work, three buckets:** `doing/` (active Darren-Method tracks) · `future/` (queued + parked) · `done/` (finished, archived). | **active work** |

## Root files worth knowing

| File | What |
|---|---|
| `SERO_BOARD.md` | **The live board** — what's in flight now. Start here. |
| `CLAUDE.md` | Standing behavioural rules for this repo |
| `README.md` | Quick start + short repo map |
| `backend/cli.ts` | CLI entry point |
| `scripts/smoke-test.js` | Full 5-stage smoke run |
| `backend/engine/paths.mts` | The address book — one place defining where content lives |

## The look-alikes (what actually differs)

- **`content/scenarios/` vs `evals/`** — `content/scenarios/` holds the *inputs* (fake
  notes/people to feed a run); `evals/` holds the *checks* that judge whether the output
  is correct.
- **`content/config/` vs `content/data/`** — `config/` is static, human-edited settings
  you commit; `data/` is runtime state, often generated/rebuilt (some of it git-ignored).
- **`docs/plans/` vs `SERO_BOARD.md`** — `docs/plans/` holds the plan *folders* in three
  buckets (`doing/` active · `future/` queued+parked · `done/` finished); `SERO_BOARD.md`
  is the strategic board that says what's active right now. If in doubt, read the board.
- **`content/prompts/` vs `content/config/`** — `prompts/` is what we tell the model
  (templates); `config/` is which models/personas and numeric settings.

## Cleanup levers (why the big folders are big on purpose)

- **`logs/` grows fast** — it's mostly git-ignored; prune old runs with
  `node scripts/purge-runs.ts`. Only `logs/may/` is tracked, as the regression baseline.
- **`content/questions/` is ~4k files by design** — indexed by `_index.json`; rebuild
  after adding/moving any with `npm run rebuild-question-index`.
