# Phase 2 — Blueprint + Render setup checklist

**Part of:** [plan.md](plan.md) · **Status:** 🔨 BUILT 2026-07-08 — awaiting Carl's walk

## Built (2026-07-08, $0)
- **`render.yaml`** (root) — one free Node web service, Frankfurt. Verified against the real app facts: `buildCommand: npm ci --include=dev && npm run build` (vite + cross-env are devDeps — plain `npm ci` under `NODE_ENV=production` would skip them and the build dies), `startCommand: npm start` (= `cross-env NODE_ENV=production node backend/api/server.ts`), `healthCheckPath: /api/v1/health`, `autoDeployTrigger: commit`. Plain values `NODE_ENV=production` + `APP_ENV=live`; the 4 secrets (`DATABASE_URL`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `SUPERADMIN_EMAILS`) are `sync: false` — **names only, zero values in the file**. `API_PORT` deliberately absent (Render injects `PORT`, which `server.ts` reads in prod).
- **`RENDER_SETUP.md`** (root) — Carl's one-time click-by-click: account → connect GitHub → New Blueprint → paste 4 secrets → wait for deploy → make an API key → hand it over. The DATABASE_URL trap (paste the `LIVE_DATABASE_URL` value, not the local one) is called out in a red box tied to the actual env-guard behaviour (checked `backend/db/env-guard.ts`: `APP_ENV=live` + a DB claimed "local" → refuses to boot).
- No app code touched — `npm test` unaffected at **96/96**. `render.yaml` parses as valid YAML; grep-confirmed no secret values, variable names only.

## Goal
Everything Carl needs to set Render up in one sitting: the blueprint file Render reads, and a plain-words checklist to follow.

## Changes
- `render.yaml` (root) — one free Node web service, Frankfurt, **`npm ci --include=dev && npm run build`** (plain `npm ci` would skip vite/cross-env under `NODE_ENV=production` and the build dies) / `npm start`, health check on `/api/v1/health`, auto-deploy on every push to `main` (`autoDeployTrigger: commit`). Secrets (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `DATABASE_URL`, `SUPERADMIN_EMAILS`) marked `sync: false` — Render asks for the values once, in the dashboard; they never touch git. `NODE_ENV=production`, `APP_ENV=live` set as plain values. Deliberately absent: `API_PORT`, `VITE_DEV_LOGIN_*`.
- ⚠️ **DATABASE_URL on Render = the `LIVE_DATABASE_URL` value parked in `.env`** (Neon "Sero Live"), NOT the local `DATABASE_URL`. Paste the wrong one and the env-guard refuses to boot on purpose. `RENDER_SETUP.md` must say this in bold at the paste step.
- `RENDER_SETUP.md` (root) — Carl's one-time to-do list: account → connect GitHub → New Blueprint → paste 4 secret values → wait for deploy → create API key → hand key to the agent.
- Checkpoint commit of the working tree so the first push to GitHub is clean.

## Not in this phase
- Actually doing the Render steps (Phase 3 — Carl does them).

## Done when
- [ ] `render.yaml` exists and matches the app facts (build/start/health/port).
- [ ] `RENDER_SETUP.md` reads clearly to a non-technical person.
- [ ] Working tree checkpoint-committed.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Read the checklist** — open `RENDER_SETUP.md` and read it top to bottom. Every step should be obvious without asking me anything. ❌ Not OK if any step makes you go "wait, where do I click?".
2. **No secrets in git** — open `render.yaml`; you should see variable NAMES only, never actual keys.
