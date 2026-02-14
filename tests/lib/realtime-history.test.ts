import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ActivityEventBus } from '../../src/lib/realtime';
import type { ActivityEvent } from '../../src/lib/activity';

const MOCK_EVENT: ActivityEvent = {
  id: 'evt-1',
  kind: 'created',
  beadId: 'bb-1',
  beadTitle: 'Test',
  projectId: 'C:\\Test', // Note: Backslash needs to be escaped in string literals
  projectName: 'Test',
  timestamp: new Date().toISOString(),
  actor: 'user',
  payload: {},
};

describe('ActivityEventBus History', () => {
  let bus: ActivityEventBus;

  beforeEach(() => {
    bus = new ActivityEventBus();
  });

  it('should buffer emitted events', () => {
    bus.emit(MOCK_EVENT);
    const history = bus.getHistory();
    assert.strictEqual(history.length, 1);
    assert.deepStrictEqual(history[0], MOCK_EVENT);
  });

  it('should respect the history limit (ring buffer)', () => {
    // MAX_HISTORY is 100
    for (let i = 0; i < 110; i++) {
      bus.emit({ ...MOCK_EVENT, id: `evt-${i}` });
    }
    
    const history = bus.getHistory();
    assert.strictEqual(history.length, 100);
    // Should contain the latest events (LIFO: unshift adds to front)
    // Wait, unshift adds to front. So index 0 is the NEWEST.
    // So if we emit 0..109:
    // 109 is at index 0.
    // 10 is at index 99.
    // 0..9 should be popped.
    assert.strictEqual(history[0].id, 'evt-109');
    assert.strictEqual(history[99].id, 'evt-10');
  });

  it('should filter history by project root', () => {
    bus.emit({ ...MOCK_EVENT, projectId: 'C:\\ProjA', id: 'A' }); // Note: Backslash needs to be escaped
    bus.emit({ ...MOCK_EVENT, projectId: 'C:\\ProjB', id: 'B' }); // Note: Backslash needs to be escaped

    const historyA = bus.getHistory('C:\\ProjA'); // Note: Backslash needs to be escaped
    assert.strictEqual(historyA.length, 1);
    assert.strictEqual(historyA[0].id, 'A');

    const historyB = bus.getHistory('C:\\ProjB'); // Note: Backslash needs to be escaped
    assert.strictEqual(historyB.length, 1);
    assert.strictEqual(historyB[0].id, 'B');
  });
});
