import test from 'node:test';
import assert from 'node:assert/strict';

import type { BeadIssue } from '../../../src/lib/types';
import type { AgentState } from '../../../src/lib/agent';
import type { SocialCard as SocialCardData } from '../../../src/lib/social-cards';
import { buildSocialAgentPresenceByName } from '../../../src/components/social/social-presence';
import { mapAgentStateToAvatarStatus } from '../../../src/components/shared/agent-presence';

function makeIssue(overrides: Partial<BeadIssue> & Pick<BeadIssue, 'id' | 'title' | 'status' | 'priority' | 'issue_type'>): BeadIssue {
  return {
    id: overrides.id,
    title: overrides.title,
    description: overrides.description ?? null,
    status: overrides.status,
    priority: overrides.priority,
    issue_type: overrides.issue_type,
    assignee: overrides.assignee ?? null,
    templateId: overrides.templateId ?? null,
    owner: overrides.owner ?? null,
    labels: overrides.labels ?? [],
    dependencies: overrides.dependencies ?? [],
    created_at: overrides.created_at ?? '2026-03-26T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-03-26T00:00:00.000Z',
    closed_at: overrides.closed_at ?? null,
    close_reason: overrides.close_reason ?? null,
    closed_by_session: overrides.closed_by_session ?? null,
    created_by: overrides.created_by ?? null,
    due_at: overrides.due_at ?? null,
    estimated_minutes: overrides.estimated_minutes ?? null,
    external_ref: overrides.external_ref ?? null,
    metadata: overrides.metadata ?? {},
    agentTypeId: overrides.agentTypeId,
    agentInstanceId: overrides.agentInstanceId,
  };
}

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

function makeCard(overrides: Partial<SocialCardData> & Pick<SocialCardData, 'id' | 'title' | 'status' | 'priority'>): SocialCardData {
  return {
    id: overrides.id,
    title: overrides.title,
    status: overrides.status,
    blocks: overrides.blocks ?? [],
    unblocks: overrides.unblocks ?? [],
    agents: overrides.agents ?? [],
    lastActivity: overrides.lastActivity ?? new Date(),
    priority: overrides.priority,
    agentTypeId: overrides.agentTypeId,
  };
}

test('Social presence helper maps runtime status to avatar status', () => {
  const now = Date.parse('2026-03-27T05:00:00.000Z');

  assert.equal(mapAgentStateToAvatarStatus(makeAgentState({
    projectId: 'bb',
    agentId: 'runtime-1',
    status: 'launching',
    lastEventAt: '2026-03-27T04:55:00.000Z',
  }), now), 'spawning');
  assert.equal(mapAgentStateToAvatarStatus(makeAgentState({
    projectId: 'bb',
    agentId: 'runtime-1',
    status: 'working',
    lastEventAt: '2026-03-27T04:55:00.000Z',
  }), now), 'working');
  assert.equal(mapAgentStateToAvatarStatus(makeAgentState({
    projectId: 'bb',
    agentId: 'runtime-1',
    status: 'blocked',
    lastEventAt: '2026-03-27T04:55:00.000Z',
  }), now), 'stuck');
  assert.equal(mapAgentStateToAvatarStatus(makeAgentState({
    projectId: 'bb',
    agentId: 'runtime-1',
    status: 'idle',
    lastEventAt: '2026-03-27T04:55:00.000Z',
  }), now), 'idle');
  assert.equal(mapAgentStateToAvatarStatus(makeAgentState({
    projectId: 'bb',
    agentId: 'runtime-1',
    status: 'working',
    lastEventAt: '2026-03-27T03:00:00.000Z',
  }), now), 'stale');
  assert.equal(mapAgentStateToAvatarStatus(makeAgentState({
    projectId: 'bb',
    agentId: 'runtime-1',
    status: 'completed',
    lastEventAt: '2026-03-27T03:00:00.000Z',
  }), now), 'done');
  assert.equal(mapAgentStateToAvatarStatus(makeAgentState({
    projectId: 'bb',
    agentId: 'runtime-1',
    status: 'failed',
    lastEventAt: '2026-03-27T03:00:00.000Z',
  }), now), 'dead');
});

test('Social presence helper prefers live runtime presence for assigned cards', () => {
  const card = makeCard({
    id: 'bb-task-1',
    title: 'Task 1',
    status: 'in_progress',
    priority: 'P1',
    agents: [{ name: 'agent-alpha', status: 'active' }],
  });
  const issue = makeIssue({
    id: 'bb-task-1',
    title: 'Task 1',
    status: 'in_progress',
    priority: 1,
    issue_type: 'task',
  });
  const agentStates = [
    makeAgentState({
      projectId: 'bb',
      agentId: 'runtime-1',
      label: 'agent-alpha',
      status: 'working',
      taskId: 'bb-task-1',
    }),
  ];

  const presence = buildSocialAgentPresenceByName(card, issue, agentStates);

  assert.equal(presence['agent-alpha'].live, true);
  assert.equal(presence['agent-alpha'].status, 'working');
  assert.equal(presence['agent-alpha'].runtimeStatus, 'working');
});

test('Social presence helper marks stale runtime ownership consistently', () => {
  const card = makeCard({
    id: 'bb-task-stale',
    title: 'Stale Task',
    status: 'in_progress',
    priority: 'P1',
    agents: [{ name: 'agent-stale', status: 'active' }],
  });
  const issue = makeIssue({
    id: 'bb-task-stale',
    title: 'Stale Task',
    status: 'in_progress',
    priority: 1,
    issue_type: 'task',
  });
  const agentStates = [
    makeAgentState({
      projectId: 'bb',
      agentId: 'runtime-stale',
      label: 'agent-stale',
      status: 'working',
      taskId: 'bb-task-stale',
      lastEventAt: '2026-03-27T03:00:00.000Z',
    }),
  ];

  const presence = buildSocialAgentPresenceByName(card, issue, agentStates);

  assert.equal(presence['agent-stale'].live, true);
  assert.equal(presence['agent-stale'].status, 'stale');
  assert.equal(presence['agent-stale'].runtimeStatus, 'working');
});

test('Social presence helper falls back to static assigned presence when no runtime state exists', () => {
  const card = makeCard({
    id: 'bb-task-2',
    title: 'Task 2',
    status: 'ready',
    priority: 'P2',
    agents: [{ name: 'agent-beta', status: 'stale' }],
  });
  const issue = makeIssue({
    id: 'bb-task-2',
    title: 'Task 2',
    status: 'open',
    priority: 2,
    issue_type: 'task',
  });

  const presence = buildSocialAgentPresenceByName(card, issue, []);

  assert.equal(presence['agent-beta'].live, false);
  assert.equal(presence['agent-beta'].status, 'stale');
  assert.equal(presence['agent-beta'].runtimeStatus, null);
});
