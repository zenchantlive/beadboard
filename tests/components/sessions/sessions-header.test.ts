import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { AgentRecord } from '../../../src/lib/agent-registry';

interface SwarmGroup {
  swarmId: string;
  swarmLabel: string;
  members: AgentRecord[];
}

function groupAgentsBySwarm(
  agents: AgentRecord[],
  swarmGroups: SwarmGroup[]
): { swarmGroups: SwarmGroup[]; unassigned: AgentRecord[] } {
  const nonEmptySwarmGroups = swarmGroups.filter(g => g.members.length > 0);
  const assignedIds = new Set(nonEmptySwarmGroups.flatMap(g => g.members.map(m => m.agent_id)));
  const unassigned = agents.filter(a => !assignedIds.has(a.agent_id));
  return { swarmGroups: nonEmptySwarmGroups, unassigned };
}

describe('SessionsHeader: Agent Grouping', () => {
  const mockAgent = (id: string): AgentRecord => ({
    agent_id: id,
    display_name: id,
    role: 'agent',
    status: 'idle',
    created_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    version: 1,
  });

  it('groups agents by swarm', () => {
    const agents = [
      mockAgent('agent-1'),
      mockAgent('agent-2'),
      mockAgent('agent-3'),
    ];

    const swarmGroups: SwarmGroup[] = [
      {
        swarmId: 'bb-buff',
        swarmLabel: 'bb-buff',
        members: [agents[0], agents[1]],
      },
    ];

    const result = groupAgentsBySwarm(agents, swarmGroups);

    assert.equal(result.swarmGroups.length, 1);
    assert.equal(result.swarmGroups[0].members.length, 2);
    assert.equal(result.unassigned.length, 1);
    assert.equal(result.unassigned[0].agent_id, 'agent-3');
  });

  it('shows fallback bucket for unassigned agents', () => {
    const agents = [
      mockAgent('agent-1'),
      mockAgent('agent-2'),
    ];

    const swarmGroups: SwarmGroup[] = [];

    const result = groupAgentsBySwarm(agents, swarmGroups);

    assert.equal(result.swarmGroups.length, 0);
    assert.equal(result.unassigned.length, 2);
  });

  it('handles empty swarm groups', () => {
    const agents = [mockAgent('agent-1')];

    const swarmGroups: SwarmGroup[] = [
      {
        swarmId: 'bb-empty',
        swarmLabel: 'bb-empty',
        members: [],
      },
    ];

    const result = groupAgentsBySwarm(agents, swarmGroups);

    assert.equal(result.swarmGroups.length, 0, 'Empty swarm groups should not render');
    assert.equal(result.unassigned.length, 1);
  });
});
