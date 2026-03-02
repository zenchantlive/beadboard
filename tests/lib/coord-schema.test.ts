import test from 'node:test';
import assert from 'node:assert/strict';

import { validateCoordEventEnvelope } from '../../src/lib/coord-schema';

function baseEnvelope(eventType: string): any {
  return {
    version: 'coord.v1',
    kind: 'coord_event',
    issue_id: 'bb-123',
    actor: 'amber-otter',
    timestamp: '2026-02-28T18:00:00.000Z',
    data: {
      event_type: eventType,
      event_id: 'evt_01JN6Y1Q7R80E8P6K1Q5',
      project_root: '/tmp/repo',
      payload: {},
    },
  };
}

test('validateCoordEventEnvelope accepts valid SEND', () => {
  const input = baseEnvelope('SEND');
  input.data.to_agent = 'cobalt-harbor';
  input.data.state = 'unread';
  input.data.payload = { subject: 's', body: 'b' };

  const result = validateCoordEventEnvelope(input);
  assert.equal(result.ok, true);
});

test('validateCoordEventEnvelope rejects READ without event_ref', () => {
  const input = baseEnvelope('READ');

  const result = validateCoordEventEnvelope(input);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /event_ref/i);
  }
});

test('validateCoordEventEnvelope accepts TAKEOVER with stale mode', () => {
  const input = baseEnvelope('TAKEOVER');
  input.data.scope = 'src/lib/*';
  input.data.takeover_mode = 'stale';
  input.data.reason = 'owner stale';

  const result = validateCoordEventEnvelope(input);
  assert.equal(result.ok, true);
});

test('validateCoordEventEnvelope rejects TAKEOVER with invalid mode', () => {
  const input = baseEnvelope('TAKEOVER');
  input.data.scope = 'src/lib/*';
  input.data.takeover_mode = 'none';
  input.data.reason = 'owner stale';

  const result = validateCoordEventEnvelope(input);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /takeover_mode/i);
  }
});
