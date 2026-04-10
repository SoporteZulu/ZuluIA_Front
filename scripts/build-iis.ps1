$ErrorActionPreference = "Stop"

$env:BUILD_TARGET = "iis-static"
$root = Split-Path -Parent $PSScriptRoot
$productionEnvFile = Join-Path $root ".env.production"

if (Test-Path $productionEnvFile) {
  $configuredApiUrl = Get-Content $productionEnvFile |
    Where-Object { $_ -match '^NEXT_PUBLIC_API_URL=' } |
    Select-Object -First 1

  if ($configuredApiUrl) {
    $env:NEXT_PUBLIC_API_URL = ($configuredApiUrl -replace '^NEXT_PUBLIC_API_URL=', '').Trim()
  }
}

if (-not $env:NEXT_PUBLIC_BASE_PATH) {
  $env:NEXT_PUBLIC_BASE_PATH = "/Front_IA"
}

pnpm exec next build

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "prepare-iis.ps1")

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}