# Sero

Manager-facing 1:1 prep — sparse notes in, structured meeting out. **CLI** + **web app**, shared pipeline core.

## Quick start

```bash
npm install
npm run dev      # API :3001 + web :3000
npm run cli      # terminal pipeline
npm test         # full offline test suite — free, no API key
npm run smoke    # scenario smoke tests — PAID (hits OpenAI, needs key)
npm run eval     # engine checks (prompt rules + replay) — PAID (hits OpenAI)
```

Production: `npm run build && npm start` (serves built client on `:3000`).

Requires `OPENAI_API_KEY` in `.env` for live AI stages.

## Repo map

| Path | What |
|---|---|
| `backend/engine/` | Pipeline core (generate, prep, queue, eval, lexicon, one-on-one types) + `paths.mts` address book |
| `backend/api/` | HTTP API + session persistence |
| `backend/cli.ts` | CLI entry point |
| `admin/` | Web UI stages (internal admin tool — Vite SPA) |
| `frontend/` | Placeholder for the future customer app (Phase 007) |
| `content/` | Product content — `prompts/`, `questions/`, `lexicons/`, `scenarios/`, `config/`, `data/`, `notes/`, `axes.json`, `focus-points.json` |
| `scripts/` | Verify, replay, sweep, promote helpers |
| `evals/` | Engine-correctness checks (`trust-checks.js`, golden, fixtures) |
| `logs/` | Run artifacts (git keep-set only — see `.gitignore`) |
| `docs/` | Technical docs, `plans/`, `archives/`, active `todo/` work |
| `.claude/skills/reviewrun/` | `/reviewrun` skill for log review |

**Where are we? Two trackers, no more:** [`STATUS.md`](STATUS.md) — what we're working on **right now** (tactical, per-phase) · [`SERO_BOARD.md`](SERO_BOARD.md) — the **big-picture** feature board (strategic). Everything else is a log, not a status source — [`docs/TRACKERS.md`](docs/TRACKERS.md) maps which file is which. Deep inventory (archived): [`docs/archives/plans/FEATURES.md`](docs/archives/plans/FEATURES.md). Folder map: [`docs/STRUCTURE.md`](docs/STRUCTURE.md).

## Verify after prompt changes

1. `npm run eval` — plan-turn rules, batch replay, pinned briefing session
2. `node scripts/sweep.js --dry-run` — list sweep personas
3. `node scripts/sweep.js` — full 5-type sweep (needs API key; writes `logs/sweeps/<ts>/`)

Reference run logs kept in git: the `logs/` keep-set (see `.gitignore`).

## Skills

- **reviewrun** — project skill at `.claude/skills/reviewrun/`
- **impeccable** — vendored at `.claude/skills/impeccable/`; upstream pinned in `skills-lock.json`
