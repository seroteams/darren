# Project Cleanup — darren

**Version:** v1 (2026-05-31)

**Caveman summary:** Delete 3 orphan PNGs (353KB). Gitignore `.playwright-mcp/`. Move shipped plans to `plans/done/`. Commit untracked logs+questions. Leave logs/questions content untouched. Features: assessed, nothing dead.

## Context

Working tree accumulated cruft over the May iteration sprint: dev screenshots, an untracked tool cache, ~70 uncommitted scratch files, and a `plans/` folder where almost every plan is already shipped. User wants a clean tree and an assessment of what's still needed ongoing.

Inventory was run across assets, plans, logs, questions, and feature surface. Decisions confirmed with user: **conservative** — touch only unambiguous junk, archive completed plans, and leave the live data stores (logs/, questions/) intact.

## Scope decisions (confirmed)

| Area | Decision |
|---|---|
| logs/ (104 runs, 24MB, tracked) | **Leave alone** — code rehydrates sessions from here |
| questions/ (933 yaml, all indexed) | **Leave content alone**; only commit untracked files |
| plans/ | **Archive DONE → `plans/done/`** |
| 3 root PNGs + `.playwright-mcp/` | **Delete PNGs; gitignore cache** |
| features/stages/handlers | **Assessed — all active, nothing to remove** |

## Changes

### 1. Delete orphaned PNGs
No code/markdown references found (whole-repo grep). Dev verification screenshots.
- `verify-01-start.png`
- `verify-02-focuspoints.png`
- `verify-03-prep.png`

### 2. Gitignore dev cache
Append to `.gitignore`:
```
.playwright-mcp/
```
(Current `.gitignore`: node_modules, frontend/client/dist, .env, .env.local, .DS_Store, *.zip.)

### 3. Archive shipped plans → `plans/done/`
`plans/done/` already exists. Move the fully-shipped plans:
- `plans/cool-okay-so-peppy-thimble.md` → `done/` (all 7 phases shipped, audit v16 confirms)
- `plans/lexicon-finish.md` → `done/` (6 steps done)
- `plans/split-arcs-into-flows.md` → `done/` (Phases 0–2 built, v7)
- `plans/toby-run-fix/` (whole folder) → `done/toby-run-fix/` (all phases DONE/deferred)

**Keep at top level** (still tracking open work):
- `plans/log-fix-audit.md` — live tracker, 7 OPEN + 3 PLANNING items
- `plans/remaining-backlog.md` — Batch N pending
- `plans/update-openai-pricing-2026-05-27.md` — pending Batch N (data 39d stale; note, don't delete)

Already archived (leave): `done/engine-refinement-loop.md`, `done/start-page.md`.

### 4. Commit the working tree
After above, stage and commit so the tree is clean:
- Modified tracked files (~20: settings, config, frontend, prompts, questions/_index.json)
- Untracked logs/ run dirs + batch reports
- Untracked questions/ q_*.yaml (all indexed; user chose keep+commit)
- The plan moves above

Single commit, conventional message. Branch is `refactor/one-on-one-types` — commit there (not main).

## Features assessment (no action — recorded for the user)

All pipeline surface is live; nothing dead to cut:
- **Client stages** (`frontend/client/src/stages/`): start, intake, focus-points, preparation, briefing, bank, questioning, eval, lexicon-review, error — all wired.
- **Server handlers** (`frontend/server/handlers/`): start, focus-points, preparation, bank, plan, question, answer, evaluation, lexicon, runs, notes, meeting-types, pipeline, rehydrate, stream-helper — all routed.
- **6-stage pipeline** intact (intake → focus → prep → bank → questioning → eval → lexicon).
- Only intentionally-scoped piece: `src/lexicon-reviewer.js` gated to `design/lead/growth`. By design, not dead.

## Verification

1. `git status` — working tree clean after commit; only intended deletions/moves in the diff.
2. Orphan grep re-check: `rg "verify-0" --type-not png` returns nothing (confirms safe delete).
3. App still boots: run the app, confirm favicon + stages load (PNGs were never referenced).
4. `node scripts/rebuild-question-index.js` (if present) or load app — confirm question index still resolves (we didn't touch questions content).
5. Plans: `plans/done/` contains the moved files; top-level plans are the 3 trackers only.

## Notes
- Per convention, this plan should live in `darren/plans/`, not the global `~/.claude/plans/`. Relocate the plan file there after approval.
