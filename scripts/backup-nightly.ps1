# The nightly database photocopy. Backs up LIVE first (the copy that actually matters),
# then local, prunes sets older than the retention window, and appends one line per run
# to backups/backup.log so a silent failure is visible the next morning.
#
# Install the 02:30 schedule:  npm run backup:nightly:install
# Remove it:                   npm run backup:nightly:uninstall
# Run it by hand right now:    npm run backup:nightly
#
# The live URL is read from .secrets/live-database-url (gitignored, never printed). If
# that file is missing, the live half is SKIPPED and the log says so loudly: a backup
# that quietly only covered the dev database is worse than none.
#
# ASCII only in this file. Windows PowerShell 5.1 reads .ps1 as ANSI, so a non-ASCII
# character inside a string is a parse error, not a typo.

$ErrorActionPreference = "Stop"
$RepoRoot    = (Resolve-Path "$PSScriptRoot\..").Path
$BackupDir   = Join-Path $RepoRoot "backups"
$LogFile     = Join-Path $BackupDir "backup.log"
$LiveUrlFile = Join-Path $RepoRoot ".secrets\live-database-url"
$KeepDays    = 14

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

function Write-Log($message) {
  $stamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  Add-Content -Path $LogFile -Value "$stamp  $message" -Encoding utf8
  Write-Host $message
}

function Backup-One($label, $url) {
  $env:DATABASE_URL = $url
  # No 2>&1 here. In PowerShell 5.1 redirecting a native command's stderr wraps each
  # line in an ErrorRecord, which under ErrorActionPreference=Stop kills the run even
  # when node exited 0. node's stderr goes to the console instead.
  $out = & node (Join-Path $RepoRoot "scripts\backup-db.js") --label $label
  $code = $LASTEXITCODE
  $env:DATABASE_URL = $null
  $summary = ($out | Select-String -Pattern "^\[backup\] done" | Select-Object -Last 1)
  if ($code -eq 0 -and $summary) {
    Write-Log "OK   $label - $($summary.Line)"
    return
  }
  Write-Log "FAIL $label - exit $code"
  Write-Log (($out | Select-Object -Last 5 | Out-String).Trim())
}

Set-Location $RepoRoot
Write-Log "--- nightly backup starting"

# LIVE is the irreplaceable one. Do it first so a mid-run failure still got the half
# that matters.
if (Test-Path $LiveUrlFile) {
  $liveUrl = (Get-Content $LiveUrlFile -Raw).Trim()
  Backup-One "live" $liveUrl
} else {
  Write-Log "SKIP live - .secrets/live-database-url is missing. LIVE DATA IS NOT BEING BACKED UP."
}

# LOCAL is dev/test runs, read from .env.
$match = Select-String -Path (Join-Path $RepoRoot ".env") -Pattern "^\s*DATABASE_URL\s*=\s*(.+)$"
if ($match) {
  $localUrl = $match.Matches.Groups[1].Value.Trim().Trim('"').Trim("'")
  Backup-One "local" $localUrl
} else {
  Write-Log "SKIP local - no DATABASE_URL in .env"
}

# Prune: keep the last $KeepDays days. Only ever touches the sero-* sets this script
# creates; the hand-made pre-purge-* exports are left alone.
$cutoff = (Get-Date).AddDays(-$KeepDays)
foreach ($item in (Get-ChildItem $BackupDir -Filter "sero-*" | Where-Object { $_.LastWriteTime -lt $cutoff })) {
  Remove-Item $item.FullName -Recurse -Force -Confirm:$false
  Write-Log "pruned $($item.Name)"
}

$total = [math]::Round(((Get-ChildItem $BackupDir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1GB), 2)
Write-Log "--- nightly backup finished - backups/ now $total GB"
