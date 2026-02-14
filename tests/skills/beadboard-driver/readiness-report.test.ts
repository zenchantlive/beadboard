import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = path.resolve('skills/beadboard-driver/scripts/readiness-report.mjs');

async function runReport(args: string[]) {
  const { stdout } = await execFileAsync('node', [scriptPath, ...args], {
    env: process.env,
  });
  return JSON.parse(stdout);
}

async function withTempDir(run: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-skill-report-'));
  try {
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('readiness-report outputs stable schema', async () => {
  await withTempDir(async (root) => {
    const artifact = path.join(root, 'artifact.txt');
    await fs.writeFile(artifact, 'ok', 'utf8');

    const checks = JSON.stringify([
      { name: 'typecheck', ok: true, details: 'pass' },
      { name: 'test', ok: true, details: 'pass' },
    ]);
    const artifacts = JSON.stringify([{ path: artifact, required: true }]);

    const result = await runReport(['--checks', checks, '--artifacts', artifacts, '--dependency-note', 'acyclic']);

    assert.equal(result.ok, true);
    assert.equal(result.summary.ready, true);
    assert.equal(result.checks.length, 2);
    assert.equal(result.artifacts[0].exists, true);
    assert.equal(result.dependency_sanity, 'acyclic');
  });
});

test('readiness-report flags missing required artifact', async () => {
  const checks = JSON.stringify([{ name: 'lint', ok: true, details: 'pass' }]);
  const artifacts = JSON.stringify([{ path: 'missing.png', required: true }]);

  const result = await runReport(['--checks', checks, '--artifacts', artifacts]);
  assert.equal(result.ok, true);
  assert.equal(result.summary.ready, false);
  assert.equal(result.artifacts[0].exists, false);
});
