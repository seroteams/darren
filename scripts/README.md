# scripts/ — what's in here

Three kinds of file:

- **Runners** — what `package.json` calls: `run-tests.js` (the offline test runner),
  `gate.js` (paid regression gate), `eval.js`, `sweep.js`, `replay-*.js`,
  `rebuild-question-index.js`, `purge-logs.js`.
- **Offline test scripts** — `test-*.js`: assertion scripts with **no** API calls, all run by
  `npm test`. Drop a new one in and it's auto-discovered.
- **One-off verifiers** — `verify-*.js`, `batch-*-verify.js`: scratch scripts from past
  investigations. Safe to ignore; prune when clearly dead.

Anything that hits OpenAI is **paid** and needs a go-ahead first — see [../CLAUDE.md](../CLAUDE.md).
Unit + integration tests live under `backend/`, not here.
