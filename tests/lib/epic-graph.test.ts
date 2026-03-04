import test from 'node:test';
import assert from 'node:assert/strict';

import type { BeadIssue } from '../../src/lib/types';
import { collectEpicDescendantIds, buildWorkflowEdges } from '../../src/lib/epic-graph';

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
    created_at: overrides.created_at ?? '2026-03-02T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-03-02T00:00:00Z',
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

test('collectEpicDescendantIds includes nested subtasks under selected epic', () => {
  const issues: BeadIssue[] = [
    issue({ id: 'epic-1', issue_type: 'epic' }),
    issue({ id: 'a', dependencies: [{ type: 'parent', target: 'epic-1' }] }),
    issue({ id: 'a-1', dependencies: [{ type: 'parent', target: 'a' }] }),
    issue({ id: 'a-2', dependencies: [{ type: 'parent', target: 'a' }] }),
    issue({ id: 'b', dependencies: [{ type: 'parent', target: 'epic-1' }] }),
    issue({ id: 'orphan', dependencies: [{ type: 'parent', target: 'other-epic' }] }),
  ];

  const ids = collectEpicDescendantIds(issues, 'epic-1');

  assert.deepEqual([...ids].sort(), ['a', 'a-1', 'a-2', 'b']);
});

test('buildWorkflowEdges includes blocks edges and optional parent edges', () => {
  const issues: BeadIssue[] = [
    issue({ id: 'epic-1', issue_type: 'epic' }),
    issue({ id: 'a', dependencies: [{ type: 'parent', target: 'epic-1' }] }),
    issue({ id: 'a-1', dependencies: [{ type: 'parent', target: 'a' }, { type: 'blocks', target: 'b' }] }),
    issue({ id: 'b', dependencies: [{ type: 'parent', target: 'epic-1' }] }),
  ];

  const visibleIds = new Set(['a', 'a-1', 'b']);

  const withoutHierarchy = buildWorkflowEdges({ issues, visibleIds, includeHierarchy: false, selectedId: null });
  const withHierarchy = buildWorkflowEdges({ issues, visibleIds, includeHierarchy: true, selectedId: null });

  assert.equal(withoutHierarchy.some((edge) => edge.kind === 'subtask'), false);
  assert.equal(withHierarchy.some((edge) => edge.kind === 'subtask'), true);
  assert.equal(withoutHierarchy.some((edge) => edge.kind === 'blocks'), true);
});
