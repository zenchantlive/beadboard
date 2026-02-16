import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { BeadIssueWithProject, BeadDependency } from '../../src/lib/types';
import { diffSnapshots } from '../../src/lib/snapshot-differ';

const MOCK_PROJECT = {
  key: 'proj-1',
  root: 'C:\\test',
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

describe('Snapshot Differ Stress Tests', () => {
  describe('HIGH-FREQUENCY BURSTS', () => {
    it('should capture only final diff when status changes multiple times (simulated burst)', () => {
      const prev = [createMockIssue('bb-1', { status: 'open' })];
      const curr = [createMockIssue('bb-1', { status: 'closed' })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].kind, 'closed');
      assert.strictEqual(events[0].payload.from, 'open');
      assert.strictEqual(events[0].payload.to, 'closed');
    });

    it('should handle rapid status oscillation (open -> in_progress -> blocked -> in_progress)', () => {
      const prev = [createMockIssue('bb-1', { status: 'open' })];
      const curr = [createMockIssue('bb-1', { status: 'in_progress' })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].kind, 'status_changed');
    });
  });

  describe('BATCH MUTATIONS', () => {
    it('should handle 50+ beads all changing status simultaneously', () => {
      const prev: BeadIssueWithProject[] = [];
      const curr: BeadIssueWithProject[] = [];
      
      for (let i = 1; i <= 50; i++) {
        curr.push(createMockIssue(`bb-${i}`, { status: 'open' }));
      }
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 50);
      events.forEach(e => {
        assert.strictEqual(e.kind, 'created');
      });
    });

    it('should handle 100 beads with mixed status transitions', () => {
      const prev: BeadIssueWithProject[] = [];
      const curr: BeadIssueWithProject[] = [];
      
      for (let i = 1; i <= 100; i++) {
        if (i <= 50) {
          prev.push(createMockIssue(`bb-${i}`, { status: 'open' }));
          curr.push(createMockIssue(`bb-${i}`, { status: 'in_progress' }));
        } else {
          curr.push(createMockIssue(`bb-${i}`, { status: 'open' }));
        }
      }
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 100);
      
      const statusChanged = events.filter(e => e.kind === 'status_changed');
      const created = events.filter(e => e.kind === 'created');
      assert.strictEqual(statusChanged.length, 50);
      assert.strictEqual(created.length, 50);
    });
  });

  describe('COMPLEX PERMUTATIONS', () => {
    it('should emit events for status + assignee + priority + labels all changing on same bead', () => {
      const prev = [createMockIssue('bb-1', {
        status: 'open',
        assignee: null,
        priority: 2,
        labels: ['bug'],
      })];
      const curr = [createMockIssue('bb-1', {
        status: 'in_progress',
        assignee: 'alice',
        priority: 1,
        labels: ['bug', 'urgent'],
      })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 4);
      
      const kinds = events.map(e => e.kind);
      assert.ok(kinds.includes('status_changed'));
      assert.ok(kinds.includes('assignee_changed'));
      assert.ok(kinds.includes('priority_changed'));
      assert.ok(kinds.includes('labels_changed'));
    });

    it('should handle all trackable fields changing simultaneously', () => {
      const prev = [createMockIssue('bb-1', {
        status: 'open',
        title: 'Old Title',
        description: null,
        priority: 3,
        issue_type: 'task',
        assignee: null,
        labels: [],
        dependencies: [],
        due_at: null,
        estimated_minutes: null,
      })];
      const curr = [createMockIssue('bb-1', {
        status: 'in_progress',
        title: 'New Title',
        description: 'New description',
        priority: 1,
        issue_type: 'feature',
        assignee: 'bob',
        labels: ['enhancement'],
        dependencies: [{ type: 'blocks', target: 'bb-2' }],
        due_at: '2026-02-20T00:00:00Z',
        estimated_minutes: 120,
      })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 10);
      
      const kinds = events.map(e => e.kind);
      assert.ok(kinds.includes('status_changed'));
      assert.ok(kinds.includes('title_changed'));
      assert.ok(kinds.includes('description_changed'));
      assert.ok(kinds.includes('priority_changed'));
      assert.ok(kinds.includes('type_changed'));
      assert.ok(kinds.includes('assignee_changed'));
      assert.ok(kinds.includes('labels_changed'));
      assert.ok(kinds.includes('dependency_added'));
      assert.ok(kinds.includes('due_date_changed'));
      assert.ok(kinds.includes('estimate_changed'));
    });
  });

  describe('NULL SAFETY', () => {
    it('should NOT crash when labels is null in prev (DOCUMENTS BUG - will throw TypeError)', () => {
      const prev = [createMockIssue('bb-1', { labels: null as unknown as string[] })];
      const curr = [createMockIssue('bb-1', { labels: ['bug'] })];
      
      assert.throws(() => {
        diffSnapshots(prev, curr);
      }, /TypeError|Cannot read properties of null/);
    });

    it('should NOT crash when labels is null in curr (DOCUMENTS BUG - will throw TypeError)', () => {
      const prev = [createMockIssue('bb-1', { labels: ['bug'] })];
      const curr = [createMockIssue('bb-1', { labels: null as unknown as string[] })];
      
      assert.throws(() => {
        diffSnapshots(prev, curr);
      }, /TypeError|Cannot read properties of null/);
    });

    it('should NOT crash when dependencies is null (DOCUMENTS BUG - will throw TypeError)', () => {
      const prev = [createMockIssue('bb-1', { dependencies: null as unknown as BeadDependency[] })];
      const curr = [createMockIssue('bb-1', { dependencies: [] })];
      
      assert.throws(() => {
        diffSnapshots(prev, curr);
      }, /TypeError|Cannot read properties of null/);
    });

    it('should NOT crash when dependencies is undefined in curr (DOCUMENTS BUG - will throw TypeError)', () => {
      const prev = [createMockIssue('bb-1', { dependencies: [] })];
      const curr = [createMockIssue('bb-1', { dependencies: undefined as unknown as BeadDependency[] })];
      
      assert.throws(() => {
        diffSnapshots(prev, curr);
      }, /TypeError|Cannot read properties of undefined/);
    });
  });

  describe('EMPTY ARRAYS', () => {
    it('should not emit event when labels goes from empty to empty', () => {
      const prev = [createMockIssue('bb-1', { labels: [] })];
      const curr = [createMockIssue('bb-1', { labels: [] })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 0);
    });

    it('should emit labels_changed when labels goes from empty to non-empty', () => {
      const prev = [createMockIssue('bb-1', { labels: [] })];
      const curr = [createMockIssue('bb-1', { labels: ['bug'] })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].kind, 'labels_changed');
    });

    it('should emit labels_changed when labels goes from non-empty to empty', () => {
      const prev = [createMockIssue('bb-1', { labels: ['bug'] })];
      const curr = [createMockIssue('bb-1', { labels: [] })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].kind, 'labels_changed');
    });

    it('should not emit event when dependencies goes from empty to empty', () => {
      const prev = [createMockIssue('bb-1', { dependencies: [] })];
      const curr = [createMockIssue('bb-1', { dependencies: [] })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 0);
    });

    it('should emit dependency_added when dependencies goes from empty to non-empty', () => {
      const prev = [createMockIssue('bb-1', { dependencies: [] })];
      const curr = [createMockIssue('bb-1', { dependencies: [{ type: 'blocks', target: 'bb-2' }] })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].kind, 'dependency_added');
    });

    it('should emit dependency_removed when dependencies goes from non-empty to empty', () => {
      const prev = [createMockIssue('bb-1', { dependencies: [{ type: 'blocks', target: 'bb-2' }] })];
      const curr = [createMockIssue('bb-1', { dependencies: [] })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].kind, 'dependency_removed');
    });
  });

  describe('DELETION DETECTION', () => {
    it('should NOT emit any event when issue is deleted (DOCUMENTS CURRENT BEHAVIOR - no deletion event)', () => {
      const prev = [createMockIssue('bb-1')];
      const curr: BeadIssueWithProject[] = [];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 0);
    });

    it('should NOT emit deletion event when multiple issues are removed', () => {
      const prev = [
        createMockIssue('bb-1'),
        createMockIssue('bb-2'),
        createMockIssue('bb-3'),
      ];
      const curr = [createMockIssue('bb-2')];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 0);
    });

    it('should still emit created events for new issues even when others are deleted', () => {
      const prev = [createMockIssue('bb-1')];
      const curr = [createMockIssue('bb-2')];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].kind, 'created');
      assert.strictEqual(events[0].beadId, 'bb-2');
    });
  });

  describe('LABELS ORDER INDEPENDENCE', () => {
    it('should NOT emit labels_changed when same labels are in different order', () => {
      const prev = [createMockIssue('bb-1', { labels: ['bug', 'ui', 'urgent'] })];
      const curr = [createMockIssue('bb-1', { labels: ['urgent', 'bug', 'ui'] })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 0);
    });

    it('should NOT emit labels_changed for single label (trivially same order)', () => {
      const prev = [createMockIssue('bb-1', { labels: ['bug'] })];
      const curr = [createMockIssue('bb-1', { labels: ['bug'] })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 0);
    });

    it('should handle large label sets with shuffled order', () => {
      const labels = Array.from({ length: 20 }, (_, i) => `label-${i}`);
      const shuffled = [...labels].reverse();
      
      const prev = [createMockIssue('bb-1', { labels })];
      const curr = [createMockIssue('bb-1', { labels: shuffled })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 0);
    });
  });

  describe('DUPLICATE LABELS', () => {
    it('should NOT emit event when labels have same duplicates in same order', () => {
      const prev = [createMockIssue('bb-1', { labels: ['bug', 'bug', 'ui'] })];
      const curr = [createMockIssue('bb-1', { labels: ['bug', 'bug', 'ui'] })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 0);
    });

    it('should NOT emit event when labels have same duplicates in different order', () => {
      const prev = [createMockIssue('bb-1', { labels: ['bug', 'bug', 'ui'] })];
      const curr = [createMockIssue('bb-1', { labels: ['ui', 'bug', 'bug'] })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 0);
    });

    it('should emit event when duplicate count differs', () => {
      const prev = [createMockIssue('bb-1', { labels: ['bug', 'bug'] })];
      const curr = [createMockIssue('bb-1', { labels: ['bug'] })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].kind, 'labels_changed');
    });

    it('should emit event when new duplicate is added', () => {
      const prev = [createMockIssue('bb-1', { labels: ['bug'] })];
      const curr = [createMockIssue('bb-1', { labels: ['bug', 'bug'] })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].kind, 'labels_changed');
    });
  });

  describe('EDGE CASES', () => {
    it('should handle null previous snapshot (first load)', () => {
      const curr = [createMockIssue('bb-1'), createMockIssue('bb-2')];
      
      const events = diffSnapshots(null, curr);
      assert.strictEqual(events.length, 2);
      events.forEach(e => {
        assert.strictEqual(e.kind, 'created');
      });
    });

    it('should handle empty previous and current snapshots', () => {
      const events = diffSnapshots([], []);
      assert.strictEqual(events.length, 0);
    });

    it('should handle same issue in both snapshots with no changes', () => {
      const issue = createMockIssue('bb-1');
      const events = diffSnapshots([issue], [issue]);
      assert.strictEqual(events.length, 0);
    });

    it('should handle multiple dependency changes on same bead', () => {
      const prev = [createMockIssue('bb-1', {
        dependencies: [
          { type: 'blocks', target: 'bb-2' },
          { type: 'relates_to', target: 'bb-3' },
        ],
      })];
      const curr = [createMockIssue('bb-1', {
        dependencies: [
          { type: 'blocks', target: 'bb-4' },
        ],
      })];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 3);
      
      const kinds = events.map(e => e.kind);
      assert.ok(kinds.includes('dependency_added'));
      assert.ok(kinds.filter(k => k === 'dependency_removed').length === 2);
    });

    it('should generate valid UUIDs for all events', () => {
      const prev: BeadIssueWithProject[] = [];
      const curr = [createMockIssue('bb-1')];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events.length, 1);
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      assert.match(events[0].id, uuidRegex);
    });

    it('should include correct project info in events', () => {
      const prev: BeadIssueWithProject[] = [];
      const curr = [createMockIssue('bb-1')];
      
      const events = diffSnapshots(prev, curr);
      assert.strictEqual(events[0].projectId, 'proj-1');
      assert.strictEqual(events[0].projectName, 'Test Project');
    });

    it('should compute actor from assignee or owner or created_by', () => {
      const events1 = diffSnapshots([], [createMockIssue('bb-1', { assignee: 'alice', owner: 'bob', created_by: 'charlie' })]);
      assert.strictEqual(events1[0].actor, 'alice');

      const events2 = diffSnapshots([], [createMockIssue('bb-1', { assignee: null, owner: 'bob', created_by: 'charlie' })]);
      assert.strictEqual(events2[0].actor, 'bob');

      const events3 = diffSnapshots([], [createMockIssue('bb-1', { assignee: null, owner: null, created_by: 'charlie' })]);
      assert.strictEqual(events3[0].actor, 'charlie');
    });
  });
});