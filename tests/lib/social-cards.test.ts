import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSocialCards } from '../../src/lib/social-cards';
import type { BeadIssue } from '../../src/lib/types';

function makeBead(overrides: Partial<BeadIssue>): BeadIssue {
  return {
    id: overrides.id || 'bb-test',
    title: overrides.title || 'Test bead',
    description: overrides.description ?? null,
    status: overrides.status || 'open',
    priority: overrides.priority || 2,
    issue_type: overrides.issue_type || 'task',
    assignee: overrides.assignee ?? null,
    templateId: overrides.templateId ?? null,
    owner: overrides.owner ?? null,
    labels: overrides.labels || [],
    dependencies: overrides.dependencies || [],
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
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

test('buildSocialCards excludes runtime-instance beads from the social task list', () => {
  const cards = buildSocialCards([
    makeBead({ id: 'bb-task-1', title: 'Task 1' }),
    makeBead({
      id: 'bb-coder-task-kqi-3',
      title: 'Agent: coder/task-kqi-3',
      status: 'deferred',
      labels: ['agent-lifecycle:runtime-instance', 'agent-instance:coder/task-kqi-3'],
    }),
  ]);

  assert.deepEqual(cards.map((card) => card.id), ['bb-task-1']);
});

test('buildSocialCards surfaces assigned runtime instance name from assignee bead id', () => {
  const [card] = buildSocialCards([
    makeBead({
      id: 'bb-task-1',
      title: 'Task 1',
      assignee: 'bb-coder-task-kqi-3',
      metadata: { agentStatus: 'active' },
    }),
  ]);

  assert.equal(card.agents.length, 1);
  assert.equal(card.agents[0].name, 'coder-task-kqi-3');
});
