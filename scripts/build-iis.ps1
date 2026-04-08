$ErrorActionPreference = "Stop"

$env:BUILD_TARGET = "iis-static"

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