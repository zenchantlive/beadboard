import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';

import { buildBlockedTriageAssignmentOptions, selectBlockedTriageIssues } from '../../src/components/shared/blocked-triage-modal';
import type { AgentState } from '../../src/lib/agent';
import type { BeadIssue } from '../../src/lib/types';
import type { AgentArchetype } from '../../src/lib/types-swarm';

function makeIssue(
  overrides: Partial<BeadIssue> & Pick<BeadIssue, 'id' | 'title' | 'status' | 'priority' | 'issue_type'>,
): BeadIssue {
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

function makeAgentState(
  overrides: Partial<AgentState> & Pick<AgentState, 'projectId' | 'agentId' | 'status'>,
): AgentState {
  return {
    projectId: overrides.projectId,
    agentId: overrides.agentId,
    kind: overrides.kind ?? 'worker',
    agentTypeId: overrides.agentTypeId ?? null,
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

function makeArchetype(overrides: Partial<AgentArchetype> & Pick<AgentArchetype, 'id' | 'name'>): AgentArchetype {
  return {
    id: overrides.id,
    name: overrides.name,
    description: overrides.description ?? '',
    systemPrompt: overrides.systemPrompt ?? '',
    capabilities: overrides.capabilities ?? [],
    color: overrides.color ?? '#3b82f6',
    icon: overrides.icon,
    createdAt: overrides.createdAt ?? '2026-03-26T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-26T00:00:00.000Z',
    isBuiltIn: overrides.isBuiltIn ?? false,
  };
}

test('BlockedTriageModal - selects explicit and derived blocked tasks with blocker chains', () => {
  const issues = [
    makeIssue({
      id: 'beadboard-ov2.5.1',
      title: 'Explicitly blocked task',
      status: 'blocked',
      priority: 0,
      issue_type: 'task',
      dependencies: [{ type: 'blocks', target: 'beadboard-ov2.5.9' }],
    }),
    makeIssue({
      id: 'beadboard-ov2.5.2',
      title: 'Derived blocked task',
      status: 'in_progress',
      priority: 1,
      issue_type: 'task',
      dependencies: [{ type: 'blocks', target: 'beadboard-ov2.5.3' }],
    }),
    makeIssue({
      id: 'beadboard-ov2.5.3',
      title: 'Open blocker',
      status: 'in_progress',
      priority: 1,
      issue_type: 'task',
      dependencies: [{ type: 'blocks', target: 'beadboard-ov2.5.4' }],
    }),
    makeIssue({
      id: 'beadboard-ov2.5.4',
      title: 'Upstream blocker',
      status: 'open',
      priority: 2,
      issue_type: 'task',
    }),
    makeIssue({
      id: 'beadboard-ov2.5.5',
      title: 'Unblocked task',
      status: 'open',
      priority: 2,
      issue_type: 'task',
    }),
    makeIssue({
      id: 'beadboard-ov2.5.9',
      title: 'Explicit blocker',
      status: 'open',
      priority: 2,
      issue_type: 'task',
    }),
  ];

  const selected = selectBlockedTriageIssues(issues);

  assert.deepEqual(
    selected.map((entry) => entry.issue.id),
    ['beadboard-ov2.5.1', 'beadboard-ov2.5.2', 'beadboard-ov2.5.3'],
  );
  assert.equal(selected[0].isExplicitlyBlocked, true);
  assert.equal(selected[0].isDerivedBlocked, true);
  assert.equal(selected[0].blockerChain.total, 1);
  assert.deepEqual(
    selected[1].blockerChain.nodes.map((node) => [node.id, node.level]),
    [
      ['beadboard-ov2.5.3', 1],
      ['beadboard-ov2.5.4', 2],
    ],
  );
  assert.equal(selected[2].isExplicitlyBlocked, false);
  assert.equal(selected[2].isDerivedBlocked, true);
});

test('BlockedTriageModal - excludes closed blockers and unblocked tasks from triage list', () => {
  const issues = [
    makeIssue({
      id: 'beadboard-ov2.5.6',
      title: 'Closed blocker',
      status: 'closed',
      priority: 1,
      issue_type: 'task',
    }),
    makeIssue({
      id: 'beadboard-ov2.5.7',
      title: 'Resolved downstream task',
      status: 'in_progress',
      priority: 1,
      issue_type: 'task',
      dependencies: [{ type: 'blocks', target: 'beadboard-ov2.5.6' }],
    }),
    makeIssue({
      id: 'beadboard-ov2.5.8',
      title: 'Ready task',
      status: 'open',
      priority: 2,
      issue_type: 'task',
    }),
  ];

  const selected = selectBlockedTriageIssues(issues);
  assert.equal(selected.length, 0);
});

test('BlockedTriageModal - prefers live archetypes and falls back when no live agents exist', () => {
  const archetypes = [
    makeArchetype({ id: 'engineer', name: 'Engineer' }),
    makeArchetype({ id: 'reviewer', name: 'Reviewer' }),
    makeArchetype({ id: 'tester', name: 'Tester' }),
  ];
  const liveStates = [
    makeAgentState({ projectId: 'bb', agentId: 'a1', agentTypeId: 'engineer', status: 'idle' }),
    makeAgentState({ projectId: 'bb', agentId: 'a2', agentTypeId: 'engineer', status: 'working' }),
    makeAgentState({ projectId: 'bb', agentId: 'r1', agentTypeId: 'reviewer', status: 'blocked' }),
    makeAgentState({ projectId: 'bb', agentId: 'done1', agentTypeId: 'tester', status: 'completed' }),
  ];

  const liveOptions = buildBlockedTriageAssignmentOptions(archetypes, liveStates);
  assert.deepEqual(
    liveOptions.map((option) => option.archetype.id),
    ['engineer', 'reviewer'],
  );
  assert.equal(liveOptions[0].liveCount, 2);
  assert.equal(liveOptions[0].idleCount, 1);
  assert.equal(liveOptions[1].blockedCount, 1);

  const fallbackOptions = buildBlockedTriageAssignmentOptions(archetypes, [
    makeAgentState({ projectId: 'bb', agentId: 'done2', agentTypeId: 'tester', status: 'completed' }),
  ]);
  assert.deepEqual(
    fallbackOptions.map((option) => option.archetype.id),
    ['engineer', 'reviewer', 'tester'],
  );
});

test('UnifiedShell - opens blocked triage modal from the blocked affordance', async () => {
  const src = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(src.includes('const [blockedTriageOpen, setBlockedTriageOpen] = useState(false);'));
  assert.ok(src.includes('const handleOpenBlockedTriage = useCallback(() => setBlockedTriageOpen(true), []);'));
  assert.ok(src.includes('<BlockedTriageModal'));
  assert.ok(src.includes('isOpen={blockedTriageOpen}'));
  assert.ok(src.includes('onClose={handleCloseBlockedTriage}'));
  assert.ok(src.includes('agentStates={agentStates}'));
  assert.ok(src.includes('setBlockedTriageOpen(false)'));
});

test('TopBar - blocked items button routes through triage handler instead of a local toggle', async () => {
  const src = await fs.readFile(path.join(process.cwd(), 'src/components/shared/top-bar.tsx'), 'utf-8');
  assert.ok(src.includes('onClick={onOpenBlockedTriage}'));
  assert.ok(!src.includes('onClick={toggleBlockedOnly}'));
});
