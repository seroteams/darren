---
name: release
description: "Put Carl's work live on Render. Trigger when Carl says /release, 'release', 'go live', 'ship it', 'push it live', 'deploy'. Runs free checks, commits anything unsaved, pushes main (Render auto-deploys), then watches the Render API until the deploy is live or failed — reporting in plain words. On failure it explains the problem and waits for Carl's yes before changing anything. Never prints or commits the API key."
argument-hint: ""
user-invocable: true
disable-model-invocation: true
---

Take whatever's ready locally and get it live at **https://sero-obwq.onrender.com**. Every push to `main` auto-deploys; this skill pushes, then watches and reports. **Talk in plain words at every step — Carl should always know what's happening.**

## Step 0 — where are you standing? (do this FIRST, before any push or merge)

`git branch --show-current`. If you're **on `main`**, skip to Steps. If you're on a **feature branch**, STOP and check divergence before doing anything — Carl runs many parallel sessions and a branch can be stale:

```
git fetch origin main
git rev-list --left-right --count origin/main...HEAD   # left = commits main has you lack; right = commits you have main lacks
```

- **Behind but not ahead** → main already has everything; nothing to merge. Go verify the live deploy (Step 5) and tell Carl it's already live.
- **Ahead** → the branch has commits main lacks. **Do NOT assume they're unshipped.** Check whether main already contains that work under a *different* history first:
  ```
  git log origin/main..HEAD --oneline          # what this branch has
  git log origin/main --oneline | head -40      # scan main for the SAME feature/commit messages
  ```
  Sero's branches often re-implement the same feature in parallel, so the *same work* lands on main via a different PR/merge (identical commit **messages**, different hashes). If main's copy is a **superset** (e.g. main has the feature through Phase 7, your branch only through Phase 2), the branch is **stale and superseded** — merging it would **regress** production and cause a wall of add/add conflicts. Say so plainly and recommend against merging. **Real seen 2026-07-15:** `work/monthly-checkin` was 38-ahead/10-behind but every commit was already on main (monthly-checkin was closed at Phase 7 there); a trial merge threw 26 conflicts incl. DB migration journals. Correct move was *don't merge — main's already live*.
  - Only genuinely-new, wanted work merges. Do it in an **isolated worktree** so the parallel session's working tree is never touched: `git worktree add --detach <tmp> HEAD` → `git merge origin/main` (resolve) → `git push origin HEAD:main` → `git worktree remove <tmp>`. **Never** resolve a pile of conflicts (especially DB migration snapshots/`_journal.json`) by guesswork and push to prod — surface them to Carl.
- **Cross-check reality:** the live deploy's commit is the source of truth — compare `origin/main` tip to the latest Render deploy's `commit.id` (Step 4). If they match and health is ok, main is already live; there may be nothing to do.

## Steps

1. **Free checks first** (no cost). Run `npm test` and `npm run typecheck`.
   - Red? **Stop.** Say what failed in one plain sentence and ask whether to fix or release anyway. Don't push broken work silently.
2. **Save anything unsaved.** If `git status` shows uncommitted work, run the [commit](../commit/SKILL.md) steps first (path-scoped, safe-commit). Nothing to commit → carry on.
3. **Push.** `git push origin main`. This is what triggers Render.
4. **Watch the deploy** (Render API — free). Read the key + service id:
   - Key: `.secrets/render-api-key` · Service id: `.secrets/render-service-id`
   - Find the newest deploy and its status:
     ```
     KEY=$(cat .secrets/render-api-key); SID=$(cat .secrets/render-service-id)
     curl -s -H "Authorization: Bearer $KEY" "https://api.render.com/v1/services/$SID/deploys?limit=1"
     ```
   - The JSON's `[0].deploy.status` moves through `created`/`build_in_progress`/`update_in_progress` → **`live`** (good) or **`build_failed`/`update_failed`/`canceled`** (bad).
   - Poll every ~30s, up to ~15 min. Tell Carl it's building; don't go silent.
5. **Live?** Hit the real health check to be sure it's actually serving:
   `curl -s https://sero-obwq.onrender.com/api/v1/health` → expect `{"ok":true}`.
   Then tell Carl: **"✅ It's live"** + the URL. Done.
6. **Failed?** Pull the logs, don't guess:
   ```
   curl -s -H "Authorization: Bearer $KEY" "https://api.render.com/v1/services/$SID/deploys/<deployId>"
   curl -s -H "Authorization: Bearer $KEY" "https://api.render.com/v1/services/$SID/logs?limit=50"
   ```
   Explain the problem in **one plain sentence**, propose the fix, and **WAIT for Carl's yes** before changing any code or re-releasing. Never auto-fix-and-repush.

## Rules
- **Never print or commit the API key.** Read it from `.secrets/`, use it in the header, never echo it. `.secrets/` stays gitignored.
- **Free checks before every push.** Paid runs (gate/smoke/eval) are NOT part of release — don't run them here.
- **A failed deploy doesn't break the live site** — the last good version keeps serving. Say that to reassure Carl.
- **Fix only with Carl's yes.** Diagnose freely; change nothing without the go.
- Plain words throughout. No jargon, no silent gaps while polling.

## Notes
- Live URL: **https://sero-obwq.onrender.com** · service id in `.secrets/render-service-id` (`srv-…`).
- First hit after 15 min idle takes ~50s (free plan waking) — not a failure.
- If `.secrets/render-api-key` is missing (e.g. a fresh clone / cloud session), say so — the watch step can't run without it; Carl can still push and watch in the Render dashboard.
