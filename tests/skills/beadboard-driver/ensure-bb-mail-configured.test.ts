import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = path.resolve('skills/beadboard-driver/scripts/ensure-bb-mail-configured.mjs');

async function withTempDir(run: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-skill-mailcfg-ts-'));
  try {
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('ensure-bb-mail-configured reports missing delegate outside initialized repo', async () => {
  await withTempDir(async (root) => {
    const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
      cwd: root,
      env: {
        ...process.env,
        BB_AGENT: 'test-agent',
      },
    });

    const result = JSON.parse(stdout);
    assert.equal(result.ok, false);
    assert.equal(result.error_code, 'MAIL_DELEGATE_MISSING');
  });
});
