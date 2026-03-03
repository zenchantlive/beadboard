$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$InstallHome = if ($env:BB_INSTALL_HOME) { $env:BB_INSTALL_HOME } else { $HOME }
$BbHome = Join-Path $InstallHome '.beadboard'
$TargetDir = Join-Path $BbHome 'bin'
$RuntimeDir = Join-Path $BbHome 'runtime'
$CurrentJson = Join-Path $RuntimeDir 'current.json'
$Version = if ($env:BB_RUNTIME_VERSION) { $env:BB_RUNTIME_VERSION } else { '0.1.0' }

New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null

$BeadboardShim = Join-Path $TargetDir 'beadboard.cmd'
$BbShim = Join-Path $TargetDir 'bb.cmd'

$runtimeMetadata = @{
  version = $Version
  runtimeRoot = $RepoRoot
  installMode = 'repo-shim-fallback'
  shimTarget = (Join-Path $RepoRoot 'install\beadboard.mjs')
} | ConvertTo-Json -Depth 4

[System.IO.File]::WriteAllText($CurrentJson, "$runtimeMetadata`n")

$beadboardContent = @"
@echo off
setlocal
set "BB_HOME=%BB_INSTALL_HOME%"
if "%BB_HOME%"=="" set "BB_HOME=%USERPROFILE%"
set "CURRENT_JSON=%BB_HOME%\.beadboard\runtime\current.json"
set "RUNTIME_ROOT="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$p='%CURRENT_JSON%'; if (Test-Path $p) { try { (Get-Content -Raw $p | ConvertFrom-Json).runtimeRoot } catch {} }"`) do set "RUNTIME_ROOT=%%I"
if "%RUNTIME_ROOT%"=="" set "RUNTIME_ROOT=$RepoRoot"
node "%RUNTIME_ROOT%\install\beadboard.mjs" %*
"@

$bbContent = @"
@echo off
setlocal
set "BB_HOME=%BB_INSTALL_HOME%"
if "%BB_HOME%"=="" set "BB_HOME=%USERPROFILE%"
set "CURRENT_JSON=%BB_HOME%\.beadboard\runtime\current.json"
set "RUNTIME_ROOT="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$p='%CURRENT_JSON%'; if (Test-Path $p) { try { (Get-Content -Raw $p | ConvertFrom-Json).runtimeRoot } catch {} }"`) do set "RUNTIME_ROOT=%%I"
if "%RUNTIME_ROOT%"=="" set "RUNTIME_ROOT=$RepoRoot"
npx --yes tsx "%RUNTIME_ROOT%\tools\bb.ts" %*
"@

$beadboardTemp = "$BeadboardShim.tmp"
$bbTemp = "$BbShim.tmp"
[System.IO.File]::WriteAllText($beadboardTemp, $beadboardContent)
[System.IO.File]::WriteAllText($bbTemp, $bbContent)
Move-Item -Path $beadboardTemp -Destination $BeadboardShim -Force
Move-Item -Path $bbTemp -Destination $BbShim -Force

Write-Output "Installed BeadBoard shims:"
Write-Output "- $BeadboardShim"
Write-Output "- $BbShim"
Write-Output "- $CurrentJson"
Write-Output ""
Write-Output "Add to PATH if needed:"
Write-Output "  setx PATH ""$TargetDir;%PATH%"""
