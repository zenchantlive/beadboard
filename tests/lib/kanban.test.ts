import test from 'node:test';
import assert from 'node:assert/strict';

import type { BeadIssue } from '../../src/lib/types';
import {
  KANBAN_STATUSES,
  buildExecutionChecklist,
  buildBlockedByTree,
  buildKanbanColumns,
  buildKanbanStats,
  buildUnblocksCountByIssue,
  findIssueLane,
  filterKanbanIssues,
  pickNextActionableIssue,
} from '../../src/lib/kanban';

function issue(overrides: Partial<BeadIssue>): BeadIssue {
  return {
    id: overrides.id ?? 'bb-x',
    title: overrides.title ?? 'Issue',
    description: overrides.description ?? null,
    status: overrides.status ?? 'open',
    priority: overrides.priority ?? 2,
    issue_type: overrides.issue_type ?? 'task',
    assignee: overrides.assignee ?? null,
    templateId: null,
    owner: overrides.owner ?? null,
    labels: overrides.labels ?? [],
    dependencies: overrides.dependencies ?? [],
    created_at: overrides.created_at ?? '2026-02-12T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-02-12T00:00:00Z',
    closed_at: overrides.closed_at ?? null,
    close_reason: overrides.close_reason ?? null,
    closed_by_session: overrides.closed_by_session ?? null,
    created_by: overrides.created_by ?? null,
    due_at: overrides.due_at ?? null,
    estimated_minutes: overrides.estimated_minutes ?? null,
    external_ref: overrides.external_ref ?? null,
    metadata: overrides.metadata ?? {},
  };
}

