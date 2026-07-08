---
name: checkpoint
description: "Save or restore the full project picture on one word from Carl. Trigger on 'checkpoint' / 'check point' (any spelling), 'save everything', 'save where we are' — that's the SAVE job. Trigger on 'checkpoint' said at the START of a fresh session, or 'where are we', 'catch me up', 'bring me back up to speed' — that's the RESTORE job. Never ask which one he means: mid-work = save, fresh session = restore."
argument-hint: "(no args — the word itself is the command)"
user-invocable: true
---

One word, two jobs. Mid-work = **save**. Fresh session = **restore**. Don't ask which — read the room.

## Job A — Save (mid-work, or the moment a phase gets Carl's sign-off)

- [ ] **Commit the working tree** — message: `chore: checkpoint — <plain-words state>`.
      If `git status` shows files that are NOT from this session's work, or `git worktree list`
      shows parallel sessions, follow the [safe-commit](../safe-commit/SKILL.md) rules —
      path-scoped adds only, never sweep foreign work into a checkpoint. (A checkpoint commit
      once swept another session's uncommitted fix. Never again.)
- [ ] **Refresh [STATUS.md](../../../STATUS.md)** so its 📍 checkpoint note matches what was just committed, and commit that too.
- [ ] **Refresh the chat-history log** — `python scripts/chat-log.py` (Carl's machine only; the
      folder is git-ignored on purpose — don't commit it, and don't be surprised when a cloud
      session can't find it).
- [ ] Nothing built stays uncommitted past a checkpoint. Local only — no push unless asked.

## Job B — Restore (fresh session, "check point" / "where are we")

Read, in order — then answer. Never ask "what do you mean":

- [ ] [STATUS.md](../../../STATUS.md) — the ▶ Your move banner + phase boxes.
- [ ] The active workstream's `plan.md` "Current state" (under `docs/workstreams/<slug>/`).
- [ ] `git log --oneline -15` — what actually landed.
- [ ] [SERO_BOARD.md](../../../SERO_BOARD.md) if the question is bigger than the current phase.

Then give the full picture in plain words, in one reply:
1. **Done** — what's finished and tested.
2. **Built, awaiting QA** — what exists but Carl hasn't walked yet.
3. **Your move** — exactly one action (or lettered A/B/C options if there's a real choice).

Carl should be back in the saddle from that one reply.

## Rules

- [ ] Save = commit + STATUS refresh + chat-log, all three. A checkpoint that skips one is a miss.
- [ ] Restore reads files first, talks second. No guessing from memory.
- [ ] If STATUS.md turns out stale during a restore, say so plainly and fix it as part of the reply — Carl should never discover staleness himself.
