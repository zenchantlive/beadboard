import { execFile as nodeExecFile } from 'node:child_process';
import { promisify } from 'node:util';

import { BdExecutableNotFoundError, resolveBdExecutable } from './bd-path';

const execFileAsync = promisify(nodeExecFile);

export type BdFailureClassification = 'not_found' | 'timeout' | 'non_zero_exit' | 'bad_args' | 'unknown';

export interface RunBdCommandOptions {
  projectRoot: string;
  args: string[];
  timeoutMs?: number;
  explicitBdPath?: string | null;
}

export interface RunBdCommandResult {
  success: boolean;
  classification: BdFailureClassification | null;
  command: string;
  args: string[];
  cwd: string;
  stdout: string;
  stderr: string;
  code: number | null;
  durationMs: number;
  error: string | null;
}

type ExecFileOptions = {
  cwd: string;
  timeout: number;
  windowsHide: boolean;
  env: NodeJS.ProcessEnv;
};

type ExecFileLike = (
  command: string,
  args: string[],
  options: ExecFileOptions,
) => Promise<{ stdout: string; stderr: string }>;

interface RunBdCommandDeps {
  resolveBdExecutable: typeof resolveBdExecutable;
  execFile: ExecFileLike;
  env: NodeJS.ProcessEnv;
}

function normalizeOutput(text: unknown): string {
  if (typeof text !== 'string') {
    return '';
  }

  return text.replaceAll('\r\n', '\n').trim();
}

function toErrorMessage(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }
  return String(value ?? 'Unknown error');
}

function classifyFailure(error: NodeJS.ErrnoException & { stderr?: string; killed?: boolean; signal?: string }): BdFailureClassification {
  if (error.code === 'ENOENT') {
    return 'not_found';
  }

  if (error.code === 'ETIMEDOUT' || error.killed || error.signal === 'SIGTERM') {
    return 'timeout';
  }

  const stderr = normalizeOutput(error.stderr);
  if (typeof error.code === 'number') {
    if (/(unknown|invalid|required|usage)/i.test(stderr)) {
      return 'bad_args';
    }
    return 'non_zero_exit';
  }

  return 'unknown';
}

export async function runBdCommand(
  options: RunBdCommandOptions,
  injectedDeps?: Partial<RunBdCommandDeps>,
): Promise<RunBdCommandResult> {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 30_000;
  const cwd = options.projectRoot;
  const args = [...options.args];

  const deps: RunBdCommandDeps = {
    resolveBdExecutable: injectedDeps?.resolveBdExecutable ?? resolveBdExecutable,
    execFile: injectedDeps?.execFile ?? execFileAsync,
    env: injectedDeps?.env ?? process.env,
  };

  let command = options.explicitBdPath ?? 'bd.exe';

  try {
    const resolved = await deps.resolveBdExecutable({
      explicitPath: options.explicitBdPath,
      env: deps.env,
    });
    command = resolved.executable;

    const { stdout, stderr } = await deps.execFile(command, args, {
      cwd,
      timeout: timeoutMs,
      windowsHide: true,
      env: deps.env,
    });

    return {
      success: true,
      classification: null,
      command,
      args,
      cwd,
      stdout: normalizeOutput(stdout),
      stderr: normalizeOutput(stderr),
      code: 0,
      durationMs: Date.now() - startedAt,
      error: null,
    };
  } catch (rawError) {
    if (rawError instanceof BdExecutableNotFoundError) {
      return {
        success: false,
        classification: 'not_found',
        command,
        args,
        cwd,
        stdout: '',
        stderr: '',
        code: null,
        durationMs: Date.now() - startedAt,
        error: rawError.message,
      };
    }

    const error = rawError as NodeJS.ErrnoException & {
      stderr?: string;
      stdout?: string;
      killed?: boolean;
      signal?: string;
    };

    return {
      success: false,
      classification: classifyFailure(error),
      command,
      args,
      cwd,
      stdout: normalizeOutput(error.stdout),
      stderr: normalizeOutput(error.stderr),
      code: typeof error.code === 'number' ? error.code : null,
      durationMs: Date.now() - startedAt,
      error: toErrorMessage(error),
    };
  }
}
