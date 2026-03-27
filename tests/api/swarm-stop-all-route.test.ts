import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bb-swarm-stop-all-route-'));
}

function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

async function importRoute(tag: string) {
  return import(`../../src/app/api/swarm/stop-all/route.js?case=${tag}-${Date.now()}`);
}

test('POST /api/swarm/stop-all returns 400 when swarmId is missing', async () => {
  const dir = makeTempDir();
  fs.mkdirSync(path.join(dir, '.beads'), { recursive: true });

  try {
    const { POST } = await importRoute('missing-swarm');
    const response = await POST(new Request('http://localhost/api/swarm/stop-all', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectRoot: dir,
        confirmation: 'STOP SWARM beadboard-ov2 WITH 0 ACTIVE TASKS',
      }),
    }));

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error.message, 'swarmId is required');
  } finally {
    removeTempDir(dir);
  }
});

test('POST /api/swarm/stop-all returns 400 when confirmation is missing', async () => {
  const dir = makeTempDir();
  fs.mkdirSync(path.join(dir, '.beads'), { recursive: true });

  try {
    const { POST } = await importRoute('missing-confirmation');
    const response = await POST(new Request('http://localhost/api/swarm/stop-all', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectRoot: dir,
        swarmId: 'beadboard-ov2',
      }),
    }));

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error.message, 'confirmation is required');
  } finally {
    removeTempDir(dir);
  }
});

test('POST /api/swarm/stop-all returns 400 when projectRoot is invalid', async () => {
  const { POST } = await importRoute('invalid-root');
  const response = await POST(new Request('http://localhost/api/swarm/stop-all', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      projectRoot: '/definitely/not/a/beadboard/project',
      swarmId: 'beadboard-ov2',
      confirmation: 'STOP SWARM beadboard-ov2 WITH 0 ACTIVE TASKS',
    }),
  }));

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.error, 'Not a beads-enabled project directory');
});

test('POST /api/swarm/stop-all returns the stopActiveSwarmWorkers payload on success', async (t) => {
  const dir = makeTempDir();
  fs.mkdirSync(path.join(dir, '.beads'), { recursive: true });

  try {
    const stopActiveSwarmWorkers = mock.fn(async (projectRoot: string, swarmId: string, confirmation: string) => ({
      swarmId,
      activeTaskIds: ['beadboard-ov2.8.1', 'beadboard-ov2.8.2'],
      confirmationPhrase: confirmation,
      matchedWorkers: [
        {
          workerId: 'worker-1',
          taskId: 'beadboard-ov2.8.1',
          status: 'working',
          displayName: 'Engineer 01',
        },
      ],
      stoppedWorkerIds: ['worker-1'],
      failedWorkers: [],
      projectRoot,
    }));

    const { handleStopAllRequest } = await importRoute('success');
    const confirmation = 'STOP 2 ACTIVE WORKERS IN beadboard-ov2';
    const response = await handleStopAllRequest(new Request('http://localhost/api/swarm/stop-all', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectRoot: dir,
        swarmId: 'beadboard-ov2',
        confirmation,
      }),
    }), { stopActiveSwarmWorkers });

    const payload = await response.json();
    if (response.status !== 200) {
      assert.fail(`Expected success response, received ${response.status}: ${JSON.stringify(payload)}`);
    }
    assert.equal(payload.ok, true);
    assert.equal(payload.data.swarmId, 'beadboard-ov2');
    assert.deepEqual(payload.data.stoppedWorkerIds, ['worker-1']);
    assert.equal(stopActiveSwarmWorkers.mock.calls.length, 1);
    assert.deepEqual(stopActiveSwarmWorkers.mock.calls[0].arguments, [dir, 'beadboard-ov2', confirmation]);
  } finally {
    t.mock.restoreAll();
    removeTempDir(dir);
  }
});
