#!/usr/bin/env node

import { resolveBbPath } from './lib/driver-lib.mjs';

async function main() {
  try {
    const resolved = await resolveBbPath();
    process.stdout.write(`${JSON.stringify(resolved, null, 2)}\n`);
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: false,
          source: 'internal',
          resolved_path: null,
          reason: error instanceof Error ? error.message : String(error),
          remediation: 'Inspect resolve-bb.js runtime environment and retry.',
        },
        null,
        2,
      )}\n`,
    );
  }
}

void main();
