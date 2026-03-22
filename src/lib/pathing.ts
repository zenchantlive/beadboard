import os from 'node:os';
import path from 'node:path';

const IS_WINDOWS = os.platform() === 'win32';

function normalizeDriveLetter(input: string): string {
  if (/^[a-z]:/.test(input)) {
    return `${input[0].toUpperCase()}${input.slice(1)}`;
  }

  return input;
}

function trimTrailingSeparator(input: string): string {
  if (IS_WINDOWS && /^[A-Za-z]:\\$/.test(input)) {
    return input;
  }

  if (!IS_WINDOWS && input === '/') {
    return input;
  }

  return input.replace(/[\\/]+$/, '');
}

export function canonicalizeWindowsPath(input: string): string {
  if (!IS_WINDOWS) {
    return trimTrailingSeparator(path.resolve(input));
  }

  const withBackslashes = input.replaceAll('/', '\\');
  const normalized = path.win32.normalize(withBackslashes);
  const withDriveCase = normalizeDriveLetter(normalized);
  return trimTrailingSeparator(withDriveCase);
}

export function windowsPathKey(input: string): string {
  if (!IS_WINDOWS) {
    return canonicalizeWindowsPath(input);
  }

  return canonicalizeWindowsPath(input).toLowerCase();
}

export function toDisplayPath(input: string): string {
  if (!IS_WINDOWS) {
    return canonicalizeWindowsPath(input);
  }

  return canonicalizeWindowsPath(input).replaceAll('\\', '/');
}

export function sameWindowsPath(a: string, b: string): boolean {
  return windowsPathKey(a) === windowsPathKey(b);
}
