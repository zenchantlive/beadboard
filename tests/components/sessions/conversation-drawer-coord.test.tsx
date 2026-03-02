import { describe, it } from 'node:test';
import assert from 'node:assert';

import { buildCommentMutationBody, buildCoordMessageActionEvent } from '../../../src/components/sessions/conversation-drawer';

describe('ConversationDrawer coord action payloads', () => {
  const message = {
    message_id: 'evt_send_1',
    thread_id: 'bead:bb-123',
    bead_id: 'bb-123',
    from_agent: 'amber-otter',
    to_agent: 'cobalt-harbor',
    category: 'HANDOFF',
    subject: 'subject',
    body: 'body',
    state: 'unread',
    requires_ack: true,
    created_at: '2026-02-28T10:00:00.000Z',
    read_at: null,
    acked_at: null,
  } as const;

  it('builds READ event with event_ref to message id', () => {
    const payload = buildCoordMessageActionEvent({
      action: 'read',
      message: message as any,
      beadId: 'bb-123',
      projectRoot: '/tmp/repo',
      nowIso: '2026-02-28T11:00:00.000Z',
    }) as any;

    assert.equal(payload.kind, 'coord_event');
    assert.equal(payload.data.event_type, 'READ');
    assert.equal(payload.data.event_ref, 'evt_send_1');
  });

  it('builds ACK event with recipient as actor', () => {
    const payload = buildCoordMessageActionEvent({
      action: 'ack',
      message: message as any,
      beadId: 'bb-123',
      projectRoot: '/tmp/repo',
      nowIso: '2026-02-28T11:00:00.000Z',
    }) as any;

    assert.equal(payload.actor, 'cobalt-harbor');
    assert.equal(payload.data.event_type, 'ACK');
    assert.equal(payload.issue_id, 'bb-123');
  });
});

describe('ConversationDrawer comment payload', () => {
  it('includes actor when provided', () => {
    const payload = buildCommentMutationBody({
      projectRoot: '/tmp/repo',
      text: 'hello',
      actor: 'zenchant',
    }) as any;

    assert.equal(payload.actor, 'zenchant');
  });

  it('omits actor when blank', () => {
    const payload = buildCommentMutationBody({
      projectRoot: '/tmp/repo',
      text: 'hello',
      actor: '   ',
    }) as any;

    assert.equal('actor' in payload, false);
  });
});
