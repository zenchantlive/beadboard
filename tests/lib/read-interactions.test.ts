import test from 'node:test';
import assert from 'node:assert/strict';

import { deleteCommentViaDolt, updateCommentViaDolt } from '../../src/lib/read-interactions';

const validRoot = 'C:/Users/Zenchant/codex/beadboard';

test('updateCommentViaDolt validates projectRoot', async () => {
  await assert.rejects(
    async () => updateCommentViaDolt('', 1, 'hello'),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.equal((error as Error).message, 'projectRoot is required.');
      return true;
    },
  );
});

test('updateCommentViaDolt validates commentId', async () => {
  await assert.rejects(
    async () => updateCommentViaDolt(validRoot, 0, 'hello'),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.equal((error as Error).message, 'commentId must be a positive integer.');
      return true;
    },
  );
});

test('updateCommentViaDolt validates text', async () => {
  await assert.rejects(
    async () => updateCommentViaDolt(validRoot, 10, '   '),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.equal((error as Error).message, 'text is required.');
      return true;
    },
  );
});

test('deleteCommentViaDolt validates projectRoot', async () => {
  await assert.rejects(
    async () => deleteCommentViaDolt('  ', 10),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.equal((error as Error).message, 'projectRoot is required.');
      return true;
    },
  );
});

test('deleteCommentViaDolt validates commentId', async () => {
  await assert.rejects(
    async () => deleteCommentViaDolt(validRoot, -1),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.equal((error as Error).message, 'commentId must be a positive integer.');
      return true;
    },
  );
});
