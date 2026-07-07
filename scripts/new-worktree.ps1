# new-worktree.ps1 — spin up an ISOLATED git worktree for a Claude session, so parallel
# sessions stop colliding (shared working tree = clobbered files + co-mingled commits).
#
# Each worktree is a separate folder with its OWN files + git index, on its OWN branch, but
# sharing this repo's history. It's wired to work immediately: .env is copied and node_modules
# is linked from the main copy (no full npm install, no missing DATABASE_URL).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/new-worktree.ps1 <name>
# e.g.  ... new-worktree.ps1 error-log   ->   ../seroengine-error-log  on branch  work/error-log
#
# When the branch is done + tested, merge it back from the MAIN copy and drop the worktree:
#   git merge work/<name>
#   git worktree remove ../seroengine-<name>
#   git branch -d work/<name>

param([Parameter(Mandatory = $true)][string]$Name)
$ErrorActionPreference = "Stop"

$repo = (git rev-parse --show-toplevel).Trim()
$parent = Split-Path $repo -Parent
$dir = Join-Path $parent "seroengine-$Name"
$branch = "work/$Name"

if (Test-Path $dir) { Write-Error "Folder already exists: $dir"; exit 1 }

git worktree add -b $branch $dir
if ($LASTEXITCODE -ne 0) { Write-Error "git worktree add failed"; exit 1 }

# Copy the gitignored .env so DB-backed code works in the worktree (same Neon).
$envSrc = Join-Path $repo ".env"
if (Test-Path $envSrc) { Copy-Item $envSrc (Join-Path $dir ".env") }

# Link node_modules from the main copy (junction — no admin needed) so tests/build/dev run
# without a fresh install.
$nm = Join-Path $dir "node_modules"
if ((Test-Path (Join-Path $repo "node_modules")) -and -not (Test-Path $nm)) {
  New-Item -ItemType Junction -Path $nm -Target (Join-Path $repo "node_modules") | Out-Null
}

Write-Host ""
Write-Host "Worktree ready." -ForegroundColor Green
Write-Host "  Folder:  $dir"
Write-Host "  Branch:  $branch  (.env copied, node_modules linked)"
Write-Host ""
Write-Host "Start a Claude session there:  cd $dir"
Write-Host "Only ONE worktree should run the dev server (npm run dev) at a time - others use"
Write-Host "offline checks (npm test / typecheck), or set a different API_PORT + vite --port."
Write-Host ""
Write-Host "Done + tested? From the main copy:  git merge $branch ; git worktree remove $dir ; git branch -d $branch"
