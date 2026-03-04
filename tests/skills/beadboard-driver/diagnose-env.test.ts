import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = path.resolve('skills/beadboard-driver/scripts/diagnose-env.mjs');

test('diagnose-env returns stable schema', async () => {
  const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
    env: { ...process.env, PATH: '' },
  });

  const result = JSON.parse(stdout);
  assert.equal(typeof result.ok, 'boolean');
  assert.equal(typeof result.timestamp, 'string');
  assert.equal(Array.isArray(result.findings), true);
  assert.equal(Array.isArray(result.recommendations), true);
  assert.equal(typeof result.environment?.cwd, 'string');
});
