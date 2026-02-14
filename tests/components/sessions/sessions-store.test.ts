import { describe, it } from 'node:test';
import assert from 'node:assert';
import { useTimelineStore } from '../../../src/components/timeline/timeline-store';

describe('Sessions Store (bb-u6f.3.7)', () => {
  it('should manage agent and task selection', () => {
    const store = useTimelineStore.getState();
    
    // Initial state
    assert.strictEqual(store.selectedAgentId, null);
    assert.strictEqual(store.selectedTaskId, null);

    // Select agent
    store.setSelectedAgentId('agent-1');
    assert.strictEqual(useTimelineStore.getState().selectedAgentId, 'agent-1');

    // Select task
    store.setSelectedTaskId('task-1');
    assert.strictEqual(useTimelineStore.getState().selectedTaskId, 'task-1');
  });

  it('should handle navigation back to agent', () => {
    const store = useTimelineStore.getState();
    store.setSelectedAgentId('agent-1');
    store.setSelectedTaskId('task-1');

    // Back to agent
    store.backToAgent();
    assert.strictEqual(useTimelineStore.getState().selectedTaskId, null);
    assert.strictEqual(useTimelineStore.getState().selectedAgentId, 'agent-1');
  });

  it('should clear all selections on clear', () => {
    const store = useTimelineStore.getState();
    store.setSelectedAgentId('agent-1');
    store.setSelectedTaskId('task-1');

    store.clear();
    assert.strictEqual(useTimelineStore.getState().selectedAgentId, null);
    assert.strictEqual(useTimelineStore.getState().selectedTaskId, null);
  });
});
