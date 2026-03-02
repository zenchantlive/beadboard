import path from 'node:path';

function isWindowsAbsolute(input: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(input);
}

function windowsToPosixMount(input: string): string {
  const drive = input[0].toLowerCase();
  const tail = input.slice(2).replace(/\\/g, '/').replace(/^\/+/, '');
  return `/mnt/${drive}/${tail}`;
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
