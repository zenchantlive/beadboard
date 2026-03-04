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
const scriptPath = path.resolve(__dirname, '..', 'scripts', 'heal-common-issues.mjs');

test('heal-common-issues contract: dry-run does not mutate git index.lock', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-skill-heal-'));
  try {
    const lockDir = path.join(root, '.git');
    const lockPath = path.join(lockDir, 'index.lock');
    await fs.mkdir(lockDir, { recursive: true });
    await fs.writeFile(lockPath, 'locked', 'utf8');

    const { stdout } = await execFileAsync(process.execPath, [scriptPath, '--project-root', root], {
      env: process.env,
    });
    const result = JSON.parse(stdout);

    const lockStillExists = await fs
      .access(lockPath)
      .then(() => true)
      .catch(() => false);

    assert.equal(result.ok, true);
    assert.equal(result.mode, 'dry-run');
    assert.equal(lockStillExists, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('heal-common-issues contract: apply removes stale git index.lock when opted in', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-skill-heal-'));
  try {
    const lockDir = path.join(root, '.git');
    const lockPath = path.join(lockDir, 'index.lock');
    await fs.mkdir(lockDir, { recursive: true });
    await fs.writeFile(lockPath, 'locked', 'utf8');

    const { stdout } = await execFileAsync(
      process.execPath,
      [scriptPath, '--project-root', root, '--apply', '--fix-git-index-lock'],
      {
        env: process.env,
      },
    );
    const result = JSON.parse(stdout);

    const lockStillExists = await fs
      .access(lockPath)
      .then(() => true)
      .catch(() => false);

    assert.equal(result.ok, true);
    assert.equal(result.mode, 'apply');
    assert.equal(lockStillExists, false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
