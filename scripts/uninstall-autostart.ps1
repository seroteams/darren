# Removes the auto-start set up by install-autostart.ps1 (startup shortcut and,
# if present, the older scheduled task). Does not stop a server already running.
# Run:  npm run autostart:uninstall

$startupDir = [Environment]::GetFolderPath("Startup")
$lnkPath    = Join-Path $startupDir "Sero Dev Server.lnk"

if (Test-Path $lnkPath) {
  Remove-Item $lnkPath -Force
  Write-Host "Removed startup shortcut. The dev server will no longer auto-start at login." -ForegroundColor Yellow
} else {
  Write-Host "No startup shortcut found." -ForegroundColor DarkGray
}

if (Get-ScheduledTask -TaskName "SeroDevServer" -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName "SeroDevServer" -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName "SeroDevServer" -Confirm:$false
  Write-Host "Removed old scheduled task too." -ForegroundColor Yellow
}
