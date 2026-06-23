# Sero

Manager-facing 1:1 prep — sparse notes in, structured meeting out. **CLI** + **web app**, shared pipeline core.

## Quick start

```bash
npm install
npm run dev      # API :3001 + web :3000
npm run cli      # terminal pipeline
npm run smoke    # scenario smoke tests
npm run eval     # offline engine checks (prompt rules + replay batch)
```

Production: `npm run build && npm start` (serves built client on `:3000`).

Requires `OPENAI_API_KEY` in `.env` for live AI stages.

## Repo map

| Path | What |
|---|---|
| `backend/engine/` | Pipeline core (generate, prep, queue, eval, lexicon, one-on-one types) + `paths.js` address book |
| `backend/api/` | HTTP API + session persistence |
| `backend/cli.js` | CLI entry point |
| `admin/` | Web UI stages (internal admin tool — Vite SPA) |
| `frontend/` | Placeholder for the future customer app (Phase 007) |
| `content/` | Product content — `prompts/`, `questions/`, `lexicons/`, `scenarios/`, `config/`, `data/`, `notes/`, `axes.json`, `focus-points.json` |
| `scripts/` | Verify, replay, sweep, promote helpers |
| `evals/` | Engine-correctness checks (`trust-checks.js`, golden, fixtures) |
| `logs/` | Run artifacts (git keep-set only — see `.gitignore`) |
| `docs/` | Technical docs, `plans/`, `archives/`, active `todo/` work |
| `.claude/skills/reviewrun/` | `/reviewrun` skill for log review |

**Start here for current work:** [`SERO_BOARD.md`](SERO_BOARD.md) — the single live board. Deep inventory: [`docs/plans/FEATURES.md`](docs/plans/FEATURES.md). Old workstream history (archived): [`docs/plans/PLAN-archive.md`](docs/plans/PLAN-archive.md). Folder map: [`docs/STRUCTURE.md`](docs/STRUCTURE.md).

## Verify after prompt changes

1. `npm run eval` — plan-turn rules, batch replay, pinned briefing session
2. `node scripts/sweep.js --dry-run` — list sweep personas
3. `node scripts/sweep.js` — full 5-type sweep (needs API key; writes `logs/sweeps/<ts>/`)

Reference logs kept in git: see [`plans/done/old-log-open-issues.md`](plans/done/old-log-open-issues.md).

## Skills

- **reviewrun** — project skill at `.claude/skills/reviewrun/`
- **impeccable** — vendored at `.claude/skills/impeccable/`; upstream pinned in `skills-lock.json`
