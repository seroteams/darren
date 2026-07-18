# Running multiple Claude sessions — the trunk-only way

> **This page was rewritten 2026-07-18.** The old version taught a worktree-per-session flow;
> Carl retired that ceremony on **2026-07-15** ("I am the ONLY person building — stop the git
> gymnastics", model B). `scripts/new-worktree.ps1` was deleted in the same sweep. History of
> the old guide lives in git if ever needed.

**The setup.** Carl runs many Claude chats at once in this ONE folder, all on the single branch
`main`. No worktrees, no feature branches, no PRs. The safety that used to come from isolation
now comes from discipline:

1. **Commit my-own-files-only.** Every session stages and commits ONLY the specific files it
   touched — `git add -- <my paths>` + `git commit -- <my paths>`. **Never `git add -A`**, never
   `git add .`, never `git commit -a`. Full ritual: [safe-commit](../../.claude/skills/safe-commit/SKILL.md).
2. **Foreign files are off-limits.** Anything in `git status` this session didn't create or edit
   belongs to a parallel chat (or to Carl) — report it if relevant, never commit or revert it.
3. **Git stays invisible to Carl.** Commits are silent snapshots; push happens only on
   "go live" / "release" (a push deploys to Render).
4. **If a session lands on a branch anyway** — surface it, don't add more.

## Dev servers (ports) — still true

Only **one** session should run `npm run dev` at a time — that's the one Carl's browser points
at (`:3001` API + `:3000` Vite). Other sessions edit code and run **offline** checks
(`npm test`, `npm run typecheck`) — they don't need a server. If you truly need two live at
once, give the second different ports: `$env:API_PORT="3011"; npm run dev` and `vite --port 3010`.
