# Tests

Sero's tests **mirror the system** — never one flat dump.

- **Unit tests are co-located** with the code they test: `sessions.service.test.ts` sits beside
  `sessions.service.ts`. They are **not** in this folder.
- **Integration and end-to-end tests live here**, in a tree shaped like the domains:
  - `tests/integration/<domain>/…` — e.g. `tests/integration/sessions/…`
  - `tests/e2e/…` — full user-flow tests

All new work is **test-first** (red → green → refactor — see the `test-driven-development` skill) and
TypeScript (`*.test.ts` / `*.test.tsx`), type-checked by `npm run typecheck`.
