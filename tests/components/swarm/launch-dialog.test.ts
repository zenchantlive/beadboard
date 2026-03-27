import test from 'node:test';
import assert from 'node:assert/strict';

import { extractLaunchedSwarmId } from '../../../src/components/swarm/launch-dialog';

test('extractLaunchedSwarmId prefers explicit swarm identifiers from launch payloads', () => {
  assert.equal(extractLaunchedSwarmId({ swarmId: 'bb-swarm-1' }), 'bb-swarm-1');
  assert.equal(extractLaunchedSwarmId({ swarm_id: 'bb-swarm-2' }), 'bb-swarm-2');
  assert.equal(extractLaunchedSwarmId({ epicId: 'bb-epic-1' }), 'bb-epic-1');
  assert.equal(extractLaunchedSwarmId({ epic_id: 'bb-epic-2' }), 'bb-epic-2');
});

test('extractLaunchedSwarmId unwraps nested API response data safely', () => {
  assert.equal(extractLaunchedSwarmId({ data: { epic_id: 'bb-epic-nested' } }), 'bb-epic-nested');
  assert.equal(extractLaunchedSwarmId({ data: { id: 'bb-id-nested' } }), 'bb-id-nested');
  assert.equal(extractLaunchedSwarmId({ ok: true }), null);
});
