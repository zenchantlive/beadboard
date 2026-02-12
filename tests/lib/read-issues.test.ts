import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { readIssuesFromDisk, resolveIssuesJsonlPath, resolveIssuesJsonlPathCandidates } from '../../src/lib/read-issues';
import { canonicalizeWindowsPath, sameWindowsPath, toDisplayPath, windowsPathKey } from '../../src/lib/pathing';

test('resolveIssuesJsonlPath appends .beads/issues.jsonl using windows-safe pathing', () => {
  const resolved = resolveIssuesJsonlPath('C:/Repo/Project');
  assert.equal(sameWindowsPath(resolved, 'C:/Repo/Project/.beads/issues.jsonl'), true);
});

test('resolveIssuesJsonlPathCandidates includes .jsonl and .jsonl.new fallback paths', () => {
  const [primary, fallback] = resolveIssuesJsonlPathCandidates('C:/Repo/Project');
  assert.equal(sameWindowsPath(primary, 'C:/Repo/Project/.beads/issues.jsonl'), true);
  assert.equal(sameWindowsPath(fallback, 'C:/Repo/Project/.beads/issues.jsonl.new'), true);
});

test('readIssuesFromDisk parses JSONL issues from disk', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-read-'));
  const beadsDir = path.join(root, '.beads');
  const issuesPath = path.join(beadsDir, 'issues.jsonl');

  await fs.mkdir(beadsDir, { recursive: true });
  await fs.writeFile(
    issuesPath,
    [
      JSON.stringify({ id: 'bb-1', title: 'Open issue', status: 'open', priority: 0, issue_type: 'task' }),
      JSON.stringify({ id: 'bb-2', title: 'Hidden tombstone', status: 'tombstone' }),
    ].join('\n'),
    'utf8',
  );

  const issues = await readIssuesFromDisk({ projectRoot: root });

  assert.equal(issues.length, 1);
  assert.equal(issues[0].id, 'bb-1');
  assert.equal(issues[0].priority, 0);
  assert.equal(issues[0].project.root, canonicalizeWindowsPath(root));
  assert.equal(issues[0].project.key, windowsPathKey(root));
  assert.equal(issues[0].project.displayPath, toDisplayPath(root));
  assert.equal(issues[0].project.name, path.basename(canonicalizeWindowsPath(root)));
  assert.equal(issues[0].project.source, 'local');
  assert.equal(issues[0].project.addedAt, null);
});

test('readIssuesFromDisk returns empty list when issues file does not exist', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-read-missing-'));
  const issues = await readIssuesFromDisk({ projectRoot: root });
  assert.deepEqual(issues, []);
});

test('readIssuesFromDisk falls back to issues.jsonl.new when issues.jsonl is missing', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-read-fallback-'));
  const beadsDir = path.join(root, '.beads');
  const fallbackPath = path.join(beadsDir, 'issues.jsonl.new');
  await fs.mkdir(beadsDir, { recursive: true });
  await fs.writeFile(
    fallbackPath,
    JSON.stringify({ id: 'bb-fallback', title: 'From fallback', status: 'open', priority: 2, issue_type: 'task' }),
    'utf8',
  );

  const issues = await readIssuesFromDisk({ projectRoot: root });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].id, 'bb-fallback');
});
