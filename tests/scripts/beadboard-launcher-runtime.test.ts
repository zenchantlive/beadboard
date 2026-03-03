import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const launcherPath = path.resolve('install/beadboard.mjs');

test('status --json reports runtime root and install mode', async () => {
  const { stdout } = await execFileAsync(process.execPath, [launcherPath, 'status', '--json']);
  const payload = JSON.parse(stdout);
  assert.ok(payload.runtimeRoot);
  assert.ok(payload.installMode);
});
