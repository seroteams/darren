---
name: clean-up
description: "The repo spring-clean: sweep the whole house, show Carl what's dusty, then tidy only what he picks. Trigger when Carl says 'clean up', 'let's do a clean up', 'cleanup', 'tidy the repo', 'spring clean', or 'declutter'. Sweeps TODOs, tracker freshness, unfinished plans, git mess (branches/worktrees/stashes/uncommitted), old and orphaned files, stale systems with no consumers, refactor opportunities, and styling drift against DESIGN.md — then reports it all as scannable tables with a lettered pick-list. Read-only until Carl chooses; free checks only, never a paid run. NOT the same as goodnight (end-of-day tie-off + push) — clean-up is the audit-and-tidy sweep, any time of day, no push."
argument-hint: "(optional: a focus area, e.g. 'clean up, just git' or 'clean up the docs')"
user-invocable: true
---

A clean-up is two passes, never one: **SWEEP** (read-only, report everything) then **TIDY**
(only the items Carl picked). Nothing is deleted, moved, or rewritten during the sweep — the
report is the product; the tidying is a separate, approved act. If Carl named a focus area,
sweep only that area, full depth.

## Pass 1 — SWEEP (read-only)

Run the lenses below. Every finding needs a citation (`file:line`, branch name, or folder path)
— a finding I can't point at doesn't go in the report. Fan out subagents per lens if the sweep
feels big; each returns findings only.

### Lens A — TODOs & promises in code
- [ ] `grep -rn "TODO\|FIXME\|HACK\|XXX"` across `admin/ frontend/ backend/ shared/ scripts/`
      (skip `node_modules`, `logs/`, `docs/chat-history/`). Classify each: still real / already
      done (stale comment) / belongs in a plan file instead.

### Lens B — Trackers & unfinished work
- [ ] [STATUS.md](../../../STATUS.md) — does the ▶ Your-move banner match reality? SERO_BOARD.md rows current?
- [ ] Every `docs/plans/doing/<slug>/` — which phase is open, is it actually moving, or is it
      quietly dead? Dead-but-unfinished gets flagged **not safe to archive yet — <what's open>**;
      only genuinely signed-off work may be suggested for `docs/plans/done/` (archive-safe rule).
- [ ] `docs/plans/future/` — anything superseded by work that already shipped?

### Lens C — Git mess
- [ ] `git status --porcelain` — classify every entry by owner (safe-commit's mine-vs-foreign
      call). Foreign/live-session work is REPORTED, never touched.
- [ ] `git branch -vv` + `git branch --merged main` — merged-and-stale vs unmerged. For unmerged:
      what's on it (`git log main..<branch> --oneline`), finished or abandoned?
- [ ] `git worktree list` + `git stash list` — orphans and forgotten stashes, with age.

### Lens D — Old & orphaned files
- [ ] Strays: `*.tmp`, `*.bak`, `*.orig`, `*copy*`, `-old`/`-backup` suffixes, root-level junk,
      dead scratch scripts in `scripts/`, stale `logs/` output.
- [ ] Docs that describe systems that no longer exist (check `docs/` against the code).
- [ ] For each candidate: is it tracked (git keeps history → low-risk delete) or untracked
      (unrecoverable → higher bar, and see Gotchas)?

### Lens E — Stale systems & dead code
- [ ] Suspected-dead module? Grep for real consumers (imports/requires/route registrations)
      before calling it dead — dependency-check's rule, in reverse.
- [ ] Feature flags / env vars nothing reads; npm scripts that no longer run; exports with zero
      importers (`npx knip` if it runs clean here — free, local).

### Lens F — Refactor & tidy opportunities
- [ ] Copy-pasted blocks between admin/ and frontend/ (the shared-stages trap), oversized files,
      leftover debug logging, commented-out blocks. **Report only** — refactors are proposals
      with effort estimates (S/M/L), never done inside a clean-up.

### Lens G — Styling drift
- [ ] Against root DESIGN.md's checklist: hardcoded colors/radii that should be design.css
      tokens, text under the 14px floor, more than one blue action per view, hand-rolled
      skeletons instead of `createSkeleton()`, feature CSS not in its own file.

## The report

Carl is a visual thinker — tables, not prose. Shape:

1. ⚠️ guardrail block only if one fires.
2. **One table per lens that found anything** — columns: `#` (letter) / What / Where / Why it's
   stale / Suggested move / Risk (🟢 safe / 🟡 check first / 🔴 don't touch). Skip empty lenses
   with one line: "Lens G — clean ✅".
3. **😤 Looks bad but is actually fine** — things a naive sweep would flag that are deliberate
   (runtime artifacts, gitignored local tooling, deliberately-open phases). This section is
   what stops the same false alarms recurring.
4. **Pick-list**: every actionable finding gets a letter so Carl can reply "A, C, F" — plus
   `ALL 🟢` (= do everything green-risk) and `NOTHING` as standing options.
5. Save the full report to `docs/reports/cleanup/<YYYY-MM-DD>.md`. If a previous report exists
   there, diff against it first and mark findings **NEW / STILL OPEN / RESOLVED** — that's how
   repeat clean-ups show progress instead of re-listing the same dust.

Then STOP and wait for Carl's picks. The sweep alone is a complete, useful deliverable.

## Pass 2 — TIDY (only what Carl picked)

- [ ] Deletions of tracked files: path-scoped commit first (`git add <paths>` +
      `git commit -- <paths>` — safe-commit rules), so everything is recoverable.
- [ ] Stale-branch deletes: merged-only unless Carl explicitly named an unmerged one; quote what
      dies with it before deleting.
- [ ] Tracker refreshes, stale-TODO removals, doc fixes: small path-scoped commits, one per theme.
- [ ] After tidying: `npm test` + `npm run typecheck` (free). Red → say what broke, raw.
- [ ] Close with a files-touched table and the bottom box.

## Rules

- [ ] **Free only.** A clean-up never needs the OpenAI API. No gate/smoke/eval runs, ever.
- [ ] **Never touch during the sweep.** Read-only means read-only.
- [ ] **Foreign work is off-limits.** Parallel sessions' uncommitted files get reported, not tidied.
- [ ] **Advise, don't nag.** One clear risk flag per item; Carl decides.

## Gotchas

- `content/questions/` untracked files are runtime artifacts — NEVER list them as junk, never
  bulk-delete (standing rule; a past sweep nearly ate the question bank).
- `docs/chat-history/` + `scripts/chat-log.py` are gitignored on purpose — local-only tooling,
  not clutter.
- `scripts/gate.js` EXECUTES on import — grep/read it, never `node -e require` it.
- Fresh-worktree known failures (test-customer-serving, test-persona-bench) are environmental,
  not findings.
- "Unused" in one app isn't unused — admin/ and frontend/ share stages; check BOTH before
  calling anything dead.
- A file changing mid-sweep = a live session owns it. Re-run `git status` before any Pass-2
  commit.
