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

test('generate-agent-name returns adjective-noun format', async () => {
  const result = await runName({
    BB_NAME_ADJECTIVES: 'green',
    BB_NAME_NOUNS: 'castle',
    BB_NAME_MAX_RETRIES: '1',
  });

  assert.equal(result.ok, true);
  assert.equal(result.agent_name, 'green-castle');
  assert.match(result.agent_name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

test('generate-agent-name retries on collisions', async () => {
  await withTempDir(async (root) => {
    const registryDir = path.join(root, 'agents');
    await fs.mkdir(registryDir, { recursive: true });
    await fs.writeFile(path.join(registryDir, 'green-castle.json'), '{}', 'utf8');

    const result = await runName({
      BB_AGENT_REGISTRY_DIR: registryDir,
      BB_NAME_ADJECTIVES: 'green,blue',
      BB_NAME_NOUNS: 'castle',
      BB_NAME_MAX_RETRIES: '3',
      BB_NAME_SEED_SEQUENCE: '0,0,0.9,0',
    });

    assert.equal(result.ok, true);
    assert.equal(result.agent_name, 'blue-castle');
    assert.equal(result.collisions, 2);
    assert.equal(result.attempts, 3);
  });
});

test('generate-agent-name fails after retry exhaustion', async () => {
  await withTempDir(async (root) => {
    const registryDir = path.join(root, 'agents');
    await fs.mkdir(registryDir, { recursive: true });
    await fs.writeFile(path.join(registryDir, 'green-castle.json'), '{}', 'utf8');

    const result = await runName({
      BB_AGENT_REGISTRY_DIR: registryDir,
      BB_NAME_ADJECTIVES: 'green',
      BB_NAME_NOUNS: 'castle',
      BB_NAME_MAX_RETRIES: '2',
      BB_NAME_SEED_SEQUENCE: '0,0,0,0',
    });

    assert.equal(result.ok, false);
    assert.equal(result.error_code, 'NAME_GENERATION_EXHAUSTED');
    assert.equal(result.attempts, 2);
  });
});
