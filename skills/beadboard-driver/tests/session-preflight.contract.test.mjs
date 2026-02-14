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
    await fs.mkdir(path.join(repo, 'tools'), { recursive: true });
    await fs.mkdir(toolsDir, { recursive: true });
    await fs.writeFile(path.join(repo, 'bb.ps1'), 'echo ok', 'utf8');
    await fs.writeFile(path.join(toolsDir, 'bd.cmd'), '@echo off\r\necho beads\r\n', 'utf8');

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
