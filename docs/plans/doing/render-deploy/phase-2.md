# Phase 2 — Blueprint + Render setup checklist

**Part of:** [plan.md](plan.md) · **Status:** ⬜

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
