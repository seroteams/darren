# Render deploy — host Sero on Render.com + /commit & /release workflow

**Goal:** Carl can develop locally and get changes live on the internet with two words: `/commit` then `/release`.
**Driver:** Carl
**Created:** 2026-07-08

## Done means
- The app is live at a public Render URL (free plan, Frankfurt), auto-deploying on every push to `main`.
- `RENDER_SETUP.md` exists — a plain-words checklist Carl followed once to set Render up.
- The agent can check deploys/logs itself via a Render API key stored in `.secrets/` (never committed).
- `/commit` saves work locally; `/release` pushes to main, watches the deploy, and reports live/failed in plain words.

## Resolved before we start (dug out of the code 2026-07-08)
- Prod = ONE server: `npm start` serves API + built SPA from `admin/dist` (gitignored → Render must run `npm run build`).
- Port: `server.ts` reads `PORT` (Render's variable) — works as-is; never set `API_PORT` on Render.
- Backend runs `.ts` files directly → Node must be ≥ 22.18 for native TypeScript. Nothing pins Node today; local is **v24.15.0** → pin 24.
- Env vars already in the right place: secrets only in gitignored `.env`, none hardcoded (grep clean), `DATABASE_URL` is Neon (cloud — reachable from Render). Render dashboard vars win over `.env` (custom loader). **Never set `VITE_DEV_LOGIN_*` on Render** — they'd bake dev passwords into the public bundle.
- No health endpoint exists (heartbeat is admin-only) → Phase 1 adds `GET /api/v1/health`.
- **Double-check finds (2026-07-08, before Carl's night run):**
  - **Origin guard would have broken the live site** — it only allowed `localhost`, so on Render every browser save/start would 403 "Bad origin". Fixed in Phase 1 (same-origin now passes; other sites still refused).
  - **Two Neon databases exist** — `.env`'s `DATABASE_URL` is **Sero Local**; the parked `LIVE_DATABASE_URL` is **Sero Live**. On Render, `DATABASE_URL` must get the **LIVE** value (+ `APP_ENV=live`), or the env-guard refuses to boot (that's it working).
  - **Build must keep dev tools** — with `NODE_ENV=production` set, plain `npm ci` skips devDependencies (vite, cross-env) and the build dies → blueprint uses `npm ci --include=dev`.
  - Blueprint field names re-verified against the official spec (`autoDeployTrigger: commit`, `frankfurt`, `healthCheckPath` fine on free). Render's Node default is already 24.x; our `.node-version` pins 24.15.0 anyway.
- No /commit or /release skill exists anywhere → greenfield.
- Free-plan trade-offs Carl accepted: sleeps after 15 min idle (~50 s wake); disk wiped each deploy (past run-log detail + generated questions reset; users/logins/run list survive in Neon).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Pre-flight fixes | Node pinned, `/api/v1/health`, `.secrets/` ignored | ✅ |
| 2 | Blueprint + checklist | `render.yaml` + `RENDER_SETUP.md` + checkpoint commit | ✅ |
| 3 | Go live | Carl sets up Render; API key in `.secrets/`; deploy verified live | ✅ |
| 4 | /commit + /release skills | The two-word local→live workflow | 🔨 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## 🎉 LIVE — https://sero-obwq.onrender.com (2026-07-08 night)
Deploy went green. P1 ✅, P2 ✅, **P3 ✅ green-lit** — Carl did the paid live run (log in + one 1:1 on the live site, ~$0.35, worked). Render API key + service id in `.secrets/` (gitignored). **P4 🔨 building now: /commit + /release skills.** Follow-ups: rotate the live DB password (passed through chat — Carl deferred); optional custom domain.

## Current state
Triple-checked 2026-07-08 for Carl's night run: production-mode boot proven locally (Render's PORT + built SPA + deep links + health), origin-guard deploy-blocker fixed test-first, [TONIGHT.md](../../../../TONIGHT.md) runbook at repo root (temporary — delete at close-out). Folder moved to docs/plans/doing/ in the repo-wide reorg (links fixed).
Phase 1 ✅ green-lit + committed 2026-07-08 (`1b67f792`). Baseline before changes: `npm test` 88/88, typecheck clean (free checks — gate not run: no engine/prompt changes here, the one paid run is reserved for Phase 3's live walk). After build + double-check: **96/96** (whole-tree) · typecheck · build clean · health + origin fence proven on real boots.

Phase 2 ✅ green-lit + committed 2026-07-08 (`95a7a817`) — `render.yaml` blueprint + `RENDER_SETUP.md` checklist, both at repo root. Blueprint fields verified against the real app (build/start/health/port) and against `env-guard.ts` for the DATABASE_URL warning; no secret values in git; no app code touched (`npm test` still 96/96). Carl walked both scenarios ("go"). Next: Phase 3 — Carl sets Render up following `RENDER_SETUP.md`, then hands over a Render API key so the agent verifies the live deploy (the one ~$0.35 paid check, Carl's go).

## Parked
- Persistent disk for `logs/` run artifacts (paid add-on) — revisit if losing run detail between deploys starts to hurt.
- Starter plan ($7/mo, no sleep) — one-line change in `render.yaml` when demos need it.
- Custom domain (app.seroteams.com) — after the free URL proves itself.
