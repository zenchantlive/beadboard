#!/usr/bin/env node

/**
 * setup-mail-delegate.mjs
 *
 * Configures bd's mail.delegate to point at the bb-mail-shim.mjs bundled
 * alongside this script. Uses import.meta.url to resolve the absolute path
 * so the caller never needs to know where the skill is installed.
 *
 * Usage: node {baseDir}/scripts/setup-mail-delegate.mjs
 * Output: JSON { ok, configured, delegate } or { ok, error_code, reason }
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { findCommandInPath } from './lib/driver-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const shimPath = join(__dirname, 'bb-mail-shim.mjs');
const delegateCommand = `node ${shimPath}`;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const bdPath = await findCommandInPath('bd');

  if (!bdPath) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          error_code: 'BD_NOT_FOUND',
          reason: 'Could not find bd in PATH. Install with: npm install -g beads-cli',
          delegate: null,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  if (dryRun) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          dry_run: true,
          configured: false,
          delegate: delegateCommand,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  const result = spawnSync(bdPath, ['config', 'set', 'mail.delegate', delegateCommand], {
    stdio: 'pipe',
    shell: false,
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.toString().trim() || '';
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          error_code: 'BD_CONFIG_FAILED',
          reason: stderr || 'bd config set mail.delegate exited non-zero.',
          delegate: delegateCommand,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        configured: true,
        delegate: delegateCommand,
      },
      null,
      2,
    )}\n`,
  );
}

void main();
