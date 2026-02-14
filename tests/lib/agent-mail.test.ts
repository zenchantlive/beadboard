import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { registerAgent } from '../../src/lib/agent-registry';
import { ackAgentMessage, inboxAgentMessages, readAgentMessage, sendAgentMessage } from '../../src/lib/agent-mail';

async function withTempUserProfile(run: () => Promise<void>): Promise<void> {
  const previous = process.env.USERPROFILE;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-agent-mail-'));
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

test('sendAgentMessage rejects unknown sender and recipient', async () => {
  await withTempUserProfile(async () => {
    const unknownSender = await sendAgentMessage({
      from: 'agent-ui-1',
      to: 'agent-graph-1',
      bead: 'bb-dcv.6',
      category: 'HANDOFF',
      subject: 'subject',
      body: 'body',
    });

    assert.equal(unknownSender.ok, false);
    assert.equal(unknownSender.error?.code, 'UNKNOWN_SENDER');

    await registerAgent({ name: 'agent-ui-1', role: 'ui' }, { now: () => '2026-02-14T00:00:00.000Z' });

    const unknownRecipient = await sendAgentMessage({
      from: 'agent-ui-1',
      to: 'agent-graph-1',
      bead: 'bb-dcv.6',
      category: 'HANDOFF',
      subject: 'subject',
      body: 'body',
    });

    assert.equal(unknownRecipient.ok, false);
    assert.equal(unknownRecipient.error?.code, 'UNKNOWN_RECIPIENT');
  });
});

test('send/inbox/read/ack flows end-to-end', async () => {
  await withTempUserProfile(async () => {
    await seedAgents();

    const sent = await sendAgentMessage(
      {
        from: 'agent-ui-1',
        to: 'agent-graph-1',
        bead: 'bb-dcv.6',
        category: 'HANDOFF',
        subject: 'Edge direction patch ready',
        body: 'Please validate graph screenshots.',
      },
      {
        now: () => '2026-02-14T00:01:00.000Z',
        idGenerator: () => 'msg_20260214_000100_test',
      },
    );

    assert.equal(sent.ok, true);
    assert.equal(sent.data?.requires_ack, true);
    assert.equal(sent.data?.state, 'unread');

    const inboxUnread = await inboxAgentMessages({ agent: 'agent-graph-1', state: 'unread' });
    assert.equal(inboxUnread.ok, true);
    assert.equal(inboxUnread.data?.length, 1);

    const read = await readAgentMessage(
      { agent: 'agent-graph-1', message: 'msg_20260214_000100_test' },
      { now: () => '2026-02-14T00:02:00.000Z' },
    );
    assert.equal(read.ok, true);
    assert.equal(read.data?.state, 'read');

    const ack = await ackAgentMessage(
      { agent: 'agent-graph-1', message: 'msg_20260214_000100_test' },
      { now: () => '2026-02-14T00:03:00.000Z' },
    );
    assert.equal(ack.ok, true);
    assert.equal(ack.data?.state, 'acked');
    assert.equal(ack.data?.acked_at, '2026-02-14T00:03:00.000Z');

    const inboxAcked = await inboxAgentMessages({ agent: 'agent-graph-1', state: 'acked' });
    assert.equal(inboxAcked.ok, true);
    assert.equal(inboxAcked.data?.length, 1);
  });
});

test('ackAgentMessage forbids non-recipient agent', async () => {
  await withTempUserProfile(async () => {
    await seedAgents();

    await sendAgentMessage(
      {
        from: 'agent-ui-1',
        to: 'agent-graph-1',
        bead: 'bb-dcv.6',
        category: 'HANDOFF',
        subject: 'subject',
        body: 'body',
      },
      {
        now: () => '2026-02-14T00:01:00.000Z',
        idGenerator: () => 'msg_20260214_000100_forbidden',
      },
    );

    const forbidden = await ackAgentMessage(
      { agent: 'agent-ui-1', message: 'msg_20260214_000100_forbidden' },
      { now: () => '2026-02-14T00:02:00.000Z' },
    );

    assert.equal(forbidden.ok, false);
    assert.equal(forbidden.error?.code, 'ACK_FORBIDDEN');
  });
});

test('sendAgentMessage validates category and bead id', async () => {
  await withTempUserProfile(async () => {
    await seedAgents();

    const invalidCategory = await sendAgentMessage({
      from: 'agent-ui-1',
      to: 'agent-graph-1',
      bead: 'bb-dcv.6',
      category: 'NOPE' as never,
      subject: 'subject',
      body: 'body',
    });
    assert.equal(invalidCategory.ok, false);
    assert.equal(invalidCategory.error?.code, 'INVALID_CATEGORY');

    const missingBead = await sendAgentMessage({
      from: 'agent-ui-1',
      to: 'agent-graph-1',
      bead: '  ',
      category: 'INFO',
      subject: 'subject',
      body: 'body',
    });
    assert.equal(missingBead.ok, false);
    assert.equal(missingBead.error?.code, 'MISSING_BEAD_ID');
  });
});
