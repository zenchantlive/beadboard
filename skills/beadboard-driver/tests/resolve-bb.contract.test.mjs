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
const scriptPath = path.resolve(__dirname, '..', 'scripts', 'resolve-bb.mjs');

async function createRepoEntrypoint(repo) {
  await fs.mkdir(path.join(repo, 'tools'), { recursive: true });
  if (process.platform === 'win32') {
    const bbPath = path.join(repo, 'bb.ps1');
    await fs.writeFile(bbPath, 'echo ok', 'utf8');
    return bbPath;
  }
  const bbPath = path.join(repo, 'bin', 'beadboard.js');
  await fs.mkdir(path.dirname(bbPath), { recursive: true });
  await fs.writeFile(bbPath, '#!/usr/bin/env node\nconsole.log("ok");\n', 'utf8');
  await fs.chmod(bbPath, 0o755);
  return bbPath;
}

test('resolve-bb contract: BB_REPO source', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-skill-contract-resolve-'));
  try {
    const repo = path.join(root, 'beadboard');
    await createRepoEntrypoint(repo);

    const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
      env: { ...process.env, BB_REPO: repo, BB_SKILL_HOME: path.join(root, 'home'), PATH: '' },
    });
    const result = JSON.parse(stdout);

    assert.equal(result.ok, true);
    assert.equal(result.source, 'env');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
