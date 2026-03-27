import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptPath = path.resolve('skills/beadboard-driver/scripts/generate-agent-name.mjs');

async function runName(env: Record<string, string | undefined> = {}) {
  const { stdout } = await execFileAsync('node', [scriptPath], {
    env: { ...process.env, ...env },
  });
  return JSON.parse(stdout);
}

async function withTempDir(run: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-skill-name-'));
  try {
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('generate-agent-name returns deterministic archetype-scoped runtime instance name', async () => {
  const result = await runName({
    BB_ARCHETYPE_ID: 'Coder',
    BB_INSTANCE_SCOPE: 'task beadboard-kqi.3',
    BB_NAME_MAX_RETRIES: '1',
  });

  assert.equal(result.ok, true);
  assert.equal(result.agent_name, 'coder/task-beadboard-kqi-3');
  assert.equal(result.runtime_instance_name, 'coder/task-beadboard-kqi-3');
  assert.equal(result.archetype_id, 'coder');
});

test('generate-agent-name retries on collisions with ordinal suffix', async () => {
  await withTempDir(async (root) => {
    const registryDir = path.join(root, 'agents');
    await fs.mkdir(registryDir, { recursive: true });
    await fs.writeFile(path.join(registryDir, 'coder__task-kqi-3.json'), '{}', 'utf8');

    const result = await runName({
      BB_AGENT_REGISTRY_DIR: registryDir,
      BB_ARCHETYPE_ID: 'coder',
      BB_INSTANCE_SCOPE: 'task-kqi-3',
      BB_NAME_MAX_RETRIES: '3',
    });

    assert.equal(result.ok, true);
    assert.equal(result.agent_name, 'coder/task-kqi-3#2');
    assert.equal(result.collisions, 1);
    assert.equal(result.attempts, 2);
  });
});

test('generate-agent-name fails after retry exhaustion', async () => {
  await withTempDir(async (root) => {
    const registryDir = path.join(root, 'agents');
    await fs.mkdir(registryDir, { recursive: true });
    await fs.writeFile(path.join(registryDir, 'coder__task-kqi-3.json'), '{}', 'utf8');
    await fs.writeFile(path.join(registryDir, 'coder__task-kqi-3__2.json'), '{}', 'utf8');

    const result = await runName({
      BB_AGENT_REGISTRY_DIR: registryDir,
      BB_ARCHETYPE_ID: 'coder',
      BB_INSTANCE_SCOPE: 'task-kqi-3',
      BB_NAME_MAX_RETRIES: '2',
    });

    assert.equal(result.ok, false);
    assert.equal(result.error_code, 'NAME_GENERATION_EXHAUSTED');
    assert.equal(result.attempts, 2);
  });
});
