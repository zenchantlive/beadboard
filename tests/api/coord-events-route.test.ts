import test from 'node:test';
import assert from 'node:assert/strict';

import { handleCoordEventsPost } from '../../src/lib/handlers/coord-events';

test('handleCoordEventsPost returns 400 for invalid body', async () => {
  const request = new Request('http://localhost/api/coord/events', {
    method: 'POST',
    body: 'not-json',
    headers: { 'content-type': 'application/json' },
  });

  const response = await handleCoordEventsPost(request);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
});

test('handleCoordEventsPost writes event and returns success', async () => {
  const request = new Request('http://localhost/api/coord/events', {
    method: 'POST',
    body: JSON.stringify({
      projectRoot: process.cwd(),
      event: {
        version: 'coord.v1',
        kind: 'coord_event',
        issue_id: 'bb-123',
        actor: 'amber-otter',
        timestamp: '2026-02-28T18:00:00.000Z',
        data: {
          event_type: 'SEND',
          event_id: 'evt_01',
          project_root: process.cwd(),
          to_agent: 'cobalt-harbor',
          state: 'unread',
          payload: { subject: 's', body: 'b' },
        },
      },
    }),
    headers: { 'content-type': 'application/json' },
  });

  const response = await handleCoordEventsPost(request, {
    writeCoordEvent: async () => ({
      ok: true,
      eventId: 'evt_01',
      commandResult: {
        success: true,
        classification: null,
        command: 'bd',
        args: [],
        cwd: process.cwd(),
        stdout: '',
        stderr: '',
        code: 0,
        durationMs: 1,
        error: null,
      },
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.eventId, 'evt_01');
});
