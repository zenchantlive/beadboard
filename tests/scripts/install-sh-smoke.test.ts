import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = 'install/install.sh';

test('install.sh supports install and reinstall into BB_INSTALL_HOME', { skip: os.platform() === 'win32' ? 'Bash pathing issues on Windows' : false }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-install-smoke-'));
  const installHome = path.join(root, 'home').replace(/\\/g, '/');

  try {
    await execFileAsync('bash', [scriptPath], {
      env: { ...process.env, BB_INSTALL_HOME: installHome },
    });
    await execFileAsync('bash', [scriptPath], {
      env: { ...process.env, BB_INSTALL_HOME: installHome },
    });

    const beadboardShim = path.join(installHome, '.beadboard', 'bin', 'beadboard');
    const bbShim = path.join(installHome, '.beadboard', 'bin', 'bb');
    const runtimeMetadata = path.join(installHome, '.beadboard', 'runtime', 'current.json');

    const [beadboardRaw, bbRaw, metadataRaw] = await Promise.all([
      fs.readFile(beadboardShim, 'utf8'),
      fs.readFile(bbShim, 'utf8'),
      fs.readFile(runtimeMetadata, 'utf8'),
    ]);

    assert.match(beadboardRaw, /runtime\/current\.json/);
    assert.match(bbRaw, /runtime\/current\.json/);
    assert.match(metadataRaw, /"runtimeRoot"/);
    assert.match(metadataRaw, /"installMode"/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
