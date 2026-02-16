import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

import { joinSwarm, leaveSwarm, getSwarmMembers } from '../../src/lib/swarm-molecules';
import { registerAgent } from '../../src/lib/agent-registry';

const projectRoot = process.cwd();
const runId = Date.now().toString(36);

// Helper: bd show returns an ARRAY, take first element
function bdShow(beadId: string): any {
  const out = execSync(`bd --allow-stale show ${beadId} --json`, { cwd: projectRoot, encoding: 'utf8', timeout: 30000 });
  const arr = JSON.parse(out);
  return arr[0] || arr;
}

test('joinSwarm creates swarm membership', async () => {
  const agentId = `join-${runId}`;
  
  await registerAgent({ name: agentId, role: 'tester' }, { projectRoot });
  const result = await joinSwarm({ agent: agentId, epicId: 'bb-buff' }, { projectRoot });
  assert.equal(result.ok, true, `joinSwarm failed: ${result.error?.message}`);
  
  const agent = bdShow(`bb-${agentId}`);
  const hasSwarm = agent.labels?.some((l: string) => l.startsWith('swarm:'));
  assert.ok(hasSwarm, 'Agent should have swarm label');
  
  await leaveSwarm({ agent: agentId }, { projectRoot });
});

test('joinSwarm switches membership', async () => {
  const agentId = `switch-${runId}`;
  
  await registerAgent({ name: agentId, role: 'tester' }, { projectRoot });
  await joinSwarm({ agent: agentId, epicId: 'bb-buff' }, { projectRoot });
  await joinSwarm({ agent: agentId, epicId: 'bb-buff.2' }, { projectRoot });

  const agent = bdShow(`bb-${agentId}`);
  const swarmLabels = agent.labels?.filter((l: string) => l.startsWith('swarm:')) || [];
  assert.equal(swarmLabels.length, 1, 'Should have exactly one swarm label');
  
  await leaveSwarm({ agent: agentId }, { projectRoot });
});

test('leaveSwarm removes membership', async () => {
  const agentId = `leave-${runId}`;
  
  await registerAgent({ name: agentId, role: 'tester' }, { projectRoot });
  await joinSwarm({ agent: agentId, epicId: 'bb-buff' }, { projectRoot });
  await leaveSwarm({ agent: agentId }, { projectRoot });

  const agent = bdShow(`bb-${agentId}`);
  const swarmLabels = agent.labels?.filter((l: string) => l.startsWith('swarm:')) || [];
  assert.equal(swarmLabels.length, 0, 'Should have no swarm labels');
});

test('getSwarmMembers returns members', async () => {
  const agent1 = `m1-${runId}`;
  const agent2 = `m2-${runId}`;
  
  await registerAgent({ name: agent1, role: 'tester' }, { projectRoot });
  await registerAgent({ name: agent2, role: 'tester' }, { projectRoot });
  await joinSwarm({ agent: agent1, epicId: 'bb-buff' }, { projectRoot });
  await joinSwarm({ agent: agent2, epicId: 'bb-buff' }, { projectRoot });

  const members = await getSwarmMembers({ swarmId: 'bb-buff' }, { projectRoot });
  assert.ok(members.includes(agent1), `Should include ${agent1}`);
  assert.ok(members.includes(agent2), `Should include ${agent2}`);
  
  await leaveSwarm({ agent: agent1 }, { projectRoot });
  await leaveSwarm({ agent: agent2 }, { projectRoot });
});

test('joinSwarm rejects invalid agent', async () => {
  const result = await joinSwarm({ agent: 'nonexistent', epicId: 'bb-buff' }, { projectRoot });
  assert.equal(result.ok, false);
  assert.equal(result.error?.code, 'AGENT_NOT_FOUND');
});

test('joinSwarm rejects invalid epic', async () => {
  const agentId = `invepic-${runId}`;
  await registerAgent({ name: agentId, role: 'tester' }, { projectRoot });
  
  const result = await joinSwarm({ agent: agentId, epicId: 'bb-nonexistent' }, { projectRoot });
  assert.equal(result.ok, false);
  assert.equal(result.error?.code, 'EPIC_NOT_FOUND');
});
