import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { registerAgent } from '../../src/lib/agent-registry';
import { ackAgentMessage, inboxAgentMessages, readAgentMessage, sendAgentMessage } from '../../src/lib/agent-mail';

async function withTempProject(run: (projectRoot: string) => Promise<void>): Promise<void> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-agent-mail-'));

  execSync('bd init --prefix bb --force', { cwd: tempDir, stdio: 'ignore' });

  const previousProfile = process.env.USERPROFILE;
  process.env.USERPROFILE = tempDir;

  const originalCwd = process.cwd();
  process.chdir(tempDir);

  try {
    await run(tempDir);
  } finally {
    process.chdir(originalCwd);
    if (previousProfile === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = previousProfile;
    }

    for (let i = 0; i < 5; i++) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }
}

async function seedAgents(): Promise<void> {
  const now = '2026-02-14T00:00:00.000Z';
  await registerAgent({ name: 'agent-ui-1', role: 'ui' }, { now: () => now });
  await registerAgent({ name: 'agent-graph-1', role: 'graph' }, { now: () => now });
}

test('sendAgentMessage rejects unknown sender and recipient', async () => {
  await withTempProject(async () => {
    const result = await sendAgentMessage({
      from: 'unknown',
      to: 'also-unknown',
      bead: 'bb-1',
      category: 'INFO',
      subject: 'Hello',
      body: 'World',
    });

    assert.equal(result.ok, false);
    assert.equal(result.error?.code, 'UNKNOWN_SENDER');
  });
});

