# Cross-machine workflow alignment

## Context

User runs two Claude Code instances against the same repo:
- **This machine**: $20 plan, lighter model. Used for inspection, small edits, dev server runs, git plumbing.
- **Work computer**: top-tier model. Used for refactors, design, multi-file features, deep planning.

Git is the sync transport. Logs are now tracked (commit `90d7b0d`), so both machines see the same run history.

Problem: without a shared written convention, the two instances will redo each other's work, burn tokens on tasks the other machine should own, or step on in-flight changes. Need a doc both machines read on startup, plus a shared plan file that reflects current focus.

## Deliverables

### 1. `HANDOFF.md` at repo root

Single source of truth for the two-machine protocol. Read by both instances at session start (via CLAUDE.md reference, see step 3).

Sections:
- **Machine roles** — what each machine handles and defers (mirrors the list already agreed in chat)
- **Git protocol** — pull-first, commit-before-switch, push immediately, branch when work-machine has dirty WIP
- **Plan-file protocol** — how to read/update `PLAN.md` (see below)
- **Red-flag triggers** — phrases that signal "defer to other machine"

### 2. `PLAN.md` at repo root

Living document. One section per active workstream. Each entry:
```
## <workstream name>
- **Owner**: <machine>
- **Status**: <planning | in-progress | blocked | review | done>
- **Last touched**: <YYYY-MM-DD, machine>
- **Next step**: <one line>
- **Notes**: <optional context, links to logs/ or PRs>
```

Rules:
- Either machine may add a workstream
- Only the **owner** machine edits status/next-step
- Other machine may append a `> note from <machine>:` comment under an entry
- Commit `PLAN.md` updates as their own small commits (`plan: ...`) so diffs are easy to scan

### 3. Hook into `CLAUDE.md`

Append a short pointer near the top of `CLAUDE.md`:
```
## Multi-machine workflow
Before any non-trivial work, read `HANDOFF.md` and `PLAN.md`.
Defer scope flagged in HANDOFF.md to the other machine.
```

This guarantees both instances load the protocol on every session (CLAUDE.md is auto-injected into context).

## Critical files

- `HANDOFF.md` (new, repo root)
- `PLAN.md` (new, repo root, seeded with current workstreams)
- `CLAUDE.md` (edit: add pointer block)

## Initial PLAN.md seed

Pre-populate with what we know is in flight:
- **Pipeline run review workflow** — owner: work-machine; status: planning
- **Logs tracked in git** — owner: this machine; status: done (commit `90d7b0d`)

User confirms/adjusts seed entries before this machine commits.

## Verification

1. Both files present at repo root, committed, pushed.
2. `CLAUDE.md` shows the new pointer block.
3. On work-machine next session: top-model instance reads `HANDOFF.md` + `PLAN.md` without prompting (verify by asking it "what's the current workstream owner?").
4. This machine can edit a `PLAN.md` entry it owns, commit with `plan:` prefix, and the work-machine sees the update on next pull.
