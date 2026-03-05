import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve('skills/beadboard-driver/scripts/setup-mail-delegate.mjs');
const expectedShimPath = path.join(__dirname, '..', 'scripts', 'bb-mail-shim.mjs');

async function withTempDir(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-skill-setupdelegate-'));
  try {
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('setup-mail-delegate contract: dry-run resolves absolute shim path', async () => {
  await withTempDir(async (root) => {
    const { stdout } = await execFileAsync(process.execPath, [scriptPath, '--dry-run'], {
      cwd: root,
      env: { ...process.env },
    });

    const result = JSON.parse(stdout);
    assert.equal(result.ok, true);
    assert.equal(result.dry_run, true);
    assert.ok(
      result.delegate.includes('bb-mail-shim.mjs'),
      `delegate should reference bb-mail-shim.mjs, got: ${result.delegate}`,
    );

    const resolvedPath = result.delegate.replace(/^node\s+/, '');
    assert.ok(
      path.isAbsolute(resolvedPath),
      `delegate path should be absolute, got: ${resolvedPath}`,
    );
    assert.equal(
      resolvedPath,
      expectedShimPath,
      `delegate should point to the bundled shim`,
    );
  });
});

test('setup-mail-delegate contract: BD_NOT_FOUND when bd missing', async () => {
  await withTempDir(async (root) => {
    const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
      cwd: root,
      env: {
        ...process.env,
        PATH: '/nonexistent',
      },
    });

    const result = JSON.parse(stdout);
    assert.equal(result.ok, false);
    assert.equal(result.error_code, 'BD_NOT_FOUND');
  });
});
