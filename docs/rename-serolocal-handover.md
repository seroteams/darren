# Handover — rename `darren` → `serolocal`

**Status:** prep complete + committed. Only the manual rename run remains.
**Owner action needed:** run one script with all sessions closed (see step 1 below).
**Date opened:** 2026-07-08

---

## The goal (one line)

Rename the local dev folder `C:\Users\User\Documents\Sero\darren` → `…\Sero\serolocal`, so the
naming lines up with the future deployed copy **`serolive`**. (Local = `serolocal`, live = `serolive`.)

> Earlier working name was `seroengine` — **superseded**, do not use it.

---

## What "darren" actually is — three separate things

| # | Thing | Handled by |
|---|-------|------------|
| 1 | Local folder path | the rename script |
| 2 | Claude state dir (`~/.claude/projects/…-darren`) — **memory, chat history, saved permissions** | the rename script |
| 3 | `~/.claude.json` project keys (~20, keyed by absolute path — MCP config, per-project settings) | the rename script |
| — | The **Darren *Method*** (skill + workflow) | ⛔ NOT renamed — unrelated, leave every mention alone |
| — | GitHub repo `seroteams/darren` | optional follow-up (old URL auto-redirects) |

---

## ✅ Already done (committed in `1e9a42b4`, content = `serolocal`)

Three tracked files had their functional path/prefix refs updated:

- `scripts/new-worktree.ps1` — worktree folders now spawn as `serolocal-<name>`
- `docs/reference/parallel-sessions.md` — folder path + worktree naming
- `.claude/skills/reviewrun/SKILL.md` — example run path

Plus one **local-only, gitignored** file (never commit it):

- `scripts/chat-log.py` — now *derives* its transcript dir from the repo path, so it's rename-proof forever

> The commit *message* says "seroengine rename prep" (written under the old name) but the committed
> file **content is correct `serolocal`**. No action needed.

---

## ⬜ What remains — the manual rename (≈ 2 minutes)

The folder can't be renamed while any process has it open, so this is a human step, not an agent step.

```
1. Close EVERYTHING in the darren folder — all Claude sessions, editors, terminals.

2. Run in a fresh PowerShell window:
   powershell -ExecutionPolicy Bypass -File C:\Users\User\Documents\Sero\rename-to-serolocal.ps1

3. Reopen Claude with working dir:  C:\Users\User\Documents\Sero\serolocal

4. Say "finish the rename"  → that session does the optional GitHub repo step.
```

**The script** (`Sero\rename-to-serolocal.ps1`, lives outside the repo so it survives the rename) does,
in order, each step guarded so nothing ends up half-done:
1. Renames the folder (fails cleanly if still locked → just close things and re-run)
2. Renames the Claude state dir (case-insensitive match) → memory/history/permissions follow
3. Rewrites `~/.claude.json` project keys, after backing it up to `.bak-before-serolocal-rename`

---

## Gotchas / known hazards

- **Locked folder** → script step 1 errors with a clear message. Close the stray session/editor/terminal and re-run. Nothing is changed until the folder actually moves.
- **Memory looks empty after reopening** → the state-dir rename (step 2) got skipped. Check `~/.claude/projects/` for a leftover `C--Users-User-Documents-Sero-darren` dir and rename it to `…-serolocal`.
- **Parallel sessions** → a concurrent session sharing this folder reverted the prep edits once before they were committed. They're committed now, so safe. But don't run the rename while another agent is mid-task in the folder — it'll break that session and/or block the rename.
- **Cosmetic mentions left on purpose** → historical/archive prose ("nicknamed darren", old backup zip, old log JSONs). Not functional; ignore unless you want a tidy-up pass.

---

## GitHub follow-up (optional, decide at step 4)

```
gh repo rename serolocal
git remote set-url origin https://github.com/seroteams/serolocal.git
```

Open question for Carl: match the repo to `serolocal`, or pick a neutral name (e.g. `sero`) since
`serolive` will likely be a separate deployment, not a separate repo. Old URL redirects either way,
so this is low-risk and reversible.
