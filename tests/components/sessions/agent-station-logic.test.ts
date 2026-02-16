import test from 'node:test';
import assert from 'node:assert/strict';
import { getAgentRoleColor } from '../../../src/components/sessions/agent-station-logic';

test('getAgentRoleColor returns correct color for known roles', () => {
  assert.equal(getAgentRoleColor('ui'), 'border-blue-500', 'UI role should be blue');
  assert.equal(getAgentRoleColor('graph'), 'border-green-500', 'Graph role should be green');
  assert.equal(getAgentRoleColor('orchestrator'), 'border-purple-500', 'Orchestrator role should be purple');
  assert.equal(getAgentRoleColor('agent'), 'border-zinc-500', 'Agent role should be gray');
});

test('getAgentRoleColor returns default for unknown role', () => {
  assert.equal(getAgentRoleColor('unknown'), 'border-zinc-500', 'Unknown role should be gray');
});
