import { exec as nodeExec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

import { BdExecutableNotFoundError, resolveBdExecutable } from './bd-path';

const execAsync = promisify(nodeExec);

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

interface RunBdCommandDeps {
  resolveBdExecutable: typeof resolveBdExecutable;
  exec: (command: string, options: { cwd: string; timeout: number; env: NodeJS.ProcessEnv }) => Promise<{ stdout: string; stderr: string }>;
  env: NodeJS.ProcessEnv;
}

function normalizeOutput(text: unknown): string {
  if (typeof text !== 'string') return '';
  return text.replaceAll('\r\n', '\n').trim();
}

function toErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  return String(value ?? 'Unknown error');
}

function classifyFailure(error: NodeJS.ErrnoException & { stderr?: string; killed?: boolean; signal?: string }): BdFailureClassification {
  if (error.code === 'ENOENT') return 'not_found';
  if (error.code === 'ETIMEDOUT' || error.killed || error.signal === 'SIGTERM') return 'timeout';
  const stderr = normalizeOutput(error.stderr);
  if (typeof error.code === 'number') {
    if (/(unknown|invalid|required|usage)/i.test(stderr)) return 'bad_args';
    return 'non_zero_exit';
  }
  return 'unknown';
}

function buildShellCommand(executable: string, args: string[]): string {
  // Normalize to forward slashes for Windows shell compatibility
  const normalizedExe = executable.split(path.sep).join('/');
  
  if (process.platform === 'win32') {
    // Windows: quote the executable path, leave simple args unquoted
    const quotedExe = `"${normalizedExe}"`;
    const quotedArgs = args.map(a => {
      if (/[\s&|<>()^"]/.test(a)) return `"${a.replace(/"/g, '""')}"`;
      return a;
    });
    return [quotedExe, ...quotedArgs].join(' ');
  } else {
    const escapeArg = (a: string) => `'${a.replace(/'/g, "'\''")}'`;
    return [normalizedExe, ...args.map(escapeArg)].join(' ');
  }
}

export async function runBdCommand(
  options: RunBdCommandOptions,
  injectedDeps?: Partial<RunBdCommandDeps>,
): Promise<RunBdCommandResult> {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 30_000;
  const cwd = options.projectRoot;
  const args = [...options.args];
  if (process.env.BD_NO_DAEMON === 'true') {
    args.unshift('--no-daemon');
  }

  const deps: RunBdCommandDeps = {
    resolveBdExecutable: injectedDeps?.resolveBdExecutable ?? resolveBdExecutable,
    exec: injectedDeps?.exec ?? execAsync,
    env: injectedDeps?.env ?? process.env,
  };

  let command = options.explicitBdPath ?? 'bd';

  try {
    const resolved = await deps.resolveBdExecutable({
      explicitPath: options.explicitBdPath,
      env: deps.env,
    });
    command = resolved.executable;

    const shellCommand = buildShellCommand(command, args);

    const mingwBin = 'C:\\msys64\\mingw64\\bin';
    const existingPath = deps.env.Path ?? deps.env.PATH ?? '';
    const enhancedPath = existingPath.includes('mingw64')
      ? existingPath
      : `${mingwBin};${existingPath}`;

    const { stdout, stderr } = await deps.exec(shellCommand, {
      cwd,
      timeout: timeoutMs,
      env: { ...deps.env, Path: enhancedPath, PATH: enhancedPath },
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
