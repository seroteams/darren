# Running multiple Claude sessions without collisions

**The problem.** Several Claude sessions in the *same* folder (`Sero/darren`) share one git
working tree and one git index. That causes two real failures we hit on 2026-07-05:

- **Co-mingled commits** — one session's `git commit` sweeps in another session's *staged*
  files (the index is shared). A commit ends up containing unrelated work under the wrong message.
- **Clobbered work** — one session rewrites a shared file (e.g. `design.css`) and silently
  deletes another session's *uncommitted* edits to the same file. (This wiped all the Error
  log styles once.)

**The fix: one git *worktree* per session.** A worktree is a separate folder with its own
files and its own index, on its own branch, but sharing this repo's history. Sessions in
different worktrees can't clobber or co-mingle each other. When a branch is done, merge it to
`main`.

## Start a session in its own worktree

From the main copy (`Sero/darren`):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/new-worktree.ps1 <name>
```

e.g. `... new-worktree.ps1 error-log` creates:
- folder `../darren-error-log`
- branch `work/error-log`
- with `.env` copied and `node_modules` linked (so tests/build/dev run right away).

Then start the Claude session with that folder as its working directory (`cd ../darren-error-log`).
Give each concurrent track its own name.

## Dev servers (ports)

Only **one** worktree should run `npm run dev` at a time — that's the one your browser points
at (`:3001` API + `:3000` Vite). Other sessions edit code and run **offline** checks
(`npm test`, `npm run typecheck`) — they don't need a server. If you truly need two live at
once, give the second different ports: `$env:API_PORT="3011"; npm run dev` and `vite --port 3010`.

## Merge back + clean up

When a worktree's branch is built + tested, from the **main copy**:

```powershell
git merge work/<name>
git worktree remove ../darren-<name>
git branch -d work/<name>
```

`git worktree list` shows every active worktree. `git worktree remove` refuses if there are
uncommitted changes — commit or discard first (add `--force` only if you mean to throw them away).

## Rule of thumb

- **One session = one worktree = one branch.** Never two sessions in the same folder.
- Merge small and often, so branches don't drift far from `main`.
- The shared `node_modules` is linked, so don't `npm install` new deps in a worktree unless you
  mean to change it for everyone (then commit `package.json` + merge deliberately).
