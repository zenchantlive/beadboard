import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { registerAgent } from '../../src/lib/agent-registry';
import { sendAgentMessage } from '../../src/lib/agent-mail';
import { releaseAgentReservation, reserveAgentScope, statusAgentReservations } from '../../src/lib/agent-reservations';

async function withTempUserProfile(run: () => Promise<void>): Promise<void> {
  const previous = process.env.USERPROFILE;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-agent-reservations-'));
  process.env.USERPROFILE = tempDir;

  try {
    await run();
  } finally {
    if (previous === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = previous;
    }

    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function seedAgents(): Promise<void> {
  const now = '2026-02-14T00:00:00.000Z';
  await registerAgent({ name: 'agent-ui-1', role: 'ui' }, { now: () => now });
  await registerAgent({ name: 'agent-graph-1', role: 'graph' }, { now: () => now });
}

test('reserve/release/status flows with required-ack status visibility', async () => {
  await withTempUserProfile(async () => {
    await seedAgents();

    const reserved = await reserveAgentScope(
      {
        agent: 'agent-ui-1',
        scope: 'src/components/graph/*',
        bead: 'bb-dcv.4',
      },
      {
        now: () => '2026-02-14T00:01:00.000Z',
        idGenerator: () => 'res_20260214_000100_flow',
      },
    );

    assert.equal(reserved.ok, true);
    assert.equal(reserved.data?.reservation_id, 'res_20260214_000100_flow');

    await sendAgentMessage(
      {
        from: 'agent-ui-1',
        to: 'agent-graph-1',
        bead: 'bb-dcv.4',
        category: 'HANDOFF',
        subject: 'handoff',
        body: 'please review',
      },
      {
        now: () => '2026-02-14T00:02:00.000Z',
        idGenerator: () => 'msg_20260214_000200_flow',
      },
    );

    const statusBeforeRelease = await statusAgentReservations({ bead: 'bb-dcv.4' }, { now: () => '2026-02-14T00:03:00.000Z' });
    assert.equal(statusBeforeRelease.ok, true);
    assert.equal(statusBeforeRelease.data?.reservations.length, 1);
    assert.equal(statusBeforeRelease.data?.unacked_required_messages.length, 1);

    const released = await releaseAgentReservation(
      {
        agent: 'agent-ui-1',
        scope: 'src/components/graph/*',
      },
      { now: () => '2026-02-14T00:04:00.000Z' },
    );

    assert.equal(released.ok, true);
    assert.equal(released.data?.state, 'released');

    const statusAfterRelease = await statusAgentReservations({ bead: 'bb-dcv.4' }, { now: () => '2026-02-14T00:05:00.000Z' });
    assert.equal(statusAfterRelease.ok, true);
    assert.equal(statusAfterRelease.data?.reservations.length, 0);
  });
});

test('status clears expired reservations after TTL elapses', async () => {
  await withTempUserProfile(async () => {
    await seedAgents();

    const reserved = await reserveAgentScope(
      {
        agent: 'agent-ui-1',
        scope: 'src/components/kanban/*',
        bead: 'bb-dcv.4',
        ttl: 5,
      },
      {
        now: () => '2026-02-14T00:00:00.000Z',
        idGenerator: () => 'res_20260214_000000_expire',
      },
    );
    assert.equal(reserved.ok, true);

    const status = await statusAgentReservations({}, { now: () => '2026-02-14T00:06:00.000Z' });
    assert.equal(status.ok, true);
    assert.equal(status.data?.reservations.length, 0);
    assert.equal(status.data?.summary.expired, 1);
  });
});

test('stale reservation conflict and takeover behavior', async () => {
  await withTempUserProfile(async () => {
    await seedAgents();

    const initial = await reserveAgentScope(
      {
        agent: 'agent-ui-1',
        scope: 'src/components/workspace/*',
        bead: 'bb-dcv.4',
        ttl: 5,
      },
      {
        now: () => '2026-02-14T00:00:00.000Z',
        idGenerator: () => 'res_20260214_000000_stale',
      },
    );
    assert.equal(initial.ok, true);

    const staleConflict = await reserveAgentScope(
      {
        agent: 'agent-graph-1',
        scope: 'src/components/workspace/*',
        bead: 'bb-dcv.4',
        ttl: 5,
      },
      {
        now: () => '2026-02-14T00:06:00.000Z',
        idGenerator: () => 'res_20260214_000600_takeover',
      },
    );

    assert.equal(staleConflict.ok, false);
    assert.equal(staleConflict.error?.code, 'RESERVATION_STALE_FOUND');

    const takeover = await reserveAgentScope(
      {
        agent: 'agent-graph-1',
        scope: 'src/components/workspace/*',
        bead: 'bb-dcv.4',
        ttl: 5,
        takeoverStale: true,
      },
      {
        now: () => '2026-02-14T00:06:00.000Z',
        idGenerator: () => 'res_20260214_000600_takeover',
      },
    );

    assert.equal(takeover.ok, true);
    assert.equal(takeover.data?.agent_id, 'agent-graph-1');

    const wrongRelease = await releaseAgentReservation(
      {
        agent: 'agent-ui-1',
        scope: 'src/components/workspace/*',
      },
      { now: () => '2026-02-14T00:07:00.000Z' },
    );

    assert.equal(wrongRelease.ok, false);
    assert.equal(wrongRelease.error?.code, 'RELEASE_FORBIDDEN');
  });
});
