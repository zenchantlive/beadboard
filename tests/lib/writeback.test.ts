import test from 'node:test';
import assert from 'node:assert/strict';

import { applyOptimisticStatus, planStatusTransition } from '../../src/lib/writeback';
import type { BeadIssue } from '../../src/lib/types';

test('planStatusTransition maps open -> closed to close command', () => {
  const steps = planStatusTransition({ id: 'bb-1', status: 'open' }, 'closed');
  assert.deepEqual(steps, [{ operation: 'close', payload: { id: 'bb-1', reason: 'Moved to closed via board drag-and-drop' } }]);
});

test('planStatusTransition maps closed -> in_progress to reopen + update', () => {
  const steps = planStatusTransition({ id: 'bb-2', status: 'closed' }, 'in_progress');
  assert.deepEqual(steps, [
    { operation: 'reopen', payload: { id: 'bb-2', reason: 'Moved from closed via board drag-and-drop' } },
    { operation: 'update', payload: { id: 'bb-2', status: 'in_progress' } },
  ]);
});

test('planStatusTransition maps non-closed transitions to update', () => {
  const steps = planStatusTransition({ id: 'bb-3', status: 'blocked' }, 'open');
  assert.deepEqual(steps, [{ operation: 'update', payload: { id: 'bb-3', status: 'open' } }]);
});

test('applyOptimisticStatus updates selected issue status and timestamps', () => {
  const issues: BeadIssue[] = [
    {
      id: 'bb-1',
      title: 'One',
      description: null,
      status: 'open',
      priority: 2,
      issue_type: 'task',
      assignee: null,
      owner: null,
      labels: [],
      dependencies: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      closed_at: null,
      close_reason: null,
      closed_by_session: null,
      created_by: null,
      due_at: null,
      estimated_minutes: null,
      external_ref: null,
      metadata: {},
    },
  ];

  const updated = applyOptimisticStatus(issues, 'bb-1', 'closed', '2026-02-12T00:00:00Z');
  assert.equal(updated[0].status, 'closed');
  assert.equal(updated[0].closed_at, '2026-02-12T00:00:00Z');
  assert.equal(updated[0].updated_at, '2026-02-12T00:00:00Z');
});
