$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$nextDir = Join-Path $root ".next"
$publicDir = Join-Path $root "public"
$envProductionFile = Join-Path $root ".env.production"
$packageJsonFile = Join-Path $root "package.json"
$packageLockFile = Join-Path $root "package-lock.json"
$nextConfigFile = Join-Path $root "next.config.mjs"
$targetDir = Join-Path $root "vm-package"

if (!(Test-Path $nextDir)) {
  throw "No se encontro .next. Ejecuta npm run build antes de preparar la carpeta de VM."
}

if (Test-Path $targetDir) {
  Get-ChildItem -Force -Path $targetDir | ForEach-Object {
    Remove-Item -Recurse -Force $_.FullName
  }
} else {
  New-Item -ItemType Directory -Path $targetDir | Out-Null
}

Copy-Item -Path $nextDir -Destination (Join-Path $targetDir ".next") -Recurse -Force

if (Test-Path $publicDir) {
  Copy-Item -Path $publicDir -Destination (Join-Path $targetDir "public") -Recurse -Force
}

if (Test-Path $packageJsonFile) {
  Copy-Item -Path $packageJsonFile -Destination (Join-Path $targetDir "package.json") -Force
}

if (Test-Path $packageLockFile) {
  Copy-Item -Path $packageLockFile -Destination (Join-Path $targetDir "package-lock.json") -Force
}

if (Test-Path $nextConfigFile) {
  Copy-Item -Path $nextConfigFile -Destination (Join-Path $targetDir "next.config.mjs") -Force
}

if (Test-Path $envProductionFile) {
  Copy-Item -Path $envProductionFile -Destination (Join-Path $targetDir ".env.production") -Force
}

@"
VM package ready.

Contents:
- production build: vm-package/.next
- public assets: vm-package/public
- runtime config: vm-package/package.json, vm-package/package-lock.json, vm-package/next.config.mjs
- production env template: vm-package/.env.production

Run on the VM:
1. cd vm-package
2. npm ci --omit=dev
3. npm start
"@ | Set-Content -Path (Join-Path $targetDir "README.txt")