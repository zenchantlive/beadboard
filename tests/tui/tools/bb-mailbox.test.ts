import test from 'node:test';
import assert from 'node:assert/strict';
import { createMailboxTools } from '../../../src/tui/tools/bb-mailbox';

test('createMailboxTools returns definitions for inbox, send, and ack', () => {
  const tools = createMailboxTools();
  
  assert.equal(tools.length, 3);
  
  const inbox = tools.find((t) => t.name === 'bb_read_inbox');
  const send = tools.find((t) => t.name === 'bb_send_message');
  const ack = tools.find((t) => t.name === 'bb_ack_message');
  
  assert.ok(inbox);
  assert.ok(send);
  assert.ok(ack);
  
  assert.equal(typeof inbox?.execute, 'function');
  assert.equal(typeof send?.execute, 'function');
  assert.equal(typeof ack?.execute, 'function');
});
