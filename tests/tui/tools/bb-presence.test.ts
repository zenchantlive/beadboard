import test from 'node:test';
import assert from 'node:assert/strict';
import { createPresenceTools } from '../../../src/tui/tools/bb-presence';

test('createPresenceTools returns presence update definition', () => {
  const tools = createPresenceTools();
  assert.equal(tools.length, 1);
  assert.equal(tools[0].name, 'bb_update_presence');
  assert.equal(typeof tools[0].execute, 'function');
});
