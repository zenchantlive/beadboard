import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  addProject,
  listProjects,
  removeProject,
  registryFilePath,
  type RegistryProject,
} from '../../src/lib/registry';

async function withTempUserProfile(run: (userProfile: string) => Promise<void>): Promise<void> {
  const previous = process.env.USERPROFILE;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-registry-'));
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

test('registryFilePath resolves under %USERPROFILE%/.beadboard/projects.json', async () => {
  await withTempUserProfile(async (userProfile) => {
    const result = registryFilePath();
    assert.equal(result, path.join(userProfile, '.beadboard', 'projects.json'));
  });
});

test('listProjects returns empty when registry does not exist', async () => {
  await withTempUserProfile(async () => {
    const result = await listProjects();
    assert.deepEqual(result, []);
  });
});

test('addProject persists normalized path and deduplicates case/separators', async () => {
  await withTempUserProfile(async () => {
    const first = await addProject('c:/Work/Alpha/');
    assert.equal(first.added, true);

    const second = await addProject('C:\\work\\alpha');
    assert.equal(second.added, false);

    const listed = await listProjects();
    assert.equal(listed.length, 1);
    assert.equal(listed[0].path, 'C:/Work/Alpha');

    const file = await fs.readFile(registryFilePath(), 'utf8');
    const parsed = JSON.parse(file) as { projects: RegistryProject[] };
    assert.equal(parsed.projects.length, 1);
  });
});

test('removeProject removes matching normalized path', async () => {
  await withTempUserProfile(async () => {
    await addProject('D:/Repos/One');
    await addProject('D:/Repos/Two');

    const removed = await removeProject('d:\\repos\\one\\');
    assert.equal(removed.removed, true);

    const listed = await listProjects();
    assert.deepEqual(
      listed.map((project) => project.path),
      ['D:/Repos/Two'],
    );
  });
});

test('addProject rejects non-Windows absolute paths', async () => {
  await withTempUserProfile(async () => {
    await assert.rejects(() => addProject('/tmp/project'), /Windows absolute path/i);
    await assert.rejects(() => addProject('relative/path'), /Windows absolute path/i);
  });
});
