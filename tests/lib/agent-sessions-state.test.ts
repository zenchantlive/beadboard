import test from 'node:test';
import assert from 'node:assert/strict';
import type { BeadIssue } from '../../src/lib/types';


/**
 * Tests for bb-buff.3.2: Critical Visual Signals
 * 
 * These tests verify that stuck/dead ZFC states are properly
 * derived into session states for visual rendering.
 */

// Import the deriveState function (will be exported from agent-sessions)
import { deriveSessionState } from '../../src/lib/agent-sessions';

function makeTask(overrides: Partial<BeadIssue> = {}): BeadIssue {
  return {
    id: 'bb-1',
    title: 'Test Task',
    status: 'in_progress',
    updated_at: new Date().toISOString(),
    dependencies: [],
    labels: [],
    ...overrides
  } as BeadIssue;
}

test('deriveSessionState returns stuck when ZFC state is stuck', () => {
  const task = makeTask();
  const result = deriveSessionState(task, null, false, 'active', 'stuck');
  assert.equal(result, 'stuck');
});

test('deriveSessionState returns dead when ZFC state is dead', () => {
  const task = makeTask();
  const result = deriveSessionState(task, null, false, 'active', 'dead');
  assert.equal(result, 'dead');
});

test('deriveSessionState prioritizes stuck over evicted', () => {
  const task = makeTask();
  // Even if liveness is evicted, stuck should win
  const result = deriveSessionState(task, null, false, 'evicted', 'stuck');
  assert.equal(result, 'stuck');
});

test('deriveSessionState prioritizes dead over stale', () => {
  const task = makeTask();
  const result = deriveSessionState(task, null, false, 'stale', 'dead');
  assert.equal(result, 'dead');
});

test('deriveSessionState returns evicted when liveness is evicted and no ZFC state', () => {
  const task = makeTask();
  const result = deriveSessionState(task, null, false, 'evicted', undefined);
  assert.equal(result, 'evicted');
});

test('deriveSessionState returns completed when task is closed', () => {
  const task = makeTask({ status: 'closed' });
  // Even with stuck ZFC state, closed task is completed
  const result = deriveSessionState(task, null, false, 'active', 'stuck');
  assert.equal(result, 'completed');
});
