# scripts/ — what's in here

Three kinds of file:

- **Runners** — what `package.json` calls: `run-tests.js` (the offline test runner),
  `gate.js` (paid regression gate), `eval.js`, `sweep.js`, `replay-*.js`,
  `rebuild-question-index.js`, `purge-runs.ts`.
- **Offline test scripts** — `test-*.js`: assertion scripts with **no** API calls, all run by
  `npm test`. Drop a new one in and it's auto-discovered. Most are engine unit tests that
  predate the co-located `*.test.ts` convention — migrating them into the mirrored tree is
  parked debt (see `backend/tests/README.md`).
- **Manual tools** — run by hand when needed, no npm wiring: `focus-example.js` (promote a
  run's focus points into prompt examples), `rebuild-profiles.js` (rebuild derived per-person
  profiles), `replay-capture.js` (freeze a finished run into a regression fixture),
  `org-inventory.ts` / `delete-orgs.ts` (DB ops).

Anything that hits OpenAI is **paid** and needs a go-ahead first — see [../CLAUDE.md](../CLAUDE.md).
Co-located unit tests live beside their backend modules; the mirrored integration tree is
`backend/tests/`.
