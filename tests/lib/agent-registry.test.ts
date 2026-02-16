import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

import {
  listAgents,
  registerAgent,
} from '../../src/lib/agent-registry';

async function withTempProject(run: (projectRoot: string) => Promise<void>): Promise<void> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-agent-legacy-test-'));
  
  // Initialize bd rig
  execSync('bd init --prefix bb --force', { cwd: tempDir, stdio: 'ignore' });

  try {
    await run(tempDir);
  } finally {
    // Windows cleanup retry
    for (let i = 0; i < 5; i++) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        break;
      } catch {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
}

test('registerAgent creates stable metadata file with idle status', async () => {
  await withTempProject(async (projectRoot) => {
    const now = '2026-02-13T23:55:00.000Z';
    const result = await registerAgent(
      {
        name: 'agent-ui-1',
        display: 'UI Agent 1',
        role: 'ui',
      },
      { now: () => now, projectRoot }
    );

    assert.equal(result.ok, true);
    assert.equal(result.data?.agent_id, 'agent-ui-1');
    assert.equal(result.data?.status, 'idle');
  });
});

test('registerAgent rejects duplicate id without --force-update', async () => {
  await withTempProject(async (projectRoot) => {
    await registerAgent({ name: 'agent-ui-1', role: 'ui' }, { projectRoot });

    const duplicate = await registerAgent({ name: 'agent-ui-1', role: 'ui' }, { projectRoot });

    assert.equal(duplicate.ok, false);
    assert.equal(duplicate.error?.code, 'DUPLICATE_AGENT_ID');
  });
});

test('registerAgent force update mutates display/role but keeps created_at', async () => {
  await withTempProject(async (projectRoot) => {
    const t1 = '2026-02-13T23:55:00.000Z';
    const first = await registerAgent(
      { name: 'agent-ui-1', display: 'UI Agent', role: 'ui' },
      { now: () => t1, projectRoot }
    );
    assert.equal(first.ok, true);

    const updated = await registerAgent(
      { name: 'agent-ui-1', display: 'Frontend Agent', role: 'frontend', forceUpdate: true },
      { projectRoot }
    );

    assert.equal(updated.ok, true);
    assert.equal(updated.data?.display_name, 'Frontend Agent');
    assert.equal(updated.data?.role, 'frontend');
  });
});

test('listAgents sorts and filters by role/status', async () => {
  await withTempProject(async (projectRoot) => {
    await registerAgent({ name: 'agent-b', role: 'backend' }, { projectRoot });
    await registerAgent({ name: 'agent-a', role: 'ui' }, { projectRoot });

    const originalCwd = process.cwd();
    process.chdir(projectRoot);
    try {
      const all = await listAgents({});
      assert.equal(all.ok, true);
      assert.deepEqual(
        all.data?.map((agent) => agent.agent_id),
        ['agent-a', 'agent-b'],
      );

      const byRole = await listAgents({ role: 'ui' });
      assert.deepEqual(
        byRole.data?.map((agent) => agent.agent_id),
        ['agent-a'],
      );
    } finally {
      process.chdir(originalCwd);
    }
  });
});
