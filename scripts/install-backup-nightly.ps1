# Registers the nightly database backup as a Windows scheduled task (02:30 daily, and
# it catches up if the laptop was asleep at the time). Current user only, no admin.
#
# Run once:   npm run backup:nightly:install
# Remove it:  npm run backup:nightly:uninstall

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path "$PSScriptRoot\..").Path
$TaskName = "SeroNightlyBackup"

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$script = Join-Path $RepoRoot "scripts\backup-nightly.ps1"
$argline = '-NoProfile -ExecutionPolicy Bypass -File "' + $script + '"'

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argline -WorkingDirectory $RepoRoot
$trigger = New-ScheduledTaskTrigger -Daily -At 02:30
# StartWhenAvailable: if the laptop was off at 02:30, run at the next opportunity —
# otherwise a closed lid means a silently skipped night.
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Nightly backup of the Sero live + local databases (scripts/backup-nightly.ps1)" | Out-Null

Write-Host "Registered scheduled task '$TaskName' - daily at 02:30." -ForegroundColor Green
Write-Host "Log: backups/backup.log" -ForegroundColor DarkGray
