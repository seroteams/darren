# Full file & folder inventory — keep / could go / won't keep (2026-07-18, evening)

Read-only audit of every top-level file and folder, done AFTER today's big sweep
(audits/REPO_SWEEP.md) — so most junk is already gone. Cursor files, old benchmarks,
May logs, duplicate images, dead modules and shipped test mocks were all binned this
morning. This pass covers what's left.

Legend: ✅ KEEP (needed to move forward) · 🟡 COULD GO (your call, nothing breaks) ·
🗑 WON'T KEEP (junk — bin on your nod).

---

## 🗑 WON'T KEEP — junk, bin on your nod

| What | Size | Why it's junk | Delete is… |
|---|---|---|---|
| `logs/gate/` (June 10 runs, ~18 folders) | 381 KB | Old paid gate-run outputs from 10 June — 5+ weeks stale, superseded by dozens of newer runs in logs/july | Permanent (untracked) |
| `logs/benchmark/` (baseline-sweep, messy-12, suggest-test) | 269 KB | Outputs of the benchmark toolset we DELETED this morning (sweep item 14) — the logs are now orphans of a dead tool | Permanent (untracked) |
| `.claude/worktrees/` | empty | Empty leftover folder from the retired worktree flow | Trivial |
| `.playwright-mcp/page-*.yml` | 2 KB | Browser-tool scratch snapshot from today's sessions; regenerates itself | Trivial |

Total: ~650 KB. Small, but all four are pure dead weight.

## 🟡 COULD GO — nothing breaks, but it's your call

| What | Size | The case for keeping | The case for binning |
|---|---|---|---|
| `darren.code-workspace` | 169 B | Opens the folder pre-configured in VS Code/Cursor | Last editor-era file left (Cursor config went this morning). If you only use Claude Code now, it's dead |
| `admin/dist/` + `frontend/dist/` | 4.9 MB | Nothing — rebuilt automatically on every deploy/build | Regenerable build output; gitignored; safe to wipe any time |
| `docs/archive/logs/` (2 zips) | 43 MB | The full June run archive — the only copy of those runs anywhere | Local-only by design; could move to a backup drive instead of living in the repo folder |
| `docs/archive/screenshots/` (6 pngs) | small | Historic phase screenshots, already archived | Nothing references them; pure nostalgia |
| `docs/chat-history/` | 19 MB | Your searchable past-conversation log (chat-log.py rebuilds the index, not the transcripts) | Local-only; grows forever; could prune months you're done with |
| `logs/sweeps/` | 98 KB | Recent sweep outputs (July) | Regenerable; will go stale like logs/gate did |
| `docs/archive/rename-serolocal-handover.md` | 5 KB | The parked folder-rename plan (sweep item 21 — still your open call) | If you shelve the rename for good, this goes with it |

## ✅ KEEP — everything else, by room

**The product (all live, all needed):**
`admin/` (console app) · `frontend/` (customer app) · `backend/` (API + engine + DB) ·
`shared/` (cross-app SSE/API code) · `content/` (questions, prompts, axes, lexicons,
scenarios — the engine's brain; `_runtime` YAMLs are protected, never junk) ·
`evals/` (golden cases + replay + trust checks — 2 safety sentinels live here).

**Working files & trackers:** CLAUDE.md, DESIGN.md, VOICE.md, STATUS.md, SERO_BOARD.md,
LANES.md, README.md, `docs/plans/` (2 doing, 13 future, ~30 done), `docs/reference/`
(22 live reference docs incl. repo-map + guardrails), `docs/reports/` (changelog +
how-it-works dashboards, cleanup series, archive), `docs/decisions/`, `docs/design/`,
`docs/research/`, `audits/`.

**Plumbing (all consumed):** package.json + lock, tsconfig, vite/eslint/drizzle/tailwind
configs, render.yaml, `.github/workflows/ci.yml`, `.node-version`, `.gitattributes`,
`.gitignore`, skills-lock.json, `Start Sero.bat` (your launcher), `scripts/` (every
script verified live in this morning's sweep — batch-m4-verify.js especially: eval.js
runs it), `.claude/` (skills, hooks, output style, launch.json), `testing/` (tester
pack + 3 result walks from 15 July — product evidence).

**Local-only by design (never committed, keep):** `.env`, `.secrets/`, `logs/july/`
(143 MB — CURRENT month's runs, the engine's evidence base), `content/data/`
(feedback, audit trail, aliases, guest-cap), `backups/` (DB dumps), `node_modules/`.

---

## Leftover open calls (from this morning's sweep, unchanged)

- Item 18 — launch.json repair: still held for an all-sessions-closed moment.
- Item 21 — promises-loop park/un-park + the folder rename: still your calls.

Nothing in this inventory touches another session's lane; no files were changed.
