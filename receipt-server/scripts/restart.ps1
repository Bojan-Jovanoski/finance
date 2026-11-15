# Restarts the autostart task, e.g. after git pull or editing .env.
#
#   powershell -ExecutionPolicy Bypass -File scripts\restart.ps1

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

if (-not (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue)) {
    throw "Task '$TaskName' is not registered. Run scripts\install-autostart.ps1 first."
}
Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Stop-ReceiptServer
Start-Sleep -Seconds 1
Start-ScheduledTask -TaskName $TaskName
Write-Step 'Receipt server restarted. Check with: curl.exe http://localhost:8787/health'
