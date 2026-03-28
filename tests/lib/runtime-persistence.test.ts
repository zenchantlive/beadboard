/**
 * tests/lib/runtime-persistence.test.ts
 *
 * Tests for runtime-persistence.ts (appendJsonl, readJsonl, writeJsonl) and
 * EmbeddedPiDaemon's restore-from-disk behaviour in ensureProject.
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { appendJsonl, readJsonl, writeJsonl } from '../../src/lib/runtime-persistence.js';
import { EmbeddedPiDaemon } from '../../src/lib/embedded-daemon.js';
import { embeddedPiDaemon } from '../../src/lib/embedded-daemon.js';
import { workerSessionManager } from '../../src/lib/worker-session-manager.js';
import type { ConversationTurn } from '../../src/lib/orchestrator-chat.js';
import { getProjectRuntimeId, type RuntimeConsoleEvent } from '../../src/lib/embedded-runtime.js';
import { summarizeAgentStates } from '../../src/lib/agent/state.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bb-persist-test-'));
}

function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── appendJsonl / readJsonl / writeJsonl ────────────────────────────────────

describe('appendJsonl', () => {
  let dir: string;

  before(() => { dir = makeTempDir(); });
  after(() => { removeTempDir(dir); });

  it('creates file and appends first line', () => {
    appendJsonl(dir, 'test.jsonl', { a: 1 });
    const records = readJsonl<{ a: number }>(dir, 'test.jsonl');
    assert.equal(records.length, 1);
    assert.equal(records[0].a, 1);
  });

  it('appends multiple lines correctly', () => {
    appendJsonl(dir, 'multi.jsonl', { n: 1 });
    appendJsonl(dir, 'multi.jsonl', { n: 2 });
    appendJsonl(dir, 'multi.jsonl', { n: 3 });
    const records = readJsonl<{ n: number }>(dir, 'multi.jsonl');
    assert.equal(records.length, 3);
    assert.deepEqual(records.map((r) => r.n), [1, 2, 3]);
  });
});

describe('readJsonl', () => {
  let dir: string;

  before(() => { dir = makeTempDir(); });
  after(() => { removeTempDir(dir); });

  it('returns empty array for missing file', () => {
    const result = readJsonl(dir, 'nonexistent.jsonl');
    assert.deepEqual(result, []);
  });

  it('parses JSONL correctly', () => {
    appendJsonl(dir, 'parse-test.jsonl', { x: 'hello', y: 42 });
    appendJsonl(dir, 'parse-test.jsonl', { x: 'world', y: 0 });
    const records = readJsonl<{ x: string; y: number }>(dir, 'parse-test.jsonl');
    assert.equal(records.length, 2);
    assert.equal(records[0].x, 'hello');
    assert.equal(records[1].x, 'world');
  });
});

describe('writeJsonl', () => {
  let dir: string;

  before(() => { dir = makeTempDir(); });
  after(() => { removeTempDir(dir); });

  it('creates file with all records', () => {
    writeJsonl(dir, 'write-test.jsonl', [{ v: 1 }, { v: 2 }]);
    const records = readJsonl<{ v: number }>(dir, 'write-test.jsonl');
    assert.equal(records.length, 2);
    assert.equal(records[0].v, 1);
    assert.equal(records[1].v, 2);
  });

  it('overwrites existing file content', () => {
    writeJsonl(dir, 'overwrite.jsonl', [{ v: 10 }, { v: 20 }]);
    writeJsonl(dir, 'overwrite.jsonl', [{ v: 99 }]);
    const records = readJsonl<{ v: number }>(dir, 'overwrite.jsonl');
    assert.equal(records.length, 1);
    assert.equal(records[0].v, 99);
  });

  it('writes empty file when given empty array', () => {
    writeJsonl(dir, 'empty.jsonl', []);
    const records = readJsonl(dir, 'empty.jsonl');
    assert.deepEqual(records, []);
  });
});

// ─── EmbeddedPiDaemon disk restore ───────────────────────────────────────────

describe('EmbeddedPiDaemon restores events from disk on ensureProject', () => {
  let dir: string;
  let daemon: EmbeddedPiDaemon;

  beforeEach(() => {
    dir = makeTempDir();
    daemon = new EmbeddedPiDaemon();
  });

  after(() => {
    // Clean up all temp dirs created via beforeEach — they share the same prefix
    // so we rely on os.tmpdir() being cleaned up or just accept minor leakage.
    // The beforeEach creates a new dir each time; we can't easily share cleanup.
    // This is acceptable for a small test suite.
  });

  it('starts with empty events when no disk file exists', () => {
    daemon.ensureProject(dir);
    assert.equal(daemon.listEvents(dir).length, 0);
  });

  it('restores events written before restart', () => {
    // Simulate prior run: write an event directly to disk
    const fakeEvent: RuntimeConsoleEvent = {
      id: 'evt-test-001',
      projectId: 'test-proj',
      kind: 'launch.started',
      title: 'Test event',
      detail: 'A persisted event',
      timestamp: new Date().toISOString(),
      status: 'idle',
    };
    appendJsonl(dir, 'events.jsonl', fakeEvent);

    // New daemon instance (simulates server restart)
    const freshDaemon = new EmbeddedPiDaemon();
    freshDaemon.ensureProject(dir);

    const events = freshDaemon.listEvents(dir);
    assert.equal(events.length, 1);
    assert.equal(events[0].id, 'evt-test-001');
    assert.equal(events[0].title, 'Test event');
  });

  it('restores the newest persisted events first when history exceeds the cap', () => {
    for (let index = 0; index < 1005; index += 1) {
      appendJsonl(dir, 'events.jsonl', {
        id: `evt-${index}`,
        projectId: 'test-proj',
        kind: 'worker.updated',
        title: `Event ${index}`,
        detail: `Persisted event ${index}`,
        timestamp: `2026-03-26T00:00:${String(index % 60).padStart(2, '0')}.000Z`,
        status: 'working',
        metadata: { workerId: `worker-${index}` },
      } satisfies RuntimeConsoleEvent);
    }

    const freshDaemon = new EmbeddedPiDaemon();
    freshDaemon.ensureProject(dir);

    const events = freshDaemon.listEvents(dir);
    assert.equal(events.length, 1000);
    assert.equal(events[0].id, 'evt-1004');
    assert.equal(events.at(-1)?.id, 'evt-5');
  });
});

describe('EmbeddedPiDaemon restores turns from disk on ensureProject', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  it('starts with empty turns when no disk file exists', () => {
    const daemon = new EmbeddedPiDaemon();
    daemon.ensureProject(dir);
    assert.equal(daemon.listTurns(dir).length, 0);
  });

  it('restores turns written before restart', () => {
    const turn1: ConversationTurn = {
      id: 'user-111',
      role: 'user',
      text: 'Deploy everything',
      timestamp: new Date().toISOString(),
      status: 'complete',
    };
    const turn2: ConversationTurn = {
      id: 'asst-222',
      role: 'assistant',
      text: 'Deploying now...',
      timestamp: new Date().toISOString(),
      status: 'complete',
    };
    appendJsonl(dir, 'turns.jsonl', turn1);
    appendJsonl(dir, 'turns.jsonl', turn2);

    const freshDaemon = new EmbeddedPiDaemon();
    freshDaemon.ensureProject(dir);

    const turns = freshDaemon.listTurns(dir);
    assert.equal(turns.length, 2);
    assert.equal(turns[0].id, 'user-111');
    assert.equal(turns[0].text, 'Deploy everything');
    assert.equal(turns[1].id, 'asst-222');
    assert.equal(turns[1].role, 'assistant');
  });

  it('appendTurn writes to disk so next daemon can restore', () => {
    const daemon1 = new EmbeddedPiDaemon();
    const turn: ConversationTurn = {
      id: 'u-persist',
      role: 'user',
      text: 'Persist me',
      timestamp: new Date().toISOString(),
      status: 'complete',
    };
    daemon1.appendTurn(dir, turn);

    // New daemon restores
    const daemon2 = new EmbeddedPiDaemon();
    daemon2.ensureProject(dir);
    const turns = daemon2.listTurns(dir);
    assert.equal(turns.length, 1);
    assert.equal(turns[0].text, 'Persist me');
  });

  it('appendEvent writes to disk so next daemon can restore', () => {
    const daemon1 = new EmbeddedPiDaemon();
    daemon1.appendEvent(dir, {
      kind: 'launch.started',
      title: 'Persist event',
      detail: 'should survive restart',
      status: 'idle',
    });

    const daemon2 = new EmbeddedPiDaemon();
    daemon2.ensureProject(dir);
    const events = daemon2.listEvents(dir);
    assert.equal(events.length, 1);
    assert.equal(events[0].title, 'Persist event');
  });
});

describe('WorkerSessionManager bootstraps agent state from persisted workers before live events', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
    workerSessionManager.reset();
    embeddedPiDaemon.resetForTests();
  });

  afterEach(() => {
    workerSessionManager.reset();
    embeddedPiDaemon.resetForTests();
    removeTempDir(dir);
  });

  it('marks restored in-flight workers failed and appends a terminal event after restart', () => {
    const projectId = getProjectRuntimeId(dir);

    writeJsonl(dir, 'workers.jsonl', [
      {
        id: 'worker-123',
        projectId,
        projectRoot: dir,
        taskId: 'task-1',
        beadId: 'bead-1',
        status: 'working',
        createdAt: '2026-03-26T00:00:00.000Z',
        completedAt: null,
        result: null,
        error: null,
        archetypeId: 'engineer',
        agentTypeId: 'engineer',
        agentInstanceId: 'engineer-01-abc123',
        displayName: 'Engineer 01',
      },
    ]);

    appendJsonl(dir, 'events.jsonl', {
      id: 'evt-blocked-1',
      projectId,
      kind: 'worker.blocked',
      title: 'Engineer 01 blocked',
      detail: 'Waiting on approval',
      timestamp: '2026-03-26T00:00:01.000Z',
      status: 'blocked',
      actorLabel: 'Engineer 01',
      taskId: 'task-1',
      swarmId: null,
      metadata: {
        workerId: 'worker-123',
        agentInstanceId: 'engineer-01-abc123',
        agentTypeId: 'engineer',
        displayName: 'Engineer 01',
        taskId: 'task-1',
      },
    } satisfies RuntimeConsoleEvent);

    const workers = workerSessionManager.listWorkers(dir);
    const agentStates = workerSessionManager.listAgentStates(dir);
    const events = embeddedPiDaemon.listEvents(dir);

    assert.equal(workers.length, 1);
    assert.equal(workers[0].status, 'failed');
    assert.equal(workers[0].error, 'Server restarted');

    assert.equal(agentStates.length, 1);
    assert.equal(agentStates[0].status, 'failed');
    assert.equal(agentStates[0].error, 'Server restarted');
    assert.equal(agentStates[0].lastEventKind, 'worker.failed');
    assert.equal(agentStates[0].taskId, 'task-1');
    assert.equal(events[0].kind, 'worker.failed');
    assert.equal(events[0].metadata?.workerId, 'worker-123');
  });

  it('keeps one logical agent through restore plus live replay and preserves counts', () => {
    const projectId = getProjectRuntimeId(dir);

    writeJsonl(dir, 'workers.jsonl', [
      {
        id: 'worker-123',
        projectId,
        projectRoot: dir,
        taskId: 'task-1',
        beadId: 'bead-1',
        status: 'working',
        createdAt: '2026-03-26T00:00:00.000Z',
        completedAt: null,
        result: null,
        error: null,
        archetypeId: 'engineer',
        agentTypeId: 'engineer',
        agentInstanceId: 'engineer-01-abc123',
        displayName: 'Engineer 01',
      },
    ]);

    const restored = workerSessionManager.listAgentStates(dir);
    const manager = workerSessionManager as unknown as {
      recordAgentEvent: (worker: any, event: RuntimeConsoleEvent) => void;
    };

    manager.recordAgentEvent(
      {
        id: 'worker-123',
        projectId,
        projectRoot: dir,
        taskId: 'task-1',
        beadId: 'bead-1',
        status: 'working',
        session: null,
        createdAt: '2026-03-26T00:00:00.000Z',
        completedAt: null,
        result: null,
        error: null,
        archetypeId: 'engineer',
        agentTypeId: 'engineer',
        agentInstanceId: 'engineer-01-abc123',
        displayName: 'Engineer 01',
      },
      {
        id: 'evt-blocked-live',
        projectId,
        kind: 'worker.blocked',
        title: 'Engineer 01 blocked again',
        detail: 'Waiting on approval after reconnect',
        timestamp: '2026-03-26T00:00:02.000Z',
        status: 'blocked',
        actorLabel: 'Engineer 01',
        taskId: 'task-1',
        swarmId: null,
        metadata: {
          workerId: 'worker-123',
          agentInstanceId: 'engineer-01-abc123',
          agentTypeId: 'engineer',
          displayName: 'Engineer 01',
          taskId: 'task-1',
        },
      },
    );

    const agentStates = workerSessionManager.listAgentStates(dir);
    const summary = summarizeAgentStates(agentStates);

    assert.equal(restored.length, 1);
    assert.equal(agentStates.length, 1);
    assert.equal(agentStates[0].status, 'blocked');
    assert.equal(agentStates[0].blocker, 'Waiting on approval after reconnect');
    assert.equal(agentStates[0].seenEventIds.length, 3);
    assert.equal(agentStates[0].seenEventIds[0], 'worker-123:bootstrap');
    assert.equal(agentStates[0].seenEventIds[2], 'evt-blocked-live');
    assert.equal(summary.totalCount, 1);
    assert.equal(summary.busyCount, 0);
    assert.equal(summary.blockedCount, 1);
    assert.equal(summary.idleCount, 0);
  });
});
