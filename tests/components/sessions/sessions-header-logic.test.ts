import test from 'node:test';
import assert from 'node:assert/strict';
import { getSwarmHealth } from '../../../src/components/sessions/sessions-header-logic';
import type { AgentRecord, AgentLiveness } from '../../../src/lib/agent-registry';

// Mock AgentRecord helper
function mockAgent(id: string, liveness: AgentLiveness): { agent: AgentRecord, liveness: AgentLiveness } {
  return {
    agent: {
      agent_id: id,
      display_name: id,
      role: 'agent',
      status: 'idle',
      created_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      version: 1
    },
    liveness
  };
}

test('getSwarmHealth returns green/active when all agents are active', () => {
  const members = [
    mockAgent('a1', 'active'),
    mockAgent('a2', 'active')
  ];
  const livenessMap = { a1: 'active', a2: 'active' };
  
  const health = getSwarmHealth(members.map(m => m.agent), livenessMap);
  assert.equal(health.status, 'active');
  assert.equal(health.color, 'text-emerald-400');
});

test('getSwarmHealth returns yellow/warning when any agent is stale', () => {
  const members = [
    mockAgent('a1', 'active'),
    mockAgent('a2', 'stale')
  ];
  const livenessMap = { a1: 'active', a2: 'stale' };
  
  const health = getSwarmHealth(members.map(m => m.agent), livenessMap);
  assert.equal(health.status, 'warning');
  assert.equal(health.color, 'text-amber-400');
});

test('getSwarmHealth returns red/critical when any agent is evicted/dead', () => {
  const members = [
    mockAgent('a1', 'active'),
    mockAgent('a2', 'evicted')
  ];
  const livenessMap = { a1: 'active', a2: 'evicted' };
  
  const health = getSwarmHealth(members.map(m => m.agent), livenessMap);
  assert.equal(health.status, 'critical');
  assert.equal(health.color, 'text-rose-400');
});

test('getSwarmHealth returns gray/offline when all agents are idle', () => {
  const members = [
    mockAgent('a1', 'idle'),
    mockAgent('a2', 'idle')
  ];
  const livenessMap = { a1: 'idle', a2: 'idle' };
  
  const health = getSwarmHealth(members.map(m => m.agent), livenessMap);
  assert.equal(health.status, 'offline');
  assert.equal(health.color, 'text-zinc-500');
});
