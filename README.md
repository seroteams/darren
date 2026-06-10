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
| `src/` | Pipeline core (generate, prep, queue, eval, lexicon, one-on-one types) |
| `frontend/client/` | Web UI stages |
| `frontend/server/` | HTTP API + session persistence |
| `prompts/` | Stage prompt templates |
| `questions/` | Question bank YAML + `_index.json` |
| `lexicons/` | Canonical wording + candidate queue |
| `scenarios/` | Smoke, batch, and regression fixtures |
| `scripts/` | Verify, replay, sweep, promote helpers |
| `logs/` | Run artifacts (git keep-set only — see `.gitignore`) |
| `notes/` | Optional CLI banner copy (`whats-new.md`) |
| `plans/` | Audit tracker, specs, feature inventory, archived plans |
| `.claude/skills/reviewrun/` | `/reviewrun` skill for log review |

Deep inventory: [`plans/FEATURES.md`](plans/FEATURES.md). Active workstreams: [`PLAN.md`](PLAN.md).

## Verify after prompt changes

1. `npm run eval` — plan-turn rules, batch replay, pinned briefing session
2. `node scripts/sweep.js --dry-run` — list sweep personas
3. `node scripts/sweep.js` — full 5-type sweep (needs API key; writes `logs/sweeps/<ts>/`)

Reference logs kept in git: see [`plans/done/old-log-open-issues.md`](plans/done/old-log-open-issues.md).

## Skills

- **reviewrun** — project skill at `.claude/skills/reviewrun/`
- **impeccable** — vendored at `.claude/skills/impeccable/`; upstream pinned in `skills-lock.json`
