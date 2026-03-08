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
  // Only apply Windows-specific path normalization on Windows
  if (process.platform !== 'win32') {
    return input;
  }
  const withBackslashes = input.replaceAll('/', '\\');
  const normalized = path.win32.normalize(withBackslashes);
  const withDriveCase = normalizeDriveLetter(normalized);
  return trimTrailingSeparator(withDriveCase);
}

export function windowsPathKey(input: string): string {
  // Only use Windows-specific normalization on Windows
  if (process.platform === 'win32') {
    return canonicalizeWindowsPath(input).toLowerCase();
  }
  return input.toLowerCase();
}

export function toDisplayPath(input: string): string {
  // Only apply Windows-specific normalization on Windows
  if (process.platform === 'win32') {
    return canonicalizeWindowsPath(input).replaceAll('\\', '/');
  }
  return input;
}

export function sameWindowsPath(a: string, b: string): boolean {
  // On Windows, use Windows-specific normalization
  // On other platforms, just compare normally
  if (process.platform === 'win32') {
    return windowsPathKey(a) === windowsPathKey(b);
  }
  return a === b;
}
