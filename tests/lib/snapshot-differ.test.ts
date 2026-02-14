import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { BeadIssueWithProject } from '../../src/lib/types';
import { diffSnapshots } from '../../src/lib/snapshot-differ';

const MOCK_PROJECT = {
  key: 'proj-1',
  root: 'C:\\test', // Corrected: Escaped backslash for Windows path
  displayPath: 'test',
  name: 'Test Project',
  source: 'local' as const,
  addedAt: null,
};

function createMockIssue(id: string, overrides: Partial<BeadIssueWithProject> = {}): BeadIssueWithProject {
  return {
    id,
    title: `Title ${id}`,
    description: null,
    status: 'open',
    priority: 2,
    issue_type: 'task',
    assignee: null,
    owner: 'owner',
    labels: [],
    dependencies: [],
    created_at: '2026-02-13T00:00:00Z',
    updated_at: '2026-02-13T00:00:00Z',
    closed_at: null,
    close_reason: null,
    closed_by_session: null,
    created_by: 'creator',
    due_at: null,
    estimated_minutes: null,
    external_ref: null,
    metadata: {},
    project: MOCK_PROJECT,
    ...overrides,
  };
}

describe('Snapshot Differ (bb-xhm.2)', () => {
  it('should emit "created" for new issues', () => {
    const prev: BeadIssueWithProject[] = [];
    const curr: BeadIssueWithProject[] = [createMockIssue('bb-1')];
    
    const events = diffSnapshots(prev, curr);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].kind, 'created');
    assert.strictEqual(events[0].beadId, 'bb-1');
  });

  it('should emit "status_changed" for non-closed status transitions', () => {
    const prev = [createMockIssue('bb-1', { status: 'open' })];
    const curr = [createMockIssue('bb-1', { status: 'in_progress' })];
    
    const events = diffSnapshots(prev, curr);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].kind, 'status_changed');
    assert.strictEqual(events[0].payload.from, 'open');
    assert.strictEqual(events[0].payload.to, 'in_progress');
  });

  it('should emit "closed" when status moves to closed', () => {
    const prev = [createMockIssue('bb-1', { status: 'in_progress' })];
    const curr = [createMockIssue('bb-1', { status: 'closed', closed_at: '2026-02-13T01:00:00Z' })];
    
    const events = diffSnapshots(prev, curr);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].kind, 'closed');
  });

  it('should emit "reopened" when status moves from closed to open', () => {
    const prev = [createMockIssue('bb-1', { status: 'closed' })];
    const curr = [createMockIssue('bb-1', { status: 'open' })];
    
    const events = diffSnapshots(prev, curr);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].kind, 'reopened');
  });

  it('should emit "assignee_changed" (assigned/unassigned/reassigned)', () => {
    // Assigned
    let events = diffSnapshots(
      [createMockIssue('bb-1', { assignee: null })],
      [createMockIssue('bb-1', { assignee: 'alice' })]
    );
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].kind, 'assignee_changed');
    assert.strictEqual(events[0].payload.to, 'alice');

    // Unassigned
    events = diffSnapshots(
      [createMockIssue('bb-1', { assignee: 'alice' })],
      [createMockIssue('bb-1', { assignee: null })]
    );
    assert.strictEqual(events[0].payload.from, 'alice');
    assert.strictEqual(events[0].payload.to, null);

    // Reassigned
    events = diffSnapshots(
      [createMockIssue('bb-1', { assignee: 'alice' })],
      [createMockIssue('bb-1', { assignee: 'bob' })]
    );
    assert.strictEqual(events[0].payload.from, 'alice');
    assert.strictEqual(events[0].payload.to, 'bob');
  });

  it('should emit "labels_changed" when labels are modified', () => {
    const prev = [createMockIssue('bb-1', { labels: ['bug'] })];
    const curr = [createMockIssue('bb-1', { labels: ['bug', 'ui'] })];
    
    const events = diffSnapshots(prev, curr);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].kind, 'labels_changed');
  });

  it('should emit "dependency_added" and "dependency_removed"', () => {
    const prev = [createMockIssue('bb-1', { dependencies: [] })];
    const curr = [createMockIssue('bb-1', { dependencies: [{ type: 'blocks', target: 'bb-2' }] })];
    
    const events = diffSnapshots(prev, curr);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].kind, 'dependency_added');
    assert.strictEqual(events[0].payload.to, 'bb-2');
  });

  it('should ignore noise (updated_at only changes)', () => {
    const prev = [createMockIssue('bb-1', { updated_at: '2026-02-13T00:00:00Z' })];
    const curr = [createMockIssue('bb-1', { updated_at: '2026-02-13T00:01:00Z' })];
    
    const events = diffSnapshots(prev, curr);
    assert.strictEqual(events.length, 0);
  });

  it('should emit multiple events for multiple field changes', () => {
    const prev = [createMockIssue('bb-1', { status: 'open', assignee: null })];
    const curr = [createMockIssue('bb-1', { status: 'in_progress', assignee: 'alice' })];
    
    const events = diffSnapshots(prev, curr);
    assert.strictEqual(events.length, 2);
    const kinds = events.map(e => e.kind);
    assert.ok(kinds.includes('status_changed'));
    assert.ok(kinds.includes('assignee_changed'));
  });
});
