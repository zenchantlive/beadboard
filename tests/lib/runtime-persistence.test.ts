/**
 * tests/lib/runtime-persistence.test.ts
 *
 * Tests for runtime-persistence.ts (appendJsonl, readJsonl, writeJsonl) and
 * EmbeddedPiDaemon's restore-from-disk behaviour in ensureProject.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { appendJsonl, readJsonl, writeJsonl } from '../../src/lib/runtime-persistence.js';
import { EmbeddedPiDaemon } from '../../src/lib/embedded-daemon.js';
import type { ConversationTurn } from '../../src/lib/orchestrator-chat.js';
import type { RuntimeConsoleEvent } from '../../src/lib/embedded-runtime.js';

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
