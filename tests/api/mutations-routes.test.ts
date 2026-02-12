import test from 'node:test';
import assert from 'node:assert/strict';

import { POST as createPost } from '../../src/app/api/beads/create/route';
import { POST as reopenPost } from '../../src/app/api/beads/reopen/route';
import { POST as commentPost } from '../../src/app/api/beads/comment/route';

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

test('create route returns 400 for invalid payload', async () => {
  const response = await createPost(
    new Request('http://localhost/api/beads/create', {
      method: 'POST',
      body: JSON.stringify({ projectRoot: '', title: '' }),
      headers: { 'content-type': 'application/json' },
    }),
  );

  assert.equal(response.status, 400);
  const data = await readJson(response);
  assert.equal(data.ok, false);
  assert.equal(data.error.classification, 'bad_args');
});

test('reopen route returns 400 for missing id', async () => {
  const response = await reopenPost(
    new Request('http://localhost/api/beads/reopen', {
      method: 'POST',
      body: JSON.stringify({ projectRoot: 'C:/repo' }),
      headers: { 'content-type': 'application/json' },
    }),
  );

  assert.equal(response.status, 400);
  const data = await readJson(response);
  assert.equal(data.ok, false);
});

test('comment route returns 400 for missing comment text', async () => {
  const response = await commentPost(
    new Request('http://localhost/api/beads/comment', {
      method: 'POST',
      body: JSON.stringify({ projectRoot: 'C:/repo', id: 'bb-1' }),
      headers: { 'content-type': 'application/json' },
    }),
  );

  assert.equal(response.status, 400);
  const data = await readJson(response);
  assert.equal(data.ok, false);
  assert.equal(typeof data.error.message, 'string');
});
