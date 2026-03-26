import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bootstrapAgentStatesFromWorkers,
  createAgentState,
  reduceAgentEventSequence,
  reduceAgentState,
  summarizeAgentStates,
  type AgentStateBootstrapWorkerSnapshot,
  type AgentStateEvent,
} from '../../src/lib/agent/state.js';

function makeEvent(
  overrides: Partial<AgentStateEvent> & Pick<AgentStateEvent, 'id' | 'kind'>
): AgentStateEvent {
  return {
    id: overrides.id,
    kind: overrides.kind,
    projectId: overrides.projectId ?? 'project-1',
    timestamp: overrides.timestamp ?? '2026-03-26T00:00:00.000Z',
    status: overrides.status ?? 'working',
    taskId: overrides.taskId ?? 'task-1',
    swarmId: overrides.swarmId ?? 'swarm-1',
    actorLabel: overrides.actorLabel ?? 'Engineer 01',
    detail: overrides.detail ?? 'Worker event',
    metadata: overrides.metadata ?? {
      workerId: 'worker-1',
      agentInstanceId: 'engineer-01-abc123',
      agentTypeId: 'engineer',
      displayName: 'Engineer 01',
      taskId: 'task-1',
      epicId: 'epic-1',
      swarmId: 'swarm-1',
    },
  };
}

