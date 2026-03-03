import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

async function read(relativePath: string): Promise<string> {
  return fs.readFile(path.resolve(relativePath), 'utf8');
}

test('install wrapper scripts exist with canonical filenames', async () => {
  const [ps1, sh] = await Promise.all([
    read('install/install.ps1'),
    read('install/install.sh'),
  ]);
  assert.match(ps1, /beadboard/i);
  assert.match(sh, /beadboard/i);
});

test('install wrappers provision both bb and beadboard shims', async () => {
  const [ps1, sh] = await Promise.all([
    read('install/install.ps1'),
    read('install/install.sh'),
  ]);
  assert.match(ps1, /\bbb\b/i);
  assert.match(ps1, /\bbeadboard\b/i);
  assert.match(sh, /\bbb\b/i);
  assert.match(sh, /\bbeadboard\b/i);
});

test('install wrappers write runtime metadata and resolve runtime targets first', async () => {
  const [ps1, sh] = await Promise.all([
    read('install/install.ps1'),
    read('install/install.sh'),
  ]);
  assert.match(ps1, /runtime\\current\.json/i);
  assert.match(ps1, /RUNTIME_ROOT/i);
  assert.match(sh, /runtime\/current\.json/i);
  assert.match(sh, /RUNTIME_ROOT/i);
});
