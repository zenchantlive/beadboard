import { spawn } from 'node:child_process';
import path from 'node:path';

import { normalizeProjectRootForRuntime } from './project-root';

export type BdFailureClassification = 'not_found' | 'timeout' | 'non_zero_exit' | 'bad_args' | 'unknown';

export interface RunBdCommandOptions {
  projectRoot: string;
  args: string[];
  timeoutMs?: number;
  // Deprecated: accepted for payload compatibility, ignored by runner.
  explicitBdPath?: string | null;
  stdinText?: string;
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
  exec: (
    command: string,
    options: { cwd: string; timeout: number; env: NodeJS.ProcessEnv; stdinText?: string },
  ) => Promise<{ stdout: string; stderr: string }>;
  env: NodeJS.ProcessEnv;
}

function normalizeOutput(text: unknown): string {
  if (typeof text !== 'string') return '';
  return text.replaceAll('\r\n', '\n').trim();
}

function getExitCode(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const value = (error as { exitCode?: unknown }).exitCode;
  return typeof value === 'number' ? value : null;
}

function toErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  return String(value ?? 'Unknown error');
}

function classifyFailure(error: NodeJS.ErrnoException & { stderr?: string; killed?: boolean; signal?: string }): BdFailureClassification {
  const exitCode = getExitCode(error);
  if (error.code === 'ENOENT') return 'not_found';
  if (error.code === 'ETIMEDOUT' || error.killed || error.signal === 'SIGTERM') return 'timeout';
  const stderr = normalizeOutput(error.stderr);
  if (
    /not recognized as an internal or external command/i.test(stderr) ||
    /command not found/i.test(stderr) ||
    /["']bd["'] is not recognized/i.test(stderr) ||
    /bd: not found/i.test(stderr)
  ) {
    return 'not_found';
  }
  if (typeof error.code === 'number' || exitCode !== null) {
    if (/(unknown|invalid|required|usage)/i.test(stderr)) return 'bad_args';
    return 'non_zero_exit';
  }
  return 'unknown';
}

function buildBdNotFoundMessage(): string {
  return 'bd command not found in PATH. Install with: npm install -g @beads/bd';
}

function buildShellCommand(executable: string, args: string[]): string {
  const sanitizedExecutable = executable.replace(/^['"]+|['"]+$/g, '');
  // Normalize to forward slashes for Windows shell compatibility
  const normalizedExe = sanitizedExecutable.split(path.sep).join('/');
  
  if (process.platform === 'win32') {
    // Windows: do not quote plain command tokens like `bd`; quote only when needed.
    const quotedExe = /[\s&|<>()^"]/.test(normalizedExe)
      ? `"${normalizedExe.replace(/"/g, '""')}"`
      : normalizedExe;
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

async function execShellCommand(
  command: string,
  options: { cwd: string; timeout: number; env: NodeJS.ProcessEnv; stdinText?: string },
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
    const shellArgs = process.platform === 'win32' ? ['/d', '/s', '/c', command] : ['-lc', command];

    const child = spawn(shell, shellArgs, {
      cwd: options.cwd,
      env: options.env,
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, options.timeout);

    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      const wrapped = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
      wrapped.stdout = stdout;
      wrapped.stderr = stderr;
      reject(wrapped);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (code === 0 && !timedOut) {
        resolve({ stdout, stderr });
        return;
      }
      const error = new Error(`Command failed with code ${code ?? 'null'}`) as NodeJS.ErrnoException & {
        stdout?: string;
        stderr?: string;
        killed?: boolean;
        signal?: string;
      };
      error.code = timedOut ? 'ETIMEDOUT' : 'BD_EXIT';
      error.stdout = stdout;
      error.stderr = stderr;
      error.killed = timedOut;
      error.signal = signal ?? undefined;
      (error as { exitCode?: number }).exitCode = code ?? 1;
      reject(error);
    });

    if (options.stdinText !== undefined) {
      child.stdin.write(options.stdinText);
    }
    child.stdin.end();
  });
}

export async function runBdCommand(
  options: RunBdCommandOptions,
  injectedDeps?: Partial<RunBdCommandDeps>,
): Promise<RunBdCommandResult> {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 30_000;
  const cwd = normalizeProjectRootForRuntime(options.projectRoot);
  const args = [...options.args];
  if (process.env.BD_NO_DAEMON === 'true') {
    args.unshift('--no-daemon');
  }

  const deps: RunBdCommandDeps = {
    exec: injectedDeps?.exec ?? execShellCommand,
    env: injectedDeps?.env ?? process.env,
  };

  const command = 'bd';

  try {
    const shellCommand = buildShellCommand(command, args);

    let env = deps.env;
    if (process.platform === 'win32') {
      const mingwBin = 'C:\\msys64\\mingw64\\bin';
      const existingPath = deps.env.Path ?? deps.env.PATH ?? '';
      const enhancedPath = existingPath.includes('mingw64')
        ? existingPath
        : `${mingwBin};${existingPath}`;
      env = { ...deps.env, Path: enhancedPath, PATH: enhancedPath };
    } else {
      // Ensure ~/.local/bin is in PATH so bd is found regardless of how the server was started
      const home = deps.env.HOME ?? '';
      const localBin = `${home}/.local/bin`;
      const existingPath = deps.env.PATH ?? '';
      if (home && !existingPath.includes(localBin)) {
        env = { ...deps.env, PATH: `${localBin}:${existingPath}` };
      }
    }

    const { stdout, stderr } = await deps.exec(shellCommand, {
      cwd,
      timeout: timeoutMs,
      env,
      stdinText: options.stdinText,
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
    const error = rawError as NodeJS.ErrnoException & {
      stderr?: string;
      stdout?: string;
      killed?: boolean;
      signal?: string;
    };
    const classification = classifyFailure(error);

    return {
      success: false,
      classification,
      command,
      args,
      cwd,
      stdout: normalizeOutput(error.stdout),
      stderr: normalizeOutput(error.stderr),
      code: typeof error.code === 'number' ? error.code : getExitCode(error),
      durationMs: Date.now() - startedAt,
      error: classification === 'not_found' ? buildBdNotFoundMessage() : toErrorMessage(error),
    };
  }
}
