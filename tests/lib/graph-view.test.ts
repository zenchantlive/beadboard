import test from 'node:test';
import assert from 'node:assert/strict';

import { buildGraphModel } from '../../src/lib/graph';
import { analyzeBlockedChain, buildGraphViewModel, buildPathWorkspace, detectDependencyCycles } from '../../src/lib/graph-view';
import type { BeadIssue } from '../../src/lib/types';

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

test('buildGraphViewModel limits visible nodes by hop depth around focus', () => {
  const model = buildGraphModel([
    issue({ id: 'bb-1', dependencies: [{ type: 'blocks', target: 'bb-2' }] }),
    issue({ id: 'bb-2', dependencies: [{ type: 'blocks', target: 'bb-3' }] }),
    issue({ id: 'bb-3', dependencies: [{ type: 'blocks', target: 'bb-4' }] }),
    issue({ id: 'bb-4' }),
  ]);

  const depth1 = buildGraphViewModel(model, { focusId: 'bb-2', depth: 1, hideClosed: false });
  const depth2 = buildGraphViewModel(model, { focusId: 'bb-2', depth: 2, hideClosed: false });

  assert.deepEqual(
    depth1.nodes.map((x) => x.id),
    ['bb-2', 'bb-1', 'bb-3'],
  );
  assert.deepEqual(
    depth2.nodes.map((x) => x.id),
    ['bb-2', 'bb-1', 'bb-3', 'bb-4'],
  );
});

test('buildGraphViewModel can hide closed nodes while preserving focused node', () => {
  const model = buildGraphModel([
    issue({ id: 'bb-1', status: 'closed', dependencies: [{ type: 'blocks', target: 'bb-2' }] }),
    issue({ id: 'bb-2', status: 'open' }),
  ]);

  const hidden = buildGraphViewModel(model, { focusId: null, depth: 'full', hideClosed: true });
  const focused = buildGraphViewModel(model, { focusId: 'bb-1', depth: 'full', hideClosed: true });

  assert.deepEqual(hidden.nodes.map((x) => x.id), ['bb-2']);
  assert.deepEqual(focused.nodes.map((x) => x.id), ['bb-1', 'bb-2']);
});

test('buildGraphViewModel keeps deterministic edge ordering', () => {
  const model = buildGraphModel([
    issue({
      id: 'bb-2',
      dependencies: [
        { type: 'parent', target: 'bb-1' },
        { type: 'blocks', target: 'bb-3' },
      ],
    }),
    issue({ id: 'bb-1' }),
    issue({ id: 'bb-3' }),
  ]);

  const view = buildGraphViewModel(model, { focusId: null, depth: 'full', hideClosed: false });

  assert.deepEqual(
    view.edges.map((x) => `${x.source}|${x.type}|${x.target}`),
    ['bb-2|blocks|bb-3', 'bb-2|parent|bb-1'],
  );
  assert.equal(view.nodes.every((x) => Number.isFinite(x.position.x) && Number.isFinite(x.position.y)), true);
});

test('buildPathWorkspace returns upstream/downstream levels around focus', () => {
  const model = buildGraphModel([
    issue({ id: 'bb-1', dependencies: [{ type: 'blocks', target: 'bb-2' }] }),
    issue({ id: 'bb-2', dependencies: [{ type: 'blocks', target: 'bb-3' }] }),
    issue({ id: 'bb-3' }),
  ]);

  const workspace = buildPathWorkspace(model, { focusId: 'bb-2', depth: 2, hideClosed: false });

  assert.equal(workspace.focus?.id, 'bb-2');
  assert.deepEqual(workspace.blockers.map((level) => level.map((node) => node.id)), [['bb-1']]);
  assert.deepEqual(workspace.dependents.map((level) => level.map((node) => node.id)), [['bb-3']]);
});

test('buildPathWorkspace hides closed nodes when requested', () => {
  const model = buildGraphModel([
    issue({ id: 'bb-1', status: 'closed', dependencies: [{ type: 'blocks', target: 'bb-2' }] }),
    issue({ id: 'bb-2' }),
  ]);

  const workspace = buildPathWorkspace(model, { focusId: 'bb-2', depth: 2, hideClosed: true });
  assert.equal(workspace.blockers.length, 0);
  assert.equal(workspace.focus?.id, 'bb-2');
});

