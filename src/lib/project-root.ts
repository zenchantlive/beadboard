import path from 'node:path';
import { canonicalizeWindowsPath } from './pathing';

function isWindowsAbsolute(input: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(input);
}

function windowsToPosixMount(input: string): string {
  const normalized = canonicalizeWindowsPath(input);
  const drive = normalized[0]?.toLowerCase() || '';
  const tail = normalized.slice(2)?.replace(/\\/g, '/')?.replace(/^\/+/, '') || '';
  if (drive && tail) {
    return `/mnt/${drive}/${tail}`;
  }
  return normalized;
}

export function normalizeProjectRootForRuntime(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  if (process.platform === 'win32') {
    return path.resolve(trimmed);
  }

  if (isWindowsAbsolute(trimmed)) {
    return path.resolve(windowsToPosixMount(trimmed));
  }

  return path.resolve(trimmed);
}
