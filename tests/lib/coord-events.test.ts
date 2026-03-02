import test from 'node:test';
import assert from 'node:assert/strict';

import { writeCoordEvent } from '../../src/lib/coord-events';

function validEnvelope() {
  return {
    version: 'coord.v1',
    kind: 'coord_event',
    issue_id: 'bb-123',
    actor: 'amber-otter',
    timestamp: '2026-02-28T18:00:00.000Z',
    data: {
      event_type: 'SEND',
      event_id: 'evt_01',
      project_root: '/tmp/repo',
      to_agent: 'cobalt-harbor',
      state: 'unread',
      payload: {
        subject: 'Need review',
        body: 'Please check API changes',
      },
    },
  };
}

test('writeCoordEvent rejects invalid payload', async () => {
  const result = await writeCoordEvent(
    { version: 'coord.v1' },
    { projectRoot: '/tmp/repo' },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error?.classification, 'bad_args');
});

test('writeCoordEvent invokes bd audit record with --stdin payload', async () => {
  let capturedArgs: string[] | null = null;
  let capturedStdin = '';

  const result = await writeCoordEvent(
    validEnvelope(),
    { projectRoot: '/tmp/repo' },
    {
      runBdCommand: async (options) => {
        capturedArgs = options.args;
        capturedStdin = options.stdinText ?? '';
        return {
          success: true,
          classification: null,
          command: 'bd',
          args: options.args,
          cwd: options.projectRoot,
          stdout: '{"ok":true}',
          stderr: '',
          code: 0,
          durationMs: 1,
          error: null,
        };
      },
    },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(capturedArgs, ['audit', 'record', '--stdin', '--json']);
  assert.match(capturedStdin, /"coord_event"/);
  assert.match(capturedStdin, /"SEND"/);
});
