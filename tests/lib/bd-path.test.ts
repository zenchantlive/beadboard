import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { BdExecutableNotFoundError, resolveBdExecutable } from '../../src/lib/bd-path';

test('resolveBdExecutable prefers explicit configured path when provided', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-bd-path-'));
  const explicit = path.join(temp, 'tools', 'bd.exe');
  await fs.mkdir(path.dirname(explicit), { recursive: true });
  await fs.writeFile(explicit, '');

  const resolved = await resolveBdExecutable({ explicitPath: explicit, env: { Path: '', NODE_ENV: 'test' } });

  assert.equal(resolved.executable, explicit);
  assert.equal(resolved.source, 'config');
});

test('resolveBdExecutable finds bd.exe on PATH when explicit path is not set', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-bd-path-env-'));
  const candidate = path.join(temp, 'bd.exe');
  await fs.writeFile(candidate, '');

  const resolved = await resolveBdExecutable({ env: { Path: temp, NODE_ENV: 'test' } });

  assert.equal(resolved.executable, candidate);
  assert.equal(resolved.source, 'path');
});

test('resolveBdExecutable throws actionable setup guidance when executable is missing', async () => {
  await assert.rejects(
    () => resolveBdExecutable({ env: { Path: '', NODE_ENV: 'test' } }),
    (error: unknown) => {
      assert.equal(error instanceof BdExecutableNotFoundError, true);
      const message = String((error as Error).message).toLowerCase();
      assert.equal(message.includes('npm install -g @beads/bd'), true);
      assert.equal(message.includes('bd.exe'), true);
      return true;
    },
  );
});
