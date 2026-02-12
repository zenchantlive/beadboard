import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canonicalizeWindowsPath,
  windowsPathKey,
  toDisplayPath,
  sameWindowsPath,
} from '../../src/lib/pathing';

test('canonicalizeWindowsPath normalizes separators and drive casing', () => {
  const input = 'c:/Users/Zenchant/codex/beadboard/';
  const result = canonicalizeWindowsPath(input);
  assert.equal(result, 'C:\\Users\\Zenchant\\codex\\beadboard');
});

test('windowsPathKey is case-insensitive stable key', () => {
  const a = windowsPathKey('C:/Users/Zenchant/codex/beadboard');
  const b = windowsPathKey('c:\\users\\zenchant\\codex\\beadboard\\');
  assert.equal(a, b);
});

test('toDisplayPath renders forward slashes for UI readability', () => {
  const display = toDisplayPath('C:\\Users\\Zenchant\\codex\\beadboard');
  assert.equal(display, 'C:/Users/Zenchant/codex/beadboard');
});

test('sameWindowsPath handles case/separator differences', () => {
  assert.equal(sameWindowsPath('D:/Repos/One', 'd:\\repos\\one\\'), true);
});
