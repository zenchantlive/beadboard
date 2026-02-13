import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { readIssuesForScope } from '../../src/lib/aggregate-read';
import type { ProjectScopeOption } from '../../src/lib/project-scope';

async function writeIssues(root: string, lines: unknown[]): Promise<void> {
  const beadsDir = path.join(root, '.beads');
  await fs.mkdir(beadsDir, { recursive: true });
  await fs.writeFile(
    path.join(beadsDir, 'issues.jsonl'),
    lines.map((line) => JSON.stringify(line)).join('\n'),
    'utf8',
  );
}

test('readIssuesForScope reads selected project in single mode', async () => {
  const localRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-scope-single-'));
  await writeIssues(localRoot, [{ id: 'bb-1', title: 'Local issue', issue_type: 'task', status: 'open', priority: 1 }]);

  const local: ProjectScopeOption = {
    key: 'local',
    root: localRoot,
    displayPath: localRoot.replaceAll('\\', '/'),
    source: 'local',
  };

  const issues = await readIssuesForScope({
    mode: 'single',
    selected: local,
    scopeOptions: [local],
  });

  assert.equal(issues.length, 1);
  assert.equal(issues[0].id, 'bb-1');
});

test('readIssuesForScope scopes ids and dependencies in aggregate mode', async () => {
  const localRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-scope-agg-local-'));
  const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-scope-agg-reg-'));

  await writeIssues(localRoot, [
    { id: 'bb-epic', title: 'Local epic', issue_type: 'epic', status: 'open', priority: 1 },
    {
      id: 'bb-epic.1',
      title: 'Local task',
      issue_type: 'task',
      status: 'open',
      priority: 1,
      dependencies: [{ type: 'parent-child', depends_on_id: 'bb-epic' }],
    },
  ]);

  await writeIssues(registryRoot, [
    { id: 'bb-epic', title: 'Registry epic', issue_type: 'epic', status: 'open', priority: 1 },
  ]);

  const local: ProjectScopeOption = {
    key: 'local',
    root: localRoot,
    displayPath: localRoot.replaceAll('\\', '/'),
    source: 'local',
  };
  const registry: ProjectScopeOption = {
    key: 'd:\\repos\\alpha',
    root: registryRoot,
    displayPath: registryRoot.replaceAll('\\', '/'),
    source: 'registry',
  };

  const issues = await readIssuesForScope({
    mode: 'aggregate',
    selected: local,
    scopeOptions: [local, registry],
  });

  assert.equal(issues.length, 3);
  assert.equal(issues.some((issue) => issue.id === 'local::bb-epic'), true);
  assert.equal(issues.some((issue) => issue.id === 'd:\\repos\\alpha::bb-epic'), true);
  const localTask = issues.find((issue) => issue.id === 'local::bb-epic.1');
  assert.ok(localTask);
  assert.equal(localTask.dependencies.some((dependency) => dependency.target === 'local::bb-epic'), true);
  assert.equal(localTask.metadata.original_id, 'bb-epic.1');
});
