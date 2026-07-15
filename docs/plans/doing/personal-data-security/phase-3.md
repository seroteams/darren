# Phase 3 — Purge committed test-run logs from git history

**Part of:** [plan.md](plan.md) · **Status:** ⬜ (needs a coordinated moment — all sessions closed)

## Why this is its own phase
The `.gitignore` keep-set (`logs/may/2026_May24_*`, `logs/may/2026_May25_*`, `logs/sweeps/*`) put real employee names, manager notes and briefings into **git history**. Removing them isn't a normal edit — it's a **history rewrite** (git filter-repo / BFG) that:
- changes every commit hash from the rewrite point on,
- requires a **force-push** to the remote,
- breaks every other checkout/clone until they re-sync.
Doing that while Carl has parallel sessions live would destroy their in-flight work. So it waits for a deliberate, everyone-out moment — same discipline as the folder-rename task.

## The plan (when the moment comes)
1. Confirm all other Claude sessions + working copies are closed and pushed.
2. Take a full backup clone.
3. `git filter-repo --path-glob 'logs/**' --invert-paths` (or BFG on those globs) to strip the log dirs from all history.
4. Tighten `.gitignore` so the keep-set no longer exists — `logs/**` fully ignored, nothing kept.
5. Force-push the rewritten history; every other checkout re-clones fresh.
6. Verify.

## Done when
- [ ] `git log --all -- 'logs/may/2026_May24_*'` returns nothing.
- [ ] Grepping full history for a known test employee name returns nothing.
- [ ] `.gitignore` keeps no run dirs; a new run dir is ignored by default.
- [ ] Remote updated; Carl's other checkouts re-synced.

## Test scenarios — for the product owner
1. **Names are gone** — I show you a search of the whole project history for the old test folders / a known name; it comes back empty. ❌ Not OK if any real name still appears.
2. **Nothing else lost** — the app still builds and runs; only the old log files are gone. ❌ Not OK if anything real is missing.

## Interim (safe, optional, non-destructive) — can do without coordination
Stop *tracking* the committed log dirs going forward (`git rm -r --cached` those paths + gitignore them) so they leave HEAD and future clones' working tree. This does NOT scrub history (old commits still hold them) but reduces exposure until the full rewrite. Flag to Carl as a partial measure.
