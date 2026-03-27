import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';

import type { AgentState } from '../../../src/lib/agent';
import { selectTaskAssignedAgentStates } from '../../../src/lib/agent/ownership';

function makeAgentState(overrides: Partial<AgentState> & Pick<AgentState, 'projectId' | 'agentId' | 'status'>): AgentState {
  return {
    projectId: overrides.projectId,
    agentId: overrides.agentId,
    kind: overrides.kind ?? 'worker',
    agentTypeId: overrides.agentTypeId ?? 'engineer',
    label: overrides.label ?? overrides.agentId,
    taskId: overrides.taskId ?? null,
    epicId: overrides.epicId ?? null,
    swarmId: overrides.swarmId ?? null,
    status: overrides.status,
    lastEventId: overrides.lastEventId ?? null,
    lastEventKind: overrides.lastEventKind ?? null,
    lastEventAt: overrides.lastEventAt ?? null,
    result: overrides.result ?? null,
    blocker: overrides.blocker ?? null,
    error: overrides.error ?? null,
    seenEventIds: overrides.seenEventIds ?? [],
  };
}

test('GraphNodeCard overlays live agent ownership in the bottom-right corner', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx'), 'utf-8');
  assert.ok(fileContent.includes('AgentAvatar'), 'GraphNodeCard should render the shared AgentAvatar overlay');
  assert.ok(fileContent.includes('assignedAgentStates'), 'GraphNodeCard should receive assigned agent states from the graph model');
  assert.ok(fileContent.includes('absolute bottom-2 right-2'), 'GraphNodeCard should place the agent overlay in the bottom-right corner');
  assert.ok(fileContent.includes("from '../shared/agent-presence'"), 'GraphNodeCard should reuse the shared agent-presence helper');
  assert.ok(fileContent.includes('mapAgentStateToAvatarStatus(primaryAssignedAgentState)'), 'GraphNodeCard should map runtime state to avatar status through the shared helper');
});

test('WorkflowGraph threads shared agent states into node data', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/workflow-graph.tsx'), 'utf-8');
  assert.ok(fileContent.includes('agentStates?: readonly AgentState[]'), 'WorkflowGraph should accept shell-owned agent states');
  assert.ok(fileContent.includes('selectTaskAssignedAgentStates'), 'WorkflowGraph should reuse the shared task-agent projection');
  assert.ok(fileContent.includes('assignedAgentStates: assignedAgentStatesById.get(issue.id) ?? []'), 'WorkflowGraph should pass per-task assigned states into node data');
});

test('SmartDag and UnifiedShell pass shell agent states into the graph path', async () => {
  const smartDag = await fs.readFile(path.join(process.cwd(), 'src/components/graph/smart-dag.tsx'), 'utf-8');
  const shell = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(smartDag.includes('agentStates?: readonly AgentState[]'), 'SmartDag should accept agent states from the shell');
  assert.ok(smartDag.includes('agentStates={agentStates}'), 'SmartDag should forward agent states into WorkflowGraph');
  assert.ok(shell.includes('agentStates={agentStates}'), 'UnifiedShell should pass shell agent states into SmartDag');
});

test('selectTaskAssignedAgentStates prefers task matches and recent runtime states', () => {
  const states = [
    makeAgentState({
      projectId: 'bb',
      agentId: 'worker-a',
      label: 'Worker A',
      status: 'working',
      taskId: 'task-1',
      lastEventAt: '2026-03-26T12:00:00.000Z',
    }),
    makeAgentState({
      projectId: 'bb',
      agentId: 'worker-b',
      label: 'Worker B',
      status: 'blocked',
      taskId: 'task-1',
      lastEventAt: '2026-03-26T12:05:00.000Z',
      blocker: 'Waiting on review',
    }),
    makeAgentState({
      projectId: 'bb',
      agentId: 'engineer-01-abc123',
      label: 'Engineer 01',
      status: 'launching',
      taskId: 'task-2',
      lastEventAt: '2026-03-26T12:10:00.000Z',
    }),
  ];

  const selected = selectTaskAssignedAgentStates(states, 'task-1');
  assert.equal(selected.length, 2);
  assert.equal(selected[0].agentId, 'worker-b');
  assert.equal(selected[1].agentId, 'worker-a');

  const byAgentInstance = selectTaskAssignedAgentStates(states, 'task-missing', 'engineer-01-abc123');
  assert.equal(byAgentInstance.length, 1);
  assert.equal(byAgentInstance[0].agentId, 'engineer-01-abc123');
});
