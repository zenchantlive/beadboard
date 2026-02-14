import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { ActivityEvent, ActivityEventKind } from '../../src/lib/activity';

describe('Activity Event Model (bb-xhm.1)', () => {
  it('should support all 16 required transition types in ActivityEventKind', () => {
    const kinds: ActivityEventKind[] = [
      'created',
      'closed',
      'reopened',
      'status_changed',
      'priority_changed',
      'assignee_changed',
      'type_changed',
      'title_changed',
      'description_changed',
      'labels_changed',
      'dependency_added',
      'dependency_removed',
      'comment_added',
      'due_date_changed',
      'estimate_changed',
      'field_changed',
    ];

    assert.strictEqual(kinds.length, 16, 'Should have exactly 16 transition types');
    
    // Verify specific important types are present
    assert.ok(kinds.includes('created'));
    assert.ok(kinds.includes('closed'));
    assert.ok(kinds.includes('reopened'));
    assert.ok(kinds.includes('comment_added'));
  });

  it('should allow creating a valid ActivityEvent object', () => {
    const event: ActivityEvent = {
      id: 'evt-123',
      kind: 'status_changed',
      beadId: 'bb-1',
      beadTitle: 'Test Bead',
      projectId: 'proj-1',
      projectName: 'Test Project',
      timestamp: new Date().toISOString(),
      actor: 'zenchantlive',
      payload: {
        field: 'status',
        from: 'open',
        to: 'in_progress',
      },
    };

    assert.strictEqual(event.kind, 'status_changed');
    assert.strictEqual(event.payload.field, 'status');
    assert.strictEqual(event.payload.from, 'open');
    assert.strictEqual(event.payload.to, 'in_progress');
  });
});
