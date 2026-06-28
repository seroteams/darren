# backend/tests — the mirrored test tree

Tests mirror the system instead of piling into one flat folder (Phase 004 step 4).

## Where each kind of test lives

- **Unit tests — beside the code.** A pure function or a service's logic is tested
  by a `*.test.ts` file sitting next to it, e.g.
  `backend/api/services/sessions/sessions.service.test.ts`. These use the built-in
  `node:test` runner. This is the house rule from `backend-conventions`.

- **Integration / e2e tests — here, shaped like the domains.** A test that drives a
  whole domain end-to-end (across the service → repo → store seam, or the persistence
  layer) lives under `backend/tests/<domain>/` as a `test-*.js` assertion script,
  mirroring the API service domains in `backend/api/services/`.

      backend/tests/
        sessions/   ← drives the live 1:1 runner end-to-end
          test-back-nav.js        (answer → step back → amend, through the seam)
          test-session-resume.js  (create → persist → drop → restore → snapshot)
        checks/
          test-checks-service.js  (the free-checks service, offline)

## Running

`npm test` runs everything offline (no API key, no spend):

- the `OFFLINE_TESTS` assertion scripts in `scripts/`,
- every co-located `*.test.ts` under `backend/`,
- every `test-*.js` under `backend/tests/` (this tree — auto-discovered).

A new integration test just drops into its domain folder; the runner finds it.

## Not here

Engine-level assertion scripts that test the engine/content (not the API layers) still
live in `scripts/` (e.g. `test-axis-coverage.js`, `test-lexicon.js`). Reorganising those
is out of scope for the API-v1 phase and is parked.
