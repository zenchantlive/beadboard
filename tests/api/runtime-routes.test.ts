import test from 'node:test';
import assert from 'node:assert/strict';

import { embeddedPiDaemon } from '../../src/lib/embedded-daemon';
import { GET as getRuntimeStatus } from '../../src/app/api/runtime/status/route';
import { POST as postOrchestrator } from '../../src/app/api/runtime/orchestrator/route';
import { GET as getRuntimeEvents } from '../../src/app/api/runtime/events/route';
import { handleRuntimeLaunchPost } from '../../src/app/api/runtime/launch/route';
import type { BeadIssue } from '../../src/lib/types';

function makeIssue(overrides: Partial<BeadIssue> = {}): BeadIssue {
  return {
    id: 'bb-runtime.4',
    title: 'Add host runtime routes',
    description: 'Need launch route',
    status: 'open',
    priority: 1,
    issue_type: 'task',
    assignee: null,
    templateId: null,
    owner: null,
    labels: [],
    dependencies: [{ type: 'parent', target: 'bb-runtime' }],
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

async function readJson(response: Response): Promise<any> {
  return JSON.parse(await response.text());
}

test.beforeEach(() => {
  embeddedPiDaemon.resetForTests();
});

test('GET /api/runtime/status returns daemon status payload', async () => {
  const response = await getRuntimeStatus();
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.daemon.backend, 'pi');
});

test('POST /api/runtime/orchestrator requires projectRoot', async () => {
  const response = await postOrchestrator(
    new Request('http://localhost/api/runtime/orchestrator', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    }),
  );
  const body = await readJson(response);

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
});

test('POST /api/runtime/orchestrator creates project orchestrator', async () => {
  const response = await postOrchestrator(
    new Request('http://localhost/api/runtime/orchestrator', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectRoot: '/tmp/project-a' }),
    }),
  );
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.match(body.data.id, /orchestrator$/);
});

test('POST /api/runtime/launch validates required fields', async () => {
  const response = await handleRuntimeLaunchPost(
    new Request('http://localhost/api/runtime/launch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectRoot: '/tmp/project-a' }),
    }),
  );
  const body = await readJson(response);

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
});

test('POST /api/runtime/launch launches from task context using issue loader', async () => {
  const response = await handleRuntimeLaunchPost(
    new Request('http://localhost/api/runtime/launch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectRoot: '/tmp/project-a',
        taskId: 'bb-runtime.4',
        origin: 'social',
      }),
    }),
    {
      readIssues: async () => [makeIssue()],
    },
  );
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.data.orchestrator.status, 'planning');
  assert.equal(body.data.events[0].kind, 'launch.requested');
});

test('GET /api/runtime/events returns project-scoped event history', async () => {
  await handleRuntimeLaunchPost(
    new Request('http://localhost/api/runtime/launch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectRoot: '/tmp/project-a',
        taskId: 'bb-runtime.4',
        origin: 'social',
      }),
    }),
    {
      readIssues: async () => [makeIssue()],
    },
  );

  const response = await getRuntimeEvents(new Request('http://localhost/api/runtime/events?projectRoot=/tmp/project-a'));
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.data.length, 2);
});
