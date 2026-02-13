import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { DELETE, GET, POST } from '../../src/app/api/projects/route';

async function withTempUserProfile(run: (userProfile: string) => Promise<void>): Promise<void> {
  const previous = process.env.USERPROFILE;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-api-'));
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

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

test('GET /api/projects returns empty list initially', async () => {
  await withTempUserProfile(async () => {
    const response = await GET();
    assert.equal(response.status, 200);

    const body = (await readJson(response)) as { projects: unknown[] };
    assert.deepEqual(body.projects, []);
  });
});

test('POST /api/projects validates payload and path', async () => {
  await withTempUserProfile(async () => {
    const missing = await POST(new Request('http://localhost/api/projects', { method: 'POST', body: '{}' }));
    assert.equal(missing.status, 400);

    const missingBody = (await readJson(missing)) as { error: string };
    assert.match(missingBody.error, /path/i);

    const invalidPath = await POST(
      new Request('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ path: '/tmp/project' }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    assert.equal(invalidPath.status, 400);
  });
});

test('POST deduplicates and GET returns normalized path', async () => {
  await withTempUserProfile(async () => {
    const first = await POST(
      new Request('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ path: 'c:/Users/Zenchant/codex/beadboard/' }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    assert.equal(first.status, 201);

    const dup = await POST(
      new Request('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ path: 'C:\\users\\zenchant\\codex\\beadboard' }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    assert.equal(dup.status, 200);

    const list = await GET();
    const body = (await readJson(list)) as { projects: Array<{ path: string }> };
    assert.deepEqual(body.projects, [{ path: 'C:/Users/Zenchant/codex/beadboard' }]);
  });
});

test('DELETE /api/projects removes by normalized path', async () => {
  await withTempUserProfile(async () => {
    await POST(
      new Request('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ path: 'D:/Repos/One' }),
        headers: { 'content-type': 'application/json' },
      }),
    );

    const removed = await DELETE(
      new Request('http://localhost/api/projects', {
        method: 'DELETE',
        body: JSON.stringify({ path: 'd:\\repos\\one\\' }),
        headers: { 'content-type': 'application/json' },
      }),
    );
    assert.equal(removed.status, 200);

    const list = await GET();
    const body = (await readJson(list)) as { projects: unknown[] };
    assert.deepEqual(body.projects, []);
  });
});
