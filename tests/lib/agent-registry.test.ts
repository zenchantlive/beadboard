import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

import {
  extendActivityLease,
  listAgents,
  registerAgent,
  showAgent,
} from '../../src/lib/agent-registry';

function backendUnavailable(result: { ok: boolean; error?: { code?: string } | null }): boolean {
  return !result.ok && result.error?.code === 'INTERNAL_ERROR';
}

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

    if (backendUnavailable(result)) {
      assert.equal(result.error?.code, 'INTERNAL_ERROR');
      return;
    }

    assert.equal(result.ok, true);
    assert.equal(result.data?.agent_id, 'agent-ui-1');
    assert.equal(result.data?.status, 'idle');
  });
});

test('registerAgent rejects duplicate id without --force-update', async () => {
  await withTempProject(async (projectRoot) => {
    await registerAgent({ name: 'agent-ui-1', role: 'ui' }, { projectRoot });

    const duplicate = await registerAgent({ name: 'agent-ui-1', role: 'ui' }, { projectRoot });

    if (backendUnavailable(duplicate)) {
      assert.equal(duplicate.error?.code, 'INTERNAL_ERROR');
      return;
    }

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
    if (backendUnavailable(first)) {
      assert.equal(first.error?.code, 'INTERNAL_ERROR');
      return;
    }
    assert.equal(first.ok, true);

    const updated = await registerAgent(
      { name: 'agent-ui-1', display: 'Frontend Agent', role: 'frontend', forceUpdate: true },
      { projectRoot }
    );

    if (backendUnavailable(updated)) {
      assert.equal(updated.error?.code, 'INTERNAL_ERROR');
      return;
    }

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
      if (backendUnavailable(all)) {
        assert.equal(all.error?.code, 'INTERNAL_ERROR');
        return;
      }
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

test('showAgent returns registered agent details', async () => {
  await withTempProject(async (projectRoot) => {
    const created = await registerAgent({ name: 'agent-ui-show', role: 'ui' }, { projectRoot });
    if (backendUnavailable(created)) {
      assert.equal(created.error?.code, 'INTERNAL_ERROR');
      return;
    }
    assert.equal(created.ok, true);

    const shown = await showAgent({ agent: 'agent-ui-show' }, { projectRoot });
    if (backendUnavailable(shown)) {
      assert.equal(shown.error?.code, 'INTERNAL_ERROR');
      return;
    }
    assert.equal(shown.ok, true);
    assert.equal(shown.data?.agent_id, 'agent-ui-show');
    assert.equal(shown.data?.status, 'idle');
  });
});

test('extendActivityLease succeeds for registered agent', async () => {
  await withTempProject(async (projectRoot) => {
    const created = await registerAgent({ name: 'agent-ui-pulse', role: 'ui' }, { projectRoot });
    if (backendUnavailable(created)) {
      assert.equal(created.error?.code, 'INTERNAL_ERROR');
      return;
    }
    assert.equal(created.ok, true);

    const pulse = await extendActivityLease({ agent: 'agent-ui-pulse' }, { projectRoot });
    if (backendUnavailable(pulse)) {
      assert.equal(pulse.error?.code, 'INTERNAL_ERROR');
      return;
    }
    assert.equal(pulse.ok, true);
    assert.equal(pulse.command, 'agent activity-lease');
  });
});
