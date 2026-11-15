# Sends one receipt photo to the server and prints what the model read.
#
#   powershell -ExecutionPolicy Bypass -File scripts\test-scan.ps1 -Image C:\path\receipt.jpg -Token <ID token>
#   ... -Url https://your-pc.your-tailnet.ts.net   (to test through Tailscale Funnel)
#
# See SETUP-WINDOWS.md for how to copy a sign-in token from the app.
# Phone photos above ~4 MB may be rejected; the app shrinks them first, this script does not.

param(
    [Parameter(Mandatory = $true)] [string] $Image,
    [Parameter(Mandatory = $true)] [string] $Token,
    [string] $Url = 'http://localhost:8787'
)

$ErrorActionPreference = 'Stop'

# The app's default categories. The real app sends your actual category list and IDs.
$names = 'Electricity', 'Water', 'Internet/Phone', 'Bills Other', 'Subscriptions', 'Groceries', 'Transport',
    'Dining Out', 'Health', 'Entertainment', 'Clothing', 'Household', 'Other'
$categories = $names | ForEach-Object { @{ id = $_; name = $_ } }

$body = @{
    image      = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path $Image)))
    categories = $categories
} | ConvertTo-Json -Depth 4

$watch = [Diagnostics.Stopwatch]::StartNew()
try {
    $result = Invoke-RestMethod -Method Post -Uri "$($Url.TrimEnd('/'))/scan" `
        -Headers @{ Authorization = "Bearer $Token" } `
        -ContentType 'application/json; charset=utf-8' `
        -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 120
} catch {
    Write-Host "Request failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
    exit 1
}
$watch.Stop()

Write-Host "Took $([math]::Round($watch.Elapsed.TotalSeconds, 1)) s" -ForegroundColor Green
Write-Host "Amount:   $($result.amount) MKD"
Write-Host "Date:     $($result.date)"
Write-Host "Merchant: $($result.merchant)"
Write-Host "Category: $($result.categoryId)"
