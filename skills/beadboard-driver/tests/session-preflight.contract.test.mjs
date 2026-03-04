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
const scriptPath = path.resolve(__dirname, '..', 'scripts', 'session-preflight.mjs');

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

test('session-preflight contract: surfaces BD_NOT_FOUND when missing', async () => {
  const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
    env: { ...process.env, PATH: '' },
  });
  const result = JSON.parse(stdout);
  assert.equal(result.ok, false);
  assert.equal(result.error_code, 'BD_NOT_FOUND');
});

test('session-preflight contract: succeeds with bd + BB_REPO', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-skill-contract-preflight-'));
  try {
    const repo = path.join(root, 'beadboard');
    const toolsDir = path.join(root, 'tools');
    const bdExecutable = process.platform === 'win32' ? 'bd.cmd' : 'bd';
    const bdPath = path.join(toolsDir, bdExecutable);
    await createRepoEntrypoint(repo);
    await fs.mkdir(toolsDir, { recursive: true });
    if (process.platform === 'win32') {
      await fs.writeFile(bdPath, '@echo off\r\necho beads\r\n', 'utf8');
    } else {
      await fs.writeFile(bdPath, '#!/usr/bin/env sh\necho beads\n', 'utf8');
      await fs.chmod(bdPath, 0o755);
    }

    const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
      env: { ...process.env, PATH: toolsDir, BB_REPO: repo, BB_SKILL_HOME: path.join(root, 'home') },
    });
    const result = JSON.parse(stdout);
    assert.equal(result.ok, true);
    assert.equal(result.bb.ok, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
