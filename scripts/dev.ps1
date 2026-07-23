# Self-healing dev launcher for Sero.
# - Frees ports 3000 (web) and 3001 (api) from any stale process first.
# - Starts `npm run dev` and, if it ever exits/crashes, restarts it automatically.
# Run from the repo root:  npm run up
# Stop it with Ctrl+C.

$ErrorActionPreference = "Continue"

function Clear-Port($port) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    try {
      Write-Host "  freeing port $port (pid $($c.OwningProcess))" -ForegroundColor Yellow
      Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop
    } catch {}
  }
}

Write-Host "Sero dev - self-healing launcher (Ctrl+C to stop)" -ForegroundColor Cyan

while ($true) {
  Write-Host "`nClearing stale ports..." -ForegroundColor DarkGray
  Clear-Port 3000
  Clear-Port 3001
  Clear-Port 3002
  Start-Sleep -Milliseconds 300

  Write-Host "Starting dev server..." -ForegroundColor Green
  npm run dev

  Write-Host "`n[dev server exited] restarting in 2s... (Ctrl+C now to stop)" -ForegroundColor Red
  Start-Sleep -Seconds 2
}
