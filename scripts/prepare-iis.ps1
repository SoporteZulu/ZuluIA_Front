$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "out"
$targetDir = Join-Path $root "iis-package"
$webConfigFile = Join-Path $targetDir "web.config"
$readmeFile = Join-Path $targetDir "README.txt"

if (!(Test-Path $outDir)) {
  throw "No se encontro la carpeta out. Ejecuta pnpm run build:iis antes de preparar el paquete IIS."
}

if (Test-Path $targetDir) {
  Get-ChildItem -Force -Path $targetDir | ForEach-Object {
    Remove-Item -Recurse -Force $_.FullName
  }
} else {
  New-Item -ItemType Directory -Path $targetDir | Out-Null
}

Copy-Item -Path (Join-Path $outDir "*") -Destination $targetDir -Recurse -Force

@"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <defaultDocument enabled="true">
      <files>
        <clear />
        <add value="index.html" />
      </files>
    </defaultDocument>
  </system.webServer>
</configuration>
"@ | Set-Content -Path $webConfigFile

@"
IIS static package ready.

Target path expected:
- Front_IA as IIS site or IIS application path

What to publish:
- Copy all contents of this folder into the IIS physical path for Front_IA

Required IIS notes:
1. Enable Default Document with index.html
2. Publish this package as the physical directory of Front_IA
3. The frontend is baked to run under /Front_IA
4. This package now avoids optional IIS modules for maximum compatibility

Backend:
- API URL is embedded at build time from .env.production / NEXT_PUBLIC_API_URL

Build command:
- pnpm run build:iis
"@ | Set-Content -Path $readmeFile