import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const launcherPath = path.resolve('install/beadboard.mjs');

test('status text output includes runtime and bd diagnostics', async () => {
  let stdout = '';
  try {
    ({ stdout } = await execFileAsync(process.execPath, [launcherPath, 'status']));
  } catch (error) {
    stdout = (error as { stdout?: string }).stdout || '';
  }

  assert.match(stdout, /BeadBoard status/i);
  assert.match(stdout, /Running:/i);
  assert.match(stdout, /URL:/i);
  assert.match(stdout, /Port:/i);
  assert.match(stdout, /Install Mode:/i);
  assert.match(stdout, /Runtime Root:/i);
  assert.match(stdout, /Shim Target:/i);
  assert.match(stdout, /bd Available:/i);
  assert.match(stdout, /bd Path:/i);
  assert.match(stdout, /Project CWD:/i);
  assert.match(stdout, /\.beads Dir:/i);
  assert.match(stdout, /SQLite Legacy DB:/i);
  assert.match(stdout, /SQLite Migrated DB:/i);
  assert.match(stdout, /Dolt Repo:/i);
});

test('status text mode exits success even when runtime is down', () => {
  const result = spawnSync(process.execPath, [launcherPath, 'status'], {
    env: { ...process.env, BB_PORT: '65534' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
});
