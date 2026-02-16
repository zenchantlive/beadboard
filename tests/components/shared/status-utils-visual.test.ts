import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionStateGlow } from '../../../src/components/shared/status-utils';

/**
 * Tests for bb-buff.3.2: Critical Visual Signals
 * Visual treatments for stuck/dead session states
 */

test('sessionStateGlow returns pulsing red ring for stuck', () => {
  const classes = sessionStateGlow('stuck');
  assert.ok(classes.includes('ring-2'), 'should have ring-2');
  assert.ok(classes.includes('ring-red-500'), 'should have red ring');
  assert.ok(classes.includes('animate-pulse'), 'should pulse');
});

test('sessionStateGlow returns strong ghosting for dead', () => {
  const classes = sessionStateGlow('dead');
  assert.ok(classes.includes('opacity-40'), 'should be 40% opacity (stronger than evicted)');
  assert.ok(classes.includes('grayscale'), 'should be grayscale');
});

test('sessionStateGlow differentiates evicted from dead', () => {
  const evictedClasses = sessionStateGlow('evicted');
  const deadClasses = sessionStateGlow('dead');
  
  // Evicted should be less ghosted (60%) than dead (40%)
  assert.ok(evictedClasses.includes('opacity-60'), 'evicted should be 60% opacity');
  assert.ok(deadClasses.includes('opacity-40'), 'dead should be 40% opacity');
});

test('sessionStateGlow returns existing styles for other states', () => {
  assert.ok(sessionStateGlow('active').includes('emerald'), 'active should have green');
  assert.ok(sessionStateGlow('needs_input').includes('rose'), 'needs_input should have rose');
});
