import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import { constants as fsConstants } from 'node:fs';

const execFileAsync = promisify(execFile);

async function withTempDir<T>(fn: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bb-session-preflight-'));
  try {
    return await fn(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function createRepoEntrypoint(repo: string): Promise<void> {
  await fs.mkdir(repo, { recursive: true });
  const entrypointPath = path.join(repo, 'bb.ps1');
  const entrypointContent = '# BeadBoard repository entry point\nWrite-Host "BeadBoard repo entrypoint loaded"\nexit 0\n';
  await fs.writeFile(entrypointPath, entrypointContent, 'utf8');
}

async function runPreflight(env: Record<string, string> = {}) {
  const sessionPreflightPath = path.resolve('skills/beadboard-driver/scripts/session-preflight.mjs');
  const { stdout } = await execFileAsync(process.execPath, [sessionPreflightPath], {
    env: {
      ...process.env,
      ...env,
    },
  });
  return JSON.parse(stdout);
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
      // Create a more complete fake bd on Windows that supports subcommands
      const batchContent = `@echo off
set arg1=%1
if "%arg1%"=="query" (
  echo Found 0 issues:
) else if "%arg1%"=="config" (
  echo OK
) else (
  echo beads
)
`;
      await fs.writeFile(bdCmd, batchContent, 'utf8');
    } else {
      // Create a more complete fake bd on Unix that supports subcommands
      const bashScript = `#!/usr/bin/env sh
case "$1" in
  query)
    echo "Found 0 issues:"
    ;;
  config)
    echo "OK"
    ;;
  *)
    echo "beads"
    ;;
esac
`;
      await fs.writeFile(bdCmd, bashScript, 'utf8');
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
    // Mail configuration may or may not succeed depending on fake bd implementation
    // We're mainly testing that session-preflight completes successfully
  });
});
