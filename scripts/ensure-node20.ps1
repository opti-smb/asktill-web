# Ensures portable Node 20 exists for stable Vite on Windows 11 build 26200 + system Node 24.
$ErrorActionPreference = 'Stop'
$dest = Join-Path $PSScriptRoot '..\.tools' | Resolve-Path -ErrorAction SilentlyContinue
if (-not $dest) {
  $destPath = Join-Path $PSScriptRoot '..\.tools'
  New-Item -ItemType Directory -Force -Path $destPath | Out-Null
  $dest = Resolve-Path $destPath
}
$dir = Join-Path $dest 'node-v20.19.4-win-x64'
$exe = Join-Path $dir 'node.exe'
if (Test-Path $exe) {
  Write-Output "OK $(& $exe -v)"
  exit 0
}
$zip = Join-Path $dest 'node-v20.19.4-win-x64.zip'
Write-Output 'Downloading portable Node v20.19.4...'
Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.19.4/node-v20.19.4-win-x64.zip' -OutFile $zip -UseBasicParsing
Expand-Archive -Path $zip -DestinationPath $dest -Force
if (-not (Test-Path $exe)) { throw 'Node 20 extract failed' }
Write-Output "Installed: $(& $exe -v)"
