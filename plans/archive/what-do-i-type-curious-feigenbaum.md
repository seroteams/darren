# Future commit workflow

## Context
Repo now lives at `github.com/seroteams/darren`, `main` branch tracked. User wants the minimal command set to commit + push future changes.

## Daily flow (3 commands)

```powershell
git add .
git commit -m "short message describing change"
git push
```

That's it. `-u origin main` already set, so plain `git push` works.

## Useful extras

**See what changed before staging:**
```powershell
git status          # list of changed files
git diff            # show line-level changes
```

**Stage only specific files (safer than `git add .`):**
```powershell
git add src/foo.js src/bar.js
```

**Undo last commit but keep changes:**
```powershell
git reset --soft HEAD~1
```

**Pull latest before working (if editing from multiple machines):**
```powershell
git pull
```

## Commit message tips
- One line, present tense: `"fix axis seed values"`, `"add focus-points filter"`
- If longer explanation needed: leave blank line, then paragraph

## Verification
After push:
- `git status` → "nothing to commit, working tree clean"
- Refresh https://github.com/seroteams/darren → see new commit at top
