import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('skill-local runner passes', async () => {
  const runnerPath = path.resolve('skills/beadboard-driver/tests/run-tests.mjs');
  const { stdout, stderr } = await execFileAsync(process.execPath, [runnerPath], {
    env: process.env,
  });
  assert.doesNotMatch(`${stdout}\n${stderr}`, /not ok/i);
});
