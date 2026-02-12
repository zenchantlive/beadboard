import test from 'node:test';
import assert from 'node:assert/strict';

import type { BeadIssue } from '../../src/lib/types';
import {
  KANBAN_STATUSES,
  buildKanbanColumns,
  buildKanbanStats,
  filterKanbanIssues,
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
    issue({ id: 'bb-3', status: 'blocked', priority: 1 }),
    issue({ id: 'bb-4', status: 'pinned', priority: 1 }),
  ];

  const columns = buildKanbanColumns(issues);

  assert.deepEqual(Object.keys(columns), KANBAN_STATUSES);
  assert.deepEqual(columns.open.map((x) => x.id), ['bb-2', 'bb-1']);
  assert.deepEqual(columns.blocked.map((x) => x.id), ['bb-3']);
  assert.equal(columns.closed.length, 0);
});

test('buildKanbanStats reports total/open/active/blocked/done/p0', () => {
  const issues = [
    issue({ status: 'open', priority: 0 }),
    issue({ status: 'open', priority: 2 }),
    issue({ status: 'in_progress', priority: 1 }),
    issue({ status: 'blocked', priority: 1 }),
    issue({ status: 'closed', priority: 3 }),
  ];

  const stats = buildKanbanStats(issues);

  assert.equal(stats.total, 5);
  assert.equal(stats.open, 2);
  assert.equal(stats.active, 1);
  assert.equal(stats.blocked, 1);
  assert.equal(stats.done, 1);
  assert.equal(stats.p0, 1);
});
