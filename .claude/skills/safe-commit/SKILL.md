---
name: safe-commit
description: "How to commit in this repo without sweeping someone else's work. Trigger when Carl says 'commit my work', 'commit everything', 'commit and push', 'save my work to git', 'push all my work' — or ANY time a commit is about to happen while the working tree holds changes this session didn't make. Carl runs many parallel Claude sessions in one folder: a blanket git add -A once swept another session's uncommitted fix into an unrelated checkpoint commit."
argument-hint: "(no args)"
user-invocable: true
---

The working tree is shared ground. Commit only what's yours.

## Procedure

- [ ] **1. `git status` first.** Classify every changed/untracked file:
      - **Mine** — created or edited by THIS session, traceable to the current task.
      - **Foreign** — everything else: another session's WIP, Carl's own edits, generated
        artifacts (e.g. `content/questions/_runtime/*`, log files) your task didn't touch.
- [ ] **2. Assume parallel sessions.** Carl runs many chats in this ONE folder (trunk-only,
      model B — worktrees/branches retired 2026-07-15). Any doubt that another session is live
      → treat all unclassifiable files as foreign.
- [ ] **3. Path-scoped only.** Stage with `git add <specific paths>` or commit with
      `git commit -- <paths>`. **Never `git add -A`, `git add .`, or `git commit -a`** while a
      single foreign file exists.
- [ ] **4. Foreign changes present and Carl asked for "everything"?** List them plainly and ask
      one lettered question:
      - **A)** Commit only this session's files ✅ recommended
      - **B)** Include the listed foreign files too (say which)
      - **C)** Stop — let him look first
- [ ] **5. Push only when explicitly asked.** Default is local-only commits — no push, no PR,
      no CI noise.
- [ ] **6. Generated artifacts**: never bulk-delete or bulk-commit untracked files under
      `content/questions/` — they're runtime artifacts with their own rules.

## Parallel work — how it's handled now

There is no worktree/branch ceremony any more (retired 2026-07-15, Carl's call — trunk-only,
model B): every session works on `main` in this one folder, and **this skill's my-own-files-only
commit IS the safety**. If a session finds itself on a branch anyway, surface it — don't add more.

## Rules

- [ ] A commit message describes what's IN the commit — if the staged set surprises you, stop.
- [ ] Checkpoint commits obey the same rules — "checkpoint" is not a license to sweep
      (see [checkpoint](../checkpoint/SKILL.md)).
- [ ] When in doubt about a file, leave it out and say so. An under-scoped commit is fixable;
      a swept one cost real work once already.
