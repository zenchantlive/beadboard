import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canonicalizeWindowsPath,
  windowsPathKey,
  toDisplayPath,
  sameWindowsPath,
} from '../../src/lib/pathing';

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
