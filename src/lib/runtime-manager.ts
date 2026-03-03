import path from 'node:path';

const SEMVER_PATTERN = /^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function ensureNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return normalized;
}

export function normalizeVersion(version: string): string {
  const normalized = ensureNonEmpty(version, 'version');
  if (!SEMVER_PATTERN.test(normalized)) {
    throw new Error(`version must be semver-compatible: ${version}`);
  }
  return normalized.startsWith('v') ? normalized.slice(1) : normalized;
}

export function resolveInstallHome(env: NodeJS.ProcessEnv): string {
  const home = env.BB_INSTALL_HOME ?? env.HOME ?? env.USERPROFILE;
  return ensureNonEmpty(home ?? '', 'install home');
}

export function getRuntimePaths(home: string, version: string) {
  const installHome = ensureNonEmpty(home, 'home');
  const normalizedVersion = normalizeVersion(version);
  const beadboardHome = path.join(installHome, '.beadboard');
  const runtimeBase = path.join(beadboardHome, 'runtime');

  return {
    installHome,
    beadboardHome,
    runtimeBase,
    runtimeRoot: path.join(runtimeBase, normalizedVersion),
    runtimeCurrentMetadata: path.join(runtimeBase, 'current.json'),
    shimDir: path.join(beadboardHome, 'bin'),
    shimNames: ['bb', 'beadboard'] as const,
  };
}
