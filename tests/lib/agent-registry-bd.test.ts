import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  extendActivityLease,
  listAgents,
  registerAgent,
  showAgent,
  setAgentState,
} from '../../src/lib/agent-registry';

const BD_BIN = '/Users/jordanhindo/.local/bin/bd';
const TEST_ENV = {
  ...process.env,
  PATH: `${path.dirname(process.execPath)}:${process.env.PATH || ''}`,
  DOLT_EXECUTABLE: '/opt/homebrew/bin/dolt',
};

async function withTempProject(run: (projectRoot: string) => Promise<void>): Promise<void> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-agent-bd-test-'));
  const databaseName = `bb_test_${path.basename(tempDir).replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;
  
  // Initialize bd rig
  execFileSync(BD_BIN, ['init', '--prefix', 'bb', '--database', databaseName, '--force'], {
    cwd: tempDir,
    stdio: 'ignore',
    env: TEST_ENV,
  });

  try {
    await run(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test('BD REGISTRY: registerAgent creates a bd agent bead', async () => {
  await withTempProject(async (projectRoot) => {
    const result = await registerAgent(
      {
        name: 'test-agent',
        display: 'Test Agent Display',
        role: 'infra',
      },
      { projectRoot }
    );

    assert.equal(result.ok, true, `Register failed: ${result.error?.message}`);
    assert.equal(result.data?.agent_id, 'test-agent');
    assert.equal(result.data?.display_name, 'Test Agent Display');
    assert.equal(result.data?.role, 'infra');
    assert.equal(result.data?.status, 'idle');

    // Verify via direct bd call
    const showRaw = execFileSync(BD_BIN, ['agent', 'show', 'bb-test-agent', '--json'], { cwd: projectRoot, encoding: 'utf8', env: TEST_ENV });
    const show = JSON.parse(showRaw);
    assert.equal(show.id, 'bb-test-agent');
    assert.equal(show.title, 'Agent: Test Agent Display');
  });
});

test('BD REGISTRY: showAgent returns agent data', async () => {
  await withTempProject(async (projectRoot) => {
    await registerAgent({ name: 'show-agent', role: 'ui' }, { projectRoot });

    // Note: showAgent doesn't take projectRoot currently, it uses process.cwd()
    const originalCwd = process.cwd();
    process.chdir(projectRoot);
    try {
      const result = await showAgent({ agent: 'show-agent' });
      assert.equal(result.ok, true);
      assert.equal(result.data?.agent_id, 'show-agent');
    } finally {
      process.chdir(originalCwd);
    }
  });
});

test('BD REGISTRY: listAgents returns all agents', async () => {
  await withTempProject(async (projectRoot) => {
    await registerAgent({ name: 'agent-a', role: 'ui' }, { projectRoot });
    await registerAgent({ name: 'agent-b', role: 'backend' }, { projectRoot });

    const originalCwd = process.cwd();
    process.chdir(projectRoot);
    try {
      const result = await listAgents({});
      assert.equal(result.ok, true);
      assert.equal(result.data?.length, 2);
      assert.equal(result.data?.[0].agent_id, 'agent-a');
      assert.equal(result.data?.[1].agent_id, 'agent-b');
    } finally {
      process.chdir(originalCwd);
    }
  });
});

test('BD REGISTRY: extendActivityLease emits wisp and preserves issue state', async () => {
  await withTempProject(async (projectRoot) => {
    const agentId = 'telemetry-agent';
    await registerAgent({ name: agentId, role: 'infra' }, { projectRoot });
    
    const issuesPath = path.join(projectRoot, '.beads', 'issues.jsonl');
    const beforeState = await fs.readFile(issuesPath, 'utf8');

    const result = await extendActivityLease({ agent: agentId }, { projectRoot });
    if (!result.ok) console.error('Extend Lease Failed:', result.error);
    assert.equal(result.ok, true);

    const afterState = await fs.readFile(issuesPath, 'utf8');
    assert.equal(beforeState, afterState, 'Durable issues.jsonl should NOT change during lease extension');

    // Verify wisp exists via direct bd list
    const listRaw = execFileSync(BD_BIN, ['list', '--wisp-type', 'heartbeat', '--json'], { cwd: projectRoot, encoding: 'utf8', env: TEST_ENV });
    const wisps = JSON.parse(listRaw);
    assert.ok(wisps.length > 0, 'Heartbeat wisp should be present in the stream');
    assert.ok(wisps[0].title.startsWith('pulse:'), 'Wisp title should match pulse prefix');
  });
});

test('BD REGISTRY: setAgentState updates ZFC state', async () => {
  await withTempProject(async (projectRoot) => {
    const agentId = 'state-agent';
    await registerAgent({ name: agentId, role: 'infra' }, { projectRoot });

    // Transition to working
    const result = await setAgentState({ agent: agentId, state: 'working' }, { projectRoot });
    assert.equal(result.ok, true);
    assert.equal(result.data?.status, 'working');

    // Transition to stuck
    const failResult = await setAgentState({ agent: agentId, state: 'stuck' }, { projectRoot });
    assert.equal(failResult.ok, true);
    assert.equal(failResult.data?.status, 'stuck');
  });
});
