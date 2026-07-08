---
name: release
description: "Put Carl's work live on Render. Trigger when Carl says /release, 'release', 'go live', 'ship it', 'push it live', 'deploy'. Runs free checks, commits anything unsaved, pushes main (Render auto-deploys), then watches the Render API until the deploy is live or failed — reporting in plain words. On failure it explains the problem and waits for Carl's yes before changing anything. Never prints or commits the API key."
argument-hint: ""
user-invocable: true
disable-model-invocation: true
---

Take whatever's ready locally and get it live at **https://sero-obwq.onrender.com**. Every push to `main` auto-deploys; this skill pushes, then watches and reports. **Talk in plain words at every step — Carl should always know what's happening.**

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
