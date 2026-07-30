# Removes the nightly database backup schedule. Existing backups in backups/ are kept.
#
# Run:  npm run backup:nightly:uninstall

$TaskName = "SeroNightlyBackup"

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Removed scheduled task '$TaskName'. Existing backups are untouched." -ForegroundColor Green
} else {
  Write-Host "No scheduled task '$TaskName' found — nothing to remove." -ForegroundColor DarkGray
}
