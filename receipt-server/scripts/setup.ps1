# One-time setup for the receipt server on Windows. Safe to re-run.
#
#   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
#
# Installs Git, Node.js, Ollama and Tailscale (skipping anything already there),
# installs the server's npm packages, configures Ollama for the AMD GPU (Vulkan),
# downloads the vision model and creates .env from .env.example.

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'common.ps1')

function Install-IfMissing($WingetId, $Command) {
    if (Get-Command $Command -ErrorAction SilentlyContinue) {
        Write-Step "$WingetId already installed"
        return
    }
    Write-Step "Installing $WingetId"
    winget install --id $WingetId --exact --silent --accept-source-agreements --accept-package-agreements
    Update-SessionPath
    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        throw "$WingetId was installed but '$Command' is not on PATH yet. Close this window, open a new PowerShell and run setup.ps1 again."
    }
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "winget is missing. Install 'App Installer' from the Microsoft Store, then run this script again."
}

# 1. Tools
Install-IfMissing 'Git.Git' 'git'
Install-IfMissing 'OpenJS.NodeJS.LTS' 'node'
Install-IfMissing 'Ollama.Ollama' 'ollama'
Install-IfMissing 'Tailscale.Tailscale' 'tailscale'

$nodeMajor = [int]((node -v).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 20) { throw "Node $(node -v) is too old; version 20 or newer is needed. Run: winget upgrade OpenJS.NodeJS.LTS" }

# 2. npm packages (npm.cmd avoids the PowerShell execution-policy prompt for npm.ps1)
Write-Step 'Installing npm packages'
Push-Location $Root
try { npm.cmd install --omit=dev } finally { Pop-Location }

# 3. .env
$envFile = Join-Path $Root '.env'
if (Test-Path $envFile) {
    Write-Step '.env already exists (left unchanged)'
} else {
    Copy-Item (Join-Path $Root '.env.example') $envFile
    Write-Step 'Created .env from .env.example - fill in FIREBASE_PROJECT_ID and ALLOWED_EMAILS'
}

# 4. Ollama: Vulkan for the RX 6700 XT, keep the model loaded for 30 minutes
Write-Step 'Configuring Ollama (OLLAMA_VULKAN=1, OLLAMA_KEEP_ALIVE=30m)'
[Environment]::SetEnvironmentVariable('OLLAMA_VULKAN', '1', 'User')
[Environment]::SetEnvironmentVariable('OLLAMA_KEEP_ALIVE', '30m', 'User')
$env:OLLAMA_VULKAN = '1'
$env:OLLAMA_KEEP_ALIVE = '30m'

Write-Step 'Restarting Ollama so it picks up the settings'
Stop-Process -Name 'ollama app', 'ollama' -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-Ollama

# 5. Model
$model = Get-EnvValue $envFile 'OLLAMA_MODEL' 'qwen3-vl:8b-instruct'
Write-Step "Downloading model $model (about 6 GB, only the first time)"
ollama pull $model

Write-Host ''
Write-Host 'Setup finished. Next steps (see SETUP-WINDOWS.md):' -ForegroundColor Green
Write-Host '  - Edit receipt-server\.env (FIREBASE_PROJECT_ID, ALLOWED_EMAILS)'
Write-Host '  - Start the server:   npm.cmd start'
Write-Host '  - Then Tailscale Funnel and autostart'
