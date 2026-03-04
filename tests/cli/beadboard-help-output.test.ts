import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const binPath = path.resolve('bin/beadboard.js');

test('bb --help prints human-readable usage by default', async () => {
  const { stdout } = await execFileAsync(process.execPath, [binPath, '--help']);
  assert.match(stdout, /Usage:/i);
  assert.match(stdout, /Runtime Commands:/i);
  assert.match(stdout, /Management Commands:/i);
  assert.doesNotMatch(stdout, /^\s*\{/);
});

test('bb --help --json returns structured payload', async () => {
  const { stdout } = await execFileAsync(process.execPath, [binPath, '--help', '--json']);
  const payload = JSON.parse(stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.command, 'help');
});
