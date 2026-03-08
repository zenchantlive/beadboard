import test from 'node:test';
import assert from 'node:assert/strict';

import { GET as getRuntimeStream } from '../../src/app/api/runtime/stream/route';
import { bbDaemon } from '../../src/lib/bb-daemon';
import type { BeadIssue } from '../../src/lib/types';

function makeIssue(overrides: Partial<BeadIssue> = {}): BeadIssue {
  return {
    id: 'bb-stream.1',
    title: 'Stream runtime events',
    description: 'Need daemon SSE',
    status: 'open',
    priority: 1,
    issue_type: 'task',
    assignee: null,
    templateId: null,
    owner: null,
    labels: [],
    dependencies: [],
    created_at: '2026-03-05T00:00:00.000Z',
    updated_at: '2026-03-05T00:00:00.000Z',
    closed_at: null,
    close_reason: null,
    closed_by_session: null,
    created_by: null,
    due_at: null,
    estimated_minutes: null,
    external_ref: null,
    metadata: {},
    ...overrides,
  };
}

test.beforeEach(() => {
  bbDaemon.resetForTests();
});

test('runtime stream route emits connected frame and backlog runtime events', async () => {
  await bbDaemon.start();
  await bbDaemon.launchFromIssue({
    projectRoot: '/tmp/project-a',
    issue: makeIssue(),
    origin: 'social',
  });

  const response = await getRuntimeStream(new Request('http://localhost/api/runtime/stream?projectRoot=/tmp/project-a'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type')?.includes('text/event-stream'), true);

  const reader = response.body?.getReader();
  assert.equal(Boolean(reader), true);

  const first = await reader!.read();
  const firstChunk = new TextDecoder().decode(first.value);
  assert.equal(firstChunk.includes(': connected'), true);

  const second = await reader!.read();
  const combined = `${firstChunk}\n${new TextDecoder().decode(second.value)}`;
  assert.equal(combined.includes('event: runtime'), true);
  assert.equal(combined.includes('launch.requested') || combined.includes('orchestrator.message'), true);

  await reader!.cancel();
});
