import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  agentFilePath,
  listAgents,
  registerAgent,
  showAgent,
  type AgentRecord,
} from '../../src/lib/agent-registry';

async function withTempUserProfile(run: () => Promise<void>): Promise<void> {
  const previous = process.env.USERPROFILE;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-agent-reg-'));
  process.env.USERPROFILE = tempDir;

  try {
    await run();
  } finally {
    if (previous === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = previous;
    }

    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test('registerAgent creates stable metadata file with idle status', async () => {
  await withTempUserProfile(async () => {
    const now = '2026-02-13T23:55:00.000Z';
    const result = await registerAgent(
      {
        name: 'agent-ui-1',
        display: 'UI Agent 1',
        role: 'ui',
      },
      { now: () => now },
    );

    assert.equal(result.ok, true);
    assert.equal(result.command, 'agent register');
    assert.equal(result.data?.agent_id, 'agent-ui-1');
    assert.equal(result.data?.status, 'idle');
    assert.equal(result.data?.created_at, now);
    assert.equal(result.data?.last_seen_at, now);
    assert.equal(result.data?.version, 1);

    const file = await fs.readFile(agentFilePath('agent-ui-1'), 'utf8');
    const parsed = JSON.parse(file) as AgentRecord;
    assert.equal(parsed.agent_id, 'agent-ui-1');
    assert.equal(parsed.display_name, 'UI Agent 1');
  });
});

test('registerAgent rejects duplicate id without --force-update', async () => {
  await withTempUserProfile(async () => {
    await registerAgent({ name: 'agent-ui-1', role: 'ui' }, { now: () => '2026-02-13T23:55:00.000Z' });

    const duplicate = await registerAgent({ name: 'agent-ui-1', role: 'ui' }, { now: () => '2026-02-13T23:56:00.000Z' });

    assert.equal(duplicate.ok, false);
    assert.equal(duplicate.error?.code, 'DUPLICATE_AGENT_ID');
  });
});

test('registerAgent force update mutates display/role but keeps created_at', async () => {
  await withTempUserProfile(async () => {
    const first = await registerAgent(
      { name: 'agent-ui-1', display: 'UI Agent', role: 'ui' },
      { now: () => '2026-02-13T23:55:00.000Z' },
    );
    assert.equal(first.ok, true);

    const updated = await registerAgent(
      { name: 'agent-ui-1', display: 'Frontend Agent', role: 'frontend', forceUpdate: true },
      { now: () => '2026-02-13T23:56:00.000Z' },
    );

    assert.equal(updated.ok, true);
    assert.equal(updated.data?.display_name, 'Frontend Agent');
    assert.equal(updated.data?.role, 'frontend');
    assert.equal(updated.data?.created_at, '2026-02-13T23:55:00.000Z');
    assert.equal(updated.data?.last_seen_at, '2026-02-13T23:56:00.000Z');
  });
});

test('listAgents sorts and filters by role/status', async () => {
  await withTempUserProfile(async () => {
    await registerAgent({ name: 'agent-b', role: 'backend' }, { now: () => '2026-02-13T23:55:00.000Z' });
    await registerAgent({ name: 'agent-a', role: 'ui' }, { now: () => '2026-02-13T23:55:00.000Z' });

    await registerAgent(
      { name: 'agent-b', role: 'backend', forceUpdate: true },
      { now: () => '2026-02-13T23:56:00.000Z' },
    );

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

    const byStatus = await listAgents({ status: 'idle' });
    assert.equal(byStatus.ok, true);
    assert.equal(byStatus.data?.length, 2);
  });
});

test('showAgent returns AGENT_NOT_FOUND for unknown id', async () => {
  await withTempUserProfile(async () => {
    const result = await showAgent({ agent: 'agent-missing' });
    assert.equal(result.ok, false);
    assert.equal(result.error?.code, 'AGENT_NOT_FOUND');
  });
});

test('registerAgent validates id pattern and role', async () => {
  await withTempUserProfile(async () => {
    const badName = await registerAgent({ name: 'Agent_Upper', role: 'ui' });
    assert.equal(badName.ok, false);
    assert.equal(badName.error?.code, 'INVALID_AGENT_ID');

    const badRole = await registerAgent({ name: 'agent-ok-1', role: '   ' });
    assert.equal(badRole.ok, false);
    assert.equal(badRole.error?.code, 'INVALID_ROLE');
  });
});
