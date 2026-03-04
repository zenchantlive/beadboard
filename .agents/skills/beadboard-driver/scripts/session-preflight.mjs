#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { findCommandInPath, resolveBbPath } from './lib/driver-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Configures bd mail delegate to use bb-mail-shim.mjs.
 * Runs `bd config set mail.delegate "node <shim-path>"` in the current directory.
 *
 * @param {string} bdPath - Resolved path to the bd binary.
 * @param {string} shimPath - Absolute path to bb-mail-shim.mjs.
 * @returns {object} Mail delegate config result.
 */
function configureMailDelegate(bdPath, shimPath) {
  if (!existsSync(shimPath)) {
    return {
      configured: false,
      reason: `shim not found at ${shimPath} — skill installation may be incomplete`,
    };
  }

  const delegateCmd = `node ${shimPath}`;
  const result = spawnSync(bdPath, ['config', 'set', 'mail.delegate', delegateCmd], {
    stdio: 'pipe',
    shell: false,
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.toString().trim() || '';
    return {
      configured: false,
      reason: `bd config set failed: ${stderr || 'non-zero exit'}`,
      delegate: delegateCmd,
    };
  }

  return {
    configured: true,
    delegate: delegateCmd,
    shim_path: shimPath,
    note: 'Set BB_AGENT env var to your agent name before calling bd mail (e.g., export BB_AGENT=silver-scribe)',
  };
}

async function main() {
  const shimPath = join(__dirname, 'bb-mail-shim.mjs');

  try {
    const bdPath = await findCommandInPath('bd');
    if (!bdPath) {
      process.stdout.write(
        `${JSON.stringify(
          {
            ok: false,
            error_code: 'BD_NOT_FOUND',
            reason: 'Could not find bd in PATH.',
            remediation: 'Install beads CLI or add bd executable to PATH.',
            tools: {
              bd: { available: false, path: null },
            },
            bb: null,
            mail: null,
          },
          null,
          2,
        )}\n`,
      );
      return;
    }

    const bb = await resolveBbPath();
    if (!bb.ok) {
      process.stdout.write(
        `${JSON.stringify(
          {
            ok: false,
            error_code: 'BB_NOT_FOUND',
            reason: bb.reason,
            remediation: bb.remediation,
            tools: {
              bd: { available: true, path: bdPath },
            },
            bb,
            mail: {
              configured: false,
              reason: 'bb not available — mail delegate requires bb agent commands (see izs.2)',
            },
          },
          null,
          2,
        )}\n`,
      );
      return;
    }

    const mail = configureMailDelegate(bdPath, shimPath);

    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          tools: {
            bd: { available: true, path: bdPath },
          },
          bb,
          mail,
        },
        null,
        2,
      )}\n`,
    );
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          error_code: 'PREFLIGHT_INTERNAL_ERROR',
          reason: error instanceof Error ? error.message : String(error),
          remediation: 'Inspect session-preflight.mjs and retry.',
          tools: {
            bd: { available: false, path: null },
          },
          bb: null,
          mail: null,
        },
        null,
        2,
      )}\n`,
    );
  }
}

void main();
