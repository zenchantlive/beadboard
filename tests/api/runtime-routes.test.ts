/**
 * tests/api/runtime-routes.test.ts
 *
 * Tests for:
 *   - validateProjectRoot (src/lib/validate-project-root.ts)
 *   - readJsonl corrupt line handling (src/lib/runtime-persistence.ts)
 *   - writeJsonlAtomic (src/lib/runtime-persistence.ts)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { GET as getRuntimeAgents } from '../../src/app/api/runtime/agents/route.js';
import { embeddedPiDaemon } from '../../src/lib/embedded-daemon.js';
import { getProjectRuntimeId, type RuntimeConsoleEvent } from '../../src/lib/embedded-runtime.js';
import { validateProjectRoot } from '../../src/lib/validate-project-root.js';
import { appendJsonl, readJsonl, writeJsonl, writeJsonlAtomic, RUNTIME_DIR } from '../../src/lib/runtime-persistence.js';
import { workerSessionManager } from '../../src/lib/worker-session-manager.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bb-routes-test-'));
}

function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── validateProjectRoot ─────────────────────────────────────────────────────

describe('validateProjectRoot — rejects invalid inputs', () => {
  it('rejects missing projectRoot (undefined)', () => {
    const result = validateProjectRoot(undefined);
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.equal(result.error.status, 400);
    }
  });

  it('rejects empty string projectRoot', () => {
    const result = validateProjectRoot('');
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.equal(result.error.status, 400);
    }
  });

  it('rejects non-string projectRoot (number)', () => {
    const result = validateProjectRoot(42);
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.equal(result.error.status, 400);
    }
  });

  it('rejects relative paths', () => {
    const result = validateProjectRoot('relative/path/to/project');
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.equal(result.error.status, 400);
    }
  });

  it('rejects paths containing .. traversal segments', () => {
    const result = validateProjectRoot('/some/valid/../../../etc/passwd');
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.equal(result.error.status, 400);
    }
  });

  it('rejects absolute path without .beads directory', () => {
    const dir = makeTempDir();
    try {
      const result = validateProjectRoot(dir);
      assert.equal(result.valid, false);
      if (!result.valid) {
        assert.equal(result.error.status, 400);
      }
    } finally {
      removeTempDir(dir);
    }
  });
});

describe('validateProjectRoot — accepts valid project root', () => {
  let dir: string;

  before(() => {
    dir = makeTempDir();
    fs.mkdirSync(path.join(dir, '.beads'), { recursive: true });
  });

  after(() => {
    removeTempDir(dir);
  });

  it('accepts absolute path with .beads directory', () => {
    const result = validateProjectRoot(dir);
    assert.equal(result.valid, true);
    if (result.valid) {
      assert.equal(result.projectRoot, dir);
    }
  });
});

// ─── readJsonl — corrupt line handling ───────────────────────────────────────

describe('readJsonl — corrupt line handling', () => {
  let dir: string;

  before(() => {
    dir = makeTempDir();
    // Ensure the runtime dir exists so we can write files into it directly
    fs.mkdirSync(path.join(dir, RUNTIME_DIR), { recursive: true });
  });

  after(() => {
    removeTempDir(dir);
  });

  it('skips corrupt JSON lines without crashing', () => {
    const filePath = path.join(dir, RUNTIME_DIR, 'corrupt-only.jsonl');
    fs.writeFileSync(filePath, 'this is not json\n');
    const result = readJsonl(dir, 'corrupt-only.jsonl');
    assert.deepEqual(result, []);
  });

  it('returns valid lines before and after a corrupt line', () => {
    const filePath = path.join(dir, RUNTIME_DIR, 'mixed.jsonl');
    fs.writeFileSync(
      filePath,
      [
        JSON.stringify({ id: 1, value: 'first' }),
        'CORRUPT LINE NOT JSON',
        JSON.stringify({ id: 3, value: 'third' }),
      ].join('\n') + '\n',
    );
    const result = readJsonl<{ id: number; value: string }>(dir, 'mixed.jsonl');
    assert.equal(result.length, 2);
    assert.equal(result[0].id, 1);
    assert.equal(result[0].value, 'first');
    assert.equal(result[1].id, 3);
    assert.equal(result[1].value, 'third');
  });

  it('returns empty array for entirely corrupt file', () => {
    const filePath = path.join(dir, RUNTIME_DIR, 'all-corrupt.jsonl');
    fs.writeFileSync(
      filePath,
      ['not json at all', '{ broken: true', ']]invalid[['].join('\n') + '\n',
    );
    const result = readJsonl(dir, 'all-corrupt.jsonl');
    assert.deepEqual(result, []);
  });
});

// ─── writeJsonlAtomic ────────────────────────────────────────────────────────

describe('writeJsonlAtomic', () => {
  let dir: string;

  before(() => {
    dir = makeTempDir();
  });

  after(() => {
    removeTempDir(dir);
  });

  it('writes records and leaves no .tmp file behind (atomic rename)', () => {
    const filename = 'atomic.jsonl';
    writeJsonlAtomic(dir, filename, [{ n: 1 }, { n: 2 }]);

    const finalPath = path.join(dir, RUNTIME_DIR, filename);
    const tmpPath = finalPath + '.tmp';

    assert.ok(fs.existsSync(finalPath), 'final file should exist');
    assert.ok(!fs.existsSync(tmpPath), '.tmp file should not exist after rename');
  });

  it('file content matches expected JSONL format', () => {
    const records = [{ id: 'a', val: 1 }, { id: 'b', val: 2 }];
    writeJsonlAtomic(dir, 'content-check.jsonl', records);

    const finalPath = path.join(dir, RUNTIME_DIR, 'content-check.jsonl');
    const content = fs.readFileSync(finalPath, 'utf-8');

    const expectedLines = records.map((r) => JSON.stringify(r));
    const actualLines = content.trim().split('\n');

    assert.deepEqual(actualLines, expectedLines);
    // File should end with a newline
    assert.ok(content.endsWith('\n'), 'JSONL file should end with newline');
  });

  it('round-trips correctly through readJsonl', () => {
    const records = [{ x: 10 }, { x: 20 }, { x: 30 }];
    writeJsonlAtomic(dir, 'roundtrip.jsonl', records);

    const result = readJsonl<{ x: number }>(dir, 'roundtrip.jsonl');
    assert.equal(result.length, 3);
    assert.deepEqual(result.map((r) => r.x), [10, 20, 30]);
  });

  it('overwrites previous file content', () => {
    writeJsonlAtomic(dir, 'overwrite-atomic.jsonl', [{ v: 1 }, { v: 2 }]);
    writeJsonlAtomic(dir, 'overwrite-atomic.jsonl', [{ v: 99 }]);

    const result = readJsonl<{ v: number }>(dir, 'overwrite-atomic.jsonl');
    assert.equal(result.length, 1);
    assert.equal(result[0].v, 99);
  });
});

describe('GET /api/runtime/agents', () => {
  let dir: string;

  before(() => {
    dir = makeTempDir();
  });

  after(() => {
    workerSessionManager.reset();
    embeddedPiDaemon.resetForTests();
    removeTempDir(dir);
  });

  it('returns canonical AgentState summary and instances from the shared runtime contract', async () => {
    workerSessionManager.reset();
    embeddedPiDaemon.resetForTests();

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

    const response = await getRuntimeAgents(new Request(`http://localhost/api/runtime/agents?projectRoot=${encodeURIComponent(dir)}`));
    const payload = await response.json();

    assert.equal(payload.ok, true);
    assert.equal(payload.summary.totalCount, 1);
    assert.equal(payload.summary.busyCount, 0);
    assert.equal(payload.summary.blockedCount, 1);
    assert.equal(payload.status.totalActive, 1);
    assert.equal(payload.status.instances.length, 1);
    assert.equal(payload.status.instances[0].id, 'worker-123');
    assert.equal(payload.status.instances[0].status, 'blocked');
    assert.equal(payload.status.instances[0].currentBeadId, 'task-1');
    assert.equal(payload.agentStates.length, 1);
    assert.equal(payload.agentStates[0].status, 'blocked');
  });
});
