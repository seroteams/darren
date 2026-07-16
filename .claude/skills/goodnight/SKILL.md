---
name: goodnight
description: "The end-of-day sweep, so Carl can walk away with nothing left open. Trigger when Carl says 'goodnight', 'good night', 'end of day sweep', 'closing up for the night', 'tie everything off for the night'. Runs every free check, spends at most the stated paid-test budget (default $2) only where a run proves something owed, ties off green-lit-but-uncommitted work, tidies junk and docs, checks worktrees/branches for finished work to fold in, pushes main (Render auto-deploys) and watches it go live — then reports honestly what stayed open and why. Never sweeps a live session's work; never self-certifies a phase closed."
argument-hint: "(optional: a paid-test budget, e.g. 'goodnight, $1' — default $2)"
user-invocable: true
disable-model-invocation: true
---

Carl is leaving. Tidy the house, prove it still works, put it live, and tell him plainly what's
open. The one thing worse than leaving something open is *hiding* that it's open.

## 1. Survey — before touching anything

- [ ] `git status --porcelain` + `git worktree list` + `git log --oneline -10`.
- [ ] Read [STATUS.md](../../../STATUS.md) and glance at every `docs/plans/doing/<slug>/` folder.
- [ ] Classify every changed/untracked file by owner (this is [safe-commit](../safe-commit/SKILL.md)'s
      mine-vs-foreign call, done for the whole tree):
      - **Tie-off** — belongs to a green-lit phase or finished work that was never committed.
      - **Deliberately open** — a phase file says it stays uncommitted (awaiting proof or Carl's walk).
      - **Live session** — a parallel session is mid-work on it. Files that change *during* the sweep
        are live-session work by definition — re-run `git status` before each commit to catch them.
      - **Artifact** — runtime output (`content/questions/_runtime/*`, role-profile caches): committed
        by convention, never deleted.
      - **Junk** — temp/backup/stray files with no owner.

## 2. Tests — free first, paid only against the budget

- [ ] **Free, always:** `npm test` + `npm run typecheck`. Red → the push at step 5 is OFF;
      report what's red and stop escalating.
- [ ] **Paid, only if something is owed:** budget is what Carl said, else **$2**. Spend it only
      where a paid run proves a thing the trackers say is owed (a blocked gate proof, an unverified
      engine change) — never "just to be sure". Smallest run that proves it
      (`node scripts/gate.js --only <case>` ≈ $0.35, never the full sweep), state the cost before
      running, and report the RAW number — a metric that went the wrong way goes in the report in
      bold, not in a drawer (engine honesty rule).
- [ ] A crashed paid run usually left its session on disk — score it for $0 before paying again.

## 3. Tie off — path-scoped commits, one per track

- [ ] Green-lit but uncommitted phase work → finish its [phase-close](../phase-close/SKILL.md)
      leftovers (plan.md, STATUS, SERO_BOARD, progress log) and commit.
- [ ] Orphan untracked files (docs, tests, scripts) → group by purpose, commit with a message that
      says where they came from.
- [ ] Runtime artifacts → the `content(questions): checkpoint question bank` convention; new
      role-profile caches likewise (regenerating them costs money).
- [ ] Junk → delete tracked/untracked temp files (`*.tmp`, `*.bak`, `*.orig`, strays). NEVER
      bulk-delete under `content/questions/` and never delete a file another session may own —
      when in doubt, list it in the report instead.
- [ ] Every commit: `git add <paths>` + `git commit -- <paths>`. Note the trap: `git commit -- <paths>`
      commits the *working-tree* state of those paths, not your staged `--cached` changes — verify
      each commit with `git show --stat HEAD` before moving on.
- [ ] **Deliberately-open and live-session files stay untouched.** "Nothing left open" means
      nothing *silently* open — a phase awaiting Carl's green light is reported open, never
      self-certified closed.

## 4. Merge — fold in only what's finished

- [ ] `git worktree list` + `git branch --no-merged main`: for each, is its work done (its plan
      says green-lit / its handoff says fold)? Then merge it into main and note it. Anything
      still mid-work or unclear → leave it, name it in the report.

## 5. Push — the release flow

- [ ] Tests green? Follow [release](../release/SKILL.md): push `main`, watch the Render API until
      **live**, hit `/api/v1/health`. A push auto-deploys the live site — that's the point, but it's
      also why red tests block this step.
- [ ] Tests red or a live session's uncommitted work sits in files the deploy needs? Skip the push,
      say exactly why.

## 6. Wrap

- [ ] `python scripts/chat-log.py` (Carl's machine only — folder is gitignored).
- [ ] STATUS.md 📍 note if anything moved that its banner doesn't reflect.
- [ ] Final report: a commits table (what each tied off), a tests table (free + paid, with spend),
      deploy status, and — most important — **the open list**: every deliberately-open item, live
      session, and unmerged branch, each with one plain sentence on why it's open and whose move
      it is. Final message in the Carl output style shape, as always.

## Rules

- [ ] Free checks before any spend; state cost before any paid run; raw numbers in the report.
- [ ] Never sweep foreign work — parallel sessions are usually live during a goodnight.
- [ ] Never self-certify: green lights are Carl's. Open-but-honest beats closed-but-false.
- [ ] Red tests = no push. The last good version keeps serving; say that.
