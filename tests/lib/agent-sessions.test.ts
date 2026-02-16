import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { BeadIssue } from '../../src/lib/types';
import type { ActivityEvent } from '../../src/lib/activity';
import { buildSessionTaskFeed } from '../../src/lib/agent-sessions';

// Mock Data
const MOCK_ISSUE: BeadIssue = {
  id: 'task-1',
  title: 'Test Task',
  description: null,
  status: 'in_progress',
  priority: 2,
  issue_type: 'task',
  assignee: 'agent-smith',
  owner: 'user',
  labels: [],
  dependencies: [{ type: 'parent', target: 'epic-1' }],
  created_at: '2026-01-01',
  updated_at: '2026-01-02',
  closed_at: null,
  close_reason: null,
  closed_by_session: null,
  created_by: 'user',
  due_at: null,
  estimated_minutes: null,
  external_ref: null,
  metadata: {}
};

const MOCK_EPIC: BeadIssue = {
  ...MOCK_ISSUE,
  id: 'epic-1',
  title: 'Test Epic',
  issue_type: 'epic',
  status: 'open',
  dependencies: []
};

const MOCK_ACTIVITY: ActivityEvent = {
  id: 'evt-1',
  kind: 'comment_added',
  beadId: 'task-1',
  beadTitle: 'Test Task',
  projectId: 'root',
  projectName: 'root',
  timestamp: new Date().toISOString(), // Just now
  actor: 'agent-smith',
  payload: { message: 'Working on it' }
};

describe('Agent Sessions Aggregation', () => {
  it('should group tasks by epic', () => {
    const issues = [MOCK_EPIC, MOCK_ISSUE];
    const feed = buildSessionTaskFeed(issues, [], { messages: [] });
    
    assert.strictEqual(feed.length, 1); // 1 Epic group
    assert.strictEqual(feed[0].epic.id, 'epic-1');
    assert.strictEqual(feed[0].tasks.length, 1);
    assert.strictEqual(feed[0].tasks[0].id, 'task-1');
  });

  it('should handle orphan tasks in "Uncategorized" bucket', () => {
    const orphan = { ...MOCK_ISSUE, id: 'orphan-1', dependencies: [] };
    const feed = buildSessionTaskFeed([orphan], [], { messages: [] });
    
    assert.strictEqual(feed.length, 1);
    assert.strictEqual(feed[0].epic.title, 'Uncategorized');
    assert.strictEqual(feed[0].tasks[0].id, 'orphan-1');
  });

  it('should derive session state: active', () => {
    const issues = [MOCK_ISSUE]; // in_progress
    const feed = buildSessionTaskFeed(issues, [MOCK_ACTIVITY], { messages: [] });
    
    // MOCK_ISSUE is in_progress and has recent activity -> active
    const card = feed[0].tasks[0];
    assert.strictEqual(card.sessionState, 'active');
  });

  it('should derive session state: needs_input (blocked)', () => {
    const blocked = { ...MOCK_ISSUE, status: 'blocked' as const };
    const feed = buildSessionTaskFeed([blocked], [], { messages: [] });
    
    const card = feed[0].tasks[0];
    assert.strictEqual(card.sessionState, 'needs_input');
  });

  it('should derive session state: completed', () => {
    const closed = { ...MOCK_ISSUE, status: 'closed' as const };
    const feed = buildSessionTaskFeed([closed], [], { messages: [] });
    
    const card = feed[0].tasks[0];
    assert.strictEqual(card.sessionState, 'completed');
  });

  it('should identify stale sessions', () => {
    const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago
    const staleIssue = { ...MOCK_ISSUE, updated_at: staleTime };
    const oldActivity = { ...MOCK_ACTIVITY, timestamp: staleTime };
    
    const feed = buildSessionTaskFeed([staleIssue], [oldActivity], { messages: [] });
    
    const card = feed[0].tasks[0];
    assert.strictEqual(card.sessionState, 'stale');
  });

  it('should reflect agent liveness (evicted) in session state', () => {
    const issues = [MOCK_ISSUE];
    const livenessMap = { 'agent-smith': 'evicted' };
    
    const feed = buildSessionTaskFeed(issues, [], { messages: [] }, livenessMap);
    
    const card = feed[0].tasks[0];
    assert.strictEqual(card.sessionState, 'evicted');
  });
});
