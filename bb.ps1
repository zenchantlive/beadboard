#!/usr/bin/env pwsh

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$bbEntry = Join-Path $scriptDir "tools/bb.ts"

npx tsx $bbEntry @args
