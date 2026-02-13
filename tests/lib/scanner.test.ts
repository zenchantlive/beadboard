import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { addProject } from '../../src/lib/registry';
import { scanForProjects, resolveScanRoots } from '../../src/lib/scanner';
import { canonicalizeWindowsPath, sameWindowsPath, windowsPathKey } from '../../src/lib/pathing';

async function withTempUserProfile(run: (userProfile: string) => Promise<void>): Promise<void> {
  const previous = process.env.USERPROFILE;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-scan-'));
  process.env.USERPROFILE = tempDir;

  try {
    await run(tempDir);
  } finally {
    if (previous === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = previous;
    }

    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test('resolveScanRoots includes profile and registry roots by default', async () => {
  await withTempUserProfile(async (userProfile) => {
    const registryRoot = path.join(userProfile, 'Registered');
    await fs.mkdir(registryRoot, { recursive: true });
    await addProject(registryRoot);

    const roots = await resolveScanRoots();

    assert.equal(roots.some((root) => sameWindowsPath(root, userProfile)), true);
    assert.equal(roots.some((root) => sameWindowsPath(root, registryRoot)), true);
    assert.equal(roots.some((root) => windowsPathKey(root) === windowsPathKey('C:\\')), false);
  });
});

test('resolveScanRoots includes full-drive roots only when requested', async () => {
  await withTempUserProfile(async () => {
    const roots = await resolveScanRoots({ mode: 'full-drive' });
    assert.equal(roots.some((root) => windowsPathKey(root) === windowsPathKey('C:\\')), true);
  });
});

test('scanForProjects respects depth limits and ignore list', async () => {
  await withTempUserProfile(async (userProfile) => {
    const projectRoot = path.join(userProfile, 'ProjectA');
    await fs.mkdir(path.join(projectRoot, '.beads'), { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, '.beads', 'issues.jsonl'),
      JSON.stringify({ id: 'bb-a', title: 'A', issue_type: 'task', status: 'open', priority: 1 }),
      'utf8',
    );

    const ignoredRoot = path.join(userProfile, 'node_modules', 'Ignored');
    await fs.mkdir(path.join(ignoredRoot, '.beads'), { recursive: true });
    await fs.writeFile(
      path.join(ignoredRoot, '.beads', 'issues.jsonl'),
      JSON.stringify({ id: 'bb-ignored', title: 'Ignored', issue_type: 'task', status: 'open', priority: 1 }),
      'utf8',
    );

    const deepRoot = path.join(userProfile, 'Deep', 'Level1', 'Level2', 'ProjectDeep');
    await fs.mkdir(path.join(deepRoot, '.beads'), { recursive: true });
    await fs.writeFile(
      path.join(deepRoot, '.beads', 'issues.jsonl'),
      JSON.stringify({ id: 'bb-deep', title: 'Deep', issue_type: 'task', status: 'open', priority: 1 }),
      'utf8',
    );

    const result = await scanForProjects({ maxDepth: 1 });
    const keys = result.projects.map((project) => project.key);

    assert.equal(keys.includes(windowsPathKey(canonicalizeWindowsPath(projectRoot))), true);
    assert.equal(keys.includes(windowsPathKey(canonicalizeWindowsPath(ignoredRoot))), false);
    assert.equal(keys.includes(windowsPathKey(canonicalizeWindowsPath(deepRoot))), false);
  });
});

test('scanForProjects ignores directories that have .beads but no issues JSONL files', async () => {
  await withTempUserProfile(async (userProfile) => {
    const falsePositiveRoot = path.join(userProfile, 'LooksLikeBeadsProject');
    await fs.mkdir(path.join(falsePositiveRoot, '.beads'), { recursive: true });

    const validRoot = path.join(userProfile, 'ValidProject');
    await fs.mkdir(path.join(validRoot, '.beads'), { recursive: true });
    await fs.writeFile(
      path.join(validRoot, '.beads', 'issues.jsonl'),
      JSON.stringify({ id: 'bb-1', title: 'valid', issue_type: 'task', status: 'open', priority: 1 }),
      'utf8',
    );

    const result = await scanForProjects();
    const keys = result.projects.map((project) => project.key);

    assert.equal(keys.includes(windowsPathKey(canonicalizeWindowsPath(falsePositiveRoot))), false);
    assert.equal(keys.includes(windowsPathKey(canonicalizeWindowsPath(validRoot))), true);
  });
});

test('scanForProjects ignores tool/cache paths even if they contain issues JSONL', async () => {
  await withTempUserProfile(async (userProfile) => {
    const tempBeads = path.join(userProfile, 'AppData', 'Local', 'Temp', 'beadboard-read-X');
    await fs.mkdir(path.join(tempBeads, '.beads'), { recursive: true });
    await fs.writeFile(
      path.join(tempBeads, '.beads', 'issues.jsonl'),
      JSON.stringify({ id: 'bb-temp', title: 'temp', issue_type: 'task', status: 'open', priority: 1 }),
      'utf8',
    );

    const skillsBeads = path.join(userProfile, '.agents', 'skills', 'create-beads-orchestration');
    await fs.mkdir(path.join(skillsBeads, '.beads'), { recursive: true });
    await fs.writeFile(
      path.join(skillsBeads, '.beads', 'issues.jsonl'),
      JSON.stringify({ id: 'bb-skill', title: 'skill', issue_type: 'task', status: 'open', priority: 1 }),
      'utf8',
    );

    const realProject = path.join(userProfile, 'RealProject');
    await fs.mkdir(path.join(realProject, '.beads'), { recursive: true });
    await fs.writeFile(
      path.join(realProject, '.beads', 'issues.jsonl'),
      JSON.stringify({ id: 'bb-real', title: 'real', issue_type: 'task', status: 'open', priority: 1 }),
      'utf8',
    );

    const result = await scanForProjects();
    const keys = result.projects.map((project) => project.key);

    assert.equal(keys.includes(windowsPathKey(canonicalizeWindowsPath(tempBeads))), false);
    assert.equal(keys.includes(windowsPathKey(canonicalizeWindowsPath(skillsBeads))), false);
    assert.equal(keys.includes(windowsPathKey(canonicalizeWindowsPath(realProject))), true);
  });
});
