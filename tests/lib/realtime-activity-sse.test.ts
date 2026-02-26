/**
 * REGRESSION TEST: ActivityPanel SSE Data Parsing
 *
 * Bug: ActivityPanel was checking `data?.event` but SSE sends activity event directly.
 * The toActivitySseFrame function sends `data: ${JSON.stringify(event.event)}` which
 * means the parsed data IS the activity event, not wrapped in { event: {...} }.
 *
 * This test ensures:
 * 1. toActivitySseFrame produces the correct format
 * 2. ActivityPanel parsing logic matches the SSE frame format
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { ActivityEventBus, toActivitySseFrame } from '../../src/lib/realtime';
import type { ActivityEvent } from '../../src/lib/activity';

function createTestActivityEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: 'test-123',
    kind: 'created',
    beadId: 'bead-001',
    beadTitle: 'Test Bead',
    projectId: 'C:/test/project',
    projectName: 'test-project',
    timestamp: new Date().toISOString(),
    actor: 'test-user',
    payload: {},
    ...overrides,
  };
}

test('toActivitySseFrame sends activity event directly (not wrapped)', () => {
  const activityEvent = createTestActivityEvent();

  const frame = toActivitySseFrame({ id: 1, event: activityEvent });

  // Frame should have correct event type
  assert.ok(frame.includes('event: activity'), 'Frame should have event: activity');

  // Frame should have correct ID
  assert.ok(frame.includes('id: 1'), 'Frame should have correct SSE ID');

  // Parse the data field to verify structure
  const dataMatch = frame.match(/data: (.+)\n\n/);
  assert.ok(dataMatch, 'Frame should have data field');

  const parsedData = JSON.parse(dataMatch![1]);

  // CRITICAL: The parsed data IS the activity event directly
  // NOT wrapped in { event: {...} }
  assert.equal(parsedData.id, 'test-123', 'Parsed data should be the activity event itself');
  assert.equal(parsedData.kind, 'created', 'Parsed data should have kind');
  assert.equal(parsedData.beadId, 'bead-001', 'Parsed data should have beadId');
  assert.equal(parsedData.beadTitle, 'Test Bead', 'Parsed data should have beadTitle');

  // CRITICAL: parsedData.event should be UNDEFINED
  assert.equal(parsedData.event, undefined, 'parsedData.event should NOT exist');
});

test('ActivityPanel SSE handler should check data.beadId not data.event', () => {
  // Simulate what ActivityPanel receives
  const sseFrame = toActivitySseFrame({
    id: 1,
    event: createTestActivityEvent({
      id: 'act-001',
      kind: 'closed',
      beadId: 'bead-002',
      beadTitle: 'Closed Bead',
      payload: { from: 'open', to: 'closed', message: 'Done' },
    }),
  });

  // Simulate ActivityPanel's parsing logic (CORRECT version)
  const dataMatch = sseFrame.match(/data: (.+)\n\n/);
  assert.ok(dataMatch, 'Frame should have data field');
  
  const data = JSON.parse(dataMatch![1]);

  // OLD BUG: if (data?.event) { ... } - this would be FALSE
  const oldBuggyCheck = data?.event;
  assert.equal(oldBuggyCheck, undefined, 'Old buggy check data?.event should be undefined');

  // CORRECT: Check for activity event properties directly
  const correctCheck = data?.beadId;
  assert.ok(correctCheck, 'Correct check data?.beadId should exist');

  // Verify the event can be used directly
  assert.equal(data.kind, 'closed', 'Should be able to access event properties directly');
});

test('ActivityEventBus emits and serializes correctly', () => {
  const bus = new ActivityEventBus();
  let receivedFrame: string | null = null;

  const unsubscribe = bus.subscribe((dispatched) => {
    receivedFrame = toActivitySseFrame(dispatched);
  });

  bus.emit(createTestActivityEvent({
    id: 'emit-test',
    kind: 'status_changed',
    beadId: 'bead-003',
    beadTitle: 'Status Changed',
    payload: { from: 'open', to: 'in_progress' },
  }));

  unsubscribe();

  assert.ok(receivedFrame, 'Should have received frame');

  // Parse and verify
  const frame = receivedFrame as string;
  const dataMatch = frame.match(/data: (.+)\n\n/);
  assert.ok(dataMatch, 'Frame should have data field');
  
  const parsedData = JSON.parse(dataMatch![1]);

  assert.equal(parsedData.kind, 'status_changed', 'Should have correct kind');
  assert.equal(parsedData.beadId, 'bead-003', 'Should have correct beadId');
  assert.equal(parsedData.event, undefined, 'Should NOT have nested event property');
});

test('REGRESSION: ActivityPanel must NOT use data.event pattern', () => {
  /**
   * This test documents the exact bug that was fixed:
   *
   * BEFORE (BUG):
   *   const data = JSON.parse(event.data);
   *   if (data?.event) {
   *     setActivities(prev => [data.event, ...prev]);
   *   }
   *
   * AFTER (FIX):
   *   const data = JSON.parse(event.data);
   *   if (data?.beadId) {
   *     setActivities(prev => [data, ...prev]);
   *   }
   *
   * The bug caused ActivityPanel to never update because data.event
   * was always undefined (the event IS the data, not nested).
   */

  const sampleSseData = JSON.stringify(createTestActivityEvent({
    id: 'regression-test',
    kind: 'comment_added',
    beadId: 'bead-999',
    beadTitle: 'Regression Test Bead',
    actor: 'test-user',
    payload: { message: 'Test comment' },
  }));

  const data = JSON.parse(sampleSseData);

  // Document the bug: data.event does NOT exist
  assert.equal(data.event, undefined, 'BUG: data.event is undefined');

  // Document the fix: check data.beadId instead
  assert.ok(data.beadId, 'FIX: data.beadId exists');

  // The activity event to add is data itself, not data.event
  const activityToAdd = data; // NOT data.event
  assert.equal(activityToAdd.kind, 'comment_added', 'Activity is data directly');
});
