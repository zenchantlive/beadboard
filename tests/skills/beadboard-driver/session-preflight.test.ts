import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = path.resolve('skills/beadboard-driver/scripts/session-preflight.mjs');

async function createRepoEntrypoint(repo: string): Promise<string> {
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

async function runPreflight(env: Record<string, string | undefined> = {}) {
  const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
    env: { ...process.env, ...env },
  });
  return JSON.parse(stdout);
}

async function withTempDir(run: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-skill-preflight-'));
  try {
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('session-preflight fails when bd is unavailable', async () => {
  const result = await runPreflight({
    PATH: '',
  });

  assert.equal(result.ok, false);
  assert.equal(result.error_code, 'BD_NOT_FOUND');
  assert.match(result.remediation, /npm i -g beadboard/i);
  if (process.platform === 'win32') {
    assert.match(result.remediation, /install\.ps1/i);
  } else {
    assert.match(result.remediation, /install\.sh/i);
  }
});

test('session-preflight succeeds with fake bd and BB_REPO', async () => {
  await withTempDir(async (root) => {
    const repo = path.join(root, 'beadboard');
    const toolsDir = path.join(root, 'tools');
    const bdExecutable = process.platform === 'win32' ? 'bd.cmd' : 'bd';
    const bdCmd = path.join(toolsDir, bdExecutable);

    await createRepoEntrypoint(repo);
    await fs.mkdir(toolsDir, { recursive: true });
    if (process.platform === 'win32') {
      await fs.writeFile(bdCmd, '@echo off\r\necho beads\r\n', 'utf8');
    } else {
      await fs.writeFile(bdCmd, '#!/usr/bin/env sh\necho beads\n', 'utf8');
      await fs.chmod(bdCmd, 0o755);
    }

    const result = await runPreflight({
      PATH: `${toolsDir}${path.delimiter}${process.env.PATH || ''}`,
      BB_REPO: repo,
      BB_SKILL_HOME: path.join(root, 'home'),
      BB_SKIP_PROBE: '1',
    });

    assert.equal(result.ok, true);
    assert.equal(result.bb.ok, true);
    assert.equal(result.bb.source, 'env');
    assert.equal(result.tools.bd.available, true);
    assert.equal(result.mail.configured, true, JSON.stringify(result));
    assert.match(String(result.mail.delegate), /node .*bb-mail-shim\.mjs/);
  });
});
