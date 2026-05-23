# Cross-machine workflow

Two Claude Code instances share this repo. Git is the only sync transport.

## Machine roles

### This machine ($20 plan, lighter model) — **light-ops**

Handles:
- Read / grep / inspect code + logs
- Small edits (1–2 files: typos, renames, format tweaks, single-function fixes)
- Run dev server, smoke test, screenshot
- Git plumbing (commit, push, pull, branch, merge)
- Quick questions answered from existing files

### Work computer (top-tier model) — **heavy-ops**

Handles:
- Multi-file refactors, architecture changes
- New features touching 3+ files
- Deep design work (UI overhauls, prompt engineering for pipeline stages)
- Cross-run analysis, long planning chains
- Anything needing extended reasoning

## Git protocol

1. **Pull first** at start of every session: `git pull --rebase`.
2. **Commit before switching machines.** Never leave uncommitted work overnight on a machine the user might leave behind.
3. **Push immediately** after commit so the other machine sees it.
4. **Branch when WIP is dirty.** If work-machine has in-flight changes that won't be ready to commit before the user leaves, push a `wip/<topic>` branch so light-ops can still work on `main`.
5. **Plan-file updates** get their own commit with `plan:` prefix for scannable history.

## Plan-file protocol

`PLAN.md` at repo root is the shared workstream board.

- Either machine may **add** a workstream.
- Only the **owner** machine edits status / next-step.
- Non-owner may append `> note from <machine>:` comment under an entry.
- Update `Last touched` every time you edit your entry.

## Red-flag triggers (defer to other machine)

If the user says any of these on **this machine**, reply "defer to work machine" instead of starting:
- "Refactor X across the codebase"
- "Design new flow for Y"
- "Plan the next phase"
- "Rewrite the pipeline"
- "Audit the whole repo"
- Anything that would touch 3+ files or require sustained reasoning

If user says any of these on **work machine**, light tasks (grep, smoke test, commit) should be deferred back to this machine to save the expensive model for hard problems.
