import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { addProject, removeProject } from '../../src/lib/registry';
import { resolveAgentWorkspace } from '../../src/lib/agent-workspace';

async function makeTempHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'bb-workspace-home-'));
}

test('resolveAgentWorkspace prefers explicit requested project root', async () => {
  const result = await resolveAgentWorkspace({
    currentProjectRoot: '/tmp/beadboard',
    requestedProjectRoot: '/tmp/user-project',
  });
  assert.equal(result.root, '/tmp/user-project');
  assert.equal(result.source, 'explicit-root');
});

test('resolveAgentWorkspace can select a registered project by key', async () => {
  const originalHome = process.env.HOME;
  const home = await makeTempHome();
  process.env.HOME = home;

  try {
    const projectPath = 'C:/Repos/ClientProject';
    const added = await addProject(projectPath);
    const selectedKey = added.projects[0]?.key;
    assert.ok(selectedKey);

    const result = await resolveAgentWorkspace({
      currentProjectRoot: 'C:/Repos/BeadBoard',
      requestedProjectKey: selectedKey,
    });

    assert.match(result.root, /ClientProject$/);
    assert.equal(result.source, 'scope-selection');
    await removeProject(projectPath);
  } finally {
    process.env.HOME = originalHome;
  }
});
