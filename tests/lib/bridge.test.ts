import test from 'node:test';
import assert from 'node:assert/strict';

import { runBdCommand } from '../../src/lib/bridge';
import { normalizeProjectRootForRuntime } from '../../src/lib/project-root';

test('runBdCommand returns structured success payload from exec output', async () => {
  const result = await runBdCommand(
    {
      projectRoot: 'C:/repo/project',
      args: ['list', '--json'],
      timeoutMs: 2000,
      explicitBdPath: 'C:/tools/bd.exe',
    },
    {
      exec: async (command: string, options: any) => {
        assert.ok(command.startsWith('bd '));
        assert.ok(command.includes('list'));
        assert.ok(command.includes('--json'));
        assert.equal(options.cwd, normalizeProjectRootForRuntime('C:/repo/project'));
        return { stdout: '[{"id":"bb-1"}]\r\n', stderr: '' };
      },
    },
  );

  assert.equal(result.success, true);
  assert.equal(result.classification, null);
  assert.equal(result.stdout, '[{"id":"bb-1"}]');
});

test('runBdCommand classifies missing executable as not_found', async () => {
  const result = await runBdCommand(
    { projectRoot: 'C:/repo/project', args: ['list'] },
    {
      exec: async () => {
        const error = new Error('spawn ENOENT') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      },
    },
  );

  assert.equal(result.success, false);
  assert.equal(result.classification, 'not_found');
});

test('runBdCommand classifies timeout failures', async () => {
  const result = await runBdCommand(
    { projectRoot: 'C:/repo/project', args: ['list'], timeoutMs: 5 },
    {
      exec: async () => {
        const error = new Error('timed out') as NodeJS.ErrnoException & { killed?: boolean; signal?: string };
        error.code = 'ETIMEDOUT';
        error.killed = true;
        error.signal = 'SIGTERM';
        throw error;
      },
    },
  );

  assert.equal(result.success, false);
  assert.equal(result.classification, 'timeout');
});

test('runBdCommand classifies non-zero bad-argument exits', async () => {
  const result = await runBdCommand(
    { projectRoot: 'C:/repo/project', args: ['update', '--bad-flag'] },
    {
      exec: async () => {
        const error = new Error('exit code 1') as NodeJS.ErrnoException & {
          stdout?: string;
          stderr?: string;
        };
        (error as any).code = 1;
        error.stderr = 'unknown flag: --bad-flag';
        error.stdout = '';
        throw error;
      },
    },
  );

  assert.equal(result.success, false);
  assert.equal(result.classification, 'bad_args');
});

test('runBdCommand treats shell "not recognized" stderr as not_found', async () => {
  const result = await runBdCommand(
    { projectRoot: 'C:/repo/project', args: ['list'] },
    {
      exec: async () => {
        const error = new Error('exit code 1') as NodeJS.ErrnoException & {
          stdout?: string;
          stderr?: string;
          exitCode?: number;
        };
        error.code = 'BD_EXIT';
        error.stderr = `'bd' is not recognized as an internal or external command`;
        error.exitCode = 1;
        throw error;
      },
    },
  );

  assert.equal(result.success, false);
  assert.equal(result.classification, 'not_found');
  assert.equal(result.error?.includes('bd command not found in PATH'), true);
});
