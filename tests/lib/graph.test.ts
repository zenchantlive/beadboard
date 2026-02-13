import test from 'node:test';
import assert from 'node:assert/strict';

import type { BeadDependency, BeadIssue } from '../../src/lib/types';
import { buildGraphModel } from '../../src/lib/graph';

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

function dep(type: BeadDependency['type'], target: string): BeadDependency {
  return { type, target };
}

test('buildGraphModel extracts supported dependency types with deterministic ordering', () => {
  const issues = [
    issue({
      id: 'bb-2',
      dependencies: [
        dep('parent', 'bb-1'),
        dep('blocks', 'bb-3'),
      ],
    }),
    issue({
      id: 'bb-1',
      dependencies: [dep('supersedes', 'bb-3')],
    }),
    issue({
      id: 'bb-3',
      dependencies: [
        dep('duplicates', 'bb-1'),
        dep('relates_to', 'bb-2'),
      ],
    }),
  ];

  const model = buildGraphModel(issues, { projectKey: 'demo' });

  assert.deepEqual(model.nodes.map((x) => x.id), ['bb-1', 'bb-2', 'bb-3']);
  assert.deepEqual(
    model.edges.map((x) => `${x.source}|${x.type}|${x.target}`),
    [
      'bb-1|supersedes|bb-3',
      'bb-2|parent|bb-1',
      'bb-3|blocks|bb-2',
      'bb-3|duplicates|bb-1',
      'bb-3|relates_to|bb-2',
    ],
  );
  assert.equal(model.projectKey, 'demo');
});

test('buildGraphModel deduplicates duplicate edges and tracks diagnostics', () => {
  const issues = [
    issue({
      id: 'bb-1',
      dependencies: [
        dep('blocks', 'bb-2'),
        dep('blocks', 'bb-2'),
        dep('blocks', 'bb-2'),
      ],
    }),
    issue({ id: 'bb-2' }),
  ];

  const model = buildGraphModel(issues);

  assert.equal(model.edges.length, 1);
  assert.equal(model.diagnostics.droppedDuplicates, 2);
  assert.equal(model.diagnostics.missingTargets, 0);
});

test('buildGraphModel ignores missing-target edges and unsupported types', () => {
  const issues = [
    issue({
      id: 'bb-1',
      dependencies: [
        dep('blocks', 'bb-missing'),
        dep('replies_to', 'bb-2'),
      ],
    }),
    issue({ id: 'bb-2' }),
  ];

  const model = buildGraphModel(issues);

  assert.equal(model.edges.length, 0);
  assert.equal(model.diagnostics.missingTargets, 1);
  assert.equal(model.diagnostics.unsupportedTypes, 1);
});

test('buildGraphModel builds incoming/outgoing adjacency maps', () => {
  const issues = [
    issue({ id: 'bb-1', dependencies: [dep('blocks', 'bb-2')] }),
    issue({ id: 'bb-2', dependencies: [dep('parent', 'bb-3')] }),
    issue({ id: 'bb-3' }),
  ];

  const model = buildGraphModel(issues);

  assert.deepEqual(model.adjacency['bb-1'].outgoing.map((x) => x.target), []);
  assert.deepEqual(model.adjacency['bb-1'].incoming.map((x) => x.source), ['bb-2']);
  assert.deepEqual(model.adjacency['bb-2'].incoming.map((x) => x.source), []);
  assert.deepEqual(model.adjacency['bb-2'].outgoing.map((x) => x.target), ['bb-1', 'bb-3']);
  assert.deepEqual(model.adjacency['bb-3'].incoming.map((x) => x.source), ['bb-2']);
});
