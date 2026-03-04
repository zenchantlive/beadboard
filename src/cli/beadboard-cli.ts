import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRuntimePaths, resolveInstallHome } from '../lib/runtime-manager';

export type CliResult = {
  ok: boolean;
  command: string;
  [key: string]: unknown;
};

function parseVersion(env: NodeJS.ProcessEnv): string {
  const raw = (env.BB_RUNTIME_VERSION || env.npm_package_version || '0.1.0').trim();
  return raw.startsWith('v') ? raw.slice(1) : raw;
}

export async function runCli(argv: string[], env: NodeJS.ProcessEnv = process.env): Promise<CliResult> {
  const args = [...argv];
  const asJson = args.includes('--json');
  const yes = args.includes('--yes');
  const command = args.find((arg) => !arg.startsWith('-')) || 'help';

  const installHome = resolveInstallHome({ ...env, HOME: env.HOME || os.homedir() });
  const version = parseVersion(env);
  const runtime = getRuntimePaths(installHome, version);

  if (command === 'doctor') {
    return {
      ok: true,
      command,
      json: asJson,
      installMode: env.BB_INSTALL_MODE || 'npm-global-or-wrapper',
      installHome,
      runtimeRoot: runtime.runtimeRoot,
      runtimeCurrentMetadata: runtime.runtimeCurrentMetadata,
      shimDir: runtime.shimDir,
    };
  }

  if (command === 'self-update') {
    return {
      ok: true,
      command,
      updated: false,
      message: 'Self-update is not configured for this distribution yet. Reinstall with npm i -g beadboard when published.',
    };
  }

  if (command === 'uninstall') {
    if (!yes) {
      return {
        ok: false,
        command,
        error: 'Refusing uninstall without --yes',
      };
    }

    await Promise.all([
      fs.rm(runtime.runtimeBase, { recursive: true, force: true }),
      fs.rm(runtime.shimDir, { recursive: true, force: true }),
    ]);

    return {
      ok: true,
      command,
      removed: [runtime.runtimeBase, runtime.shimDir],
    };
  }

  return {
    ok: true,
    command: 'help',
    usage: 'beadboard <doctor|self-update|uninstall> [--json] [--yes]',
  };
}

async function main() {
  const result = await runCli(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
