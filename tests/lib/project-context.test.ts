import test from 'node:test';
import assert from 'node:assert/strict';

import { buildProjectContext } from '../../src/lib/project-context';

test('buildProjectContext derives normalized project identity', () => {
  const project = buildProjectContext('C:/Repo/Project');

  assert.equal(project.root, 'C:\\Repo\\Project');
  assert.equal(project.key, 'c:\\repo\\project');
  assert.equal(project.displayPath, 'C:/Repo/Project');
  assert.equal(project.name, 'Project');
  assert.equal(project.source, 'local');
  assert.equal(project.addedAt, null);
});