test('filterKanbanIssues filters by query/type/priority and closed visibility', () => {
  const issues = [
    issue({ id: 'bb-1', title: 'OAuth integration', labels: ['security'], status: 'open', priority: 1, issue_type: 'feature' }),
    issue({ id: 'bb-2', title: 'Fix timezone bug', status: 'in_progress', priority: 0, issue_type: 'bug' }),
    issue({ id: 'bb-3', title: 'Done task', status: 'closed', priority: 2, issue_type: 'task' }),
  ];

  const filtered = filterKanbanIssues(issues, {
    query: 'oauth',
    type: 'feature',
    priority: '1',
    showClosed: false,
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'bb-1');
});

test('buildKanbanColumns groups by core statuses and sorts by priority ascending', () => {
  const issues = [
    issue({ id: 'bb-1', status: 'open', priority: 2 }),
    issue({ id: 'bb-2', status: 'open', priority: 0 }),
    issue({ id: 'bb-epic', status: 'open', priority: 0, issue_type: 'epic' }),
    issue({ id: 'bb-3', status: 'in_progress', priority: 1 }),
    issue({ id: 'bb-4', status: 'deferred', priority: 1 }),
    issue({ id: 'bb-5', status: 'open', priority: 3, dependencies: [{ type: 'blocks', target: 'bb-1' }] }),
    issue({ id: 'bb-6', status: 'open', priority: 4, dependencies: [{ type: 'blocks', target: 'bb-2' }] }),
  ];

  const columns = buildKanbanColumns(issues);

  assert.deepEqual(Object.keys(columns), KANBAN_STATUSES);
  assert.deepEqual(columns.ready.map((x) => x.id), ['bb-2', 'bb-4', 'bb-1']);
  assert.equal(columns.ready.some((x) => x.issue_type === 'epic'), false);
  assert.deepEqual(columns.in_progress.map((x) => x.id), ['bb-3']);
  assert.deepEqual(columns.blocked.map((x) => x.id), ['bb-5', 'bb-6']);
  assert.equal(columns.closed.length, 0);
});

test('buildKanbanStats reports total/ready/active/blocked/done/p0', () => {
  const issues = [
    issue({ status: 'open', priority: 0 }),
    issue({ status: 'open', priority: 2 }),
    issue({ status: 'in_progress', priority: 1 }),
    issue({ status: 'blocked', priority: 1 }),
    issue({ status: 'closed', priority: 3 }),
  ];

  const stats = buildKanbanStats(issues);

  assert.equal(stats.total, 5);
  assert.equal(stats.ready, 2);
  assert.equal(stats.active, 1);
  assert.equal(stats.blocked, 1);
  assert.equal(stats.done, 1);
  assert.equal(stats.p0, 1);
});

test('buildBlockedByTree returns compact blocker tree with depth and total', () => {
  const issues = [
    issue({ id: 'bb-1', title: 'Target issue' }),
    issue({ id: 'bb-2', title: 'Direct blocker A', dependencies: [{ type: 'blocks', target: 'bb-1' }] }),
    issue({ id: 'bb-3', title: 'Direct blocker B', dependencies: [{ type: 'blocks', target: 'bb-1' }] }),
    issue({ id: 'bb-4', title: 'Nested blocker', dependencies: [{ type: 'blocks', target: 'bb-2' }] }),
  ];

  const tree = buildBlockedByTree(issues, 'bb-4');

  assert.equal(tree.total, 2);
  assert.deepEqual(
    tree.nodes.map((node) => `${node.id}:${node.level}`),
    ['bb-2:1', 'bb-1:2'],
  );
});

test('findIssueLane resolves ready lane for unblocked linked issues', () => {
  const issues = [
    issue({ id: 'bb-1', status: 'open' }),
    issue({ id: 'bb-2', status: 'blocked' }),
    issue({ id: 'bb-3', status: 'closed' }),
  ];

  const columns = buildKanbanColumns(issues);

  assert.equal(findIssueLane(columns, 'bb-1'), 'ready');
  assert.equal(findIssueLane(columns, 'bb-2'), 'blocked');
  assert.equal(findIssueLane(columns, 'bb-3'), 'closed');
  assert.equal(findIssueLane(columns, 'bb-404'), null);
});

test('pickNextActionableIssue is deterministic by priority asc, unblocks desc, updated desc, id asc', () => {
  const issues = [
    issue({
      id: 'bb-1',
      status: 'open',
      priority: 1,
      updated_at: '2026-02-10T01:00:00Z',
    }),
    issue({
      id: 'bb-2',
      status: 'open',
      priority: 1,
      updated_at: '2026-02-10T02:00:00Z',
    }),
    issue({
      id: 'bb-10',
      status: 'open',
      dependencies: [{ type: 'blocks', target: 'bb-1' }],
    }),
    issue({
      id: 'bb-11',
      status: 'open',
      dependencies: [{ type: 'blocks', target: 'bb-2' }],
    }),
    issue({
      id: 'bb-12',
      status: 'open',
      dependencies: [{ type: 'blocks', target: 'bb-2' }],
    }),
  ];

  const columns = buildKanbanColumns(issues);
  const next = pickNextActionableIssue(columns, issues);

  assert.equal(next?.id, 'bb-2');
});

test('pickNextActionableIssue returns null when no ready issue exists', () => {
  const issues = [issue({ id: 'bb-1', status: 'in_progress' }), issue({ id: 'bb-2', status: 'closed' })];
  const columns = buildKanbanColumns(issues);

  assert.equal(pickNextActionableIssue(columns, issues), null);
});

test('buildUnblocksCountByIssue counts unique blocks dependencies per issue', () => {
  const issues = [
    issue({
      id: 'bb-1',
      dependencies: [
        { type: 'blocks', target: 'bb-2' },
        { type: 'blocks', target: 'bb-2' },
        { type: 'blocks', target: 'bb-3' },
        { type: 'relates_to', target: 'bb-4' },
      ],
    }),
  ];

  const map = buildUnblocksCountByIssue(issues);

  assert.equal(map.get('bb-1'), 0);
  assert.equal(map.get('bb-2'), 1);
  assert.equal(map.get('bb-3'), 1);
});

test('buildExecutionChecklist evaluates owner, blockers, quality signal, and execution-compatible lane', () => {
  const issues = [
    issue({
      id: 'bb-1',
      status: 'open',
      owner: 'dev-a',
      description: 'Implements acceptance criteria with rollback notes',
      dependencies: [{ type: 'blocks', target: 'bb-2' }],
    }),
    issue({ id: 'bb-2', status: 'closed' }),
  ];

  const checklist = buildExecutionChecklist(issues[0], issues);

  assert.deepEqual(
    checklist.map((item) => item.passed),
    [true, true, true, true],
  );
});

test('buildExecutionChecklist fails blocker check when blocker is still open', () => {
  const issues = [
    issue({
      id: 'bb-1',
      status: 'open',
      owner: 'dev-a',
      description: 'Implements acceptance criteria with rollback notes',
      dependencies: [{ type: 'blocks', target: 'bb-2' }],
    }),
    issue({ id: 'bb-2', status: 'open' }),
  ];

  const checklist = buildExecutionChecklist(issues[0], issues);
  const blockerItem = checklist.find((item) => item.key === 'no_open_blockers');

  assert.equal(blockerItem?.passed, false);
});
