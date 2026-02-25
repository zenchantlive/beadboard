import test from 'node:test';
import assert from 'node:assert/strict';

import type { BeadDependency, BeadIssue } from '../../src/lib/types';
import { buildGraphModel } from '../../src/lib/graph';
import { detectDependencyCycles, analyzeBlockedChain } from '../../src/lib/graph-view';

// Helper to create minimal BeadIssue for testing
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

// Test the hook module exports
test('useGraphAnalysis - module exports', async () => {
  const mod = await import('../../src/hooks/use-graph-analysis');
  assert.ok(mod.useGraphAnalysis, 'useGraphAnalysis should be exported');
  assert.equal(typeof mod.useGraphAnalysis, 'function', 'useGraphAnalysis should be a function');
});

// Test the underlying logic that the hook uses
test('useGraphAnalysis underlying logic - graphModel is built correctly', () => {
  const issues: BeadIssue[] = [
    issue({ id: 'bb-1', title: 'Task 1', dependencies: [dep('blocks', 'bb-2')] }),
    issue({ id: 'bb-2', title: 'Task 2', dependencies: [] }),
  ];
  
  const graphModel = buildGraphModel(issues, { projectKey: 'test' });
  
  assert.ok(graphModel, 'graphModel should be returned');
  assert.equal(graphModel.nodes.length, 2, 'should have 2 nodes');
  assert.equal(graphModel.edges.length, 1, 'should have 1 edge');
  assert.ok(graphModel.adjacency, 'should have adjacency');
});

test('useGraphAnalysis underlying logic - cycleNodeIdSet detects cycles', () => {
  // Create a cycle: bb-1 blocks bb-2, bb-2 blocks bb-1
  const issues: BeadIssue[] = [
    issue({ id: 'bb-1', dependencies: [dep('blocks', 'bb-2')] }),
    issue({ id: 'bb-2', dependencies: [dep('blocks', 'bb-1')] }),
  ];
  
  const graphModel = buildGraphModel(issues, { projectKey: 'test' });
  const cycleAnalysis = detectDependencyCycles(graphModel);
  const cycleNodeIdSet = new Set(cycleAnalysis.cycleNodeIds);
  
  assert.ok(cycleNodeIdSet.has('bb-1'), 'bb-1 should be in cycle');
  assert.ok(cycleNodeIdSet.has('bb-2'), 'bb-2 should be in cycle');
});

test('useGraphAnalysis underlying logic - cycleNodeIdSet empty for acyclic graph', () => {
  const issues: BeadIssue[] = [
    issue({ id: 'bb-1', dependencies: [dep('blocks', 'bb-2')] }),
    issue({ id: 'bb-2', dependencies: [] }),
  ];
  
  const graphModel = buildGraphModel(issues, { projectKey: 'test' });
  const cycleAnalysis = detectDependencyCycles(graphModel);
  const cycleNodeIdSet = new Set(cycleAnalysis.cycleNodeIds);
  
  assert.equal(cycleNodeIdSet.size, 0, 'no cycles in acyclic graph');
});

test('useGraphAnalysis underlying logic - blockerAnalysis returns blockers', () => {
  // bb-1 blocks bb-2
  const issues: BeadIssue[] = [
    issue({ id: 'bb-1', dependencies: [] }),
    issue({ id: 'bb-2', dependencies: [dep('blocks', 'bb-1')] }),
  ];
  
  const graphModel = buildGraphModel(issues, { projectKey: 'test' });
  
  // bb-2 is blocked by bb-1
  const result = analyzeBlockedChain(graphModel, { focusId: 'bb-2' });
  assert.ok(result, 'should return analysis for valid focusId');
  assert.ok(result.blockerNodeIds.includes('bb-1'), 'bb-1 should be a blocker of bb-2');
});

test('useGraphAnalysis underlying logic - blockerTooltipMap shows blocker info', () => {
  // bb-1 blocks bb-2
  const issues: BeadIssue[] = [
    issue({ id: 'bb-1', title: 'Blocker Task', status: 'open', dependencies: [] }),
    issue({ id: 'bb-2', title: 'Blocked Task', status: 'open', dependencies: [dep('blocks', 'bb-1')] }),
  ];
  
  const graphModel = buildGraphModel(issues, { projectKey: 'test' });
  
  const blockerTooltipMap = new Map<string, string[]>();
  for (const issue of issues) {
    const adjacency = graphModel.adjacency[issue.id];
    if (!adjacency) continue;
    const lines: string[] = [];
    for (const edge of adjacency.incoming) {
      if (edge.type !== 'blocks') continue;
      const source = issues.find((i) => i.id === edge.source);
      if (source && source.status !== 'closed') {
        lines.push(`${source.id} (${source.status}) - "${source.title}"`);
      }
    }
    blockerTooltipMap.set(issue.id, lines);
  }
  
  // bb-2 should have bb-1 as blocker
  const bb2Tooltips = blockerTooltipMap.get('bb-2');
  assert.ok(bb2Tooltips, 'bb-2 should have blocker tooltips');
  assert.equal(bb2Tooltips.length, 1, 'bb-2 should have one blocker');
  assert.ok(bb2Tooltips[0].includes('bb-1'), 'tooltip should mention blocker id');
});
