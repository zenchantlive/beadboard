import path from 'node:path';

function normalizeDriveLetter(input: string): string {
  if (/^[a-z]:/.test(input)) {
    return `${input[0].toUpperCase()}${input.slice(1)}`;
  }

  return input;
}

function trimTrailingSeparator(input: string): string {
  if (/^[A-Za-z]:\\$/.test(input)) {
    return input;
  }

  return input.replace(/[\\/]+$/, '');
}

export function canonicalizeWindowsPath(input: string): string {
  const withBackslashes = input.replaceAll('/', '\\');
  const normalized = path.win32.normalize(withBackslashes);
  const withDriveCase = normalizeDriveLetter(normalized);
  return trimTrailingSeparator(withDriveCase);
}

export function windowsPathKey(input: string): string {
  return canonicalizeWindowsPath(input).toLowerCase();
}

export function toDisplayPath(input: string): string {
  return canonicalizeWindowsPath(input).replaceAll('\\', '/');
}

export function sameWindowsPath(a: string, b: string): boolean {
  return windowsPathKey(a) === windowsPathKey(b);
}