describe('AgentState reducer', () => {
  it('creates a stable idle seed', () => {
    const state = createAgentState({
      projectId: 'project-1',
      agentId: 'worker-1',
      label: 'Engineer 01',
    });

    assert.equal(state.projectId, 'project-1');
    assert.equal(state.agentId, 'worker-1');
    assert.equal(state.label, 'Engineer 01');
    assert.equal(state.status, 'idle');
    assert.deepEqual(state.seenEventIds, []);
  });

  it('reduces spawn, working, blocked, completed, and failed events deterministically', () => {
    const seed = createAgentState({
      projectId: 'project-1',
      agentId: 'worker-1',
      label: 'Engineer 01',
    });

    const spawned = reduceAgentState(
      seed,
      makeEvent({
        id: 'evt-spawn',
        kind: 'worker.spawned',
        detail: 'Worker spawned',
      })
    );

    assert.equal(spawned.agentId, 'worker-1');
    assert.equal(spawned.taskId, 'task-1');
    assert.equal(spawned.epicId, 'epic-1');
    assert.equal(spawned.status, 'launching');
    assert.equal(spawned.lastEventKind, 'worker.spawned');

    const working = reduceAgentState(
      spawned,
      makeEvent({
        id: 'evt-working',
        kind: 'worker.updated',
        detail: 'Executing task',
      })
    );

    assert.equal(working.status, 'working');
    assert.equal(working.lastEventKind, 'worker.updated');
    assert.equal(working.result, null);

    const blocked = reduceAgentState(
      working,
      makeEvent({
        id: 'evt-blocked',
        kind: 'worker.blocked',
        detail: 'Waiting on API key',
      })
    );

    assert.equal(blocked.status, 'blocked');
    assert.equal(blocked.blocker, 'Waiting on API key');
    assert.equal(blocked.error, null);

    const completed = reduceAgentState(
      blocked,
      makeEvent({
        id: 'evt-completed',
        kind: 'worker.completed',
        detail: 'Finished the reducer',
      })
    );

    assert.equal(completed.status, 'completed');
    assert.equal(completed.result, 'Finished the reducer');
    assert.equal(completed.blocker, null);
    assert.equal(completed.error, null);

    const failed = reduceAgentState(
      completed,
      makeEvent({
        id: 'evt-failed',
        kind: 'worker.failed',
        detail: 'Worker crashed',
      })
    );

    assert.equal(failed.status, 'failed');
    assert.equal(failed.error, 'Worker crashed');
    assert.equal(failed.result, null);
    assert.equal(failed.blocker, null);
  });

  it('ignores duplicate event ids', () => {
    const seed = createAgentState({
      projectId: 'project-1',
      agentId: 'worker-1',
      label: 'Engineer 01',
    });

    const spawn = makeEvent({
      id: 'evt-spawn',
      kind: 'worker.spawned',
    });

    const first = reduceAgentState(seed, spawn);
    const duplicate = reduceAgentState(first, spawn);

    assert.deepEqual(duplicate, first);
    assert.equal(duplicate.seenEventIds.length, 1);
    assert.equal(duplicate.status, 'launching');
  });

  it('reduces a whole event sequence from a seed', () => {
    const state = reduceAgentEventSequence(
      {
        projectId: 'project-1',
        agentId: 'worker-1',
        label: 'Engineer 01',
      },
      [
        makeEvent({ id: 'evt-spawn', kind: 'worker.spawned' }),
        makeEvent({ id: 'evt-working', kind: 'worker.updated' }),
        makeEvent({ id: 'evt-working', kind: 'worker.updated', detail: 'duplicate replay' }),
        makeEvent({ id: 'evt-completed', kind: 'worker.completed', detail: 'Done' }),
      ]
    );

    assert.equal(state.status, 'completed');
    assert.equal(state.result, 'Done');
    assert.equal(state.seenEventIds.length, 3);
    assert.deepEqual(state.seenEventIds, ['evt-spawn', 'evt-working', 'evt-completed']);
  });

  it('boots a snapshot from persisted worker data and matching persisted events', () => {
    const worker: AgentStateBootstrapWorkerSnapshot = {
      id: 'worker-1',
      projectId: 'project-1',
      agentTypeId: 'engineer',
      agentInstanceId: 'engineer-01-abc123',
      displayName: 'Engineer 01',
      taskId: 'task-1',
      status: 'working',
      createdAt: '2026-03-26T00:00:00.000Z',
      completedAt: null,
      result: null,
      error: null,
    };

    const states = bootstrapAgentStatesFromWorkers(
      [worker],
      [
        makeEvent({
          id: 'evt-blocked',
          kind: 'worker.blocked',
          detail: 'Waiting on approval',
          status: 'blocked',
          metadata: {
            workerId: 'worker-1',
            agentInstanceId: 'engineer-01-abc123',
            agentTypeId: 'engineer',
            displayName: 'Engineer 01',
            taskId: 'task-1',
          },
        }),
      ],
    );

    assert.equal(states.length, 1);
    assert.equal(states[0].agentId, 'worker-1');
    assert.equal(states[0].status, 'blocked');
    assert.equal(states[0].blocker, 'Waiting on approval');
    assert.equal(states[0].lastEventKind, 'worker.blocked');
    assert.equal(states[0].taskId, 'task-1');
  });

  it('converges when live events arrive after a restored snapshot', () => {
    const worker: AgentStateBootstrapWorkerSnapshot = {
      id: 'worker-1',
      projectId: 'project-1',
      agentTypeId: 'engineer',
      agentInstanceId: 'engineer-01-abc123',
      displayName: 'Engineer 01',
      taskId: 'task-1',
      status: 'working',
      createdAt: '2026-03-26T00:00:00.000Z',
      completedAt: null,
      result: null,
      error: null,
    };

    const [restored] = bootstrapAgentStatesFromWorkers([worker]);
    const liveWorking = reduceAgentState(
      restored,
      makeEvent({
        id: 'evt-working-live',
        kind: 'worker.updated',
        detail: 'Continuing after refresh',
      }),
    );
    const liveCompleted = reduceAgentState(
      liveWorking,
      makeEvent({
        id: 'evt-completed-live',
        kind: 'worker.completed',
        detail: 'Done after refresh',
      }),
    );

    assert.equal(restored.status, 'working');
    assert.equal(liveWorking.status, 'working');
    assert.equal(liveCompleted.status, 'completed');
    assert.equal(liveCompleted.result, 'Done after refresh');
    assert.deepEqual(liveCompleted.seenEventIds, ['worker-1:bootstrap', 'evt-working-live', 'evt-completed-live']);
  });

  it('summarizes unique logical agents after duplicate replay', () => {
    const states = [
      createAgentState({
        projectId: 'project-1',
        agentId: 'worker-1',
        label: 'Engineer 01',
      }),
      {
        ...createAgentState({
          projectId: 'project-1',
          agentId: 'worker-1',
          label: 'Engineer 01',
        }),
        status: 'blocked' as const,
      },
      {
        ...createAgentState({
          projectId: 'project-1',
          agentId: 'worker-2',
          label: 'Engineer 02',
        }),
        status: 'idle' as const,
      },
    ];

    const summary = summarizeAgentStates(states);

    assert.equal(summary.totalCount, 2);
    assert.equal(summary.busyCount, 0);
    assert.equal(summary.blockedCount, 1);
    assert.equal(summary.idleCount, 1);
    assert.equal(summary.completedCount, 0);
    assert.equal(summary.failedCount, 0);
  });
});
