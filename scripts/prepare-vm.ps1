$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$buildDir = Join-Path $root ".next"
$buildIdFile = Join-Path $buildDir "BUILD_ID"
$publicDir = Join-Path $root "public"
$targetDir = Join-Path $root "vm-package"
$targetBuildDir = Join-Path $targetDir ".next"
$productionEnvFile = Join-Path $root ".env.production"
$packageJsonFile = Join-Path $root "package.json"
$nextConfigFile = Join-Path $root "next.config.mjs"
$targetPackageJsonFile = Join-Path $targetDir "package.json"
$targetReadmeFile = Join-Path $targetDir "README.txt"

if (!(Test-Path $buildIdFile)) {
  throw "No se encontro .next/BUILD_ID. Ejecuta pnpm run build antes de preparar el paquete VM."
}

if (!(Test-Path $productionEnvFile)) {
  throw "No se encontro .env.production en la raiz del proyecto."
}

$rootPackage = Get-Content -Path $packageJsonFile -Raw | ConvertFrom-Json
$buildId = (Get-Content -Path $buildIdFile -Raw).Trim()

$vmPackage = [ordered]@{
  name = $rootPackage.name
  version = $rootPackage.version
  private = $true
  scripts = [ordered]@{
    start = "next start"
  }
  dependencies = $rootPackage.dependencies
}

if (Test-Path $targetDir) {
  Get-ChildItem -Force -Path $targetDir | ForEach-Object {
    Remove-Item -Recurse -Force $_.FullName
  }
} else {
  New-Item -ItemType Directory -Path $targetDir | Out-Null
}

Copy-Item -Path $buildDir -Destination $targetBuildDir -Recurse -Force
Copy-Item -Path $publicDir -Destination (Join-Path $targetDir "public") -Recurse -Force
Copy-Item -Path $productionEnvFile -Destination (Join-Path $targetDir ".env.production") -Force
Copy-Item -Path $nextConfigFile -Destination (Join-Path $targetDir "next.config.mjs") -Force

$vmPackage | ConvertTo-Json -Depth 50 | Set-Content -Path $targetPackageJsonFile

@"
VM package ready.

Contents:
- production build: vm-package/.next
- public assets: vm-package/public
- runtime config: vm-package/package.json, vm-package/package-lock.json, vm-package/next.config.mjs
- production env copy: vm-package/.env.production

How it is generated:
1. pnpm run build
2. powershell -ExecutionPolicy Bypass -File scripts/prepare-vm.ps1

Or in one step:
- pnpm run build:vm

Run on the VM:
1. cd vm-package
2. npm ci
3. npm start

Notes:
- Build ID: $buildId
- NEXT_PUBLIC_API_URL queda resuelta al generar el build; si cambia la URL del backend, regenera el paquete VM.
- Esta carpeta esta pensada para despliegue Node/VM, no para IIS estatico. Para IIS usa iis-package.
"@ | Set-Content -Path $targetReadmeFile

Push-Location $targetDir
try {
  npm install --package-lock-only --ignore-scripts

  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}
finally {
  Pop-Location
}