test('send/inbox/read/ack flows end-to-end', async () => {
  await withTempProject(async () => {
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
  await withTempProject(async () => {
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
  await withTempProject(async () => {
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

async function seedRoleAgents(): Promise<void> {
  const now = '2026-02-14T00:00:00.000Z';
  await registerAgent({ name: 'ui-agent-1', role: 'ui' }, { now: () => now });
  await registerAgent({ name: 'ui-agent-2', role: 'ui' }, { now: () => now });
  await registerAgent({ name: 'graph-agent-1', role: 'graph' }, { now: () => now });
}

test('sendAgentMessage routes to role:ui with multiple recipients', async () => {
  await withTempProject(async () => {
    await seedRoleAgents();

    const sent = await sendAgentMessage(
      {
        from: 'graph-agent-1',
        to: 'role:ui',
        bead: 'bb-test.1',
        category: 'INFO',
        subject: 'Hello UI agents',
        body: 'Please check the dashboard',
      },
      {
        now: () => '2026-02-14T00:01:00.000Z',
        idGenerator: () => 'msg_role_test_1',
      },
    );

    assert.equal(sent.ok, true);

    const inbox1 = await inboxAgentMessages({ agent: 'ui-agent-1' });
    const inbox2 = await inboxAgentMessages({ agent: 'ui-agent-2' });
    const inboxGraph = await inboxAgentMessages({ agent: 'graph-agent-1' });

    assert.equal(inbox1.data?.length, 1);
    assert.equal(inbox2.data?.length, 1);
    assert.equal(inboxGraph.data?.length, 0);
  });
});

test('sendAgentMessage role fanout excludes sender from recipient list', async () => {
  await withTempProject(async () => {
    await seedRoleAgents();

    const sent = await sendAgentMessage(
      {
        from: 'ui-agent-1',
        to: 'role:ui',
        bead: 'bb-test.2',
        category: 'INFO',
        subject: 'Peer message',
        body: 'Hello fellow UI agents',
      },
      {
        now: () => '2026-02-14T00:01:00.000Z',
        idGenerator: () => 'msg_role_test_2',
      },
    );

    assert.equal(sent.ok, true);

    const inbox1 = await inboxAgentMessages({ agent: 'ui-agent-1' });
    const inbox2 = await inboxAgentMessages({ agent: 'ui-agent-2' });

    assert.equal(inbox1.data?.length, 0, 'sender should not receive');
    assert.equal(inbox2.data?.length, 1, 'other ui agent should receive');
  });
});

test('sendAgentMessage direct send includes recipient even if sender matches recipient role', async () => {
  await withTempProject(async () => {
    await seedRoleAgents();

    const sent = await sendAgentMessage(
      {
        from: 'ui-agent-1',
        to: 'ui-agent-2',
        bead: 'bb-test.3',
        category: 'INFO',
        subject: 'Direct message',
        body: 'Hello specifically',
      },
      {
        now: () => '2026-02-14T00:01:00.000Z',
        idGenerator: () => 'msg_role_test_3',
      },
    );

    assert.equal(sent.ok, true);

    const inbox2 = await inboxAgentMessages({ agent: 'ui-agent-2' });

    assert.equal(inbox2.data?.length, 1, 'direct recipient should receive');
  });
});

test('sendAgentMessage unknown role returns UNKNOWN_RECIPIENT', async () => {
  await withTempProject(async () => {
    await seedRoleAgents();

    const sent = await sendAgentMessage({
      from: 'ui-agent-1',
      to: 'role:nonexistent',
      bead: 'bb-test.4',
      category: 'INFO',
      subject: 'Hello',
      body: 'Anyone there?',
    });

    assert.equal(sent.ok, false);
    assert.equal(sent.error?.code, 'UNKNOWN_RECIPIENT');
    assert.ok(sent.error?.message.includes('no agents found with role'));
  });
});

test('sendAgentMessage known role but all agents excluded returns UNKNOWN_RECIPIENT', async () => {
  await withTempProject(async () => {
    const now = '2026-02-14T00:00:00.000Z';
    await registerAgent({ name: 'only-ui-agent', role: 'ui' }, { now: () => now });

    const sent = await sendAgentMessage({
      from: 'only-ui-agent',
      to: 'role:ui',
      bead: 'bb-test.5',
      category: 'INFO',
      subject: 'Hello myself',
      body: 'No one else to hear',
    });

    assert.equal(sent.ok, false);
    assert.equal(sent.error?.code, 'UNKNOWN_RECIPIENT');
    assert.ok(sent.error?.message.includes('all recipients were excluded'));
  });
});

test('sendAgentMessage role fanout HANDOFF creates individual messages with per-recipient ack', async () => {
  await withTempProject(async () => {
    await seedRoleAgents();

    const sent = await sendAgentMessage(
      {
        from: 'graph-agent-1',
        to: 'role:ui',
        bead: 'bb-test.6',
        category: 'HANDOFF',
        subject: 'Take over',
        body: 'Please handle this',
      },
      {
        now: () => '2026-02-14T00:01:00.000Z',
        idGenerator: () => 'msg_handoff_test',
      },
    );

    assert.equal(sent.ok, true);

    const inbox1 = await inboxAgentMessages({ agent: 'ui-agent-1' });
    const inbox2 = await inboxAgentMessages({ agent: 'ui-agent-2' });

    assert.equal(inbox1.data?.length, 1);
    assert.equal(inbox2.data?.length, 1);

    const msg1 = inbox1.data![0];
    const msg2 = inbox2.data![0];

    assert.notEqual(msg1.message_id, msg2.message_id, 'each recipient gets unique message ID');
    assert.equal(msg1.state, 'unread');
    assert.equal(msg2.state, 'unread');

    const ack1 = await ackAgentMessage(
      { agent: 'ui-agent-1', message: msg1.message_id },
      { now: () => '2026-02-14T00:02:00.000Z' },
    );
    assert.equal(ack1.ok, true);
    assert.equal(ack1.data?.state, 'acked');

    const inbox1AfterAck = await inboxAgentMessages({ agent: 'ui-agent-1', state: 'acked' });
    const inbox2AfterAck = await inboxAgentMessages({ agent: 'ui-agent-2', state: 'unread' });

    assert.equal(inbox1AfterAck.data?.length, 1, 'ui-agent-1 message is acked');
    assert.equal(inbox2AfterAck.data?.length, 1, 'ui-agent-2 message still unread');
  });
});
