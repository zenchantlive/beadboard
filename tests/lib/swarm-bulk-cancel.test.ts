import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSwarmBulkCancelConfirmation,
  selectActiveSwarmWorkers,
  stopActiveSwarmWorkers,
} from '../../src/lib/swarm-bulk-cancel.js';
import type { WorkerSession } from '../../src/lib/worker-session-manager.js';

function makeWorker(overrides: Partial<WorkerSession> & Pick<WorkerSession, 'id' | 'projectId' | 'projectRoot' | 'taskId' | 'status'>): WorkerSession {
  return {
    id: overrides.id,
    projectId: overrides.projectId,
    projectRoot: overrides.projectRoot,
    taskId: overrides.taskId,
    status: overrides.status,
    session: null,
    createdAt: overrides.createdAt ?? '2026-03-26T00:00:00.000Z',
    completedAt: overrides.completedAt ?? null,
    result: overrides.result ?? null,
    error: overrides.error ?? null,
    beadId: overrides.beadId,
    archetypeId: overrides.archetypeId,
    agentTypeId: overrides.agentTypeId,
    agentInstanceId: overrides.agentInstanceId,
    displayName: overrides.displayName,
  };
}

test('Swarm bulk cancel helper - builds an explicit confirmation phrase', () => {
  assert.equal(
    buildSwarmBulkCancelConfirmation('beadboard-ov2.8', 3),
    'STOP 3 ACTIVE WORKERS IN beadboard-ov2.8',
  );
});

test('Swarm bulk cancel helper - selects only active workers for active swarm tasks', () => {
  const workers = [
    makeWorker({
      id: 'worker-a',
      projectId: 'project-1',
      projectRoot: '/tmp/project-1',
      taskId: 'bead-1',
      status: 'working',
      displayName: 'Worker A',
    }),
    makeWorker({
      id: 'worker-b',
      projectId: 'project-1',
      projectRoot: '/tmp/project-1',
      taskId: 'bead-2',
      status: 'completed',
      displayName: 'Worker B',
    }),
    makeWorker({
      id: 'worker-c',
      projectId: 'project-1',
      projectRoot: '/tmp/project-1',
      taskId: 'bead-3',
      status: 'spawning',
      displayName: 'Worker C',
    }),
  ];

  const selected = selectActiveSwarmWorkers(workers, ['bead-1', 'bead-2', 'bead-3']);
  assert.equal(selected.length, 2);
  assert.deepEqual(
    selected.map((worker) => worker.workerId),
    ['worker-a', 'worker-c'],
  );
});

test('Swarm bulk cancel helper - terminates matching active workers after confirmation', async () => {
  const workers = [
    makeWorker({
      id: 'worker-a',
      projectId: 'project-1',
      projectRoot: '/tmp/project-1',
      taskId: 'bead-1',
      status: 'working',
      displayName: 'Worker A',
    }),
    makeWorker({
      id: 'worker-b',
      projectId: 'project-1',
      projectRoot: '/tmp/project-1',
      taskId: 'bead-2',
      status: 'spawning',
      displayName: 'Worker B',
    }),
    makeWorker({
      id: 'worker-c',
      projectId: 'project-1',
      projectRoot: '/tmp/project-1',
      taskId: 'bead-3',
      status: 'completed',
      displayName: 'Worker C',
    }),
  ];

  const terminated: string[] = [];

  const result = await stopActiveSwarmWorkers(
    '/tmp/project-1',
    'beadboard-ov2.8',
    'STOP 2 ACTIVE WORKERS IN beadboard-ov2.8',
    {
      runBd: async () => ({
        success: true,
        classification: null,
        command: 'bd',
        args: ['swarm', 'status', 'beadboard-ov2.8', '--json'],
        cwd: '/tmp/project-1',
        stdout: JSON.stringify({
          epic_id: 'beadboard-ov2.8',
          active: [{ id: 'bead-1' }, { id: 'bead-2' }],
        }),
        stderr: '',
        code: 0,
        durationMs: 1,
        error: null,
      }),
      listWorkers: () => workers,
      terminateWorker: async (workerId: string) => {
        terminated.push(workerId);
      },
    },
  );

  assert.equal(result.confirmationPhrase, 'STOP 2 ACTIVE WORKERS IN beadboard-ov2.8');
  assert.equal(result.matchedWorkers.length, 2);
  assert.deepEqual(result.stoppedWorkerIds, ['worker-a', 'worker-b']);
  assert.deepEqual(terminated, ['worker-a', 'worker-b']);
  assert.deepEqual(result.failedWorkers, []);
});

test('Swarm bulk cancel helper - rejects stale confirmation text', async () => {
  await assert.rejects(
    () =>
      stopActiveSwarmWorkers(
        '/tmp/project-1',
        'beadboard-ov2.8',
        'STOP ALL WORKERS',
        {
          runBd: async () => ({
            success: true,
            classification: null,
            command: 'bd',
            args: ['swarm', 'status', 'beadboard-ov2.8', '--json'],
            cwd: '/tmp/project-1',
            stdout: JSON.stringify({
              epic_id: 'beadboard-ov2.8',
              active: [{ id: 'bead-1' }],
            }),
            stderr: '',
            code: 0,
            durationMs: 1,
            error: null,
          }),
          listWorkers: () => [makeWorker({
            id: 'worker-a',
            projectId: 'project-1',
            projectRoot: '/tmp/project-1',
            taskId: 'bead-1',
            status: 'working',
            displayName: 'Worker A',
          })],
          terminateWorker: async () => {},
        },
      ),
    /Confirmation must exactly match/,
  );
});
