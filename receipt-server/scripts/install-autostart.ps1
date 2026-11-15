# Registers a Task Scheduler task that starts the receipt server when you log on,
# then starts it right away.
#
#   powershell -ExecutionPolicy Bypass -File scripts\install-autostart.ps1

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

$startScript = Join-Path $PSScriptRoot 'start.ps1'
$user = "$env:USERDOMAIN\$env:USERNAME"

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
    -Principal $principal -Description 'Receipt scanning server for the finance app' -Force | Out-Null
Write-Step "Registered task '$TaskName' (runs at log on)"

Stop-ReceiptServer
Start-ScheduledTask -TaskName $TaskName
Write-Step 'Started. Check with: curl.exe http://localhost:8787/health'
