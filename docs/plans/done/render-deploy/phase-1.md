# Phase 1 — Pre-flight fixes (local, free)

**Part of:** [plan.md](plan.md) · **Status:** ✅ green-lit + committed 2026-07-08 (`1b67f792`)

## Built (2026-07-08) — extended same day after Carl's "double check the plan"
- **Origin-guard fix (deploy blocker found in the double-check):** the fence on every mutating route only allowed `localhost`, so on Render every browser save/start would have got 403 "Bad origin". Extracted to [origin.ts](../../../../backend/api/middleware/origin.ts) + 6 tests (TDD, watched them fail): no-Origin passes, localhost passes, **the site's own host passes**, foreign sites / wrong port / malformed still refused. Proven end-to-end on a scratch boot: same-origin POST on a fake real host → 401 (asks for login, fence passed); evil origin → 403. Dev behaviour unchanged.
- `package.json` — `engines.node ">=24 <25"` · `.node-version` — `24.15.0` (matches local).
- `GET /api/v1/health` — [health.controller.ts](../../../../backend/api/services/health/health.controller.ts) + mirrored test (TDD: watched it fail first), route wired in [server.ts](../../../../backend/api/server.ts) next to `/api/version`, no auth.
- `.gitignore` — `.secrets/` ignored (proven: `git check-ignore` hits).
- Offline proof: `npm test` **91/91** (was 88 at baseline — the additions are the new health + origin tests) · `npm run typecheck` clean · `npm run build` clean · real boot on a scratch port answered `{"ok":true}` HTTP 200.
- ⚠️ Your running dev server predates this — **restart `npm run dev`** before walking scenario 1.

## Goal
Make the codebase Render-ready before Render ever sees it: pinned Node, a public health check, and a safe home for secrets.

## Changes
- `package.json` — add `engines.node` (24.x, matching local v24.15.0).
- `.node-version` — new file at root (Render reads this to pick Node).
- `GET /api/v1/health` — new public endpoint returning `{"ok":true}` (test-first): `backend/api/services/health/health.controller.ts` + mirrored test, route in `server.ts`.
- `.gitignore` — add `.secrets/`.

## Not in this phase
- render.yaml / RENDER_SETUP.md (Phase 2).
- Anything on render.com itself (Phase 3).

## Done when
- [ ] `npm test`, `npm run typecheck`, `npm run build` all pass.
- [ ] `curl localhost:3001/api/v1/health` returns `{"ok":true}` with no login.
- [ ] `git check-ignore .secrets/x` says ignored.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Health check** — start the app as usual (`npm run dev`), open `http://localhost:3001/api/v1/health` in your browser. You should see `{"ok":true}`. ❌ Not OK if you get a 404, an error, or it asks you to log in.
2. **Nothing else changed** — click around the app like normal (login, start a run). Everything should work exactly as before.

## Baseline (2026-07-08, before any changes)
`npm test` 88/88 PASS · `npm run typecheck` clean. Free checks only — no gate run (no engine/prompt changes here; the one paid run is reserved for Phase 3's live walk).
