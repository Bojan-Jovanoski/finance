# Stops the receipt server and removes the autostart task.
#
#   powershell -ExecutionPolicy Bypass -File scripts\uninstall-autostart.ps1

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Step "Removed task '$TaskName'"
} else {
    Write-Step "Task '$TaskName' was not registered"
}
Stop-ReceiptServer
Write-Step 'Receipt server stopped'
