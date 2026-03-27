import test from 'node:test';
import assert from 'node:assert/strict';

import { countRecentCompletedWorkers, listRecentCompletedWorkers } from '../../src/lib/runtime-event-summary';
import type { RuntimeConsoleEvent } from '../../src/lib/embedded-runtime';

function makeEvent(overrides: Partial<RuntimeConsoleEvent> & Pick<RuntimeConsoleEvent, 'id' | 'kind' | 'projectId' | 'title' | 'detail' | 'timestamp'>): RuntimeConsoleEvent {
  return {
    id: overrides.id,
    kind: overrides.kind,
    projectId: overrides.projectId,
    title: overrides.title,
    detail: overrides.detail,
    timestamp: overrides.timestamp,
    status: overrides.status,
    actorLabel: overrides.actorLabel,
    taskId: overrides.taskId ?? null,
    swarmId: overrides.swarmId ?? null,
    metadata: overrides.metadata,
  };
}

test('countRecentCompletedWorkers counts latest recent completion per worker identity', () => {
  const now = Date.parse('2026-03-27T05:00:00.000Z');
  const events = [
    makeEvent({
      id: 'evt-1',
      kind: 'worker.completed',
      projectId: 'bb',
      title: 'Worker A completed',
      detail: 'Done',
      timestamp: '2026-03-27T04:58:00.000Z',
      metadata: { workerId: 'worker-a' },
    }),
    makeEvent({
      id: 'evt-2',
      kind: 'worker.completed',
      projectId: 'bb',
      title: 'Worker B completed',
      detail: 'Done',
      timestamp: '2026-03-27T04:57:00.000Z',
      metadata: { workerId: 'worker-b' },
    }),
  ];

  assert.equal(countRecentCompletedWorkers(events, { now }), 2);
});

test('countRecentCompletedWorkers ignores duplicate reconnect frames for the same worker completion', () => {
  const now = Date.parse('2026-03-27T05:00:00.000Z');
  const events = [
    makeEvent({
      id: 'evt-1',
      kind: 'worker.completed',
      projectId: 'bb',
      title: 'Worker A completed',
      detail: 'Done',
      timestamp: '2026-03-27T04:58:00.000Z',
      metadata: { workerId: 'worker-a' },
    }),
    makeEvent({
      id: 'evt-1-replayed',
      kind: 'worker.completed',
      projectId: 'bb',
      title: 'Worker A completed',
      detail: 'Done',
      timestamp: '2026-03-27T04:58:00.000Z',
      metadata: { workerId: 'worker-a' },
    }),
  ];

  assert.equal(countRecentCompletedWorkers(events, { now }), 1);
});

test('countRecentCompletedWorkers excludes stale completions and workers that later fail', () => {
  const now = Date.parse('2026-03-27T05:00:00.000Z');
  const events = [
    makeEvent({
      id: 'evt-stale',
      kind: 'worker.completed',
      projectId: 'bb',
      title: 'Worker stale completed',
      detail: 'Done',
      timestamp: '2026-03-27T04:10:00.000Z',
      metadata: { workerId: 'worker-stale' },
    }),
    makeEvent({
      id: 'evt-completed',
      kind: 'worker.completed',
      projectId: 'bb',
      title: 'Worker retry completed',
      detail: 'Done',
      timestamp: '2026-03-27T04:56:00.000Z',
      metadata: { workerId: 'worker-retry' },
    }),
    makeEvent({
      id: 'evt-failed',
      kind: 'worker.failed',
      projectId: 'bb',
      title: 'Worker retry failed',
      detail: 'Oops',
      timestamp: '2026-03-27T04:59:00.000Z',
      metadata: { workerId: 'worker-retry' },
    }),
  ];

  assert.equal(countRecentCompletedWorkers(events, { now }), 0);
});

test('listRecentCompletedWorkers returns a deduped, newest-first completion summary list', () => {
  const now = Date.parse('2026-03-27T05:00:00.000Z');
  const events = [
    makeEvent({
      id: 'evt-old',
      kind: 'worker.completed',
      projectId: 'bb',
      title: 'Worker old completed',
      detail: 'Done',
      timestamp: '2026-03-27T04:48:00.000Z',
      metadata: { workerId: 'worker-old' },
      taskId: 'beadboard-old',
    }),
    makeEvent({
      id: 'evt-new',
      kind: 'worker.completed',
      projectId: 'bb',
      title: 'Worker new completed',
      detail: 'Done',
      timestamp: '2026-03-27T04:59:00.000Z',
      metadata: { workerId: 'worker-new' },
      taskId: 'beadboard-new',
    }),
    makeEvent({
      id: 'evt-replay',
      kind: 'worker.completed',
      projectId: 'bb',
      title: 'Worker new completed',
      detail: 'Done',
      timestamp: '2026-03-27T04:59:00.000Z',
      metadata: { workerId: 'worker-new' },
      taskId: 'beadboard-new',
    }),
  ];

  const summary = listRecentCompletedWorkers(events, { now });
  assert.equal(summary.length, 2);
  assert.equal(summary[0].taskId, 'beadboard-new');
  assert.equal(summary[0].dedupeKey, 'worker-new:2026-03-27T04:59:00.000Z');
  assert.equal(summary[1].taskId, 'beadboard-old');
});
