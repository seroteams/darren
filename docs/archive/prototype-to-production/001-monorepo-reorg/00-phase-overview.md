# Phase 001 — Monorepo Reorg

## Goal (plain)
Tidy the whole project into clear, named folders — **without changing how anything works**. When
we're done, the app, the command-line tool, and the tests all behave exactly as they do today.
It just *looks* organised instead of being one big pile.

## What you'll have when it's done
- The new folder layout: `backend/` (engine + API), root `admin/` (the existing UI),
  `frontend/` (placeholder for the new app), `packages/content/` (prompts, questions, lexicons,
  scenarios, config), and `docs/` holding the planning + reference docs.
- One place that defines where data lives (`backend/engine/paths.js`), instead of paths scattered everywhere.
- Junk removed (two stray screenshot PNGs).
- Green tests: `npm test` passes the same as before; the app still boots; the CLI still runs.

## A grounding example (before → after)
- **Before:** `c:\dev\sero\src\reviewer.js` and `c:\dev\sero\questions\q_access_check.yaml`
- **After:** `c:\dev\sero\backend\engine\reviewer.js` and
  `c:\dev\sero\packages\content\questions\q_access_check.yaml`
- The file *contents* don't change — only where they live, and the lines that point at them.

## The steps (to be detailed next)
1. Create the new top-level folders.
2. Add `backend/engine/paths.js` — define every data root in one file.
3. Move the engine (`src/` → `backend/engine/`) and update its imports.
4. Move the data (`prompts/`, `questions/`, `lexicons/`, `scenarios/`, `config/`, `data/`,
   `axes.json`, `focus-points.json`) → `packages/content/`, and repoint the code.
5. Move the API server into `backend/api/` and the existing UI into root `admin/`; update build config.
6. Move docs (`plans/`, `notes/`, `archives/`, `plan.md`, `darren.md`) → `docs/`.
7. Delete debris (the PNGs); update `package.json` scripts, `eslint.config.js`, and the vite configs.

## How we'll know it's done (full checklist in `99-qa-signoff.md`)
- `npm test` is green (same count as before the move).
- The app starts and a run works end-to-end.
- The CLI runs an offline replay with no errors.
- Nothing in the app *behaves* differently — this phase is purely structural.

## Note
This phase keeps the code as **JavaScript** — we're only moving files, not rewriting them. The
conversion to TypeScript happens in **Phase 003**, after the conventions and tooling are in place (Phase 002).

> **Status:** overview only. Detailed step files (`01-…` onward) get written when we start this phase.
