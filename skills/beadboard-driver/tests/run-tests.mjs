#!/usr/bin/env node

import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tests = [
  path.join(__dirname, 'resolve-bb.contract.test.mjs'),
  path.join(__dirname, 'generate-agent-name.contract.test.mjs'),
  path.join(__dirname, 'session-preflight.contract.test.mjs'),
  path.join(__dirname, 'ensure-bb-mail-configured.contract.test.mjs'),
  path.join(__dirname, 'bb-mail-integration.contract.test.mjs'),
  path.join(__dirname, 'readiness-report.contract.test.mjs'),
  path.join(__dirname, 'diagnose-env.contract.test.mjs'),
  path.join(__dirname, 'heal-common-issues.contract.test.mjs'),
  path.join(__dirname, 'ensure-project-context.contract.test.mjs'),
];

const child = spawn(process.execPath, ['--test', ...tests], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