test('buildPathWorkspace full depth keeps deterministic blocker and dependent levels', () => {
  const model = buildGraphModel([
    issue({ id: 'bb-1', dependencies: [{ type: 'blocks', target: 'bb-2' }] }),
    issue({ id: 'bb-2', dependencies: [{ type: 'blocks', target: 'bb-3' }] }),
    issue({ id: 'bb-3', dependencies: [{ type: 'blocks', target: 'bb-4' }] }),
    issue({ id: 'bb-4', dependencies: [{ type: 'blocks', target: 'bb-5' }] }),
    issue({ id: 'bb-5' }),
  ]);

  const workspace = buildPathWorkspace(model, { focusId: 'bb-3', depth: 'full', hideClosed: false });

  assert.deepEqual(workspace.blockers.map((level) => level.map((node) => node.id)), [['bb-2'], ['bb-1']]);
  assert.deepEqual(workspace.dependents.map((level) => level.map((node) => node.id)), [['bb-4'], ['bb-5']]);
});

test('analyzeBlockedChain returns blocker counts, first actionable blocker, and chain edges', () => {
  const model = buildGraphModel([
    issue({ id: 'bb-1', status: 'open', dependencies: [{ type: 'blocks', target: 'bb-2' }] }),
    issue({ id: 'bb-2', status: 'in_progress', dependencies: [{ type: 'blocks', target: 'bb-3' }] }),
    issue({ id: 'bb-3', status: 'blocked' }),
  ]);

  const summary = analyzeBlockedChain(model, { focusId: 'bb-3' });

  assert.equal(summary.blockerNodeIds.length, 2);
  assert.equal(summary.openBlockerCount, 1);
  assert.equal(summary.inProgressBlockerCount, 1);
  assert.equal(summary.firstActionableBlockerId, 'bb-1');
  assert.deepEqual(summary.chainEdgeIds, ['bb-1:blocks:bb-2', 'bb-2:blocks:bb-3']);
});

test('detectDependencyCycles reports cycle nodes and edges for blocks relations', () => {
  const model = buildGraphModel([
    issue({ id: 'bb-1', dependencies: [{ type: 'blocks', target: 'bb-2' }] }),
    issue({ id: 'bb-2', dependencies: [{ type: 'blocks', target: 'bb-3' }] }),
    issue({ id: 'bb-3', dependencies: [{ type: 'blocks', target: 'bb-1' }] }),
    issue({ id: 'bb-4', dependencies: [{ type: 'blocks', target: 'bb-5' }] }),
    issue({ id: 'bb-5' }),
  ]);

  const anomaly = detectDependencyCycles(model);

  assert.equal(anomaly.cycles.length, 1);
  assert.deepEqual(anomaly.cycleNodeIds, ['bb-1', 'bb-2', 'bb-3']);
  assert.deepEqual(anomaly.cycleEdgeIds, ['bb-1:blocks:bb-2', 'bb-2:blocks:bb-3', 'bb-3:blocks:bb-1']);
});

test('detectDependencyCycles does not mark non-cycle predecessor as cyclic', () => {
  const model = buildGraphModel([
    issue({ id: 'bb-a', dependencies: [{ type: 'blocks', target: 'bb-b' }] }),
    issue({ id: 'bb-b', dependencies: [{ type: 'blocks', target: 'bb-c' }] }),
    issue({ id: 'bb-c', dependencies: [{ type: 'blocks', target: 'bb-a' }] }),
    issue({ id: 'bb-x', dependencies: [{ type: 'blocks', target: 'bb-a' }] }),
  ]);

  const anomaly = detectDependencyCycles(model);

  assert.deepEqual(anomaly.cycleNodeIds, ['bb-a', 'bb-b', 'bb-c']);
  assert.equal(anomaly.cycleNodeIds.includes('bb-x'), false);
  assert.equal(anomaly.cycleEdgeIds.includes('bb-x:blocks:bb-a'), false);
});
