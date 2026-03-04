#!/usr/bin/env node

import { findCommandInPath, resolveBbPath } from './lib/driver-lib.mjs';

async function main() {
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
          timestamp: new Date().toISOString(),
          tools: {
            bd: { available: true, path: bdPath },
          },
          bb,
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
          remediation: 'Inspect session-preflight.js and retry.',
          tools: {
            bd: { available: false, path: null },
          },
          bb: null,
        },
        null,
        2,
      )}\n`,
    );
  }
}

void main();
