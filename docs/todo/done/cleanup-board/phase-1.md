# Phase 1 — Git audit + gate-error diagnosis (read-only)

**Part of:** [PLAN.md](PLAN.md) · **Status:** 🔨 built, awaiting owner QA — output: [audit-note.md](audit-note.md)

## Goal
Make the repo state non-mysterious: every changed file mapped to its workstream, and the failed gate run explained from its logs — without running anything that costs money or touching any file.

## Changes
- None to the repo. Output is a written audit note (lands inside SERO_BOARD.md in Phase 2).
- Audit covers: the 10 modified / 286 deleted / ~388 untracked files, the two old stashes, and tonight's commits `ee018b5` + `bb49e7c`.
- Gate diagnosis reads `logs/gate/2026-06-12T12-18-27-732Z/` + one failing session folder (e.g. `logs/june/2026_Jun12_19-08-b082c5b5/`) to find why all 8 cases ended "pipeline incomplete (exit 1)".

## Not in this phase
- No code edits from the diagnosis. No fix attempts. No gate/smoke re-runs.
- No commits, no staging, nothing deleted.

## Done when
- [ ] Audit note exists: every change-group named with its workstream.
- [ ] Gate-error finding names a specific failing point with a log path as evidence — not a guess.
- [ ] `git status` is byte-for-byte what it was before the phase.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Nothing mysterious** — read the audit note, then run `git status`. Pick any three files from the output. The note tells you what each one is for. ❌ Not OK if any file isn't covered.
2. **Evidence, not vibes** — the gate-error section quotes or points at a specific log file and line/error. ❌ Not OK if it says "probably" without a path.
3. **Untouched tree** — run `git status` and `git stash list`. Only `docs/todo/cleanup-board/` shows as untracked (the engine-trust-gates session committed its own churn at 20:51 — see audit note), 2 stashes, nothing staged.
