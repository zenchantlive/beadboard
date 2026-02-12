import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { readIssuesFromDisk, resolveIssuesJsonlPath } from '../../src/lib/read-issues';
import { sameWindowsPath } from '../../src/lib/pathing';

test('resolveIssuesJsonlPath appends .beads/issues.jsonl using windows-safe pathing', () => {
  const resolved = resolveIssuesJsonlPath('C:/Repo/Project');
  assert.equal(sameWindowsPath(resolved, 'C:/Repo/Project/.beads/issues.jsonl'), true);
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
});

test('readIssuesFromDisk returns empty list when issues file does not exist', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-read-missing-'));
  const issues = await readIssuesFromDisk({ projectRoot: root });
  assert.deepEqual(issues, []);
});
