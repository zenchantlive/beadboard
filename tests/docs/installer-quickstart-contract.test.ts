import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const readmePath = path.resolve('README.md');

test('README documents installer one-liners for windows and posix', async () => {
  const raw = await fs.readFile(readmePath, 'utf8');
  assert.match(raw, /npm i -g beadboard/i);
  assert.match(raw, /install\/install\.sh/i);
  assert.match(raw, /install[\\/]+install\.ps1/i);
  assert.match(raw, /~\/\.beadboard\/runtime/i);
});

test('README documents beadboard launcher commands', async () => {
  const raw = await fs.readFile(readmePath, 'utf8');
  assert.match(raw, /\bbeadboard start\b/i);
  assert.match(raw, /\bbeadboard open\b/i);
  assert.match(raw, /\bbeadboard status\b/i);
});
