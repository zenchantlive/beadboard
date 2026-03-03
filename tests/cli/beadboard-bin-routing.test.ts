import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const binPath = path.resolve('bin/beadboard.js');

test('bin routes status --json to launcher runtime command', async () => {
  try {
    const { stdout } = await execFileAsync(process.execPath, [binPath, 'status', '--json']);
    const payload = JSON.parse(stdout);
    assert.equal(payload.command, 'status');
  } catch (error) {
    const stdout = (error as { stdout?: string }).stdout || '';
    const payload = stdout ? JSON.parse(stdout) : null;
    assert.equal(payload?.command, 'status');
  }
});
