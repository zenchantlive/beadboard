import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';

import { selectAgentDetailStates } from '../../../src/components/activity/agent-detail-panel';
import type { AgentState } from '../../../src/lib/agent';
import type { BeadIssue } from '../../../src/lib/types';

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

test('AgentDetailPanel - selects direct runtime match by agent id', () => {
  const states = [
    makeAgentState({ projectId: 'bb', agentId: 'worker-a', label: 'Worker A', status: 'working', taskId: 'task-1' }),
    makeAgentState({ projectId: 'bb', agentId: 'worker-b', label: 'Worker B', status: 'idle', taskId: 'task-2' }),
  ];

  const selected = selectAgentDetailStates(states, [], 'worker-a');
  assert.equal(selected.length, 1);
  assert.equal(selected[0].agentId, 'worker-a');
});

test('AgentDetailPanel - maps selected assignee to runtime state through owned task ids', () => {
  const states = [
    makeAgentState({ projectId: 'bb', agentId: 'runtime-1', label: 'Implementation Engineer', status: 'blocked', taskId: 'bb-task-1' }),
  ];
  const issues = [
    makeIssue({ id: 'bb-task-1', title: 'Task 1', status: 'in_progress', priority: 1, issue_type: 'task', assignee: 'beadboard-p9fx' }),
  ];

  const selected = selectAgentDetailStates(states, issues, 'beadboard-p9fx');
  assert.equal(selected.length, 1);
  assert.equal(selected[0].taskId, 'bb-task-1');
});

test('UnifiedShell - passes agentId to ContextualRightPanel', async () => {
  const src = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(src.includes('agentId={agentId}'), 'must pass agentId so right panel can render agent detail');
});
