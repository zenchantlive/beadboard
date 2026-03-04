import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = path.resolve('skills/beadboard-driver/scripts/heal-common-issues.mjs');

async function withTempDir(run: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-skill-heal-repo-'));
  try {
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('heal-common-issues dry-run preserves git index.lock', async () => {
  await withTempDir(async (root) => {
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
  });
});

test('heal-common-issues apply removes git index.lock when opted in', async () => {
  await withTempDir(async (root) => {
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
  });
});
