import test from 'node:test';
import assert from 'node:assert/strict';

import { projectInbox, projectMessageState, type CoordProtocolEvent } from '../../src/lib/coord-projections';

const baseSend: CoordProtocolEvent = {
  version: 'coord.v1',
  kind: 'coord_event',
  issue_id: 'bb-123',
  actor: 'amber-otter',
  timestamp: '2026-02-28T10:00:00.000Z',
  data: {
    event_type: 'SEND',
    event_id: 'evt_send_1',
    project_root: '/tmp/repo',
    to_agent: 'cobalt-harbor',
    state: 'unread',
    payload: {
      subject: 'handoff',
      body: 'please review',
    },
  },
};

test('projectMessageState derives unread -> read -> acked', () => {
  const events: CoordProtocolEvent[] = [
    {
      ...baseSend,
      timestamp: '2026-02-28T10:00:00.000Z',
    },
    {
      ...baseSend,
      timestamp: '2026-02-28T10:01:00.000Z',
      data: {
        event_type: 'READ',
        event_id: 'evt_read_1',
        event_ref: 'evt_send_1',
        project_root: '/tmp/repo',
        payload: {},
      },
    },
    {
      ...baseSend,
      timestamp: '2026-02-28T10:02:00.000Z',
      data: {
        event_type: 'ACK',
        event_id: 'evt_ack_1',
        event_ref: 'evt_send_1',
        project_root: '/tmp/repo',
        payload: {},
      },
    },
  ];

  const state = projectMessageState(events);
  assert.equal(state.get('evt_send_1'), 'acked');
});

test('projectInbox tolerates out-of-order and unknown refs', () => {
  const events: CoordProtocolEvent[] = [
    {
      ...baseSend,
      timestamp: '2026-02-28T10:02:00.000Z',
      data: {
        event_type: 'ACK',
        event_id: 'evt_ack_unknown',
        event_ref: 'evt_missing',
        project_root: '/tmp/repo',
        payload: {},
      },
    },
    {
      ...baseSend,
      timestamp: '2026-02-28T10:01:00.000Z',
      data: {
        event_type: 'READ',
        event_id: 'evt_read_1',
        event_ref: 'evt_send_1',
        project_root: '/tmp/repo',
        payload: {},
      },
    },
    baseSend,
  ];

  const inbox = projectInbox(events, 'bb-123', 'cobalt-harbor');
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].state, 'read');
  assert.equal(inbox[0].to_agent, 'cobalt-harbor');
});
