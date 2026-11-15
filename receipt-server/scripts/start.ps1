# Starts Ollama (if needed) and the receipt server, restarting the server if it crashes.
# Output goes to receipt-server\logs\server.log. Used by the autostart task.
#
#   powershell -ExecutionPolicy Bypass -File scripts\start.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'common.ps1')

Update-SessionPath
$logDir = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'server.log'

Start-Ollama
Set-Location $Root

while ($true) {
    Add-Content -Path $log -Value "$(Get-Date -Format s) starting receipt-server"
    # cmd handles the redirect so the log stays plain UTF-8 text.
    cmd /c "node --env-file=.env server.js >> `"$log`" 2>&1"
    Add-Content -Path $log -Value "$(Get-Date -Format s) receipt-server exited with code $LASTEXITCODE, restarting in 10 s"
    Start-Sleep -Seconds 10
}
