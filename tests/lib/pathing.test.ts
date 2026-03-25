import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';

import {
  canonicalizeWindowsPath,
  windowsPathKey,
  toDisplayPath,
  sameWindowsPath,
} from '../../src/lib/pathing';

const IS_WINDOWS = os.platform() === 'win32';

if (IS_WINDOWS) {
  test('canonicalizeWindowsPath normalizes separators and drive casing', () => {
    const input = 'c:/Users/test/project/beadboard/';
    const result = canonicalizeWindowsPath(input);
    assert.equal(result, 'C:\\Users\\test\\project\\beadboard');
  });

  test('windowsPathKey is case-insensitive stable key', () => {
    const a = windowsPathKey('C:/Users/test/project/beadboard');
    const b = windowsPathKey('c:\\users\\test\\project\\beadboard\\');
    assert.equal(a, b);
  });

  test('toDisplayPath renders forward slashes for UI readability', () => {
    const display = toDisplayPath('C:\\Users\\test\\project\\beadboard');
    assert.equal(display, 'C:/Users/test/project/beadboard');
  });

  test('sameWindowsPath handles case/separator differences', () => {
    assert.equal(sameWindowsPath('D:/Repos/One', 'd:\\repos\\one\\'), true);
  });
} else {
  test('canonicalizeWindowsPath resolves to absolute path on POSIX', () => {
    const result = canonicalizeWindowsPath('/tmp/project/beadboard');
    assert.equal(result, '/tmp/project/beadboard');
  });

  test('canonicalizeWindowsPath strips trailing slash on POSIX', () => {
    const result = canonicalizeWindowsPath('/tmp/project/');
    assert.equal(result, '/tmp/project');
  });

  test('canonicalizeWindowsPath preserves root slash', () => {
    const result = canonicalizeWindowsPath('/');
    assert.equal(result, '/');
  });

  test('windowsPathKey preserves case on POSIX (case-sensitive FS)', () => {
    const a = windowsPathKey('/tmp/Project');
    const b = windowsPathKey('/tmp/project');
    assert.notEqual(a, b);
  });

  test('toDisplayPath returns resolved path on POSIX', () => {
    const display = toDisplayPath('/opt/beadboard-projects/mira');
    assert.equal(display, '/opt/beadboard-projects/mira');
  });

  test('sameWindowsPath matches identical POSIX paths', () => {
    assert.equal(sameWindowsPath('/tmp/one', '/tmp/one'), true);
    assert.equal(sameWindowsPath('/tmp/one', '/tmp/two'), false);
  });
}
