import test from 'node:test';
import assert from 'node:assert/strict';

import { GET as eventsGet } from '../../src/app/api/events/route';
import { getIssuesWatchManager } from '../../src/lib/watcher';

test.afterEach(async () => {
  await getIssuesWatchManager().stopAll();
});

test.after(async () => {
  await getIssuesWatchManager().stopAll();
});

test('events route returns SSE response with expected headers', async () => {
  const response = await eventsGet(new Request('http://localhost/api/events?projectRoot=C:/Repo/Test'));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type')?.includes('text/event-stream'), true);
  assert.equal(response.headers.get('cache-control')?.includes('no-cache'), true);

  const reader = response.body?.getReader();
  if (reader) {
    await reader.cancel();
  }
});

test('events route emits initial connected frame', async () => {
  const response = await eventsGet(new Request('http://localhost/api/events?projectRoot=C:/Repo/Test'));
  const reader = response.body?.getReader();
  assert.equal(Boolean(reader), true);

  const first = await reader!.read();
  const chunk = new TextDecoder().decode(first.value);
  assert.equal(chunk.includes(': connected'), true);

  await reader!.cancel();
});
