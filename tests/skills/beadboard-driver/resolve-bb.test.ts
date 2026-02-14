import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = path.resolve('skills/beadboard-driver/scripts/resolve-bb.mjs');

async function runResolve(env: Record<string, string | undefined> = {}) {
  const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
    env: { ...process.env, ...env },
  });
  return JSON.parse(stdout);
}

async function withTempDir(run: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-skill-resolve-'));
  try {
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('resolve-bb uses BB_REPO and returns env source', async () => {
  await withTempDir(async (root) => {
    const repo = path.join(root, 'beadboard');
    await fs.mkdir(path.join(repo, 'tools'), { recursive: true });
    await fs.writeFile(path.join(repo, 'bb.ps1'), 'echo ok', 'utf8');

    const result = await runResolve({
      BB_REPO: repo,
      BB_SKILL_HOME: path.join(root, 'home'),
      PATH: '',
    });

    assert.equal(result.ok, true);
    assert.equal(result.source, 'env');
    assert.equal(result.resolved_path, path.join(repo, 'bb.ps1'));
  });
});

test('resolve-bb fails with remediation when BB_REPO is invalid', async () => {
  await withTempDir(async (root) => {
    const result = await runResolve({
      BB_REPO: path.join(root, 'missing'),
      BB_SKILL_HOME: path.join(root, 'home'),
      PATH: '',
    });

    assert.equal(result.ok, false);
    assert.equal(result.source, 'env');
    assert.match(result.reason, /BB_REPO/i);
    assert.match(result.remediation, /Set BB_REPO/i);
  });
});

test('resolve-bb uses cache when env and global are unavailable', async () => {
  await withTempDir(async (root) => {
    const repo = path.join(root, 'beadboard');
    const home = path.join(root, 'home');
    await fs.mkdir(path.join(repo, 'tools'), { recursive: true });
    await fs.writeFile(path.join(repo, 'bb.ps1'), 'echo ok', 'utf8');
    await fs.mkdir(path.join(home, '.beadboard'), { recursive: true });
    await fs.writeFile(
      path.join(home, '.beadboard', 'skill-config.json'),
      JSON.stringify({ bb_path: path.join(repo, 'bb.ps1') }, null, 2),
      'utf8',
    );

    const result = await runResolve({
      BB_SKILL_HOME: home,
      PATH: '',
    });

    assert.equal(result.ok, true);
    assert.equal(result.source, 'cache');
  });
});

test('resolve-bb discovers repo and self-updates cache', async () => {
  await withTempDir(async (root) => {
    const repo = path.join(root, 'workspace', 'beadboard');
    const home = path.join(root, 'home');
    await fs.mkdir(path.join(repo, 'tools'), { recursive: true });
    await fs.writeFile(path.join(repo, 'bb.ps1'), 'echo ok', 'utf8');

    const result = await runResolve({
      BB_SKILL_HOME: home,
      BB_SEARCH_ROOTS: path.join(root, 'workspace'),
      PATH: '',
    });

    assert.equal(result.ok, true);
    assert.equal(result.source, 'discovery');

    const cacheRaw = await fs.readFile(path.join(home, '.beadboard', 'skill-config.json'), 'utf8');
    const cache = JSON.parse(cacheRaw);
    assert.equal(cache.bb_path, path.join(repo, 'bb.ps1'));
  });
});

test('resolve-bb uses BB_REPO over cache and rewrites stale cache', async () => {
  await withTempDir(async (root) => {
    const repoA = path.join(root, 'repo-a');
    const repoB = path.join(root, 'repo-b');
    const home = path.join(root, 'home');

    await fs.mkdir(path.join(repoA, 'tools'), { recursive: true });
    await fs.mkdir(path.join(repoB, 'tools'), { recursive: true });
    await fs.writeFile(path.join(repoA, 'bb.ps1'), 'echo a', 'utf8');
    await fs.writeFile(path.join(repoB, 'bb.ps1'), 'echo b', 'utf8');
    await fs.mkdir(path.join(home, '.beadboard'), { recursive: true });
    await fs.writeFile(
      path.join(home, '.beadboard', 'skill-config.json'),
      JSON.stringify({ bb_path: path.join(repoA, 'bb.ps1') }, null, 2),
      'utf8',
    );

    const result = await runResolve({
      BB_REPO: repoB,
      BB_SKILL_HOME: home,
      PATH: '',
    });

    assert.equal(result.ok, true);
    assert.equal(result.source, 'env');
    assert.match(result.reason, /cache mismatch/i);

    const cacheRaw = await fs.readFile(path.join(home, '.beadboard', 'skill-config.json'), 'utf8');
    const cache = JSON.parse(cacheRaw);
    assert.equal(cache.bb_path, path.join(repoB, 'bb.ps1'));
  });
});
