import fs from 'node:fs/promises';
import path from 'node:path';

export interface ResolveBdExecutableOptions {
  explicitPath?: string | null;
  env?: NodeJS.ProcessEnv;
}

export interface BdExecutableResolution {
  executable: string;
  source: 'config' | 'path';
}

export class BdExecutableNotFoundError extends Error {
  readonly code = 'BD_NOT_FOUND';

  constructor(message: string) {
    super(message);
    this.name = 'BdExecutableNotFoundError';
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function splitEnvPath(env: NodeJS.ProcessEnv = process.env): string[] {
  const value = env.Path ?? env.PATH ?? '';
  if (!value.trim()) {
    return [];
  }

  return value.split(';').map((segment) => segment.trim()).filter(Boolean);
}

function executableCandidates(directory: string): string[] {
  return ['bd.exe', 'bd.cmd', 'bd.bat', 'bd'].map((name) => path.join(directory, name));
}

function buildNotFoundMessage(explicitPath?: string | null): string {
  const lines = [
    'bd.exe was not found.',
    'Install it with: npm install -g @beads/bd',
    'Or configure an explicit executable path in request payload/config.',
  ];

  if (explicitPath) {
    lines.push(`Configured path was not found: ${explicitPath}`);
  }

  return lines.join(' ');
}

export async function resolveBdExecutable(options: ResolveBdExecutableOptions = {}): Promise<BdExecutableResolution> {
  if (options.explicitPath && options.explicitPath.trim()) {
    const explicit = path.resolve(options.explicitPath);
    if (await fileExists(explicit)) {
      return { executable: explicit, source: 'config' };
    }

    throw new BdExecutableNotFoundError(buildNotFoundMessage(options.explicitPath));
  }

  for (const dir of splitEnvPath(options.env)) {
    for (const candidate of executableCandidates(dir)) {
      if (await fileExists(candidate)) {
        return { executable: candidate, source: 'path' };
      }
    }
  }

  throw new BdExecutableNotFoundError(buildNotFoundMessage());
}
