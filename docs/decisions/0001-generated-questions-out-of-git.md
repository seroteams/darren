# Decision 0001 — Engine-generated questions live outside git

**Date:** 2026-07-07 · **Status:** Accepted · **Owner:** Carl

## Decision
The engine writes one YAML per generated question into `content/questions/` (root).
These are **regenerable build output, not IP** → they do **not** belong in git.
Keep them gitignored (the rule already exists: `/content/questions/*.yaml`) and keep the
~3,806 that slipped in **untracked** — they stay on disk, the engine keeps writing them.

**Stays in git (the real IP):**
- The engine / generator (prompts, axis logic).
- The hand-authored banks: `content/questions/_seed/`, `content/questions/_intro/`.

## Why — 4-perspective panel, 2026-07-07, unanimous
- **Product:** a rival regenerates the whole pile in an afternoon; it isn't defensible.
- **AI:** regenerable, duplicate-heavy, and carries no record of what worked — ~zero learning value as-is.
- **Engineer:** machine-rewritten tracked files cause cross-session git conflicts (Carl runs many
  sessions in one folder) and bury real diffs.
- **Darren:** untracking is reversible and stops the bleeding; the moat is a separate, later build.

## The real moat (not these files)
Outcome data — which questions actually lead to agreed actions that *happen* — captured via the
deterministic `outcomeCheck` signal, keyed to each question. Lives in a database at go-live, backed
up. Tracked separately in `docs/archive/plans/questions-outcome-moat/`.
**Constraint:** outcome/effectiveness signal only — never train or infer on manager notes about
employees (no-inference ruling).

## "Won't we lose the updates?" — no
Updates come from the **engine writing to disk every run**, not from git. Untracking loses zero
updates. A zip *would* freeze/stale them — which is why it's rejected too. The living home is a
database + automated backups, not git and not a zip.

## Reversal (cheap — so decide freely)
If the question *text* ever becomes the asset: `git add -f content/questions/*.yaml` puts them back
under version control. Near-zero cost, so this decision is safe to commit to now.
