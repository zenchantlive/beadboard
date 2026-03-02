import test from 'node:test';
import assert from 'node:assert/strict';

import {
  handleDeleteCommentRequest,
  handlePatchCommentRequest,
} from '../../src/app/api/beads/[id]/comments/[commentId]/route';

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

const params = { id: 'bb-123', commentId: '99' };

test('handlePatchCommentRequest returns 400 for invalid JSON', async () => {
  const response = await handlePatchCommentRequest(
    new Request('http://localhost/api/beads/bb-123/comments/99', {
      method: 'PATCH',
      body: '{',
      headers: { 'content-type': 'application/json' },
    }),
    params,
    {
      updateComment: async () => true,
      deleteComment: async () => true,
    },
  );

  assert.equal(response.status, 400);
  const body = await readJson(response);
  assert.equal(body.ok, false);
});

test('handlePatchCommentRequest returns 400 for invalid payload', async () => {
  const response = await handlePatchCommentRequest(
    new Request('http://localhost/api/beads/bb-123/comments/99', {
      method: 'PATCH',
      body: JSON.stringify({ projectRoot: 'C:/repo', text: '' }),
      headers: { 'content-type': 'application/json' },
    }),
    params,
    {
      updateComment: async () => true,
      deleteComment: async () => true,
    },
  );

  assert.equal(response.status, 400);
  const body = await readJson(response);
  assert.match(body.error.message, /text is required/i);
});

test('handlePatchCommentRequest returns 404 when comment is missing', async () => {
  const response = await handlePatchCommentRequest(
    new Request('http://localhost/api/beads/bb-123/comments/99', {
      method: 'PATCH',
      body: JSON.stringify({ projectRoot: 'C:/repo', text: 'Updated text' }),
      headers: { 'content-type': 'application/json' },
    }),
    params,
    {
      updateComment: async () => false,
      deleteComment: async () => true,
    },
  );

  assert.equal(response.status, 404);
  const body = await readJson(response);
  assert.equal(body.ok, false);
});

test('handlePatchCommentRequest returns 200 on success', async () => {
  let observed: { projectRoot: string; commentId: number; text: string } | null = null;
  const response = await handlePatchCommentRequest(
    new Request('http://localhost/api/beads/bb-123/comments/99', {
      method: 'PATCH',
      body: JSON.stringify({ projectRoot: 'C:/repo', text: 'Updated text' }),
      headers: { 'content-type': 'application/json' },
    }),
    params,
    {
      updateComment: async (projectRoot, commentId, text) => {
        observed = { projectRoot, commentId, text };
        return true;
      },
      deleteComment: async () => true,
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(observed, {
    projectRoot: 'C:/repo',
    commentId: 99,
    text: 'Updated text',
  });

  const body = await readJson(response);
  assert.equal(body.ok, true);
  assert.equal(body.commentId, 99);
});

test('handlePatchCommentRequest returns 500 when update throws', async () => {
  const response = await handlePatchCommentRequest(
    new Request('http://localhost/api/beads/bb-123/comments/99', {
      method: 'PATCH',
      body: JSON.stringify({ projectRoot: 'C:/repo', text: 'Updated text' }),
      headers: { 'content-type': 'application/json' },
    }),
    params,
    {
      updateComment: async () => {
        throw new Error('boom');
      },
      deleteComment: async () => true,
    },
  );

  assert.equal(response.status, 500);
  const body = await readJson(response);
  assert.equal(body.ok, false);
});

test('handleDeleteCommentRequest returns 400 for missing projectRoot query', async () => {
  const response = await handleDeleteCommentRequest(
    new Request('http://localhost/api/beads/bb-123/comments/99', { method: 'DELETE' }),
    params,
    {
      updateComment: async () => true,
      deleteComment: async () => true,
    },
  );

  assert.equal(response.status, 400);
  const body = await readJson(response);
  assert.equal(body.ok, false);
});

test('handleDeleteCommentRequest returns 404 when comment is missing', async () => {
  const response = await handleDeleteCommentRequest(
    new Request('http://localhost/api/beads/bb-123/comments/99?projectRoot=C%3A%2Frepo', { method: 'DELETE' }),
    params,
    {
      updateComment: async () => true,
      deleteComment: async () => false,
    },
  );

  assert.equal(response.status, 404);
  const body = await readJson(response);
  assert.equal(body.ok, false);
});

test('handleDeleteCommentRequest returns 200 on success', async () => {
  let observed: { projectRoot: string; commentId: number } | null = null;
  const response = await handleDeleteCommentRequest(
    new Request('http://localhost/api/beads/bb-123/comments/99?projectRoot=C%3A%2Frepo', { method: 'DELETE' }),
    params,
    {
      updateComment: async () => true,
      deleteComment: async (projectRoot, commentId) => {
        observed = { projectRoot, commentId };
        return true;
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(observed, { projectRoot: 'C:/repo', commentId: 99 });

  const body = await readJson(response);
  assert.equal(body.ok, true);
  assert.equal(body.commentId, 99);
});

test('handleDeleteCommentRequest returns 500 when delete throws', async () => {
  const response = await handleDeleteCommentRequest(
    new Request('http://localhost/api/beads/bb-123/comments/99?projectRoot=C%3A%2Frepo', { method: 'DELETE' }),
    params,
    {
      updateComment: async () => true,
      deleteComment: async () => {
        throw new Error('boom');
      },
    },
  );

  assert.equal(response.status, 500);
  const body = await readJson(response);
  assert.equal(body.ok, false);
});
