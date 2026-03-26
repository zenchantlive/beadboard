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

import { validateProjectRoot } from '../../src/lib/validate-project-root.js';
import { readJsonl, writeJsonlAtomic, RUNTIME_DIR } from '../../src/lib/runtime-persistence.js';

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
    // os.tmpdir() exists but has no .beads subdirectory
    const result = validateProjectRoot(os.tmpdir());
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.equal(result.error.status, 400);
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
