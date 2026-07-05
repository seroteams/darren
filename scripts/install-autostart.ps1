# Makes the Sero dev server start automatically when you log in, by placing a
# shortcut in your Windows Startup folder. It opens a normal terminal window
# running the self-healing launcher (scripts/dev.ps1) — visible, and you can
# Ctrl+C to stop it any time.
#
# Run once:   npm run autostart:install
# Remove it:  npm run autostart:uninstall

$RepoRoot   = (Resolve-Path "$PSScriptRoot\..").Path
$startupDir = [Environment]::GetFolderPath("Startup")
$lnkPath    = Join-Path $startupDir "Sero Dev Server.lnk"

# Clean up the old scheduled-task approach if it exists.
if (Get-ScheduledTask -TaskName "SeroDevServer" -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName "SeroDevServer" -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName "SeroDevServer" -Confirm:$false -ErrorAction SilentlyContinue
}

$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($lnkPath)
$sc.TargetPath       = "powershell.exe"
$sc.Arguments        = "-NoExit -ExecutionPolicy Bypass -File `"$RepoRoot\scripts\dev.ps1`""
$sc.WorkingDirectory = $RepoRoot
$sc.WindowStyle      = 1  # normal window
$sc.Description      = "Sero self-healing dev server"
$sc.Save()

Write-Host "Installed startup shortcut:" -ForegroundColor Green
Write-Host "  $lnkPath" -ForegroundColor DarkGray
Write-Host "The Sero dev server will now start automatically each time you log in." -ForegroundColor Green
Write-Host "(Starting it now in a new window so you don't have to wait for a reboot.)" -ForegroundColor Cyan

Start-Process powershell.exe -ArgumentList "-NoExit","-ExecutionPolicy","Bypass","-File","`"$RepoRoot\scripts\dev.ps1`"" -WorkingDirectory $RepoRoot
