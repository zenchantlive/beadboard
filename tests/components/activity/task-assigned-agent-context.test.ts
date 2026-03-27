import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';

import { selectTaskAssignedAgentStates } from '../../../src/components/activity/task-assigned-agent-context';
import type { AgentState } from '../../../src/lib/agent';

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

test('TaskAssignedAgentContext - selects live agent state by task or agent instance', () => {
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
      blocker: 'Waiting on review',
      lastEventAt: '2026-03-26T12:05:00.000Z',
    }),
    makeAgentState({
      projectId: 'bb',
      agentId: 'worker-c',
      label: 'Worker C',
      status: 'idle',
      taskId: 'task-2',
    }),
  ];

  const selected = selectTaskAssignedAgentStates(states, 'task-1');
  assert.equal(selected.length, 2);
  assert.equal(selected[0].agentId, 'worker-b');
  assert.equal(selected[1].agentId, 'worker-a');
});

test('TaskAssignedAgentContext - falls back to agentInstanceId when taskId is missing', () => {
  const states = [
    makeAgentState({
      projectId: 'bb',
      agentId: 'engineer-01-abc123',
      label: 'Engineer 01',
      status: 'working',
      taskId: 'task-x',
    }),
    makeAgentState({
      projectId: 'bb',
      agentId: 'worker-b',
      label: 'Worker B',
      status: 'working',
      taskId: 'task-y',
    }),
  ];

  const selected = selectTaskAssignedAgentStates(states, 'task-missing', 'engineer-01-abc123');
  assert.equal(selected.length, 1);
  assert.equal(selected[0].agentId, 'engineer-01-abc123');
});

test('AgentDetailPanel - renders identity, status, and current task ownership', async () => {
  const src = await fs.readFile(path.join(process.cwd(), 'src/components/activity/agent-detail-panel.tsx'), 'utf-8');
  assert.ok(src.includes('Agent Detail'), 'agent branch should label the panel clearly');
  assert.ok(src.includes('Current Task'), 'agent branch should show the current task block');
  assert.ok(src.includes('Owned Tasks'), 'agent branch should show the ownership summary');
});

test('ContextualRightPanel - task branch now includes task assigned agent context above the thread drawer', async () => {
  const src = await fs.readFile(path.join(process.cwd(), 'src/components/activity/contextual-right-panel.tsx'), 'utf-8');
  assert.ok(src.includes('TaskAssignedAgentContext'), 'task branch should render the shared task-agent context');
  assert.ok(src.includes('agentStates={agentStates}'), 'task branch should receive shared shell agent state rather than refetching its own runtime data');
  assert.ok(src.includes('<ThreadDrawer'), 'task branch should continue rendering the existing thread drawer');
  assert.ok(src.includes('onClose={() => setTaskId(null)}'), 'task branch should preserve the existing close behavior');
  assert.ok(src.includes('AgentDetailPanel'), 'agent branch should render the shared agent detail panel');
});

test('TaskReviewPanel - closed tasks route into a minimal review destination with evidence and explicit accept/reopen actions', async () => {
  const rightPanelSrc = await fs.readFile(path.join(process.cwd(), 'src/components/activity/contextual-right-panel.tsx'), 'utf-8');
  assert.ok(rightPanelSrc.includes('TaskReviewPanel'), 'closed task selection should route into a dedicated review panel');
  assert.ok(
    rightPanelSrc.includes("selectedIssue?.status === 'closed'") || rightPanelSrc.includes("issue.status === 'closed'"),
    'task branch should only switch into review mode for completed work',
  );

  const reviewSrc = await fs.readFile(path.join(process.cwd(), 'src/components/activity/task-review-panel.tsx'), 'utf-8');
  assert.ok(reviewSrc.includes('buildThreadItemsFromBead'), 'review panel should use bead thread evidence from the shared thread builder');
  assert.ok(reviewSrc.includes('TaskAssignedAgentContext'), 'review panel should keep the assigned-agent context visible');
  assert.ok(reviewSrc.includes('ThreadView'), 'review panel should render the bead-note evidence as a thread');
  assert.ok(reviewSrc.includes('/api/beads/comment'), 'accept action should record an explicit review acknowledgement comment');
  assert.ok(reviewSrc.includes('/api/beads/reopen'), 'reopen action should reuse the reopen mutation route');
  assert.ok(reviewSrc.includes('Accept'), 'review panel should expose an explicit accept action');
  assert.ok(reviewSrc.includes('Reopen'), 'review panel should expose an explicit reopen action');
  assert.ok(reviewSrc.includes("Accepted in review"), 'accept action should leave a traceable acceptance note in bead state');
  assert.ok(reviewSrc.includes('buildUrlParams'), 'accept should reuse the shared URL builder for route handoff');
  assert.ok(reviewSrc.includes("window.history.pushState(null, '', nextUrl);"), 'accept should clear the review route directly in browser history');
  assert.ok(reviewSrc.includes('close_reason'), 'review panel should surface completion evidence from the bead close reason');
});
