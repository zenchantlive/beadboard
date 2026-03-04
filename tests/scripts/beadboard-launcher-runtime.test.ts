import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const launcherPath = path.resolve('install/beadboard.mjs');

test('status --json reports runtime root and install mode', async () => {
  let stdout = '';
  try {
    ({ stdout } = await execFileAsync(process.execPath, [launcherPath, 'status', '--json']));
  } catch (error) {
    stdout = (error as { stdout?: string }).stdout || '';
  }
  const payload = JSON.parse(stdout);
  assert.ok(payload.runtimeRoot);
  assert.ok(payload.installMode);
  assert.ok(payload.bd);
  assert.equal(typeof payload.bd.available, 'boolean');
  assert.ok('path' in payload.bd);
  assert.ok(payload.bd.project);
  assert.equal(typeof payload.bd.project.hasBeadsDir, 'boolean');
  assert.ok(payload.bd.backend);
  assert.equal(typeof payload.bd.backend.sqliteLegacyDb, 'boolean');
  assert.equal(typeof payload.bd.backend.sqliteMigratedDb, 'boolean');
  assert.equal(typeof payload.bd.backend.doltRepo, 'boolean');
});
