# Helpers shared by the receipt-server scripts. Dot-source it: . (Join-Path $PSScriptRoot 'common.ps1')

function Write-Step($Message) {
    Write-Host "==> $Message" -ForegroundColor Cyan
}

# Picks up PATH changes made by installers without opening a new window.
function Update-SessionPath {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

# Reads KEY=value from a .env file, or returns the default.
function Get-EnvValue($File, $Key, $Default) {
    if (Test-Path $File) {
        $line = Get-Content $File | Where-Object { $_ -match "^\s*$Key\s*=" } | Select-Object -First 1
        if ($line) {
            $value = ($line -split '=', 2)[1].Trim()
            if ($value) { return $value }
        }
    }
    return $Default
}

function Test-Ollama {
    try {
        Invoke-WebRequest -Uri 'http://127.0.0.1:11434/api/tags' -UseBasicParsing -TimeoutSec 3 | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Starts the Ollama tray app (which runs the server) and waits until it answers.
function Start-Ollama {
    if (Test-Ollama) { return }
    $app = Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama app.exe'
    if (Test-Path $app) {
        Start-Process -FilePath $app
    } else {
        Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Hidden
    }
    for ($i = 0; $i -lt 60; $i++) {
        if (Test-Ollama) { return }
        Start-Sleep -Seconds 1
    }
    throw 'Ollama did not start within 60 seconds.'
}

# Stops any running receipt-server node process.
function Stop-ReceiptServer {
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
        Where-Object { $_.CommandLine -like '*server.js*' -and $_.CommandLine -like '*--env-file*' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

$TaskName = 'Finance Receipt Server'
