import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('installer migrates legacy repo-bound shim to runtime-managed shim', async () => {
  if (process.platform === 'win32') {
    return;
  }

  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-install-migrate-'));
  const installHome = path.join(root, 'home').replace(/\\/g, '/');

  try {
    const shimDir = path.join(installHome, '.beadboard', 'bin');
    await fs.mkdir(shimDir, { recursive: true });
    await fs.writeFile(
      path.join(shimDir, 'beadboard'),
      '#!/usr/bin/env bash\nexec node "/legacy/repo/install/beadboard.mjs" "$@"\n',
      'utf8',
    );

    await execFileAsync('bash', ['install/install.sh'], {
      env: { ...process.env, BB_INSTALL_HOME: installHome },
    });

    const shimRaw = await fs.readFile(path.join(shimDir, 'beadboard'), 'utf8');
    const metadataRaw = await fs.readFile(
      path.join(installHome, '.beadboard', 'runtime', 'current.json'),
      'utf8',
    );

    assert.doesNotMatch(shimRaw, /\/legacy\/repo\/install\/beadboard\.mjs/);
    assert.match(shimRaw, /runtime\/current\.json/);
    assert.match(shimRaw, /RUNTIME_ROOT/);
    assert.match(metadataRaw, /"runtimeRoot"/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
