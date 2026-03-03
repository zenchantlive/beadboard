#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const cliPath = path.resolve(__dirname, '../src/cli/beadboard-cli.ts');
const launcherPath = path.resolve(__dirname, '../install/beadboard.mjs');
const command = process.argv[2] || 'help';
const launcherCommands = new Set(['start', 'open', 'status']);
const targetArgs = launcherCommands.has(command)
  ? [launcherPath, ...process.argv.slice(2)]
  : ['--import', 'tsx', cliPath, ...process.argv.slice(2)];

const result = spawnSync(process.execPath, targetArgs, {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
