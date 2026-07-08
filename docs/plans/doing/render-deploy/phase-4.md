# Phase 4 — /commit and /release skills

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The two-word workflow: `/commit` saves work, `/release` puts it live and tells Carl when it's up.

## Changes
- `.claude/skills/commit/SKILL.md` — save this session's work locally: group related changes, plain conventional message, commit with explicit paths (safe-commit rules — never sweep other sessions' files), **never push**. Replies in plain words.
- `.claude/skills/release/SKILL.md` — get it live: free checks first (`npm test` + `npm run typecheck`; stop and explain if red) → commit anything unsaved → `git push origin main` → poll the Render API (key from `.secrets/`) every ~30 s until the deploy is `live` or failed (max ~15 min) → live: check the real `/api/v1/health`, tell Carl "✅ live" + URL → failed: read the logs, explain the problem in one plain sentence, propose the fix, **wait for Carl's yes** before changing anything. Never prints or commits the API key.
- `.claude/settings.json` — allow read-only Render API calls + `git push origin main` so the loop doesn't prompt.

## Not in this phase
- Auto-rollback, staging environments, PR flows — parked unless asked.

## Done when
- [ ] Both skills show up as `/commit` and `/release`.
- [ ] A real end-to-end walk works (scenario 1).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **The whole point** — change something tiny but visible (I can suggest one), then type `/commit`, then `/release`. Without touching render.com, you should get a "✅ live" message, and the change should be visible at the public URL. ❌ Not OK if you had to open the Render dashboard for anything.
2. **Plain words** — reading the /release replies, you always know what's happening. ❌ Not OK if any reply needs translating.
