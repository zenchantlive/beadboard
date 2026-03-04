import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, '..', 'scripts', 'diagnose-env.mjs');

test('diagnose-env contract: returns stable schema', async () => {
  const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
    env: { ...process.env, PATH: '' },
  });
  const result = JSON.parse(stdout);

  assert.equal(typeof result.ok, 'boolean');
  assert.equal(typeof result.timestamp, 'string');
  assert.equal(result.environment !== null, true);
  assert.equal(Array.isArray(result.findings), true);
  assert.equal(Array.isArray(result.recommendations), true);
});
