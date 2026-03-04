import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, '..', 'scripts', 'readiness-report.mjs');

test('readiness-report contract: returns ready true for passing checks and present artifacts', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-skill-readiness-'));
  try {
    const artifact = path.join(root, 'artifact.txt');
    await fs.writeFile(artifact, 'ok', 'utf8');

    const checks = JSON.stringify([
      { name: 'typecheck', ok: true, details: 'pass' },
      { name: 'lint', ok: true, details: 'pass' },
    ]);
    const artifacts = JSON.stringify([{ path: artifact, required: true }]);

    const { stdout } = await execFileAsync(process.execPath, [scriptPath, '--checks', checks, '--artifacts', artifacts]);
    const result = JSON.parse(stdout);

    assert.equal(result.ok, true);
    assert.equal(result.summary.ready, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
