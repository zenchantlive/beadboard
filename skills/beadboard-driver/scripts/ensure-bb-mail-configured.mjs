#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { findCommandInPath } from './lib/driver-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readMailDelegate(bdPath) {
  const result = spawnSync(bdPath, ['config', 'get', 'mail.delegate'], {
    stdio: 'pipe',
    shell: false,
  });

  const stdout = result.stdout?.toString().trim() || '';
  const stderr = result.stderr?.toString().trim() || '';

  return {
    ok: result.status === 0,
    delegate: stdout,
    stderr,
  };
}

async function main() {
  const bdPath = await findCommandInPath('bd');
  const shimPath = join(__dirname, 'bb-mail-shim.mjs');
  const expected = `node ${shimPath}`;

  if (!bdPath) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          error_code: 'BD_NOT_FOUND',
          reason: 'Could not find bd in PATH.',
          remediation:
            process.platform === 'win32'
              ? 'Primary: npm i -g beadboard. Fallback: powershell -ExecutionPolicy Bypass -File .\\install\\install.ps1. Then ensure bd is available in PATH.'
              : 'Primary: npm i -g beadboard. Fallback: bash ./install/install.sh. Then ensure bd is available in PATH.',
          expected_delegate: expected,
          delegate: null,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  const delegate = readMailDelegate(bdPath);

  if (!delegate.ok || !delegate.delegate) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          error_code: 'MAIL_DELEGATE_MISSING',
          reason: delegate.stderr || 'mail.delegate is not configured.',
          remediation: `Run: bd config set mail.delegate "${expected}"`,
          expected_delegate: expected,
          delegate: delegate.delegate || null,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  if (delegate.delegate !== expected) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          error_code: 'MAIL_DELEGATE_MISMATCH',
          reason: 'mail.delegate is set, but not to the BeadBoard bb-mail shim command.',
          remediation: `Run: bd config set mail.delegate "${expected}"`,
          expected_delegate: expected,
          delegate: delegate.delegate,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  const actor = (process.env.BB_AGENT || process.env.BD_ACTOR || '').trim();
  if (!actor) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          error_code: 'BB_AGENT_NOT_SET',
          reason: 'mail.delegate is configured, but BB_AGENT/BD_ACTOR is missing.',
          remediation: 'Set BB_AGENT (preferred) or BD_ACTOR before using bd mail.',
          expected_delegate: expected,
          delegate: delegate.delegate,
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
        expected_delegate: expected,
        delegate: delegate.delegate,
        actor,
      },
      null,
      2,
    )}\n`,
  );
}

void main();
