import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateReservationIncursions,
  isTakeoverAllowed,
  projectReservations,
  type CoordProtocolEvent,
} from '../../src/lib/coord-projections';

function reserveEvent(input: {
  actor: string;
  scope: string;
  bead: string;
  at: string;
  type?: 'RESERVE' | 'RELEASE' | 'TAKEOVER';
  takeoverMode?: 'stale' | 'evicted';
}): CoordProtocolEvent {
  return {
    version: 'coord.v1',
    kind: 'coord_event',
    issue_id: input.bead,
    actor: input.actor,
    timestamp: input.at,
    data: {
      event_type: input.type ?? 'RESERVE',
      event_id: `${input.type ?? 'RESERVE'}-${input.actor}-${Date.parse(input.at)}`,
      project_root: '/tmp/repo',
      scope: input.scope,
      takeover_mode: input.takeoverMode,
      payload: {},
    },
  };
}

test('isTakeoverAllowed enforces active/stale/evicted policy', () => {
  assert.equal(isTakeoverAllowed('active', 'stale'), false);
  assert.equal(isTakeoverAllowed('stale', 'stale'), true);
  assert.equal(isTakeoverAllowed('stale', 'evicted'), false);
  assert.equal(isTakeoverAllowed('evicted', 'stale'), true);
  assert.equal(isTakeoverAllowed('evicted', 'evicted'), true);
});

test('projectReservations applies reserve/release transitions', () => {
  const events: CoordProtocolEvent[] = [
    reserveEvent({ actor: 'agent-a', scope: 'src/lib/*', bead: 'bb-1', at: '2026-02-28T10:00:00.000Z' }),
    reserveEvent({ actor: 'agent-a', scope: 'src/lib/*', bead: 'bb-1', at: '2026-02-28T10:01:00.000Z', type: 'RELEASE' }),
  ];

  const reservations = projectReservations(events, { 'agent-a': 'active' });
  assert.equal(reservations.length, 0);
});

test('projectReservations rejects stale takeover when owner active', () => {
  const events: CoordProtocolEvent[] = [
    reserveEvent({ actor: 'agent-a', scope: 'src/lib/*', bead: 'bb-1', at: '2026-02-28T10:00:00.000Z' }),
    reserveEvent({ actor: 'agent-b', scope: 'src/lib/*', bead: 'bb-2', at: '2026-02-28T10:01:00.000Z', type: 'TAKEOVER', takeoverMode: 'stale' }),
  ];

  const reservations = projectReservations(events, { 'agent-a': 'active' });
  assert.equal(reservations.length, 1);
  assert.equal(reservations[0].agent_id, 'agent-a');
});

test('projectReservations allows stale takeover when owner stale', () => {
  const events: CoordProtocolEvent[] = [
    reserveEvent({ actor: 'agent-a', scope: 'src/lib/*', bead: 'bb-1', at: '2026-02-28T10:00:00.000Z' }),
    reserveEvent({ actor: 'agent-b', scope: 'src/lib/*', bead: 'bb-2', at: '2026-02-28T10:01:00.000Z', type: 'TAKEOVER', takeoverMode: 'stale' }),
  ];

  const reservations = projectReservations(events, { 'agent-a': 'stale' });
  assert.equal(reservations.length, 1);
  assert.equal(reservations[0].agent_id, 'agent-b');
  assert.equal(reservations[0].takeover_mode, 'stale');
});

test('calculateReservationIncursions finds partial overlap', () => {
  const reservations = projectReservations(
    [
      reserveEvent({ actor: 'agent-a', scope: 'src/lib/*', bead: 'bb-1', at: '2026-02-28T10:00:00.000Z' }),
      reserveEvent({ actor: 'agent-b', scope: 'src/lib/parser.ts', bead: 'bb-2', at: '2026-02-28T10:01:00.000Z' }),
    ],
    {},
  );

  const incursions = calculateReservationIncursions(reservations);
  assert.equal(incursions.length, 1);
  assert.equal(incursions[0].severity, 'partial');
});
