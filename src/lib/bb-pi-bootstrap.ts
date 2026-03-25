import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getManagedPiPaths } from './pi-runtime-detection';

export interface BootstrapManagedPiResult {
  managedRoot: string;
  sdkPath: string;
  agentDir: string;
  created: boolean;
  alreadyInstalled: boolean;
  installedPackages: string[];
}

export interface BootstrapManagedPiOptions {
  version?: string;
  home?: string;
  output?: { write(chunk: string): void };
  execFile?: (
    file: string,
    args: string[],
    options: { cwd: string; env: NodeJS.ProcessEnv },
  ) => Promise<void>;
}

function getManagedShellPath(): string | null {
  if (process.platform === 'win32') {
    return process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe';
  }

  const candidates = ['/bin/sh', '/usr/bin/sh', '/bin/bash', '/usr/bin/bash'];
  return candidates.find((candidate) => require('node:fs').existsSync(candidate)) ?? null;
}

export async function ensureManagedPiSettings(agentDir: string): Promise<void> {
  const settingsPath = path.join(agentDir, 'settings.json');
  let settings: Record<string, unknown> = {};

  try {
    const existing = await fs.readFile(settingsPath, 'utf8');
    settings = JSON.parse(existing) as Record<string, unknown>;
  } catch {
    settings = {};
  }

  const shellPath = getManagedShellPath();
  const nextSettings = {
    defaultProvider: settings.defaultProvider ?? null,
    defaultModel: settings.defaultModel ?? null,
    ...(shellPath ? { shellPath } : {}),
    ...settings,
  };

  if (shellPath) {
    nextSettings.shellPath = shellPath;
  }

  await fs.mkdir(agentDir, { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(nextSettings, null, 2) + '\n', 'utf8');
}

const AGENTS_MD_CONTENT = `# BeadBoard Orchestrator

You are the BeadBoard Orchestrator, the central embedded intelligence of the BeadBoard project management and agent coordination system.

## Your Role
You are not a generic coding assistant. You are a headless, autonomous daemon responsible for coordinating work across the repository.

1. **Dolt Data Awareness**: You read and understand the project's task topology via Dolt (BeadBoard's versioned SQL backend).
2. **Mailbox Management**: You read, route, and respond to agent coordination messages (HANDOFF, BLOCKED, INFO).
3. **Session Presence**: You broadcast your status and presence state so the BeadBoard frontend can render what you are doing in real-time.
4. **Worker Dispatch**: You evaluate mission templates, select archetypes, and dispatch worker sub-agents to complete specific tasks.

## Operating Constraints
- You operate in a headless environment. You must NEVER prompt for human CLI input.
- You must always query the Dolt backend before making assumptions about task state.
- You must always acknowledge (ACK) messages in the BLOCKED or HANDOFF categories.
`;

export async function ensureManagedPiAgentsMd(agentDir: string): Promise<void> {
  const agentsPath = path.join(agentDir, 'AGENTS.md');
  await fs.mkdir(agentDir, { recursive: true });
  await fs.writeFile(agentsPath, AGENTS_MD_CONTENT, 'utf8');
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readDependencyVersions(): Promise<{ pi: string; minimatch: string }> {
  // Use process.cwd() rather than import.meta.url: in Next.js webpack context,
  // import.meta.url is a webpack:// URL, not a file:// URL, so fileURLToPath()
  // would throw a cross-realm TypeError. process.cwd() reliably resolves to the
  // project root in both dev and production Next.js server environments.
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const raw = await fs.readFile(packageJsonPath, 'utf8');
  const pkg = JSON.parse(raw) as {
    dependencies?: Record<string, string>;
  };

  return {
    pi: pkg.dependencies?.['@mariozechner/pi-coding-agent'] ?? '^0.30.2',
    minimatch: pkg.dependencies?.minimatch ?? '^10.2.4',
  };
}

async function defaultExecFile(file: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv }): Promise<void> {
  const { execFile } = await import('node:child_process');
  await new Promise<void>((resolve, reject) => {
    execFile(file, args, options, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function npmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

export async function bootstrapManagedPi(options: BootstrapManagedPiOptions = {}): Promise<BootstrapManagedPiResult> {
  const version = options.version ?? '0.1.0';
  const home = options.home ?? os.homedir();
  const output = options.output;
  const execFile = options.execFile ?? defaultExecFile;
  const managed = getManagedPiPaths(version, home);

  if (await pathExists(managed.sdkPath)) {
    await ensureManagedPiSettings(managed.agentDir);
    await ensureManagedPiAgentsMd(managed.agentDir);
    return {
      managedRoot: managed.managedRoot,
      sdkPath: managed.sdkPath,
      agentDir: managed.agentDir,
      created: false,
      alreadyInstalled: true,
      installedPackages: [],
    };
  }

  const versions = await readDependencyVersions();

  await fs.mkdir(managed.managedRoot, { recursive: true });
  await fs.mkdir(managed.agentDir, { recursive: true });

  await fs.writeFile(
    path.join(managed.managedRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'bb-managed-pi-runtime',
        private: true,
        type: 'module',
        dependencies: {
          '@mariozechner/pi-coding-agent': versions.pi,
          minimatch: versions.minimatch,
        },
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  await ensureManagedPiSettings(managed.agentDir);
  await ensureManagedPiAgentsMd(managed.agentDir);

  output?.write(`[bb bootstrap] Installing BeadBoard agent runtime at ${managed.managedRoot}\n`);
  await execFile(npmCommand(), ['install', '--no-package-lock', '--no-fund', '--no-audit'], {
    cwd: managed.managedRoot,
    env: {
      ...process.env,
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? home,
    },
  });
  output?.write('[bb bootstrap] Agent runtime installed.\n');

  return {
    managedRoot: managed.managedRoot,
    sdkPath: managed.sdkPath,
    agentDir: managed.agentDir,
    created: true,
    alreadyInstalled: false,
    installedPackages: ['@mariozechner/pi-coding-agent', 'minimatch'],
  };
}
