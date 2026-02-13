import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MutationValidationError,
  buildBdMutationArgs,
  validateMutationPayload,
  executeMutation,
  type MutationOperation,
} from '../../src/lib/mutations';

const root = 'C:/Users/Zenchant/codex/beadboard';

test('validateMutationPayload rejects invalid payloads', () => {
  assert.throws(
    () => validateMutationPayload('create', { projectRoot: '', title: '' }),
    (error: unknown) => error instanceof MutationValidationError,
  );
});

test('buildBdMutationArgs maps reopen correctly', () => {
  const payload = validateMutationPayload('reopen', {
    projectRoot: root,
    id: 'bb-123',
    reason: 'retry work',
  });

  const args = buildBdMutationArgs('reopen', payload);
  assert.deepEqual(args, ['reopen', 'bb-123', '-r', 'retry work', '--json']);
});

test('buildBdMutationArgs maps update issue type correctly', () => {
  const payload = validateMutationPayload('update', {
    projectRoot: root,
    id: 'bb-123',
    issueType: 'feature',
  });

  const args = buildBdMutationArgs('update', payload);
  assert.deepEqual(args, ['update', 'bb-123', '-t', 'feature', '--json']);
});

test('buildBdMutationArgs maps comment correctly', () => {
  const payload = validateMutationPayload('comment', {
    projectRoot: root,
    id: 'bb-123',
    text: 'Added notes',
  });

  const args = buildBdMutationArgs('comment', payload);
  assert.deepEqual(args, ['comments', 'add', 'bb-123', 'Added notes', '--json']);
});

test('executeMutation surfaces bridge failures in normalized response', async () => {
  const payload = validateMutationPayload('close', {
    projectRoot: root,
    id: 'bb-123',
    reason: 'completed',
  });

  const result = await executeMutation('close', payload, {
    runBdCommand: async ({ args }) => {
      assert.deepEqual(args, ['close', 'bb-123', '-r', 'completed', '--json']);
      return {
        success: false,
        classification: 'non_zero_exit',
        command: 'bd.exe',
        args,
        cwd: root,
        stdout: '',
        stderr: 'cannot close',
        code: 1,
        durationMs: 3,
        error: 'cannot close',
      };
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.error?.classification, 'non_zero_exit');
});

test('executeMutation returns successful normalized response', async () => {
  const payload = validateMutationPayload('update', {
    projectRoot: root,
    id: 'bb-123',
    status: 'in_progress',
    priority: 1,
  });

  const result = await executeMutation('update', payload, {
    runBdCommand: async ({ args }) => {
      assert.deepEqual(args, ['update', 'bb-123', '-s', 'in_progress', '-p', '1', '--json']);
      return {
        success: true,
        classification: null,
        command: 'bd.exe',
        args,
        cwd: root,
        stdout: '{"id":"bb-123"}',
        stderr: '',
        code: 0,
        durationMs: 2,
        error: null,
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.operation, 'update');
  assert.equal(result.command.success, true);
});
