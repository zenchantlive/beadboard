import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  createProtocolEvent, 
  type ProtocolEvent 
} from '../../src/lib/agent-protocol';

test('createProtocolEvent generates a valid v1 envelope', () => {
  const event = createProtocolEvent({
    event_type: 'HANDOFF',
    project_root: '/work/project',
    bead_id: 'bb-123',
    from_agent: 'agent-a',
    to_agent: 'agent-b',
    scope: 'src/lib/*',
    payload: {
      subject: 'Ready for review',
      summary: 'Implemented feature X',
      next_action: 'Please run tests',
      requires_ack: true
    }
  }, { now: () => '2026-02-14T10:00:00.000Z', idGenerator: () => 'proto_1' });

  assert.equal(event.version, 'v1');
  assert.equal(event.event_type, 'HANDOFF');
  assert.equal(event.id, 'proto_1');
  assert.equal(event.created_at, '2026-02-14T10:00:00.000Z');
  assert.equal(event.payload.subject, 'Ready for review');
});
