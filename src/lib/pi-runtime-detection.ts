import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getRuntimePaths } from './runtime-manager';

export type PiRuntimeMode = 'linked-pi' | 'bb-managed-pi';
export type PiInstallState = 'ready' | 'bootstrap-required';

export interface PiRuntimeResolution {
  mode: PiRuntimeMode;
  installState: PiInstallState;
  sdkPath: string | null;
  authPath: string | null;
  agentDir: string;
  version: string;
  managedRoot: string;
  reason: string;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export function getManagedPiPaths(version: string, home: string = os.homedir()) {
  const runtime = getRuntimePaths(home, version);
  const managedRoot = path.join(runtime.runtimeRoot, 'pi');
  return {
    managedRoot,
    sdkPath: path.join(managedRoot, 'node_modules', '@mariozechner', 'pi-coding-agent', 'dist', 'index.js'),
    agentDir: path.join(managedRoot, 'agent'),
    authPath: path.join(managedRoot, 'agent', 'auth.json'),
  };
}

export async function detectPiRuntimeStrategy(params: {
  cwd?: string;
  version?: string;
  home?: string;
  globalPiRoot?: string;
  allowLinkedPi?: boolean;
} = {}): Promise<PiRuntimeResolution> {
  const cwd = params.cwd ?? process.cwd();
  const version = params.version ?? '0.1.0';
  const home = params.home ?? os.homedir();
  const globalPiRoot = params.globalPiRoot ?? '/home/clawdbot/npm-global/lib/node_modules/@mariozechner/pi-coding-agent';
  const allowLinkedPi = params.allowLinkedPi ?? false;

  const localSdkPath = path.join(cwd, 'node_modules', '@mariozechner', 'pi-coding-agent', 'dist', 'index.js');
  const globalSdkPath = path.join(globalPiRoot, 'dist', 'index.js');
  const linkedAuthPath = path.join(home, '.pi', 'agent', 'auth.json');
  const linkedAgentDir = path.join(home, '.pi', 'agent');

  const managed = getManagedPiPaths(version, home);

  if (allowLinkedPi && await pathExists(localSdkPath)) {
    return {
      mode: 'linked-pi',
      installState: 'ready',
      sdkPath: localSdkPath,
      authPath: (await pathExists(linkedAuthPath)) ? linkedAuthPath : null,
      agentDir: linkedAgentDir,
      version,
      managedRoot: managed.managedRoot,
      reason: 'Using project-local Pi SDK and linked ~/.pi/agent state when available.',
    };
  }

  if (allowLinkedPi && await pathExists(globalSdkPath)) {
    return {
      mode: 'linked-pi',
      installState: 'ready',
      sdkPath: globalSdkPath,
      authPath: (await pathExists(linkedAuthPath)) ? linkedAuthPath : null,
      agentDir: linkedAgentDir,
      version,
      managedRoot: managed.managedRoot,
      reason: 'Using globally installed Pi SDK and linked ~/.pi/agent state when available.',
    };
  }

  const managedSdkExists = await pathExists(managed.sdkPath);
  const managedAuthExists = await pathExists(managed.authPath);

  return {
    mode: 'bb-managed-pi',
    installState: managedSdkExists ? 'ready' : 'bootstrap-required',
    sdkPath: managedSdkExists ? managed.sdkPath : null,
    authPath: managedAuthExists ? managed.authPath : null,
    agentDir: managed.agentDir,
    version,
    managedRoot: managed.managedRoot,
    reason: managedSdkExists
      ? 'Using BeadBoard-managed Pi runtime.'
      : allowLinkedPi
        ? 'No linked Pi installation found. BeadBoard-managed Pi bootstrap is required.'
        : 'BeadBoard-managed Pi bootstrap is required.',
  };
}
